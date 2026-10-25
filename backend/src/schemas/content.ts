import { z } from 'zod';

const text = (max = 300) => z.string().max(max);
const longText = z.string().max(2000);

/**
 * Links may be empty, http(s), mailto/tel, or a same-site path (e.g. /api/media/...).
 * Anything else (notably `javascript:`) is rejected because these values end up in href/src.
 */
const link = z
  .string()
  .max(2048)
  .refine((value) => value === '' || /^(https?:\/\/|\/(?!\/)|mailto:|tel:)/i.test(value), {
    message: 'Must be empty, an http(s) URL, mailto:, tel:, or a /path',
  });

/** A real IANA zone such as "Asia/Dhaka". A typo like "Dhaka" used to crash every visitor's browser. */
const timeZone = z
  .string()
  .max(60)
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid IANA time zone, e.g. Asia/Dhaka' },
  );

const labelValue = z.object({ label: text(80), value: text(160) });
const icon = z.string().max(40);

export const contentSchema = z.object({
  profile: z.object({
    name: text(120),
    role: text(120),
    headline: text(200),
    email: z.string().email().max(200),
    phone: text(40),
    location: text(120),
    timeZone,
    cvUrl: link,
    photoUrl: link,
    available: z.boolean(),
    availabilityTitle: text(160),
    availabilityText: text(300),
    social: z.object({ github: link, linkedin: link, facebook: link }),
  }),
  hero: z.object({
    badge: text(160),
    greeting: text(60),
    firstName: text(60),
    roles: z.array(text(80)).min(1).max(12),
    tagline: longText,
    metrics: z.array(z.object({ value: text(30), label: text(100) })).max(6),
  }),
  about: z.object({
    heading: text(300),
    paragraph: longText,
    cardSummary: text(400),
    quickFacts: z.array(labelValue).max(6),
    focusAreas: z.array(z.object({ icon, title: text(80), text: text(300) })).max(8),
  }),
  experience: z.object({
    items: z
      .array(
        z.object({
          period: text(60),
          role: text(120),
          company: text(120),
          category: text(160),
          status: text(40),
          summary: longText,
        }),
      )
      .max(30),
    highlights: z.array(labelValue).max(6),
  }),
  projects: z.object({
    items: z
      .array(
        z.object({
          title: text(160),
          category: text(80),
          icon,
          impact: text(200),
          description: longText,
          tech: z.array(text(40)).max(20),
          github: link,
          demo: link,
          image: link.optional(),
          /** `owner/name` when the project was imported from GitHub. */
          repo: z.string().max(200).optional(),
        }),
      )
      .max(50),
    stats: z.array(labelValue).max(6),
  }),
  skills: z.object({
    groups: z
      .array(
        z.object({
          title: text(100),
          icon,
          level: text(40),
          summary: text(400),
          skills: z.array(text(40)).max(30),
        }),
      )
      .max(12),
    stack: z.array(z.object({ label: text(60), items: z.array(text(40)).max(30) })).max(12),
  }),
});

export type SiteContent = z.infer<typeof contentSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(1).max(5000),
});

export type ContactInput = z.infer<typeof contactSchema>;
