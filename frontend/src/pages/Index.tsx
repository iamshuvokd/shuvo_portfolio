import Header from '@/components/layout/Header';
import Hero from '@/components/sections/Hero';
import About from '@/components/sections/About';
import Experience from '@/components/sections/Experience';
import Projects from '@/components/sections/Projects';
import Skills from '@/components/sections/Skills';
import Contact from '@/components/sections/Contact';
import Footer from '@/components/layout/Footer';
import AnimatedBackground from '@/components/effects/AnimatedBackground';
import ScrollProgress from '@/components/effects/ScrollProgress';
import { MotionConfig } from 'framer-motion';
import ErrorBoundary from '@/components/common/ErrorBoundary';

const Index = () => {
  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen relative">
      <a
        href="#main-content"
        className="sr-only z-[70] rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <AnimatedBackground />
      <div className="relative z-10">
        <ErrorBoundary name="header"><Header /></ErrorBoundary>
        <main id="main-content" tabIndex={-1} className="outline-none">
          <ErrorBoundary name="hero"><Hero /></ErrorBoundary>
          <ErrorBoundary name="about"><About /></ErrorBoundary>
          <ErrorBoundary name="experience"><Experience /></ErrorBoundary>
          <ErrorBoundary name="projects"><Projects /></ErrorBoundary>
          <ErrorBoundary name="skills"><Skills /></ErrorBoundary>
          <ErrorBoundary name="contact"><Contact /></ErrorBoundary>
        </main>
        <ErrorBoundary name="footer"><Footer /></ErrorBoundary>
      </div>
    </div>
    </MotionConfig>
  );
};

export default Index;
