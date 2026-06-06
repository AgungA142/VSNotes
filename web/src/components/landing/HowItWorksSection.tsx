import React from 'react';
import { Download, Play, Eye } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import AnimatedSection from '../shared/AnimatedSection';
import { LANDING_CONFIG } from '../../config/landing.config';

const ICON_MAP: Record<string, LucideIcon> = { Download, Play, Eye };

export default function HowItWorksSection() {
  return (
    <section
      id="cara-menggunakan"
      aria-label="Cara Menggunakan"
      className="py-20 md:py-28 bg-slate-50"
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        {/* Heading */}
        <AnimatedSection animation="fade-up" className="text-center mb-16">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-brand-600 mb-3">Cara Kerja</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Mulai dalam 3 Langkah
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Tidak perlu konfigurasi rumit — install, buka, dan tonton video Anda.
          </p>
        </AnimatedSection>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-10 left-1/2 -translate-x-1/2 w-[calc(100%-120px)] h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent" />

          <div className="grid md:grid-cols-3 gap-8 md:gap-6">
            {LANDING_CONFIG.steps.map((step, i) => {
              const Icon = ICON_MAP[step.icon] ?? Download;
              return (
                <AnimatedSection
                  key={step.number}
                  animation="fade-up"
                  delay={i * 0.12}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Number + icon */}
                  <div className="relative mb-5">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-700/20"
                      style={{ background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)' }}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border-2 border-brand-600 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-brand-700">{step.number}</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-xs">{step.description}</p>
                </AnimatedSection>
              );
            })}
          </div>
        </div>

        {/* Requirements */}
        <AnimatedSection
          animation="fade-up"
          delay={0.4}
          className="mt-16 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm"
        >
          <h3 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">
            Persyaratan Sistem
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'OS', value: LANDING_CONFIG.requirements.os },
              { label: 'RAM', value: LANDING_CONFIG.requirements.ram },
              { label: 'Storage', value: LANDING_CONFIG.requirements.storage },
              { label: 'Permission', value: LANDING_CONFIG.requirements.permissions },
            ].map((req) => (
              <div key={req.label} className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">{req.label}</span>
                <span className="text-sm text-slate-700 font-medium">{req.value}</span>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
