import { Download, Hand, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TypeAnimation } from 'react-type-animation';
import { motion, useScroll, useTransform } from 'framer-motion';
import { lazy, Suspense, useRef } from 'react';
import { EASE_OUT } from '@/lib/motion';
import { assetUrl } from '@/config/env';
import { useContent } from '@/hooks/use-content';
import { useProfilePhoto } from '@/hooks/use-profile-photo';
// three.js is ~700 kB; load it after first paint so the hero text appears immediately.
const Scene3D = lazy(() => import('@/components/effects/Scene3D'));

const item = (delay: number) => ({
  initial: { opacity: 0, y: 26, filter: 'blur(14px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } },
  transition: { duration: 0.9, delay, ease: EASE_OUT },
});

const Hero = () => {
  const { content } = useContent();
  const { profile, hero } = content;
  const photo = useProfilePhoto();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const sceneY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const heroFade = useTransform(scrollYProgress, [0, 0.85], [1, 0.15]);

  return (
    <section
      id="home"
      ref={sectionRef}
      className="relative flex min-h-screen items-center overflow-hidden px-4 pb-14 pt-24 sm:px-6 lg:px-8"
    >
      <div className="absolute inset-0 hero-grid opacity-70" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background via-background/80 to-transparent" />
      <div className="container relative z-10 mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
          <motion.div style={{ y: textY, opacity: heroFade }} className="max-w-3xl">
            <motion.div {...item(0.05)} className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary shadow-[0_0_30px_hsl(var(--primary)/0.12)]">
              <Sparkles className="h-4 w-4" />
              {hero.badge}
            </motion.div>

            <motion.h1 {...item(0.15)} className="max-w-4xl text-5xl font-semibold leading-tight text-foreground sm:text-6xl lg:text-7xl">
              {hero.greeting} <span className="text-primary">{hero.firstName}</span>
              <motion.span
                className="ml-3 inline-flex align-middle text-primary"
                animate={{ rotate: [0, 14, -8, 12, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden="true"
              >
                <Hand className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14" />
              </motion.span>
            </motion.h1>

            <motion.div {...item(0.28)} className="mt-6 flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 text-2xl font-semibold text-foreground sm:text-3xl lg:text-4xl">
              <span>{hero.rolePrefix}</span>
              <TypeAnimation
                key={hero.roles.join('|')}
                sequence={hero.roles.flatMap((role, index) => [role, index === 0 ? 2200 : 1800])}
                wrapper="span"
                speed={50}
                className="text-primary font-bold"
                repeat={Infinity}
              />
            </motion.div>

            <motion.p {...item(0.4)} className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              {hero.tagline}
            </motion.p>

            <motion.div {...item(0.52)} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="group h-12 rounded-lg px-6 shadow-[0_18px_50px_hsl(var(--primary)/0.18)]"
                onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Mail className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
                {hero.primaryButton}
              </Button>

              <Button
                size="lg"
                variant="hero"
                className="group h-12 rounded-lg px-6"
                onClick={() => profile.cvUrl && window.open(assetUrl(profile.cvUrl), '_blank', 'noopener,noreferrer')}
              >
                <Download className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
                {hero.cvButton}
              </Button>
            </motion.div>

            <div className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {hero.metrics.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  {...item(0.64 + index * 0.09)}
                  whileHover={{ y: -4 }}
                  className="rounded-lg border border-border/70 bg-card/55 p-4 backdrop-blur-xl transition-colors duration-300 hover:border-primary/40"
                >
                  <p className="bg-gradient-to-br from-foreground to-primary bg-clip-text text-2xl font-semibold text-transparent">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{metric.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92, filter: 'blur(18px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
            transition={{ duration: 1.1, delay: 0.2, ease: EASE_OUT }}
            style={{ y: sceneY }}
            className="relative mx-auto h-[360px] w-full max-w-[560px] sm:h-[500px] lg:h-[620px]"
          >
            <div className="absolute inset-4 rounded-[2rem] border border-primary/15 bg-[radial-gradient(circle_at_50%_42%,hsl(var(--primary)/0.18),transparent_44%),linear-gradient(145deg,hsl(var(--card)/0.75),hsl(var(--background)/0.3))] shadow-2xl shadow-primary/10 backdrop-blur-xl" />
            <div className="absolute inset-0">
              <Suspense fallback={null}>
                <Scene3D imageSrc={photo} />
              </Suspense>
            </div>
            <div className="absolute bottom-6 left-1/2 w-[calc(100%-2rem)] -translate-x-1/2 overflow-hidden rounded-xl border border-border/80 bg-background/90 p-5 text-center shadow-2xl shadow-black/20 backdrop-blur-xl sm:bottom-8 sm:w-[22rem]">
              <div className="flex flex-col items-center">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-foreground">{profile.name}</p>
                  <p className="mt-2 text-sm font-semibold text-primary">{profile.role}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{hero.cardTagline}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
