"""
Tests for audio_agent.py.

Run from desktop/python/:
    pip install pytest
    pytest test_audio_agent.py -v

soundcard (hardware) dan pycaw (COM) di-mock sepenuhnya.
numpy dan wave dijalankan untuk real (pure computation).
"""
import base64
import io
import json
import sys
import threading
import wave
from unittest.mock import MagicMock, Mock, patch

import numpy as np
import pytest

# ---------------------------------------------------------------------------
# Patch soundcard SEBELUM import modul — audio_agent.py melakukan
# `import soundcard as sc` di level modul. Tanpa ini, import gagal di mesin
# tanpa hardware audio atau soundcard tidak ter-install.
# ---------------------------------------------------------------------------
_mock_sc = MagicMock()
sys.modules["soundcard"] = _mock_sc

import audio_agent  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_device(name: str) -> MagicMock:
    d = MagicMock()
    d.name = name
    return d


def _parse_emitted(capsys) -> list[dict]:
    out = capsys.readouterr().out
    return [json.loads(line) for line in out.splitlines() if line.strip()]


def _make_recorder_ctx(mock_recorder: MagicMock) -> MagicMock:
    ctx = MagicMock()
    ctx.__enter__ = Mock(return_value=mock_recorder)
    ctx.__exit__ = Mock(return_value=False)
    return ctx


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_globals():
    """Kembalikan semua global module dan mock sc ke state bersih sebelum tiap test."""
    _mock_sc.reset_mock(return_value=True, side_effect=True)
    audio_agent._session_id = None
    audio_agent._is_paused = False
    audio_agent._stop_event.clear()
    audio_agent._capture_thread = None
    audio_agent._monitor_thread = None
    audio_agent._current_device_name = None
    audio_agent._preferred_device_index = None
    audio_agent._pycaw_state = "unknown"
    yield
    audio_agent._stop_event.set()
    for t in (audio_agent._capture_thread, audio_agent._monitor_thread):
        if t and t.is_alive():
            t.join(timeout=1.0)


@pytest.fixture
def windows():
    with patch("audio_agent.platform.system", return_value="Windows"):
        yield


@pytest.fixture
def macos():
    with patch("audio_agent.platform.system", return_value="Darwin"):
        yield


# ===========================================================================
# wav_encode
# ===========================================================================

class TestWavEncode:
    def _decode(self, b64: str) -> dict:
        raw = base64.b64decode(b64)
        with wave.open(io.BytesIO(raw)) as wf:
            return {
                "channels": wf.getnchannels(),
                "rate": wf.getframerate(),
                "width": wf.getsampwidth(),
                "data": wf.readframes(wf.getnframes()),
            }

    def test_int16_mono_preserved(self):
        frames = np.array([0, 16383, -16383, 32767], dtype=np.int16)
        info = self._decode(audio_agent.wav_encode(frames))
        assert info["channels"] == 1
        assert info["rate"] == 16000
        assert info["width"] == 2
        assert len(info["data"]) == 8  # 4 samples × 2 bytes

    def test_float32_mono_converted_to_int16(self):
        frames = np.array([0.0, 0.5, -0.5, 1.0], dtype=np.float32)
        info = self._decode(audio_agent.wav_encode(frames))
        assert info["channels"] == 1
        assert info["width"] == 2

    def test_float32_stereo_mixed_down_to_mono(self):
        frames = np.ones((100, 2), dtype=np.float32) * 0.5
        info = self._decode(audio_agent.wav_encode(frames))
        assert info["channels"] == 1
        assert len(info["data"]) == 200  # 100 samples × 2 bytes

    def test_float_values_clipped_at_plus_minus_one(self):
        frames = np.array([2.0, -2.0], dtype=np.float32)
        info = self._decode(audio_agent.wav_encode(frames))
        samples = np.frombuffer(info["data"], dtype=np.int16)
        assert samples[0] == 32767
        assert samples[1] == -32767

    def test_output_is_valid_base64(self):
        b64 = audio_agent.wav_encode(np.zeros(100, dtype=np.float32))
        assert isinstance(b64, str)
        base64.b64decode(b64)  # tidak raise jika valid


# ===========================================================================
# find_loopback_device — Windows
# ===========================================================================

class TestFindLoopbackDeviceWindows:
    def _setup_sc(self, speakers, all_mics, physical_mics, default_speaker=None):
        _mock_sc.all_speakers.return_value = speakers
        _mock_sc.all_microphones.side_effect = lambda include_loopback=False: (
            all_mics if include_loopback else physical_mics
        )
        _mock_sc.default_speaker.return_value = default_speaker or (speakers[0] if speakers else None)

    def test_exact_match_dengan_default_speaker(self, windows):
        spk = _make_device("Headphones (Realtek Audio)")
        loopback = _make_device("Headphones (Realtek Audio)")
        mic = _make_device("Microphone Array")
        self._setup_sc([spk], [loopback, mic], [mic], default_speaker=spk)

        device, is_loopback = audio_agent.find_loopback_device()

        assert is_loopback is True
        assert device.name == "Headphones (Realtek Audio)"

    def test_fuzzy_match_ketika_nama_sedikit_berbeda(self, windows):
        spk = _make_device("Headphones (Realtek(R) Audio)")
        loopback = _make_device("Headphones (Realtek Audio)")
        mic = _make_device("Microphone")
        self._setup_sc([spk], [loopback, mic], [mic], default_speaker=spk)

        device, is_loopback = audio_agent.find_loopback_device()

        assert is_loopback is True
        assert "Headphones" in device.name

    def test_preferred_index_mengabaikan_default_speaker(self, windows):
        spk0 = _make_device("Speakers (Realtek)")
        spk1 = _make_device("Headphones (USB)")
        lb0 = _make_device("Speakers (Realtek)")
        lb1 = _make_device("Headphones (USB)")
        mic = _make_device("Microphone")
        self._setup_sc([spk0, spk1], [lb0, lb1, mic], [mic], default_speaker=spk0)

        device, is_loopback = audio_agent.find_loopback_device(preferred_index=1)

        assert is_loopback is True
        assert device.name == "Headphones (USB)"

    def test_fallback_ke_loopback_pertama_jika_tidak_ada_match(self, windows):
        spk = _make_device("Unknown Speaker XYZ")
        lb0 = _make_device("Loopback A")
        lb1 = _make_device("Loopback B")
        mic = _make_device("Microphone")
        self._setup_sc([spk], [lb0, lb1, mic], [mic], default_speaker=spk)

        device, is_loopback = audio_agent.find_loopback_device()

        assert is_loopback is True
        assert device.name == "Loopback A"

    def test_fallback_ke_default_mic_jika_tidak_ada_loopback(self, windows):
        spk = _make_device("Speakers")
        mic = _make_device("Microphone Array")
        default_mic = _make_device("Default Mic")
        self._setup_sc([spk], [mic], [mic], default_speaker=spk)
        _mock_sc.default_microphone.return_value = default_mic

        _, is_loopback = audio_agent.find_loopback_device()

        assert is_loopback is False

    def test_preferred_index_out_of_range_fallback_ke_default(self, windows):
        spk = _make_device("Speakers")
        lb = _make_device("Speakers")
        mic = _make_device("Mic")
        self._setup_sc([spk], [lb, mic], [mic], default_speaker=spk)

        device, is_loopback = audio_agent.find_loopback_device(preferred_index=99)

        assert is_loopback is True
        assert device.name == "Speakers"


# ===========================================================================
# find_loopback_device — macOS
# ===========================================================================

class TestFindLoopbackDeviceMacOS:
    def test_returns_blackhole_device(self, macos):
        bh = _make_device("BlackHole 2ch")
        built_in = _make_device("Built-in Microphone")
        _mock_sc.all_microphones.return_value = [built_in, bh]

        device, is_loopback = audio_agent.find_loopback_device()

        assert is_loopback is True
        assert "blackhole" in device.name.lower()

    def test_fallback_jika_blackhole_tidak_ditemukan(self, macos):
        mic = _make_device("Built-in Microphone")
        _mock_sc.all_microphones.return_value = [mic]
        _mock_sc.default_microphone.return_value = mic

        _, is_loopback = audio_agent.find_loopback_device()

        assert is_loopback is False


# ===========================================================================
# handle_command — start
# ===========================================================================

class TestHandleCommandStart:
    def _start(self, session_id="sess-1", device_index=None):
        cmd = {"action": "start", "sessionId": session_id}
        if device_index is not None:
            cmd["deviceIndex"] = device_index
        mock_device = _make_device("Speakers")
        with patch("audio_agent.find_loopback_device", return_value=(mock_device, True)):
            with patch("audio_agent.capture_loop"):
                audio_agent.handle_command(cmd)
        return mock_device

    def test_menyimpan_session_id(self):
        self._start(session_id="abc")
        assert audio_agent._session_id == "abc"

    def test_memulai_capture_thread(self):
        self._start()
        assert audio_agent._capture_thread is not None

    def test_memulai_device_monitor_thread(self):
        self._start()
        assert audio_agent._monitor_thread is not None

    def test_menyimpan_preferred_device_index(self):
        self._start(device_index=2)
        assert audio_agent._preferred_device_index == 2

    def test_menyimpan_nama_device_aktif(self):
        mock_device = _make_device("Headphones (USB)")
        with patch("audio_agent.find_loopback_device", return_value=(mock_device, True)):
            with patch("audio_agent.capture_loop"):
                audio_agent.handle_command({"action": "start", "sessionId": "s"})
        assert audio_agent._current_device_name == "Headphones (USB)"

    def test_duplicate_start_diabaikan(self):
        find_mock = Mock(return_value=(_make_device("Speakers"), True))
        with patch("audio_agent.find_loopback_device", find_mock):
            with patch("audio_agent.capture_loop"):
                audio_agent.handle_command({"action": "start", "sessionId": "s1"})
                audio_agent._capture_thread.is_alive = Mock(return_value=True)
                audio_agent.handle_command({"action": "start", "sessionId": "s2"})

        assert find_mock.call_count == 1
        assert audio_agent._session_id == "s1"


# ===========================================================================
# handle_command — stop / pause / resume / list_devices
# ===========================================================================

class TestHandleCommandStop:
    def test_membersihkan_session_state(self):
        audio_agent._session_id = "active"
        audio_agent._current_device_name = "Speakers"
        audio_agent._preferred_device_index = 1

        audio_agent.handle_command({"action": "stop"})

        assert audio_agent._session_id is None
        assert audio_agent._current_device_name is None
        assert audio_agent._preferred_device_index is None

    def test_mengaktifkan_stop_event(self):
        audio_agent.handle_command({"action": "stop"})
        assert audio_agent._stop_event.is_set()


class TestHandleCommandPauseResume:
    def test_pause_mengaktifkan_flag(self):
        audio_agent.handle_command({"action": "pause"})
        assert audio_agent._is_paused is True

    def test_resume_mematikan_flag(self):
        audio_agent._is_paused = True
        audio_agent.handle_command({"action": "resume"})
        assert audio_agent._is_paused is False


class TestHandleCommandListDevices:
    def test_emit_devices_event_dengan_semua_speaker(self, capsys):
        _mock_sc.all_speakers.return_value = [
            _make_device("Speakers"),
            _make_device("Headphones (USB)"),
        ]
        audio_agent.handle_command({"action": "list_devices"})

        events = _parse_emitted(capsys)
        assert len(events) == 1
        assert events[0]["type"] == "devices"
        names = [d["name"] for d in events[0]["devices"]]
        assert "Speakers" in names
        assert "Headphones (USB)" in names


# ===========================================================================
# device_monitor_loop
# ===========================================================================

class TestDeviceMonitorLoop:
    """Monitor mendeteksi pergantian device dan memicu restart capture stream."""

    def _run_one_poll(self, session_id, known_name, new_name, preferred=None):
        """
        Jalankan satu iterasi efektif dari device_monitor_loop.
        Mengembalikan Mock objek dari _restart_capture_with_device.
        """
        audio_agent._session_id = session_id
        audio_agent._current_device_name = known_name
        audio_agent._preferred_device_index = preferred
        audio_agent._stop_event.clear()

        sleep_calls = [0]

        def fake_sleep(_):
            sleep_calls[0] += 1
            if sleep_calls[0] >= 1:
                audio_agent._stop_event.set()

        restart_mock = Mock()
        with patch("audio_agent._restart_capture_with_device", restart_mock):
            with patch("audio_agent._get_current_default_speaker_name", return_value=new_name):
                with patch("audio_agent.time.sleep", fake_sleep):
                    t = threading.Thread(target=audio_agent.device_monitor_loop, daemon=True)
                    t.start()
                    t.join(timeout=2.0)
        return restart_mock

    def test_restart_dipicu_saat_device_berubah(self):
        mock = self._run_one_poll("active", "Speakers", "Headphones (USB)")
        mock.assert_called_once_with(None)

    def test_tidak_restart_jika_device_sama(self):
        mock = self._run_one_poll("active", "Speakers", "Speakers")
        mock.assert_not_called()

    def test_tidak_restart_jika_tidak_ada_sesi_aktif(self):
        mock = self._run_one_poll(None, "Speakers", "Headphones (USB)")
        mock.assert_not_called()

    def test_meneruskan_preferred_index_ke_restart(self):
        mock = self._run_one_poll("active", "Speakers", "Headphones", preferred=2)
        mock.assert_called_once_with(2)


# ===========================================================================
# capture_loop
# ===========================================================================

class TestCaptureLoop:
    def test_emit_chunk_dengan_field_yang_benar(self, capsys):
        frames = np.zeros((audio_agent.CHUNK_FRAMES, 1), dtype=np.float32)
        mock_recorder = MagicMock()
        # Iterasi pertama: kembalikan frames. Kedua: raise untuk hentikan loop.
        mock_recorder.record.side_effect = [frames, RuntimeError("selesai")]

        mock_device = _make_device("Speakers")
        mock_device.recorder.return_value = _make_recorder_ctx(mock_recorder)
        audio_agent._session_id = "sess-test"

        t = threading.Thread(
            target=audio_agent.capture_loop, args=(mock_device, True), daemon=True
        )
        t.start()
        t.join(timeout=3.0)

        events = _parse_emitted(capsys)
        chunks = [e for e in events if e.get("type") == "chunk"]
        assert len(chunks) == 1
        c = chunks[0]
        assert c["sessionId"] == "sess-test"
        assert c["durationSec"] == 30
        assert isinstance(c["audioData"], str)
        assert isinstance(c["capturedAt"], str)
        # Verifikasi audioData adalah WAV valid
        raw = base64.b64decode(c["audioData"])
        with wave.open(io.BytesIO(raw)) as wf:
            assert wf.getnchannels() == 1
            assert wf.getframerate() == 16000

    def test_emit_error_jika_device_exception(self, capsys):
        mock_device = _make_device("Bad Device")
        ctx = MagicMock()
        ctx.__enter__ = Mock(side_effect=RuntimeError("device lost"))
        ctx.__exit__ = Mock(return_value=False)
        mock_device.recorder.return_value = ctx

        audio_agent._session_id = "sess-err"
        audio_agent.capture_loop(mock_device, is_loopback=True)

        events = _parse_emitted(capsys)
        errors = [e for e in events if e.get("type") == "error"]
        assert len(errors) == 1
        assert "device lost" in errors[0]["message"]

    def test_berhenti_saat_stop_event_diaktifkan(self):
        frames = np.zeros((audio_agent.CHUNK_FRAMES, 1), dtype=np.float32)
        record_calls = [0]

        def fake_record(numframes):
            record_calls[0] += 1
            if record_calls[0] >= 2:
                audio_agent._stop_event.set()
            return frames

        mock_recorder = MagicMock()
        mock_recorder.record.side_effect = fake_record
        mock_device = _make_device("Speakers")
        mock_device.recorder.return_value = _make_recorder_ctx(mock_recorder)
        audio_agent._session_id = "sess-stop"

        t = threading.Thread(
            target=audio_agent.capture_loop, args=(mock_device, True), daemon=True
        )
        t.start()
        t.join(timeout=5.0)

        assert not t.is_alive(), "Thread seharusnya sudah selesai setelah stop_event diset"

    def test_tidak_record_saat_paused(self, capsys):
        audio_agent._is_paused = True
        audio_agent._session_id = "sess-paused"

        record_calls = [0]
        sleep_calls = [0]

        def fake_record(numframes):
            record_calls[0] += 1
            return np.zeros((audio_agent.CHUNK_FRAMES, 1), dtype=np.float32)

        def fake_sleep(sec):
            sleep_calls[0] += 1
            if sleep_calls[0] >= 3:
                audio_agent._stop_event.set()

        mock_recorder = MagicMock()
        mock_recorder.record.side_effect = fake_record
        mock_device = _make_device("Speakers")
        mock_device.recorder.return_value = _make_recorder_ctx(mock_recorder)

        with patch("audio_agent.time.sleep", fake_sleep):
            t = threading.Thread(
                target=audio_agent.capture_loop, args=(mock_device, True), daemon=True
            )
            t.start()
            t.join(timeout=2.0)

        assert record_calls[0] == 0, "record() tidak boleh dipanggil saat paused"
        events = _parse_emitted(capsys)
        assert not any(e.get("type") == "chunk" for e in events)
