import { useState, type FormEvent } from 'react';
import Reveal from '@/components/common/Reveal';
import { Mail, MapPin, MessageSquare, Phone, Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { sendContactMessage } from '@/services';
import { useContent } from '@/hooks/use-content';

const Contact = () => {
  const { content } = useContent();
  const { profile } = content;
  const contactMethods = [
    { icon: Mail, label: 'Email', value: profile.email, href: `mailto:${profile.email}` },
    { icon: Phone, label: 'Phone', value: profile.phone, href: `tel:${profile.phone.replace(/\s+/g, '')}` },
    { icon: MapPin, label: 'Location', value: profile.location, href: undefined as string | undefined },
  ];
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please fill in your name, email, and message.',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await sendContactMessage({
        name: formData.name.trim(),
        email: formData.email.trim(),
        message: formData.message.trim(),
      });

      toast({
        title: 'Message sent successfully',
        description: "Thank you for reaching out. I'll get back to you soon.",
      });
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Message failed',
        description: 'Please try again later or email me directly.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-secondary/20 px-4 py-12 sm:px-6 md:py-16 lg:px-8"
    >
      <div className="hero-grid absolute inset-0 opacity-10" />
      <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start xl:grid-cols-[400px_minmax(0,1fr)]">
          <Reveal className="rounded-lg border border-border/75 bg-card/45 p-5 shadow-2xl shadow-black/15 backdrop-blur-xl sm:p-6 lg:sticky lg:top-28">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Get in Touch</p>
            <h2 className="text-3xl font-semibold leading-tight text-foreground xl:text-4xl">
              Let&apos;s build something useful.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
              Share your project goal, workflow problem, or product idea. I can help shape a clear technical path for
              AI, automation, analytics, and scalable web applications.
            </p>

            <div className="mt-5 grid gap-2.5">
              {contactMethods.map((method, index) => {
                const Icon = method.icon;
                const content = (
                  <>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {method.label}
                      </span>
                      <span className="mt-1 block break-words text-sm font-semibold text-foreground">
                        {method.value}
                      </span>
                    </span>
                  </>
                );

                if (method.href) {
                  return (
                    <Reveal key={method.label} delay={0.1 + index * 0.07} y={16}>
                      <a
                        href={method.href}
                        className="flex items-center gap-3 rounded-lg border border-border/75 bg-background/45 p-3 transition duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card/65"
                      >
                        {content}
                      </a>
                    </Reveal>
                  );
                }

                return (
                  <Reveal
                    key={method.label}
                    delay={0.1 + index * 0.07}
                    y={16}
                    className="flex items-center gap-3 rounded-lg border border-border/75 bg-background/45 p-3"
                  >
                    {content}
                  </Reveal>
                );
              })}
            </div>

            <p className="mt-5 border-t border-border/70 pt-4 text-sm leading-6 text-muted-foreground">
              Best for AI products, workflow automation, dashboards, and full-stack product engineering.
            </p>
          </Reveal>

          <Reveal
            delay={0.12}
            className="relative overflow-hidden rounded-lg border border-border/80 bg-card/60 p-5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-6"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
            <div className="mb-5 border-b border-border/70 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Project Inquiry</p>
                <h3 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">Start a conversation</h3>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="group block">
                  <span className="mb-2 block text-sm font-semibold text-muted-foreground">Name</span>
                  <span className="relative block">
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition group-focus-within:text-primary" />
                    <Input
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                      className="h-11 rounded-lg border-border/80 bg-background/60 pl-11 text-foreground placeholder:text-muted-foreground/70 focus:border-primary"
                      required
                    />
                  </span>
                </label>

                <label className="group block">
                  <span className="mb-2 block text-sm font-semibold text-muted-foreground">Email</span>
                  <span className="relative block">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition group-focus-within:text-primary" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                      className="h-11 rounded-lg border-border/80 bg-background/60 pl-11 text-foreground placeholder:text-muted-foreground/70 focus:border-primary"
                      required
                    />
                  </span>
                </label>
              </div>

              <label className="group block">
                <span className="mb-2 block text-sm font-semibold text-muted-foreground">Message</span>
                <span className="relative block">
                  <MessageSquare className="absolute left-4 top-4 h-4 w-4 text-muted-foreground transition group-focus-within:text-primary" />
                  <Textarea
                    placeholder="Tell me about your project, timeline, or problem to solve."
                    value={formData.message}
                    onChange={(event) => setFormData({ ...formData, message: event.target.value })}
                    className="min-h-[122px] resize-none rounded-lg border-border/80 bg-background/60 pl-11 pt-3 text-foreground placeholder:text-muted-foreground/70 focus:border-primary"
                    required
                  />
                </span>
              </label>

              <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="h-11 rounded-lg px-6 font-semibold text-primary-foreground"
                >
                  <Send className="mr-2 h-5 w-5" />
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default Contact;
