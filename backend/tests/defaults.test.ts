import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contentSchema } from '../src/schemas/content.js';

const raw = readFileSync(new URL('../../shared/default-content.json', import.meta.url), 'utf-8');
const defaults = JSON.parse(raw);

describe('shared default content (the seed and the offline fallback)', () => {
  it('passes the same validation the admin API applies', () => {
    expect(() => contentSchema.parse(defaults)).not.toThrow();
  });

  it('B14: has no links to the non-existent GitHub account "shuvookd"', () => {
    expect(raw.toLowerCase()).not.toContain('github.com/shuvookd');
  });

  it('every external link is a well-formed http(s) URL', () => {
    const urls = [...raw.matchAll(/"(https?:\/\/[^"]+)"/g)].map((match) => match[1]);
    expect(urls.length).toBeGreaterThan(5);
    for (const url of urls) expect(() => new URL(url), url).not.toThrow();
  });

  it('projects without a public repo have empty links, so the site shows no dead buttons', () => {
    for (const project of defaults.projects.items) {
      expect(project.github === '' || project.github.startsWith('https://github.com/iamshuvokd/'), project.title).toBe(true);
    }
  });
});
