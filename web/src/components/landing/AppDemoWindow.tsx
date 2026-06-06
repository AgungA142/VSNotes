import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AppDemoWindowProps {
  step: 0 | 1 | 2;
  progress: number; // 0–1, used for typing effect in step 1
  className?: string;
}

const TRANSCRIPT_LINES = [
  '> [00:00:12] Selamat datang di sesi ini...',
  '> [00:00:28] Hari ini kita akan membahas...',
  '> [00:00:45] Machine learning adalah cabang...',
  '> [00:01:03] Algoritma supervised learning...',
  '> [00:01:22] Contohnya regresi linear dan...',
];

const KEY_POINTS = [
  'Machine learning memungkinkan komputer belajar dari data',
  'Supervised learning menggunakan data berlabel',
  'Regresi dan klasifikasi adalah dua jenis utama',
];

function WindowChrome() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700 flex-shrink-0">
      <span className="w-3 h-3 rounded-full bg-red-500" />
      <span className="w-3 h-3 rounded-full bg-yellow-400" />
      <span className="w-3 h-3 rounded-full bg-green-400" />
      <span className="ml-3 text-xs text-slate-400 font-mono">VSNotes</span>
      <span className="ml-auto flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs text-slate-400">Aktif</span>
      </span>
    </div>
  );
}

function Step0Detection() {
  return (
    <div className="flex-1 flex items-center justify-center p-6 relative">
      {/* Background app simulation */}
      <div className="absolute inset-0 p-4 opacity-20">
        <div className="h-3 bg-slate-600 rounded w-3/4 mb-2" />
        <div className="h-3 bg-slate-600 rounded w-1/2 mb-2" />
        <div className="h-24 bg-slate-700 rounded mb-2" />
        <div className="h-3 bg-slate-600 rounded w-2/3" />
      </div>

      {/* Detection popup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 bg-slate-800 border border-indigo-500/40 rounded-2xl p-5 w-72 shadow-2xl shadow-indigo-900/40"
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" />
          </svg>
        </div>
        <p className="text-slate-300 text-sm font-medium mb-0.5">Video terdeteksi</p>
        <p className="text-xs text-slate-500 mb-4">YouTube · "Intro to Machine Learning"</p>
        <div className="flex gap-2">
          <button className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold">
            Mulai Rekam
          </button>
          <button className="px-3 py-2 rounded-lg bg-slate-700 text-slate-400 text-xs">
            Abaikan
          </button>
        </div>
        <p className="text-[10px] text-slate-600 text-center mt-2">Auto-dismiss dalam 15 detik</p>
      </motion.div>
    </div>
  );
}

function Step1Transcription({ progress }: { progress: number }) {
  const lineCount = Math.ceil(progress * TRANSCRIPT_LINES.length);
  const visibleLines = TRANSCRIPT_LINES.slice(0, Math.max(1, lineCount));
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setCursor((c) => !c), 530);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 border-b border-slate-700/50 text-xs">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-slate-400">Merekam</span>
        <span className="ml-auto text-slate-500 font-mono">01:23</span>
      </div>

      {/* Transcript panel */}
      <div className="flex-1 p-4 font-mono text-xs space-y-1.5 overflow-hidden">
        <p className="text-slate-500 mb-3">— Transkripsi —</p>
        {visibleLines.map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="text-green-400 leading-relaxed"
          >
            {line}
            {i === visibleLines.length - 1 && (
              <span className={`inline-block w-2 h-3.5 bg-green-400 ml-0.5 align-middle ${cursor ? 'opacity-100' : 'opacity-0'}`} />
            )}
          </motion.p>
        ))}
      </div>

      {/* Waveform */}
      <div className="flex items-end gap-0.5 px-4 pb-3 h-10">
        {Array.from({ length: 32 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-indigo-500/60 rounded-sm"
            style={{
              height: `${20 + Math.sin(i * 0.7 + Date.now() / 400) * 12}px`,
              transition: 'height 0.1s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Step2Summary() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="bg-slate-800 rounded-xl p-4 border border-indigo-500/20"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded bg-indigo-600/30 flex items-center justify-center">
            <svg className="w-3 h-3 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-slate-300">Rangkuman AI</span>
          <span className="ml-auto text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">Selesai</span>
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          Video membahas konsep dasar machine learning, termasuk supervised learning, regresi, dan klasifikasi dengan contoh praktis.
        </p>
      </motion.div>

      {/* Key points */}
      <div className="space-y-1.5">
        <p className="text-xs text-slate-500 font-medium px-1">Poin Utama</p>
        {KEY_POINTS.map((point, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.35 }}
            className="flex items-start gap-2 bg-slate-800/60 rounded-lg px-3 py-2"
          >
            <span className="text-indigo-400 text-xs mt-0.5 flex-shrink-0">✓</span>
            <span className="text-slate-300 text-[11px] leading-relaxed">{point}</span>
          </motion.div>
        ))}
      </div>

      {/* Notes count */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-2 text-[11px] text-slate-500 mt-auto"
      >
        <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span>8 catatan otomatis · 3 catatan manual</span>
        <span className="ml-auto text-indigo-400 cursor-pointer">Export →</span>
      </motion.div>
    </div>
  );
}

export default function AppDemoWindow({ step, progress, className = '' }: AppDemoWindowProps) {
  return (
    <div
      className={`flex flex-col rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl shadow-slate-900/60 ${className}`}
      style={{ background: '#0f172a' }}
    >
      <WindowChrome />
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="flex-1 flex flex-col overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {step === 0 && <Step0Detection />}
          {step === 1 && <Step1Transcription progress={progress} />}
          {step === 2 && <Step2Summary />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
