import React from 'react';
import AnimatedSection from '../shared/AnimatedSection';
import { LANDING_CONFIG } from '../../config/landing.config';

export default function BenefitsSection() {
  return (
    <section
      aria-label="Manfaat"
      className="py-20 md:py-28"
      style={{ background: 'linear-gradient(160deg, #020617 0%, #0f172a 60%, #1e1b4b 100%)' }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Heading */}
        <AnimatedSection animation="fade-up" className="text-center mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3">Untuk Siapa</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Kenapa Menggunakan VSNotes?
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Siapapun yang belajar dari video akan merasakan manfaatnya — tidak perlu pause, tidak perlu scroll kembali.
          </p>
        </AnimatedSection>

        {/* Benefit cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {LANDING_CONFIG.benefits.map((benefit, i) => (
            <AnimatedSection
              key={benefit.id}
              animation="fade-up"
              delay={i * 0.08}
              className="flex flex-col gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-indigo-500/30 transition-all duration-200"
            >
              <span className="text-4xl">{benefit.emoji}</span>
              <h3 className="font-semibold text-white">{benefit.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{benefit.description}</p>
            </AnimatedSection>
          ))}
        </div>

        {/* Highlight stat strip */}
        <AnimatedSection animation="fade-up" delay={0.35} className="mt-16 grid grid-cols-3 gap-6 text-center">
          {[
            { value: '100%', label: 'Otomatis' },
            { value: '3 format', label: 'Export PDF, MD, TXT' },
            { value: 'Offline', label: 'Sync saat online' },
          ].map((stat) => (
            <div key={stat.value} className="py-5 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.label}</p>
            </div>
          ))}
        </AnimatedSection>
      </div>
    </section>
  );
}
