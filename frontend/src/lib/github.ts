import type { GithubRepo, ProjectItem } from '@/types/content';

const unique = (items: string[]) => [...new Set(items.filter(Boolean))];

/** "ATL_Bot" -> "ATL Bot", "guest-management-system" -> "Guest Management System". */
export const prettifyRepoName = (name: string) =>
  name
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());

const topicLabel = (topic: string) => prettifyRepoName(topic);

/** Fields that come straight from GitHub and are safe to refresh on re-sync. */
export const githubFields = (repo: GithubRepo): Pick<ProjectItem, 'description' | 'tech' | 'github' | 'repo'> => ({
  description: repo.description || 'Open-source project on GitHub.',
  tech: unique([repo.language, ...repo.topics.map(topicLabel)]).slice(0, 8),
  github: repo.htmlUrl,
  repo: repo.fullName,
});

export const repoToProject = (repo: GithubRepo): ProjectItem => ({
  title: prettifyRepoName(repo.name),
  category: repo.language ? `${repo.language} Project` : 'GitHub Project',
  icon: 'Code2',
  impact: repo.stars > 0 ? `${repo.stars} GitHub star${repo.stars === 1 ? '' : 's'}` : 'Open-source project',
  demo: repo.homepage || repo.htmlUrl,
  image: '',
  ...githubFields(repo),
});

const norm = (value: string) => value.trim().toLowerCase().replace(/\/$/, '');

/** True when a project already points at this repository (imported earlier, or linked by hand). */
export const isRepoImported = (repo: GithubRepo, items: ProjectItem[]) =>
  items.some((item) => norm(item.repo ?? '') === norm(repo.fullName) || norm(item.github) === norm(repo.htmlUrl));

/** Best guess of the GitHub owner from existing project links, used to prefill the username box. */
export const guessGithubOwner = (items: ProjectItem[], fallbackUrl = ''): string => {
  const counts = new Map<string, number>();
  for (const url of [...items.map((item) => item.github), fallbackUrl]) {
    const owner = /^https?:\/\/github\.com\/([^/]+)/i.exec(url ?? '')?.[1];
    if (owner) counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
};
