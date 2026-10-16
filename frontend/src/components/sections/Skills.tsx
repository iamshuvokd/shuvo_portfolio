import { DatabaseZap, Layers3 } from 'lucide-react';
import Reveal from '@/components/common/Reveal';
import { useContent } from '@/hooks/use-content';
import { getIcon } from '@/lib/icons';

const Skills = () => {
  const { content } = useContent();
  const { groups: capabilityGroups, stack: technologyStack } = content.skills;

  return (
    <section id="skills" className="relative overflow-hidden px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <div className="absolute inset-0 hero-grid opacity-10" />
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/5 to-transparent" />

      <div className="container relative z-10 mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.45fr] lg:gap-14">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Technical Profile</p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Skills & Expertise
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              A cross-functional toolkit for building intelligent products, automating business workflows, and delivering reliable software systems.
            </p>

            <div className="mt-7 rounded-2xl border border-border/70 bg-card/50 p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Engineering Focus</p>
                  <p className="mt-1 text-xs text-muted-foreground">AI, automation, full-stack, analytics</p>
                </div>
              </div>
            </div>
          </Reveal>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {capabilityGroups.map((group, index) => {
                const Icon = getIcon(group.icon);
                return (
                  <Reveal key={group.title} delay={(index % 2) * 0.1}>
                  <article className="h-full rounded-2xl border border-border/70 bg-card/60 p-5 shadow-xl shadow-black/10 backdrop-blur-xl transition duration-500 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full border border-border/70 bg-background/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                        {group.level}
                      </span>
                    </div>

                    <h3 className="mt-5 text-xl font-semibold text-foreground">{group.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{group.summary}</p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {group.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md border border-border/70 bg-background/35 px-3 py-1 text-xs font-medium text-muted-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </article>
                  </Reveal>
                );
              })}
            </div>

            <Reveal className="rounded-2xl border border-border/70 bg-card/55 p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <DatabaseZap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Technology Stack</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Tools and platforms used across project delivery.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {technologyStack.map((stack) => (
                  <div key={stack.label} className="rounded-xl border border-border/60 bg-background/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{stack.label}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {stack.items.map((item) => (
                        <span key={item} className="text-sm text-muted-foreground">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Skills;
