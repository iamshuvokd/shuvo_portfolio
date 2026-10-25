import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EASE_OUT } from '@/lib/motion';
import { useContent } from '@/hooks/use-content';
import { useProfilePhoto } from '@/hooks/use-profile-photo';
import { navLinks } from '@/data/navigation';

const Header = () => {
  const { content } = useContent();
  const photo = useProfilePhoto('sm');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('#home');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Highlight the section crossing the middle band of the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(`#${entry.target.id}`);
        });
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    navLinks.forEach((link) => {
      const el = document.querySelector(link.href);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Close the mobile menu on Escape.
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setIsMobileMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileMenuOpen]);

  const scrollToSection = (href: string) => {
    setIsMobileMenuOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: EASE_OUT }}
      className="fixed left-0 right-0 top-0 z-50 px-3 pt-3"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex h-16 items-center justify-between rounded-xl border px-4 transition-all duration-500 sm:h-[4.5rem] ${
            isScrolled
              ? 'border-border/80 bg-background/85 shadow-2xl shadow-black/20 backdrop-blur-xl'
              : 'border-transparent bg-background/25 backdrop-blur-sm'
          }`}
        >
          <a
            href="#home"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection('#home');
            }}
            className="flex min-w-0 max-w-[15rem] items-center gap-3 text-base font-semibold text-foreground transition-colors hover:text-primary sm:max-w-xs sm:text-lg"
          >
            <img
              src={photo}
              alt="" // decorative: the name is printed right beside it
              className="h-9 w-9 shrink-0 rounded-lg border border-primary/20 object-cover"
            />
            <span className="truncate">{content.profile.name}</span>
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {navLinks.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <button
                  key={link.name}
                  onClick={() => scrollToSection(link.href)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-md bg-secondary/80 ring-1 ring-primary/20"
                    />
                  )}
                  <span className="relative">{link.name}</span>
                </button>
              );
            })}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <Button size="sm" className="rounded-lg" onClick={() => scrollToSection('#contact')}>
              Hire Me
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isMobileMenuOpen ? 'close' : 'open'}
                initial={{ rotate: -90, opacity: 0, filter: 'blur(4px)' }}
                animate={{ rotate: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={{ rotate: 90, opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.18 }}
                className="flex"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.nav
              aria-label="Mobile"
              initial={{ opacity: 0, y: -12, filter: 'blur(12px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
              exit={{ opacity: 0, y: -8, filter: 'blur(8px)' }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
              className="mt-2 rounded-xl border border-border/80 bg-background/95 p-2 shadow-xl backdrop-blur-xl md:hidden"
            >
              {navLinks.map((link, index) => (
                <motion.button
                  key={link.name}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.04 * index, ease: EASE_OUT }}
                  onClick={() => scrollToSection(link.href)}
                  className={`block w-full rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-secondary/70 hover:text-foreground ${
                    activeSection === link.href ? 'bg-secondary/60 text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {link.name}
                </motion.button>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};

export default Header;
