import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight } from 'lucide-react';
import Button from '../shared/Button';

export default function EmailNotifyForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  function validate(value: string) {
    if (!value) return 'Email tidak boleh kosong';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Format email tidak valid';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(email);
    if (err) { setError(err); return; }
    setError('');
    setStatus('loading');
    // Placeholder — log only until backend endpoint is ready
    await new Promise((r) => setTimeout(r, 800));
    console.info('[EmailNotify] Registered:', email);
    setStatus('success');
  }

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 py-6 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="text-white font-semibold">Terima kasih!</p>
        <p className="text-slate-400 text-sm">Kami akan menghubungi <span className="text-indigo-400">{email}</span> saat versi macOS tersedia.</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
            placeholder="email@contoh.com"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/60 focus:bg-white/15 transition-colors min-h-[44px]"
            aria-label="Alamat email"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={status === 'loading'}
          icon={ArrowRight}
          iconPosition="right"
        >
          Beritahu Saya
        </Button>
      </div>
      {error && (
        <p className="text-red-400 text-xs pl-1">{error}</p>
      )}
    </form>
  );
}
