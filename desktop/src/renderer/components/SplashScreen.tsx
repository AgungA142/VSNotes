import React from 'react';

interface SplashScreenProps {
  isLeaving?: boolean;
}

const SPLASH_CSS = `

  @keyframes orb-a {
    0%,100% { transform: translate(0,0) scale(1); }
    40%      { transform: translate(48px,-32px) scale(1.08); }
    70%      { transform: translate(-16px,24px) scale(0.94); }
  }
  @keyframes orb-b {
    0%,100% { transform: translate(0,0) scale(1); }
    35%     { transform: translate(-36px,28px) scale(1.06); }
    65%     { transform: translate(24px,-18px) scale(0.96); }
  }
  @keyframes orb-c {
    0%,100% { transform: translate(0,0) scale(1); }
    50%     { transform: translate(28px,36px) scale(1.04); }
  }
  @keyframes reveal {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes ring-out {
    0%   { transform:scale(1);   opacity:0.5; }
    100% { transform:scale(1.7); opacity:0; }
  }
  @keyframes wave-bar {
    0%,100% { transform:scaleY(0.25); }
    50%     { transform:scaleY(1); }
  }
  @keyframes shimmer-badge {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }

  .spl-orb-a { animation: orb-a  9s ease-in-out infinite; }
  .spl-orb-b { animation: orb-b 11s ease-in-out infinite; animation-delay:-4s; }
  .spl-orb-c { animation: orb-c 13s ease-in-out infinite; animation-delay:-7s; }

  .spl-logo    { animation: reveal .7s cubic-bezier(.22,1,.36,1) .2s both; }
  .spl-title   { animation: reveal .7s cubic-bezier(.22,1,.36,1) .38s both; }
  .spl-tagline { animation: reveal .7s cubic-bezier(.22,1,.36,1) .52s both; }
  .spl-loader  { animation: reveal .7s cubic-bezier(.22,1,.36,1) .68s both; }
  .spl-version { animation: reveal .7s cubic-bezier(.22,1,.36,1) .8s  both; }

  .spl-ring { animation: ring-out 2.4s ease-out infinite; }
  .spl-ring:nth-child(2) { animation-delay:.8s; }

  .spl-wave { animation: wave-bar 1.1s ease-in-out infinite; transform-origin: bottom; }
  .spl-wave:nth-child(1) { animation-delay:0s;    }
  .spl-wave:nth-child(2) { animation-delay:.09s;  }
  .spl-wave:nth-child(3) { animation-delay:.18s;  }
  .spl-wave:nth-child(4) { animation-delay:.27s;  }
  .spl-wave:nth-child(5) { animation-delay:.18s;  }
  .spl-wave:nth-child(6) { animation-delay:.09s;  }
  .spl-wave:nth-child(7) { animation-delay:0s;    }

  @keyframes spl-exit {
    from { opacity: 1;  transform: scale(1); }
    to   { opacity: 0;  transform: scale(1.04); }
  }
  .spl-exit-anim {
    animation: spl-exit 0.55s cubic-bezier(.4,0,.6,1) forwards;
    pointer-events: none;
  }

  .spl-badge {
    background: linear-gradient(90deg,
      rgba(99,102,241,.12) 0%,
      rgba(139,92,246,.28) 40%,
      rgba(99,102,241,.12) 80%
    );
    background-size: 200% 100%;
    animation: shimmer-badge 2.8s linear infinite;
  }

  .font-syne { font-family: 'Segoe UI Variable Display', 'Segoe UI', ui-sans-serif, system-ui, sans-serif; }
  .font-dm   { font-family: 'Segoe UI Variable Text', 'Segoe UI', ui-sans-serif, system-ui, sans-serif; }
`;

export function SplashScreen({ isLeaving = false }: SplashScreenProps) {
  return (
    <>
      <style>{SPLASH_CSS}</style>

      <div
        className={`relative min-h-screen flex flex-col items-center justify-center overflow-hidden select-none${isLeaving ? ' spl-exit-anim' : ''}`}
        style={{ background: '#080c16' }}
      >
        {/* ── Gradient orbs ───────────────────────────────── */}
        <div
          className="spl-orb-a absolute pointer-events-none"
          style={{
            top: '-18%', left: '-12%',
            width: 680, height: 680,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,.22) 0%, transparent 70%)',
            filter: 'blur(48px)',
          }}
        />
        <div
          className="spl-orb-b absolute pointer-events-none"
          style={{
            bottom: '-22%', right: '-14%',
            width: 580, height: 580,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,.18) 0%, transparent 70%)',
            filter: 'blur(56px)',
          }}
        />
        <div
          className="spl-orb-c absolute pointer-events-none"
          style={{
            top: '55%', left: '58%',
            width: 400, height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,.12) 0%, transparent 70%)',
            filter: 'blur(48px)',
          }}
        />

        {/* ── Dot grid ────────────────────────────────────── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(99,102,241,.18) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)',
          }}
        />

        {/* ── Logo icon ───────────────────────────────────── */}
        <div className="spl-logo relative mb-9">
          {/* Pulse rings */}
          <div
            className="spl-ring absolute inset-0 rounded-[28px] border border-indigo-500/40 pointer-events-none"
            style={{ margin: '-12px' }}
          />
          <div
            className="spl-ring absolute inset-0 rounded-[28px] border border-violet-500/30 pointer-events-none"
            style={{ margin: '-12px' }}
          />

          {/* Icon box */}
          <div
            className="relative flex items-center justify-center"
            style={{
              width: 88, height: 88,
              borderRadius: 26,
              background: 'linear-gradient(145deg, #4338ca 0%, #6d28d9 60%, #5b21b6 100%)',
              boxShadow: '0 0 0 1px rgba(255,255,255,.08) inset, 0 0 72px rgba(99,102,241,.45), 0 16px 40px rgba(0,0,0,.5)',
            }}
          >
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Film-frame rect */}
              <rect x="3" y="10" width="46" height="30" rx="4" stroke="white" strokeWidth="1.5" strokeOpacity=".25" fill="none"/>

              {/* Left sprockets */}
              <rect x="5.5" y="13"  width="3.5" height="3.5" rx="1" fill="white" fillOpacity=".25"/>
              <rect x="5.5" y="19"  width="3.5" height="3.5" rx="1" fill="white" fillOpacity=".25"/>
              <rect x="5.5" y="25"  width="3.5" height="3.5" rx="1" fill="white" fillOpacity=".25"/>
              <rect x="5.5" y="31"  width="3.5" height="3.5" rx="1" fill="white" fillOpacity=".25"/>

              {/* Right sprockets */}
              <rect x="43" y="13"  width="3.5" height="3.5" rx="1" fill="white" fillOpacity=".25"/>
              <rect x="43" y="19"  width="3.5" height="3.5" rx="1" fill="white" fillOpacity=".25"/>
              <rect x="43" y="25"  width="3.5" height="3.5" rx="1" fill="white" fillOpacity=".25"/>
              <rect x="43" y="31"  width="3.5" height="3.5" rx="1" fill="white" fillOpacity=".25"/>

              {/* Play triangle */}
              <path
                d="M21 17.5L33 25L21 32.5V17.5Z"
                fill="white"
                fillOpacity=".95"
                style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,.6))' }}
              />

              {/* AI sparkle — top-right */}
              <g opacity=".85">
                <circle cx="40.5" cy="9.5" r="2" fill="#a5b4fc"/>
                <line x1="40.5" y1="5.5"  x2="40.5" y2="7.5"  stroke="#a5b4fc" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="40.5" y1="11.5" x2="40.5" y2="13.5" stroke="#a5b4fc" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="36.5" y1="9.5"  x2="38.5" y2="9.5"  stroke="#a5b4fc" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="42.5" y1="9.5"  x2="44.5" y2="9.5"  stroke="#a5b4fc" strokeWidth="1.3" strokeLinecap="round"/>
              </g>

              {/* Notes lines — below frame */}
              <line x1="14" y1="44" x2="38" y2="44" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity=".45"/>
              <line x1="14" y1="48" x2="28" y2="48" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity=".25"/>
            </svg>
          </div>
        </div>

        {/* ── App name ─────────────────────────────────────── */}
        <div className="spl-title text-center mb-3">
          <h1
            className="font-syne text-[2.6rem] font-bold leading-none tracking-tight"
            style={{ color: '#f1f5f9' }}
          >
            Video{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #818cf8, #a78bfa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Summary
            </span>
          </h1>

          {/* Badge chip */}
          <div className="flex justify-center mt-3">
            <span
              className="spl-badge font-dm text-[10px] font-medium tracking-[0.22em] uppercase px-3 py-1 rounded-full border border-indigo-500/20"
              style={{ color: '#818cf8' }}
            >
              Auto&nbsp;Notes&nbsp;·&nbsp;AI&nbsp;Powered
            </span>
          </div>
        </div>

        {/* ── Tagline ──────────────────────────────────────── */}
        <p
          className="spl-tagline font-dm text-sm font-light tracking-wide text-center mb-14"
          style={{ color: '#64748b', maxWidth: 280 }}
        >
          Catatan otomatis dari video yang&nbsp;Anda&nbsp;tonton
        </p>

        {/* ── Waveform loader ──────────────────────────────── */}
        <div className="spl-loader flex items-end gap-[5px]" style={{ height: 28 }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="spl-wave rounded-full"
              style={{
                width: 3,
                height: 28,
                background: 'linear-gradient(to top, #6366f1, #a78bfa)',
                opacity: 0.75,
              }}
            />
          ))}
        </div>

        {/* ── Memuat teks ──────────────────────────────────── */}
        <p
          className="spl-loader font-dm text-[11px] tracking-[0.18em] uppercase mt-4"
          style={{ color: '#334155', animationDelay: '.74s' }}
        >
          Memuat aplikasi…
        </p>

        {/* ── Version ──────────────────────────────────────── */}
        <div
          className="spl-version absolute bottom-7 font-dm text-[10px] tracking-widest"
          style={{ color: '#1e293b' }}
        >
          v1.0.0
        </div>
      </div>
    </>
  );
}
