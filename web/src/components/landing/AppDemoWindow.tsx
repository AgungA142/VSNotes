import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AppDemoWindowProps {
  step: 0 | 1 | 2;
  progress: number;
  className?: string;
}

const NOTES = [
  { time: '00:12', text: 'Machine learning: komputer belajar dari data', type: 'auto' as const },
  { time: '00:28', text: 'Supervised learning pakai data berlabel', type: 'auto' as const },
  { time: '00:45', text: 'Penting! Tonton ulang bagian regresi ini', type: 'manual' as const },
  { time: '01:03', text: 'Neural network meniru cara kerja otak', type: 'auto' as const },
  { time: '01:22', text: 'Klasifikasi vs regresi — bedanya di output', type: 'auto' as const },
];

const KEY_POINTS = [
  'ML memungkinkan komputer belajar tanpa pemrograman eksplisit',
  'Supervised learning menggunakan data berlabel untuk training',
  'Regresi dan klasifikasi adalah dua teknik utama',
];

function NoteBadge({ type }: { type: 'auto' | 'manual' }) {
  return (
    <span
      className={`flex-shrink-0 text-[8px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
        type === 'auto' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
      }`}
    >
      {type === 'auto' ? 'Auto' : 'Manual'}
    </span>
  );
}

function WindowChrome() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 flex-shrink-0">
      <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
      <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
      <span className="ml-3 text-[10px] text-gray-400 font-medium">VSNotes</span>
    </div>
  );
}

function Sidebar() {
  return (
    <div className="w-9 bg-gray-900 flex flex-col items-center pt-2 pb-2 gap-1 border-r border-gray-800/80 flex-shrink-0">
      <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center mb-1.5">
        <svg width="10" height="10" viewBox="0 0 52 52" fill="none">
          <rect x="3" y="10" width="46" height="30" rx="4" stroke="white" strokeWidth="2" strokeOpacity=".7" fill="none" />
          <path d="M21 17.5L33 25L21 32.5V17.5Z" fill="white" fillOpacity=".9" />
        </svg>
      </div>
      {/* Nav icons */}
      {[true, false, false].map((active, i) => (
        <div
          key={i}
          className={`w-6 h-6 rounded-md flex items-center justify-center ${active ? 'bg-indigo-600' : ''}`}
        >
          <div className={`w-3.5 h-0.5 rounded-sm ${active ? 'bg-white/80' : 'bg-gray-600'}`} />
        </div>
      ))}
    </div>
  );
}

function Step0Detection() {
  return (
    <div className="flex-1 bg-gray-50 flex items-center justify-center relative overflow-hidden">
      {/* Faded app background */}
      <div className="absolute inset-0 p-3 opacity-25 pointer-events-none">
        <div className="h-6 bg-white border border-gray-200 rounded mb-2" />
        <div className="flex gap-2 h-full">
          <div className="flex-1 bg-white rounded border border-gray-200">
            <div className="h-2 bg-gray-200 rounded m-2 w-3/4" />
            <div className="h-2 bg-gray-200 rounded mx-2 w-1/2" />
          </div>
          <div className="flex-1 bg-white rounded border border-gray-200">
            <div className="h-2 bg-gray-200 rounded m-2 w-2/3" />
          </div>
        </div>
      </div>

      {/* Detection popup — white card, indigo border */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 bg-white rounded-xl border border-indigo-400/40 shadow-lg shadow-indigo-900/10 p-4 w-64"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800 leading-snug">Video terdeteksi</p>
            <p className="text-[10px] text-gray-500 mt-0.5">YouTube · "Intro to Machine Learning"</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold">
            Mulai Rekam
          </button>
          <button className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-[11px]">
            Abaikan
          </button>
        </div>
        <p className="text-[9px] text-gray-400 text-center mt-1.5">Auto-dismiss dalam 15 detik</p>
      </motion.div>
    </div>
  );
}

function Step1Recording({ progress }: { progress: number }) {
  const visibleCount = Math.max(1, Math.ceil(progress * NOTES.slice(0, 4).length));
  const visibleNotes = NOTES.slice(0, visibleCount);
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setCursor((c) => !c), 530);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
      {/* Session header */}
      <div className="bg-white border-b border-gray-200 px-3 py-1.5 flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-semibold flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Merekam
          </span>
          <span className="text-[10px] text-gray-600 truncate">Intro to Machine Learning</span>
        </div>
        <span className="font-mono text-[10px] text-gray-400 flex-shrink-0">01:23</span>
      </div>

      {/* Notes panel */}
      <div className="flex-1 p-2 overflow-hidden flex flex-col gap-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] font-semibold text-gray-600">Catatan</span>
          <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{visibleNotes.length}</span>
        </div>
        {visibleNotes.map((note, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5"
          >
            <span className="font-mono text-[9px] text-gray-400 w-9 text-right flex-shrink-0 pt-0.5">{note.time}</span>
            <span className="text-[10px] text-gray-700 leading-snug flex-1 min-w-0">
              {note.text}
              {i === visibleNotes.length - 1 && (
                <span className={`inline-block w-1.5 h-3 bg-gray-400 ml-0.5 align-middle ${cursor ? 'opacity-100' : 'opacity-0'}`} />
              )}
            </span>
            <NoteBadge type={note.type} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Step2Summary() {
  return (
    <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
      {/* Session header */}
      <div className="bg-white border-b border-gray-200 px-3 py-1.5 flex items-center gap-2 flex-shrink-0">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[9px] font-semibold flex-shrink-0">
          Selesai
        </span>
        <span className="text-[10px] text-gray-600 truncate flex-1 min-w-0">Intro to Machine Learning</span>
        <span className="text-[9px] text-indigo-600 font-medium flex-shrink-0">Export →</span>
      </div>

      {/* Two-column layout: Notes + Summary */}
      <div className="flex-1 flex gap-2 p-2 overflow-hidden">
        {/* Notes Panel */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden"
        >
          <div className="px-2 py-1.5 border-b border-gray-100 flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] font-semibold text-gray-700">Catatan</span>
            <span className="text-[9px] text-gray-400 bg-gray-100 px-1 py-0.5 rounded-full">{NOTES.length}</span>
          </div>
          <div className="flex-1 overflow-hidden p-1.5 space-y-1">
            {NOTES.map((note, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.07, duration: 0.25 }}
                className="flex items-start gap-1.5 bg-gray-50 border border-gray-100 rounded px-1.5 py-1"
              >
                <span className="font-mono text-[8px] text-gray-400 w-8 text-right flex-shrink-0 pt-0.5">{note.time}</span>
                <span className="text-[9px] text-gray-700 leading-snug flex-1 min-w-0 line-clamp-1">{note.text}</span>
                <NoteBadge type={note.type} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Summary Panel */}
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden"
        >
          <div className="px-2 py-1.5 border-b border-gray-100 flex-shrink-0">
            <span className="text-[10px] font-semibold text-gray-700">Rangkuman</span>
          </div>
          <div className="flex-1 overflow-hidden p-2 space-y-2">
            <p className="text-[9px] text-gray-700 leading-relaxed">
              Video membahas konsep dasar machine learning, supervised learning, regresi, dan klasifikasi dengan contoh praktis.
            </p>
            <div>
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Poin Utama</p>
              {KEY_POINTS.map((pt, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.08, duration: 0.25 }}
                  className="flex items-start gap-1 mb-1"
                >
                  <svg className="w-2.5 h-2.5 text-indigo-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-[9px] text-gray-600 leading-snug">{pt}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function AppDemoWindow({ step, progress, className = '' }: AppDemoWindowProps) {
  return (
    <div
      className={`flex flex-col rounded-xl overflow-hidden border border-gray-300/60 shadow-2xl shadow-black/30 ${className}`}
    >
      <WindowChrome />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="flex-1 flex flex-col overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && <Step0Detection />}
            {step === 1 && <Step1Recording progress={progress} />}
            {step === 2 && <Step2Summary />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
