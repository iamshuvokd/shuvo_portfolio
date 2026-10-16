import { ArrowUp, BriefcaseBusiness, Building2, CalendarDays, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import Reveal from '@/components/common/Reveal';
import { EASE_OUT } from '@/lib/motion';
import { useContent } from '@/hooks/use-content';

const Experience = () => {
  const { content } = useContent();
  const { items: experiences, highlights } = content.experience;

  return (
    <section id="experience" className="relative overflow-hidden px-4 py-14 sm:px-6 md:py-20 lg:px-8">
      <div className="absolute inset-0 hero-grid opacity-10" />
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/5 to-transparent" />

      <div className="container relative z-10 mx-auto max-w-7xl overflow-hidden">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.28fr] lg:gap-12">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Career Timeline</p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Professional Journey
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              A focused path through software engineering, business automation, AI systems, and data-driven product delivery.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {highlights.map((item) => (
                <div key={item.label} className="rounded-lg border border-border/70 bg-card/35 p-4 lg:border-l-primary/45">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 inline-flex max-w-full items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <ArrowUp className="h-4 w-4 flex-shrink-0" />
              <span className="min-w-0 whitespace-normal leading-5">Past experience building toward current role</span>
            </div>
          </Reveal>

          <div className="relative min-w-0">
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 1.4, ease: EASE_OUT }}
              style={{ originY: 0 }}
              className="absolute left-4 top-8 h-[calc(100%-4rem)] w-px bg-gradient-to-b from-primary via-primary/35 to-primary/0 sm:left-5"
            />

            <div className="space-y-4">
              {experiences.map((exp, index) => (
                <Reveal key={`${exp.period}-${exp.role}`} delay={index * 0.1} x={-20} y={20} className="relative min-w-0 pl-10 sm:pl-14">
                  <div
                    className={`absolute left-0 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-lg border bg-background shadow-lg shadow-black/10 sm:h-9 sm:w-9 ${
                      index === 0 ? 'border-primary/60 text-primary' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {index === 0 ? <Sparkles className="h-4 w-4" /> : <BriefcaseBusiness className="h-4 w-4" />}
                  </div>

                  <div
                    className={`group min-w-0 rounded-xl border p-4 shadow-xl shadow-black/10 backdrop-blur-xl transition duration-500 hover:-translate-y-1 sm:p-6 ${
                      index === 0
                        ? 'border-primary/35 bg-primary/[0.06]'
                        : 'border-border/70 bg-card/55 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {exp.period}
                          </span>
                          <span className="rounded-full border border-border/70 bg-background/45 px-3 py-1 text-xs font-medium text-muted-foreground">
                            {exp.status}
                          </span>
                        </div>

                        <h3 className="mt-4 break-words text-xl font-semibold leading-tight text-foreground sm:text-2xl">
                          {exp.role}
                        </h3>

                        <p className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                          <span className="inline-flex min-w-0 items-center gap-2 font-medium text-primary">
                            <Building2 className="h-4 w-4 flex-shrink-0" />
                            {exp.company}
                          </span>
                          <span className="hidden text-border sm:inline">|</span>
                          <span className="break-words">{exp.category}</span>
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 max-w-3xl break-words text-sm leading-7 text-muted-foreground">
                      {exp.summary}
                    </p>

                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Experience;
