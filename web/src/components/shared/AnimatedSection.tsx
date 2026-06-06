import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

interface AnimatedSectionProps {
  children: React.ReactNode;
  animation?: 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right';
  delay?: number;
  threshold?: number;
  className?: string;
  as?: React.ElementType;
}

const variants = {
  'fade-up': {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  'fade-in': {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  'slide-left': {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
  'slide-right': {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
  },
};

export default function AnimatedSection({
  children,
  animation = 'fade-up',
  delay = 0,
  threshold = 0.15,
  className = '',
  as: Tag = 'div',
}: AnimatedSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: threshold });
  const prefersReduced = useReducedMotion();

  const MotionTag = motion[Tag as keyof typeof motion] as typeof motion.div;

  return (
    <MotionTag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants[animation]}
      transition={{
        duration: prefersReduced ? 0 : 0.55,
        delay: prefersReduced ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </MotionTag>
  );
}
