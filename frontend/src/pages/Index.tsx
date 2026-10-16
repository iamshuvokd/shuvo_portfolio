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

const Index = () => {
  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen relative">
      <ScrollProgress />
      <AnimatedBackground />
      <div className="relative z-10">
        <Header />
        <main>
          <Hero />
          <About />
          <Experience />
          <Projects />
          <Skills />
          <Contact />
        </main>
        <Footer />
      </div>
    </div>
    </MotionConfig>
  );
};

export default Index;
