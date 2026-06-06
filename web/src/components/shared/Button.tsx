import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  as?: 'button' | 'a';
  href?: string;
}

const variants = {
  primary:
    'bg-brand-gradient text-white shadow-lg shadow-brand-700/30 hover:shadow-brand-700/50 focus-visible:ring-brand-500',
  secondary:
    'border-2 border-brand-600 text-brand-700 hover:bg-brand-50 focus-visible:ring-brand-500',
  ghost:
    'text-brand-700 hover:bg-brand-50 focus-visible:ring-brand-500',
};

const sizes = {
  sm: 'text-sm px-4 py-2 min-h-[36px]',
  md: 'text-base px-6 py-3 min-h-[44px]',
  lg: 'text-lg px-8 py-4 min-h-[52px]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  children,
  disabled,
  as: Tag = 'button',
  href,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const cls = [base, variants[variant], sizes[size], className].join(' ');

  const content = (
    <>
      {loading ? (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      ) : null}
      {children}
      {!loading && Icon && iconPosition === 'right' ? (
        <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      ) : null}
    </>
  );

  if (Tag === 'a' && href) {
    return (
      <motion.a
        href={href}
        className={cls}
        whileHover={{ scale: disabled ? 1 : 1.03 }}
        whileTap={{ scale: disabled ? 1 : 0.97 }}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      className={cls}
      disabled={disabled || loading}
      whileHover={{ scale: disabled || loading ? 1 : 1.03 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      {...(rest as React.ComponentPropsWithoutRef<typeof motion.button>)}
    >
      {content}
    </motion.button>
  );
}
