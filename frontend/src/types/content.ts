/** Shape of everything editable from /admin. Mirrors backend/src/schemas/content.ts. */

export interface LabelValue {
  label: string;
  value: string;
}

export interface Profile {
  name: string;
  role: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  timeZone: string;
  cvUrl: string;
  /** Empty = use the bundled default photo. */
  photoUrl: string;
  available: boolean;
  availabilityTitle: string;
  availabilityText: string;
  social: { github: string; linkedin: string; facebook: string };
}

export interface Hero {
  badge: string;
  greeting: string;
  firstName: string;
  roles: string[];
  tagline: string;
  metrics: { value: string; label: string }[];
}

export interface About {
  heading: string;
  paragraph: string;
  cardSummary: string;
  quickFacts: LabelValue[];
  focusAreas: { icon: string; title: string; text: string }[];
}

export interface ExperienceItem {
  period: string;
  role: string;
  company: string;
  category: string;
  status: string;
  summary: string;
}

export interface ProjectItem {
  title: string;
  category: string;
  icon: string;
  impact: string;
  description: string;
  tech: string[];
  github: string;
  demo: string;
  image?: string;
  /** `owner/name` when imported from GitHub. */
  repo?: string;
}

export interface SkillGroup {
  title: string;
  icon: string;
  level: string;
  summary: string;
  skills: string[];
}

export interface SiteContent {
  profile: Profile;
  hero: Hero;
  about: About;
  experience: { items: ExperienceItem[]; highlights: LabelValue[] };
  projects: { items: ProjectItem[]; stats: LabelValue[] };
  skills: { groups: SkillGroup[]; stack: { label: string; items: string[] }[] };
}

export interface MediaItem {
  id: string;
  name: string;
  mime: string;
  size: number;
  createdAt: number;
  url?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: number;
}

export interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  language: string;
  topics: string[];
  stars: number;
  forks: number;
  homepage: string;
  htmlUrl: string;
  pushedAt: string;
  fork: boolean;
  archived: boolean;
}
