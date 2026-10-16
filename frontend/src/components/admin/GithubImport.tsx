import { useMemo, useState } from 'react';
import { Check, Github, Loader2, RefreshCw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { githubFields, guessGithubOwner, isRepoImported, repoToProject } from '@/lib/github';
import { adminApi } from '@/services/admin.service';
import type { GithubRepo, ProjectItem } from '@/types/content';
import { Panel } from './fields';

const USERNAME_KEY = 'portfolio:admin-github-user';

const readSavedUser = () => {
  try {
    return localStorage.getItem(USERNAME_KEY) ?? '';
  } catch {
    return '';
  }
};

/**
 * Pick repositories from a GitHub account and turn them into project cards.
 * The backend fetches (and caches) the repo list; nothing is published until you Save & publish.
 */
const GithubImport = ({
  items,
  onChange,
  profileGithubUrl,
}: {
  items: ProjectItem[];
  onChange: (items: ProjectItem[]) => void;
  /** The GitHub link from the profile, used to prefill the username. */
  profileGithubUrl: string;
}) => {
  const { toast } = useToast();
  const [username, setUsername] = useState(() => readSavedUser() || guessGithubOwner([], profileGithubUrl) || guessGithubOwner(items));
  const [repos, setRepos] = useState<GithubRepo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');
  const [hideForks, setHideForks] = useState(true);

  const load = async (refresh = false) => {
    const user = username.trim();
    if (!user) return;
    setLoading(true);
    try {
      const list = await adminApi.listGithubRepos(user, refresh);
      setRepos(list);
      setSelected(new Set());
      try {
        localStorage.setItem(USERNAME_KEY, user);
      } catch {
        // storage unavailable: just don't remember the username
      }
      if (list.length === 0) toast({ title: 'No public repositories', description: `${user} has nothing to import.` });
    } catch (error) {
      toast({ title: 'GitHub error', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (repos ?? []).filter(
      (repo) =>
        (!hideForks || !repo.fork) &&
        (!needle || `${repo.name} ${repo.description} ${repo.language} ${repo.topics.join(' ')}`.toLowerCase().includes(needle)),
    );
  }, [repos, query, hideForks]);

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addSelected = () => {
    const chosen = (repos ?? []).filter((repo) => selected.has(repo.id) && !isRepoImported(repo, items));
    if (!chosen.length) return;
    onChange([...items, ...chosen.map(repoToProject)]);
    setSelected(new Set());
    toast({ title: `Added ${chosen.length} project${chosen.length === 1 ? '' : 's'}`, description: 'Review them below, then Save & publish.' });
  };

  const importedCount = items.filter((item) => item.repo).length;

  const resync = () => {
    if (!repos) return;
    if (!window.confirm('Refresh description, tech tags and code link of every GitHub-imported project from GitHub? Your edits to those fields will be overwritten.')) return;
    const byName = new Map(repos.map((repo) => [repo.fullName.toLowerCase(), repo]));
    let updated = 0;
    onChange(
      items.map((item) => {
        const repo = item.repo ? byName.get(item.repo.toLowerCase()) : undefined;
        if (!repo) return item;
        updated += 1;
        return { ...item, ...githubFields(repo) };
      }),
    );
    toast({ title: `Re-synced ${updated} project${updated === 1 ? '' : 's'}`, description: 'Save & publish to make it live.' });
  };

  const selectedCount = [...selected].filter((id) => {
    const repo = repos?.find((r) => r.id === id);
    return repo && !isRepoImported(repo, items);
  }).length;

  return (
    <Panel title="Import from GitHub" description="Load a GitHub account, tick the repositories you want, and they become project cards. You can edit every field afterwards.">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
      >
        <div className="relative flex-1">
          <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="GitHub username"
            placeholder="GitHub username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={loading || !username.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
          Load repositories
        </Button>
        {repos && (
          <Button type="button" variant="outline" disabled={loading} onClick={() => load(true)} aria-label="Refresh from GitHub">
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </form>

      {repos && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input aria-label="Filter repositories" placeholder={`Filter ${visible.length} repositories…`} value={query} onChange={(e) => setQuery(e.target.value)} className="sm:max-w-xs" />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={hideForks} onChange={(e) => setHideForks(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
              Hide forks
            </label>
          </div>

          <ul className="max-h-[26rem] space-y-2 overflow-y-auto rounded-xl border border-border/70 bg-background/30 p-2">
            {visible.length === 0 && <li className="p-4 text-sm text-muted-foreground">No repositories match.</li>}
            {visible.map((repo) => {
              const imported = isRepoImported(repo, items);
              return (
                <li key={repo.id}>
                  <label
                    className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                      imported
                        ? 'cursor-not-allowed border-transparent opacity-60'
                        : selected.has(repo.id)
                          ? 'cursor-pointer border-primary/50 bg-primary/10'
                          : 'cursor-pointer border-transparent hover:bg-secondary/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                      disabled={imported}
                      checked={imported || selected.has(repo.id)}
                      onChange={() => toggle(repo.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{repo.name}</span>
                        {imported && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                            <Check className="h-3 w-3" /> Added
                          </span>
                        )}
                        {repo.fork && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">fork</span>}
                        {repo.archived && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">archived</span>}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{repo.description || 'No description'}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {repo.language && <span>{repo.language}</span>}
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {repo.stars}
                        </span>
                        <span>updated {new Date(repo.pushedAt).toLocaleDateString()}</span>
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={addSelected} disabled={selectedCount === 0}>
              Add {selectedCount || ''} selected as projects
            </Button>
            {importedCount > 0 && (
              <Button type="button" variant="outline" onClick={resync}>
                <RefreshCw className="h-4 w-4" />
                Re-sync {importedCount} imported
              </Button>
            )}
          </div>
        </>
      )}
    </Panel>
  );
};

export default GithubImport;
