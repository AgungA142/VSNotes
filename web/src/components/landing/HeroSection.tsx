import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Download, ChevronDown } from 'lucide-react';
import Button from '../shared/Button';
import AppDemoWindow from './AppDemoWindow';
import { LANDING_CONFIG } from '../../config/landing.config';

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function AppLogo() {
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        background: 'linear-gradient(145deg, #4338ca 0%, #6d28d9 60%, #5b21b6 100%)',
        boxShadow: '0 0 0 1px rgba(255,255,255,.08) inset, 0 4px 16px rgba(99,102,241,.4)',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 52 52" fill="none">
        <rect x="3" y="10" width="46" height="30" rx="4" stroke="white" strokeWidth="1.5" strokeOpacity=".25" fill="none" />
        <path d="M21 17.5L33 25L21 32.5V17.5Z" fill="white" fillOpacity=".95" />
        <line x1="14" y1="44" x2="38" y2="44" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity=".45" />
        <line x1="14" y1="48" x2="28" y2="48" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity=".25" />
      </svg>
    </div>
  );
}

const STEP_LABELS = [
  { label: 'Deteksi', desc: 'Video terdeteksi otomatis' },
  { label: 'Transkrip', desc: 'Audio dikonversi ke teks' },
  { label: 'Rangkuman', desc: 'AI buat catatan & ringkasan' },
];

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Map scroll 0→1 to step 0→2
  const stepRaw = useTransform(scrollYProgress, [0.1, 0.45, 0.55, 0.85, 0.9, 1], [0, 0, 1, 1, 2, 2]);
  // Progress within step 1 (for typing effect)
  const step1Progress = useTransform(scrollYProgress, [0.45, 0.85], [0, 1]);

  // For the sticky panel Y offset — stays fixed while within container
  const [currentStep, setCurrentStep] = React.useState<0 | 1 | 2>(0);
  const [typingProgress, setTypingProgress] = React.useState(0);

  React.useEffect(() => {
    const unsubStep = stepRaw.on('change', (v) => {
      setCurrentStep(Math.round(v) as 0 | 1 | 2);
    });
    const unsubProgress = step1Progress.on('change', (v) => {
      setTypingProgress(Math.max(0, Math.min(1, v)));
    });
    return () => { unsubStep(); unsubProgress(); };
  }, [stepRaw, step1Progress]);

  return (
    <section aria-label="Hero" ref={containerRef} style={{ height: prefersReduced ? 'auto' : '320vh' }}>
      <div
        className="sticky top-0 h-screen flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)' }}
      >
        {/* Dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(99,102,241,.15) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)',
          }}
        />
        {/* Glow orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,.18) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,.14) 0%, transparent 70%)', filter: 'blur(60px)' }} />

        {/* Navbar */}
        <nav aria-label="Navigasi utama" className="relative z-10 flex items-center justify-between px-6 md:px-12 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <AppLogo />
            <span className="text-white font-bold text-lg tracking-tight">VSNotes</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10"
            onClick={() => scrollToSection('download')}
          >
            Download
          </Button>
        </nav>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex items-center px-6 md:px-12 pb-8">
          <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Left — Text */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-xs text-indigo-300 font-medium tracking-wide">AI-Powered · Windows 1.0.0</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold text-white leading-tight mb-4">
                {LANDING_CONFIG.app.fullName}
              </h1>
              <p className="text-lg md:text-xl text-indigo-300 font-medium mb-3">
                {LANDING_CONFIG.app.tagline}
              </p>
              <p className="text-slate-400 text-base md:text-lg mb-8 leading-relaxed">
                {LANDING_CONFIG.app.description}
              </p>

              <div className="flex flex-wrap gap-3">
                <Button
                  as="a"
                  href={LANDING_CONFIG.downloads.windows.url}
                  variant="primary"
                  size="lg"
                  icon={Download}
                >
                  Download Gratis
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-slate-400 hover:text-white hover:bg-white/5"
                  icon={ChevronDown}
                  iconPosition="right"
                  onClick={() => scrollToSection('features')}
                >
                  Lihat Fitur
                </Button>
              </div>

              <p className="mt-4 text-xs text-slate-600">
                Windows 10/11 64-bit · v{LANDING_CONFIG.downloads.windows.version} · {LANDING_CONFIG.downloads.windows.fileSize}
              </p>
            </motion.div>

            {/* Right — Demo Window */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:flex flex-col gap-4"
            >
              {/* Step indicators */}
              <div className="flex items-center gap-1">
                {STEP_LABELS.map((s, i) => (
                  <React.Fragment key={i}>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all duration-400 ${
                      i === currentStep
                        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                        : i < currentStep
                        ? 'text-slate-500 bg-slate-800/50'
                        : 'text-slate-600'
                    }`}>
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        i < currentStep ? 'bg-indigo-600 text-white' : i === currentStep ? 'bg-indigo-600/50 text-indigo-300' : 'bg-slate-700 text-slate-500'
                      }`}>{i < currentStep ? '✓' : i + 1}</span>
                      <span>{s.label}</span>
                    </div>
                    {i < 2 && <div className={`flex-1 h-px ${i < currentStep ? 'bg-indigo-600/50' : 'bg-slate-700'}`} />}
                  </React.Fragment>
                ))}
              </div>

              <AppDemoWindow
                step={currentStep}
                progress={typingProgress}
                className="h-80"
              />

              <p className="text-xs text-slate-600 text-center">
                {STEP_LABELS[currentStep].desc} · Scroll untuk melihat selengkapnya
              </p>
            </motion.div>

          </div>
        </div>

        {/* Mobile demo (simplified) */}
        <div className="lg:hidden px-6 pb-8">
          <AppDemoWindow step={0} progress={0} className="h-56" />
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-600">
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
