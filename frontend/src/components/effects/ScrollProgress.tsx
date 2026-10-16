import { motion, useScroll, useSpring } from 'framer-motion';

/** Thin spring-smoothed reading-progress bar pinned to the top of the viewport. */
const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-primary via-primary to-accent shadow-[0_0_12px_hsl(var(--primary)/0.7)]"
    />
  );
};

export default ScrollProgress;
