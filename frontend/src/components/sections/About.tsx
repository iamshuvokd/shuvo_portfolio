import { motion } from 'framer-motion';
import Reveal from '@/components/common/Reveal';
import { BadgeCheck, MapPin } from 'lucide-react';
import { useContent } from '@/hooks/use-content';
import { useProfilePhoto } from '@/hooks/use-profile-photo';
import { getIcon } from '@/lib/icons';

const About = () => {
  const { content } = useContent();
  const { about, profile } = content;
  const photo = useProfilePhoto('md');
  return (
    <section id="about" className="relative overflow-hidden px-4 py-12 sm:px-6 md:py-14 lg:px-8">
      <div className="hero-grid absolute inset-0 opacity-10" />
      <div className="absolute right-0 top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <Reveal className="rounded-lg border border-border/75 bg-card/45 p-5 shadow-2xl shadow-black/15 backdrop-blur-xl sm:p-7">
          <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_310px] md:items-center">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">About Me</p>
              <h2 className="max-w-4xl text-3xl font-semibold leading-tight text-foreground sm:text-4xl lg:text-[42px]">
                {about.heading}
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                {about.paragraph}
              </p>

              <div className="mt-6 grid max-w-3xl gap-4 border-t border-border/70 pt-5 sm:grid-cols-3">
                {about.quickFacts.map((item) => (
                  <div key={item.label} className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-1 break-words font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-lg border border-border/75 bg-background/55 p-5 text-center md:self-stretch">
              <div>
                <img
                  src={photo}
                  alt={`${profile.name} - ${profile.role}`}
                  className="mx-auto h-28 w-28 rounded-full border-2 border-primary/30 object-cover object-center shadow-[0_0_28px_hsl(var(--primary)/0.16)]"
                />
                <div className="mt-4 min-w-0">
                  <div className="mb-3 flex flex-wrap justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/55 px-2.5 py-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {profile.location}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{profile.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-primary">{profile.role}</p>
                </div>
              </div>
              <p className="mx-auto mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
                {about.cardSummary}
              </p>
            </aside>
          </div>
        </Reveal>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {about.focusAreas.map((item, index) => {
            const Icon = getIcon(item.icon);
            return (
              <Reveal key={item.title} delay={index * 0.09} y={22}>
              <motion.div
                whileHover={{ y: -5 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="flex h-full gap-3 rounded-lg border border-border/70 bg-card/35 p-4 backdrop-blur-xl transition duration-300 hover:border-primary/35 hover:bg-card/60"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </div>
              </motion.div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default About;
