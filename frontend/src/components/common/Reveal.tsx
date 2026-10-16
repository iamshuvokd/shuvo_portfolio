import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EASE_OUT } from '@/lib/motion';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  x?: number;
  blur?: number;
  duration?: number;
}

/**
 * Scroll-triggered speed-blur reveal. Each element animates on its own as it
 * enters the viewport (instead of the whole section waiting on one observer).
 * The filter is cleared once finished so `backdrop-blur` children and `sticky`
 * positioning keep working — a lingering `filter` creates a new containing block.
 */
const Reveal = ({ children, className, delay = 0, y = 28, x = 0, blur = 14, duration = 0.85 }: RevealProps) => {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, x, filter: `blur(${blur}px)` }}
      whileInView={{ opacity: 1, y: 0, x: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
};

export default Reveal;
