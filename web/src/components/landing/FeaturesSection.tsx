import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Eye, FileText, Sparkles, Bot, PenLine, FileDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LANDING_CONFIG } from '../../config/landing.config';

const ICON_MAP: Record<string, LucideIcon> = {
  Eye, FileText, Sparkles, Bot, PenLine, FileDown,
};

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
  isInView: boolean;
}

function FeatureCard({ icon: Icon, title, description, index, isInView }: FeatureCardProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay: prefersReduced ? 0 : index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={prefersReduced ? {} : { y: -6, boxShadow: '0 20px 40px rgba(67,56,202,.15)' }}
      className="group relative flex flex-col gap-4 p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-brand-200 transition-colors duration-200 cursor-default"
    >
      {/* Icon */}
      <div className="w-11 h-11 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
        <Icon className="w-5 h-5 text-brand-600" />
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      </div>

      {/* Subtle accent line on hover */}
      <div className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full bg-brand-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </motion.div>
  );
}

export default function FeaturesSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section
      id="features"
      ref={ref}
      aria-label="Fitur"
      className="py-20 md:py-28 bg-slate-50"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-brand-600 mb-3">Fitur</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Semua yang Anda Butuhkan
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Dari deteksi otomatis hingga ekspor — VSNotes menangani seluruh proses pencatatan video tanpa perlu konfigurasi rumit.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {LANDING_CONFIG.features.map((feature, i) => {
            const Icon = ICON_MAP[feature.icon] ?? Eye;
            return (
              <FeatureCard
                key={feature.id}
                icon={Icon}
                title={feature.title}
                description={feature.description}
                index={i}
                isInView={isInView}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
