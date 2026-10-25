import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, Clock3, Facebook, Github, Linkedin, Mail, MapPin, Phone, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useContent } from '@/hooks/use-content';
import Reveal from '@/components/common/Reveal';
import { quickLinks } from '@/data/navigation';
import { safeTimeZone } from '@/lib/timezone';

const Footer = () => {
  const { content } = useContent();
  const { profile } = content;
  const socialLinks = [
    { icon: Github, label: 'GitHub', href: profile.social.github },
    { icon: Linkedin, label: 'LinkedIn', href: profile.social.linkedin },
    { icon: Facebook, label: 'Facebook', href: profile.social.facebook },
    { icon: Mail, label: 'Email', href: `mailto:${profile.email}` },
  ].filter((link) => link.href);
  const currentYear = new Date().getFullYear();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const timeZone = safeTimeZone(profile.timeZone);

  const localTime = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(now),
    [now, timeZone],
  );

  const localDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        month: 'short',
        day: '2-digit',
      }).format(now),
    [now, timeZone],
  );

  const scrollTo = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="relative overflow-hidden border-t border-border/70 bg-card/95 px-4 py-12 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/6 to-transparent" />
      <motion.div
        className="absolute left-1/2 top-0 h-px w-full max-w-6xl -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/60 to-transparent"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="container relative z-10 mx-auto max-w-7xl">
        <Reveal className="grid items-start gap-8 md:grid-cols-2 lg:grid-cols-[1.35fr_0.65fr_0.85fr_1fr] lg:gap-10">
          <section className="relative max-w-xl overflow-hidden rounded-2xl border border-border/70 bg-background/35 p-6 shadow-2xl shadow-black/10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/80 via-accent/60 to-transparent" />
            <div className="flex items-start gap-4">
              <button
                onClick={() => scrollTo('#home')}
                className="group flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-transform hover:-translate-y-1"
                aria-label="Back to home"
              >
                <Sparkles className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <button onClick={() => scrollTo('#home')} className="group text-left" aria-label="Back to home">
                  <span className="block text-2xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {profile.name}
                  </span>
                  <span className="mt-1 block text-sm font-medium text-primary">
                    {profile.headline}
                  </span>
                </button>
                <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">
                  Building AI products, automation systems, analytics workflows, and scalable software for teams that need clarity and speed.
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {socialLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                    rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                    aria-label={link.label}
                    className="group flex items-center gap-2 rounded-lg border border-border/80 bg-card/55 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary hover:text-primary-foreground"
                    whileHover={{ y: -3, rotate: index % 2 === 0 ? -3 : 3 }}
                    whileTap={{ scale: 0.94 }}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{link.label}</span>
                  </motion.a>
                );
              })}
            </div>
          </section>

          <nav aria-label="Footer navigation" className="rounded-2xl border border-border/70 bg-background/30 p-6">
            <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Explore</h3>
            <div className="mt-5 grid gap-2">
              {quickLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="group flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
                >
                  <span>{link.label}</span>
                  <ArrowUp className="h-3.5 w-3.5 rotate-45 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </nav>

          <section className="flex min-h-[220px] flex-col justify-between rounded-xl border border-border/70 bg-background/40 p-6 shadow-xl shadow-black/5 sm:p-7 lg:min-h-0 lg:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <Clock3 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Local Time</h3>
                <p className="mt-1 text-sm text-muted-foreground">{profile.location}</p>
              </div>
            </div>

            <div className="mt-8 lg:mt-5">
              <p className="font-mono text-3xl font-semibold leading-none text-foreground tabular-nums lg:text-2xl">
                {localTime}
              </p>
              <p className="mt-3 text-base text-muted-foreground lg:text-sm">{localDate}</p>
            </div>
          </section>

          <section className="min-h-[220px] rounded-xl border border-border/70 bg-background/40 p-6 shadow-xl shadow-black/5 sm:p-7 lg:min-h-0 lg:p-6">
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  Available
                </div>

                <p className="mt-5 text-xl font-semibold leading-tight text-foreground lg:text-base">Open for select projects</p>
                <p className="mt-3 max-w-md text-base leading-7 text-muted-foreground lg:text-sm lg:leading-6">
                  AI, automation, analytics, and full-stack product development.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 text-base text-muted-foreground lg:text-sm">
              <a href={`mailto:${profile.email}`} className="flex items-center gap-3 transition-colors hover:text-primary">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="break-all">{profile.email}</span>
              </a>
              <a href={`tel:${profile.phone}`} className="flex items-center gap-3 transition-colors hover:text-primary">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>{profile.phone}</span>
              </a>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>{profile.location}</span>
              </div>
            </div>
          </section>
        </Reveal>

        <div className="mt-10 flex flex-col gap-4 border-t border-border/70 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>&copy; {currentYear} {profile.name}. All rights reserved.</p>
          <button
            onClick={() => scrollTo('#home')}
            className="group ml-auto inline-flex w-fit items-center gap-2 self-end rounded-md border border-border/80 bg-background/45 px-3 py-2 text-sm font-medium transition-colors hover:border-primary/50 hover:text-primary sm:self-auto"
          >
            Back to top
            <ArrowUp className="h-4 w-4 transition-transform group-hover:-translate-y-1" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
