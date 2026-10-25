import { ArrowUpRight, ExternalLink, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Reveal from '@/components/common/Reveal';
import { useContent } from '@/hooks/use-content';
import { assetUrl } from '@/config/env';
import { getIcon } from '@/lib/icons';

const Projects = () => {
  const { content } = useContent();
  const { items: projects, stats: projectStats } = content.projects;

  return (
    <section id="projects" className="relative overflow-hidden bg-secondary/20 px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <div className="absolute inset-0 hero-grid opacity-10" />
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/5 to-transparent" />

      <div className="container relative z-10 mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.45fr] lg:gap-14">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">{content.projects.eyebrow}</p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {content.projects.title}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              {content.projects.intro}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {projectStats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-border/70 bg-card/45 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project, index) => {
              const Icon = getIcon(project.icon);
              return (
                <Reveal key={project.title} delay={(index % 2) * 0.1} className={index === 0 ? 'sm:col-span-2' : ''}>
                <article className="group relative h-full overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-5 shadow-xl shadow-black/10 backdrop-blur-xl transition duration-500 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 sm:p-6">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                  {project.image && (
                    <img
                      src={assetUrl(project.image)}
                      alt={`${project.title} screenshot`}
                      loading="lazy"
                      className="-mx-1 -mt-1 mb-5 aspect-[16/9] w-[calc(100%+0.5rem)] rounded-xl border border-border/70 object-cover"
                    />
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-border/70 bg-background/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                      {project.category}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-semibold leading-tight text-foreground sm:text-2xl">
                    {project.title}
                  </h3>
                  <p className="mt-3 text-sm font-medium text-primary">{project.impact}</p>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{project.description}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {project.tech.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-md border border-border/70 bg-background/35 px-3 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {(project.github || project.demo) && (
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      {/* A button only exists when its link does, so an emptied link never leaves a dead button. */}
                      {project.github && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg border-border/80 bg-background/35 text-muted-foreground hover:border-primary/50 hover:text-primary"
                          onClick={() => window.open(assetUrl(project.github), '_blank', 'noopener,noreferrer')}
                        >
                          <Github className="h-4 w-4" />
                          Code
                        </Button>
                      )}
                      {project.demo && (
                        <Button
                          size="sm"
                          className="rounded-lg"
                          onClick={() => window.open(assetUrl(project.demo), '_blank', 'noopener,noreferrer')}
                        >
                          <ExternalLink className="h-4 w-4" />
                          View Project
                        </Button>
                      )}
                    </div>
                  )}

                  <ArrowUpRight className="absolute bottom-5 right-5 h-5 w-5 text-primary/30 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary" />
                </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Projects;
