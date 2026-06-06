import { useRef } from 'react';
import { useInView } from 'framer-motion';

interface UseScrollAnimationOptions {
  threshold?: number;
  triggerOnce?: boolean;
}

export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const { threshold = 0.2, triggerOnce = true } = options;
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: triggerOnce, amount: threshold });
  return { ref, isInView };
}
