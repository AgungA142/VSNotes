"""
Audio Capture Agent
Captures system audio via WASAPI loopback (Windows) or BlackHole (macOS).
Communicates with Electron main process via stdin/stdout JSON messages.

Protocol:
  stdin  (commands) : {"action": "start", "sessionId": "...", "deviceIndex": 0}
                      {"action": "stop"}
                      {"action": "pause"}
                      {"action": "resume"}
                      {"action": "list_devices"}

  stdout (events)   : {"type": "chunk",   "sessionId": "...", "audioData": "<base64>",
                        "durationSec": 30, "capturedAt": "<ISO-UTC>"}
                      {"type": "devices", "devices": [{"index": 0, "name": "..."}]}
                      {"type": "error",   "message": "..."}

  stderr            : diagnostic / debug lines (not parsed by Electron)
"""

import sys
import json
import base64
import signal
import threading
import time
import platform
from datetime import datetime, timezone
from io import BytesIO
import wave

import numpy as np
import soundcard as sc

# pycaw tidak diimport di level modul — Python 3.13 menginisialisasi COM di main thread
# sebelum comtypes sempat, menyebabkan RPC_E_CHANGED_MODE.
# Solusi: import HANYA di dalam worker thread (setiap thread punya COM apartment sendiri).
_pycaw_state: str = "unknown"  # "unknown" | "available" | "unavailable"

# ============================================================================
# Audio configuration
# ============================================================================

SAMPLE_RATE = 16000      # Hz — optimal for Gemini API
CHANNELS = 1             # mono
CHUNK_DURATION_SEC = 30
CHUNK_FRAMES = SAMPLE_RATE * CHUNK_DURATION_SEC

# ============================================================================
# Shared state
# ============================================================================

_lock = threading.Lock()
_session_id: str | None = None
_is_paused = False
_stop_event = threading.Event()
_capture_thread: threading.Thread | None = None

# ============================================================================
# Helpers
# ============================================================================

def emit(event: dict) -> None:
    """Send a JSON event line to stdout (read by Electron)."""
    print(json.dumps(event), flush=True)


def log(msg: str) -> None:
    """Write a diagnostic line to stderr (not parsed by Electron)."""
    print(f"[audio_agent] {msg}", file=sys.stderr, flush=True)


def wav_encode(frames: np.ndarray) -> str:
    """Convert float32 or int16 frames to a base64-encoded mono WAV string."""
    # Normalise to int16
    if frames.dtype != np.int16:
        frames = np.clip(frames, -1.0, 1.0)
        frames = (frames * 32767).astype(np.int16)

    # Mix down to mono if needed
    if frames.ndim == 2:
        frames = frames.mean(axis=1).astype(np.int16)

    buf = BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)          # 16-bit = 2 bytes per sample
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(frames.tobytes())
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")

# ============================================================================
# Device discovery (soundcard)
# ============================================================================

def _get_all_output_devices() -> list:
    """Return all available output (speaker) devices."""
    try:
        return sc.all_speakers()
    except Exception as exc:
        log(f"Failed to list speakers: {exc}")
        return []


def get_audio_playing_processes() -> tuple[list[str], bool]:
    """
    Kembalikan (process_names, pycaw_available).
    Import pycaw di dalam worker thread agar COM apartment-nya bersih.
    Python 3.13 menginisialisasi COM di main thread sehingga comtypes gagal jika diimport
    di sana — setiap thread Windows punya state COM tersendiri.
    """
    global _pycaw_state

    if _pycaw_state == "unavailable":
        return [], False

    processes: list[str] = []
    success_flag: list[bool] = []
    error_msg: list[str] = []

    def _worker() -> None:
        try:
            # Import di dalam thread — COM apartment thread ini masih bersih
            from pycaw.pycaw import AudioUtilities, IAudioMeterInformation as _IAM  # type: ignore
            playing: set[str] = set()
            for session in AudioUtilities.GetAllSessions():
                if session.Process is None:
                    continue
                try:
                    if session._ctl.QueryInterface(_IAM).GetPeakValue() > 0.01:
                        playing.add(session.Process.name().lower())
                except Exception:
                    continue
            processes.extend(playing)
            success_flag.append(True)
        except Exception as exc:
            error_msg.append(str(exc))
            success_flag.append(False)

    t = threading.Thread(target=_worker, daemon=True, name="audio-sessions")
    t.start()
    t.join(timeout=1.5)

    if not success_flag:
        log("Audio session detection timed out")
        return [], False

    if not success_flag[0]:
        log(f"pycaw tidak tersedia: {error_msg[0] if error_msg else 'unknown'}")
        _pycaw_state = "unavailable"
        return [], False

    _pycaw_state = "available"
    return processes, True


def list_output_devices() -> list[dict]:
    """Return serialisable list of output devices for Electron Settings UI."""
    result = []
    for idx, spk in enumerate(_get_all_output_devices()):
        result.append({"index": idx, "name": spk.name})
    return result


def find_loopback_device(preferred_index: int | None = None):
    """
    Return (mic_object, is_loopback) for capturing system audio output only.

    WASAPI loopback mic captures exactly what plays through the selected
    output device (headphone/speaker audio from video, music, etc.) —
    NOT the physical microphone.

    preferred_index maps to sc.all_speakers() (shown in Settings UI).
    """
    os_name = platform.system()

    if os_name == "Windows":
        speakers = _get_all_output_devices()
        all_mics = sc.all_microphones(include_loopback=True)
        physical_names = {m.name for m in sc.all_microphones(include_loopback=False)}

        # Loopback mics = entries in all_mics whose name does not match a physical mic
        loopback_mics = [m for m in all_mics if m.name not in physical_names]

        if not loopback_mics:
            log("No loopback mics found — cannot capture system audio without a physical mic")
            return sc.default_microphone(), False

        # Determine target speaker name from user preference or system default
        target_name: str | None = None
        if preferred_index is not None and 0 <= preferred_index < len(speakers):
            target_name = speakers[preferred_index].name
        else:
            try:
                target_name = sc.default_speaker().name
            except Exception as exc:
                log(f"Could not get default speaker: {exc}")

        # Exact match first, then fuzzy — matches e.g. "Headphones (Realtek(R) Audio)"
        if target_name:
            for mic in loopback_mics:
                if mic.name.lower() == target_name.lower():
                    log(f"Using loopback mic (system audio): {mic.name}")
                    return mic, True
            for mic in loopback_mics:
                if target_name.lower() in mic.name.lower() or mic.name.lower() in target_name.lower():
                    log(f"Using loopback mic (fuzzy match): {mic.name}")
                    return mic, True

        log(f"Using first loopback mic: {loopback_mics[0].name}")
        return loopback_mics[0], True

    elif os_name == "Darwin":
        for mic in sc.all_microphones():
            if "blackhole" in mic.name.lower():
                log(f"Using BlackHole: {mic.name}")
                return mic, True
        log("BlackHole not found — install BlackHole for system audio capture on macOS")

    else:  # Linux
        try:
            for mic in sc.all_microphones(include_loopback=True):
                if "monitor" in mic.name.lower():
                    log(f"Using PulseAudio monitor: {mic.name}")
                    return mic, True
        except Exception as exc:
            log(f"Monitor source search failed: {exc}")

    log("No system audio capture device available")
    return sc.default_microphone(), False

# ============================================================================
# Capture loop (runs in background thread)
# ============================================================================

def capture_loop(device, is_loopback: bool) -> None:
    """Continuously capture 30-second audio chunks until _stop_event is set."""
    try:
        # soundcard: Speaker.recorder() for WASAPI loopback, Microphone.recorder() for input
        recorder_ctx = device.recorder(samplerate=SAMPLE_RATE, channels=CHANNELS, blocksize=CHUNK_FRAMES)

        with recorder_ctx as recorder:
            log(f"Audio stream opened ({'loopback' if is_loopback else 'microphone'}): {device.name}")

            while not _stop_event.is_set():
                with _lock:
                    paused = _is_paused
                    sid = _session_id

                if paused or sid is None:
                    time.sleep(0.05)
                    continue

                # Blocks until CHUNK_FRAMES (≈30 s) are available
                frames = recorder.record(numframes=CHUNK_FRAMES)

                if _stop_event.is_set():
                    break

                audio_b64 = wav_encode(frames)
                emit({
                    "type": "chunk",
                    "sessionId": sid,
                    "audioData": audio_b64,
                    "durationSec": CHUNK_DURATION_SEC,
                    "capturedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
                })

    except Exception as exc:
        log(f"Capture loop error: {exc}")
        emit({"type": "error", "message": str(exc)})
    finally:
        log("Audio stream closed")

# ============================================================================
# Command handler
# ============================================================================

def handle_command(cmd: dict) -> None:
    global _session_id, _is_paused, _capture_thread

    action = cmd.get("action")

    if action == "list_devices":
        devices = list_output_devices()
        emit({"type": "devices", "devices": devices})

    elif action == "audio_sessions":
        procs, available = get_audio_playing_processes()
        emit({"type": "audio_sessions", "processes": procs, "available": available})

    elif action == "start":
        with _lock:
            if _capture_thread and _capture_thread.is_alive():
                log("Already capturing — ignoring duplicate start command")
                return
            _session_id = cmd.get("sessionId")
            _is_paused = False
            _stop_event.clear()

        preferred = cmd.get("deviceIndex")  # int | None
        device, is_loopback = find_loopback_device(preferred)

        _capture_thread = threading.Thread(
            target=capture_loop,
            args=(device, is_loopback),
            daemon=True,
            name="audio-capture",
        )
        _capture_thread.start()
        log(f"Capture started for session {_session_id} (device={device.name})")

    elif action == "stop":
        with _lock:
            _session_id = None
            _is_paused = False
        _stop_event.set()
        if _capture_thread:
            _capture_thread.join(timeout=5)
        log("Capture stopped")

    elif action == "pause":
        with _lock:
            _is_paused = True
        log("Capture paused")

    elif action == "resume":
        with _lock:
            _is_paused = False
        log("Capture resumed")

    else:
        log(f"Unknown action: {action!r}")

# ============================================================================
# Entrypoint
# ============================================================================

def _handle_sigterm(_signum, _frame) -> None:
    log("SIGTERM received — shutting down")
    _stop_event.set()
    sys.exit(0)


def main() -> None:
    signal.signal(signal.SIGTERM, _handle_sigterm)
    log("Audio agent started")

    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        try:
            cmd = json.loads(line)
            handle_command(cmd)
        except json.JSONDecodeError as exc:
            log(f"JSON decode error: {exc}")
            emit({"type": "error", "message": f"Invalid JSON command: {exc}"})
        except Exception as exc:
            log(f"Unhandled error in command handler: {exc}")
            emit({"type": "error", "message": str(exc)})

    log("stdin closed — shutting down")
    _stop_event.set()
    if _capture_thread:
        _capture_thread.join(timeout=5)


if __name__ == "__main__":
    main()
