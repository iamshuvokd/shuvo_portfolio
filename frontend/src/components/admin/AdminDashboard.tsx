import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, LogOut, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cleanContent, serializeContent } from '@/lib/clean-content';
import { ApiError } from '@/services/http';
import { adminApi } from '@/services/admin.service';
import type { SiteContent } from '@/types/content';
import { AboutEditor, ContactEditor, ExperienceEditor, HeroEditor, ProfileEditor, ProjectsEditor, SkillsEditor } from './editors';
import JsonPanel from './JsonPanel';
import MediaLibrary from './MediaLibrary';
import MessagesPanel from './MessagesPanel';

const tabs = [
  ['profile', 'Profile & CV'],
  ['hero', 'Hero'],
  ['about', 'About'],
  ['experience', 'Experience'],
  ['projects', 'Projects'],
  ['skills', 'Skills'],
  ['contact', 'Contact & Footer'],
  ['media', 'Media'],
  ['messages', 'Messages'],
  ['json', 'JSON'],
] as const;

const AdminDashboard = ({ onLogout, onSessionExpired }: { onLogout: () => void; onSessionExpired: () => void }) => {
  const { toast } = useToast();
  const [draft, setDraft] = useState<SiteContent | null>(null);
  const [savedJson, setSavedJson] = useState('');
  /** Revision of the content this draft is based on; sent with every save to detect conflicting edits. */
  const [revision, setRevision] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const handleError = useCallback(
    (error: unknown, title: string) => {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired(); // keep the draft; the page shows a sign-in overlay on top of it
        return;
      }
      toast({ title, description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    },
    [onSessionExpired, toast],
  );

  useEffect(() => {
    adminApi
      .getContent()
      .then(({ content, revision: loadedRevision }) => {
        setDraft(content);
        setRevision(loadedRevision);
        setSavedJson(serializeContent(content));
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) onLogout();
        else setLoadError(error instanceof TypeError ? 'Cannot reach the server. Is the backend running?' : error.message);
      });
  }, [onLogout]);

  const draftJson = useMemo(() => (draft ? serializeContent(draft) : ''), [draft]);
  const dirty = draft !== null && draftJson !== savedJson;

  const save = useCallback(async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const cleaned = cleanContent(draft);
      let result: { revision: number };
      try {
        result = await adminApi.saveContent(cleaned, revision);
      } catch (error) {
        // 409: someone else published after this editor was opened. Never overwrite silently.
        if (!(error instanceof ApiError && error.status === 409)) throw error;
        const overwrite = window.confirm(
          'The site content was changed by someone else (another tab or admin) after you opened this page.\n\n' +
            'OK = overwrite their changes with yours.\nCancel = keep editing (copy your work, then reload to see the latest).',
        );
        if (!overwrite) {
          toast({ title: 'Not saved', description: 'Newer changes exist. Reload the page to see them.', variant: 'destructive' });
          return;
        }
        result = await adminApi.saveContent(cleaned); // deliberate overwrite: no revision check
      }
      setDraft(cleaned);
      setRevision(result.revision);
      setSavedJson(JSON.stringify(cleaned));
      toast({ title: 'Published', description: 'Your changes are live on the site now.' });
    } catch (error) {
      handleError(error, 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [draft, saving, revision, toast, handleError]);

  const reset = async () => {
    if (!window.confirm('Reset ALL content back to the built-in defaults? This publishes immediately and cannot be undone.')) return;
    try {
      await adminApi.resetContent();
      const { content, revision: latest } = await adminApi.getContent();
      setRevision(latest);
      setDraft(content);
      setSavedJson(serializeContent(content));
      toast({ title: 'Reset', description: 'Content restored to defaults.' });
    } catch (error) {
      handleError(error, 'Reset failed');
    }
  };

  // Ctrl/Cmd + S publishes.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (dirty) save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, save]);

  // Warn before closing the tab with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <p className="text-lg font-semibold text-foreground">Could not load content</p>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const set = <K extends keyof SiteContent>(key: K) => (value: SiteContent[K]) => setDraft({ ...draft, [key]: value });

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      <header className="sticky top-0 z-30 -mx-4 mb-6 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Site admin</h1>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {dirty ? (
                <span className="text-accent">● Unsaved changes</span>
              ) : (
                <span>All changes published · edits go live instantly</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                View site
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
            <Button size="sm" onClick={save} disabled={!dirty || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save &amp; publish
            </Button>
          </div>
        </div>
      </header>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6 h-auto w-full flex-wrap justify-start gap-1 bg-secondary/50 p-1">
          {tabs.map(([value, label]) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile">
          <ProfileEditor value={draft.profile} onChange={set('profile')} />
        </TabsContent>
        <TabsContent value="hero">
          <HeroEditor value={draft.hero} onChange={set('hero')} />
        </TabsContent>
        <TabsContent value="about">
          <AboutEditor value={draft.about} onChange={set('about')} />
        </TabsContent>
        <TabsContent value="experience">
          <ExperienceEditor value={draft.experience} onChange={set('experience')} />
        </TabsContent>
        <TabsContent value="projects">
          <ProjectsEditor value={draft.projects} onChange={set('projects')} profileGithubUrl={draft.profile.social.github} />
        </TabsContent>
        <TabsContent value="skills">
          <SkillsEditor value={draft.skills} onChange={set('skills')} />
        </TabsContent>
        <TabsContent value="contact">
          <ContactEditor value={draft.contact} onChange={set('contact')} site={draft.site} onSiteChange={set('site')} />
        </TabsContent>
        <TabsContent value="media">
          <MediaLibrary contentJson={draftJson} />
        </TabsContent>
        <TabsContent value="messages">
          <MessagesPanel />
        </TabsContent>
        <TabsContent value="json">
          <JsonPanel content={draft} onApply={setDraft} />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default AdminDashboard;
