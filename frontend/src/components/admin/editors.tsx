import type { SiteContent } from '@/types/content';
import GithubImport from './GithubImport';
import { isValidTimeZone } from '@/lib/timezone';
import { AreaField, Grid, IconSelect, ListEditor, MediaField, Panel, SwitchField, TagsField, TextField } from './fields';

interface EditorProps<K extends keyof SiteContent> {
  value: SiteContent[K];
  onChange: (value: SiteContent[K]) => void;
}

export const ProfileEditor = ({ value, onChange }: EditorProps<'profile'>) => {
  const set = (patch: Partial<SiteContent['profile']>) => onChange({ ...value, ...patch });
  const setSocial = (patch: Partial<SiteContent['profile']['social']>) => set({ social: { ...value.social, ...patch } });

  return (
    <div className="space-y-6">
      <Panel title="Identity" description="Shown in the header, hero card, about card, footer and browser-facing text.">
        <Grid>
          <TextField label="Full name" value={value.name} onChange={(name) => set({ name })} />
          <TextField label="Role" value={value.role} onChange={(role) => set({ role })} />
        </Grid>
        <TextField label="Headline" hint="Shown in the footer." value={value.headline} onChange={(headline) => set({ headline })} />
        <MediaField
          label="Profile photo"
          hint="Leave empty to use the built-in photo. Square images look best."
          accept="image/png,image/jpeg,image/webp"
          preview
          value={value.photoUrl}
          onChange={(photoUrl) => set({ photoUrl })}
        />
      </Panel>

      <Panel title="CV / Resume" description="The Download CV button opens this link. Upload a PDF here or paste any URL.">
        <MediaField label="CV file or link" accept="application/pdf" value={value.cvUrl} onChange={(cvUrl) => set({ cvUrl })} />
      </Panel>

      <Panel title="Contact details">
        <Grid>
          <TextField label="Email" type="email" value={value.email} onChange={(email) => set({ email })} />
          <TextField label="Phone" hint="Include the country code, e.g. +8801XXXXXXXXX." value={value.phone} onChange={(phone) => set({ phone })} />
          <TextField label="Location" value={value.location} onChange={(location) => set({ location })} />
          <TextField
            label="Time zone (IANA)"
            hint="Used for the footer clock, e.g. Asia/Dhaka."
            value={value.timeZone}
            onChange={(timeZone) => set({ timeZone })}
            error={isValidTimeZone(value.timeZone) ? undefined : 'Not a valid time zone. Use a name like Asia/Dhaka or Europe/London.'}
          />
        </Grid>
      </Panel>

      <Panel title="Social links" description="Leave a field empty to hide that icon in the footer.">
        <Grid>
          <TextField label="GitHub" value={value.social.github} onChange={(github) => setSocial({ github })} />
          <TextField label="LinkedIn" value={value.social.linkedin} onChange={(linkedin) => setSocial({ linkedin })} />
          <TextField label="Facebook" value={value.social.facebook} onChange={(facebook) => setSocial({ facebook })} />
        </Grid>
      </Panel>

      <Panel title="Availability">
        <SwitchField label="Show as available" hint="Controls the green Available pill in the footer." value={value.available} onChange={(available) => set({ available })} />
        <TextField label="Title" value={value.availabilityTitle} onChange={(availabilityTitle) => set({ availabilityTitle })} />
        <AreaField label="Description" value={value.availabilityText} onChange={(availabilityText) => set({ availabilityText })} rows={2} />
      </Panel>
    </div>
  );
};

export const HeroEditor = ({ value, onChange }: EditorProps<'hero'>) => {
  const set = (patch: Partial<SiteContent['hero']>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-6">
      <Panel title="Hero text">
        <TextField label="Top badge" value={value.badge} onChange={(badge) => set({ badge })} />
        <Grid>
          <TextField label="Greeting" value={value.greeting} onChange={(greeting) => set({ greeting })} />
          <TextField label="First name" value={value.firstName} onChange={(firstName) => set({ firstName })} />
        </Grid>
        <TagsField label="Typing roles" hint="Rotates after “I am a”. Separate with commas." value={value.roles} onChange={(roles) => set({ roles })} />
        <AreaField label="Tagline" value={value.tagline} onChange={(tagline) => set({ tagline })} />
      </Panel>
      <Panel title="Hero metrics" description="The three stat tiles under the buttons.">
        <ListEditor
          items={value.metrics}
          onChange={(metrics) => set({ metrics })}
          makeNew={() => ({ value: '', label: '' })}
          itemTitle={(item) => `${item.value} ${item.label}`}
          addLabel="Add metric"
          renderItem={(item, update) => (
            <Grid>
              <TextField label="Value" value={item.value} onChange={(v) => update({ value: v })} />
              <TextField label="Label" value={item.label} onChange={(label) => update({ label })} />
            </Grid>
          )}
        />
      </Panel>
    </div>
  );
};

export const AboutEditor = ({ value, onChange }: EditorProps<'about'>) => {
  const set = (patch: Partial<SiteContent['about']>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-6">
      <Panel title="About text">
        <AreaField label="Heading" value={value.heading} onChange={(heading) => set({ heading })} rows={2} />
        <AreaField label="Paragraph" value={value.paragraph} onChange={(paragraph) => set({ paragraph })} rows={5} />
        <AreaField label="Card summary" hint="Small text under the profile card." value={value.cardSummary} onChange={(cardSummary) => set({ cardSummary })} rows={2} />
      </Panel>
      <Panel title="Quick facts">
        <ListEditor
          items={value.quickFacts}
          onChange={(quickFacts) => set({ quickFacts })}
          makeNew={() => ({ label: '', value: '' })}
          itemTitle={(item) => item.label}
          addLabel="Add fact"
          renderItem={(item, update) => (
            <Grid>
              <TextField label="Label" value={item.label} onChange={(label) => update({ label })} />
              <TextField label="Value" value={item.value} onChange={(v) => update({ value: v })} />
            </Grid>
          )}
        />
      </Panel>
      <Panel title="Focus areas">
        <ListEditor
          items={value.focusAreas}
          onChange={(focusAreas) => set({ focusAreas })}
          makeNew={() => ({ icon: 'Sparkles', title: '', text: '' })}
          itemTitle={(item) => item.title}
          addLabel="Add focus area"
          renderItem={(item, update) => (
            <>
              <Grid>
                <TextField label="Title" value={item.title} onChange={(title) => update({ title })} />
                <IconSelect label="Icon" value={item.icon} onChange={(icon) => update({ icon })} />
              </Grid>
              <AreaField label="Text" value={item.text} onChange={(text) => update({ text })} rows={2} />
            </>
          )}
        />
      </Panel>
    </div>
  );
};

export const ExperienceEditor = ({ value, onChange }: EditorProps<'experience'>) => {
  const set = (patch: Partial<SiteContent['experience']>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-6">
      <Panel title="Positions" description="Listed top to bottom on the timeline. Use the arrows to reorder.">
        <ListEditor
          items={value.items}
          onChange={(items) => set({ items })}
          makeNew={() => ({ period: '', role: '', company: '', category: '', status: '', summary: '' })}
          itemTitle={(item) => [item.role, item.company].filter(Boolean).join(' · ')}
          addLabel="Add position"
          renderItem={(item, update) => (
            <>
              <Grid>
                <TextField label="Role" value={item.role} onChange={(role) => update({ role })} />
                <TextField label="Company" value={item.company} onChange={(company) => update({ company })} />
                <TextField label="Period" hint="e.g. 2023 - Present" value={item.period} onChange={(period) => update({ period })} />
                <TextField label="Status tag" hint="e.g. Current" value={item.status} onChange={(status) => update({ status })} />
              </Grid>
              <TextField label="Category" value={item.category} onChange={(category) => update({ category })} />
              <AreaField label="Summary" value={item.summary} onChange={(summary) => update({ summary })} />
            </>
          )}
        />
      </Panel>
      <Panel title="Sidebar highlights">
        <ListEditor
          items={value.highlights}
          onChange={(highlights) => set({ highlights })}
          makeNew={() => ({ label: '', value: '' })}
          itemTitle={(item) => item.label}
          addLabel="Add highlight"
          renderItem={(item, update) => (
            <Grid>
              <TextField label="Label" value={item.label} onChange={(label) => update({ label })} />
              <TextField label="Value" value={item.value} onChange={(v) => update({ value: v })} />
            </Grid>
          )}
        />
      </Panel>
    </div>
  );
};

export const ProjectsEditor = ({ value, onChange, profileGithubUrl }: EditorProps<'projects'> & { profileGithubUrl: string }) => {
  const set = (patch: Partial<SiteContent['projects']>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-6">
      <GithubImport items={value.items} onChange={(items) => set({ items })} profileGithubUrl={profileGithubUrl} />
      <Panel title="Projects" description="The first project is shown as the large featured card.">
        <ListEditor
          items={value.items}
          onChange={(items) => set({ items })}
          makeNew={() => ({ title: '', category: '', icon: 'Layers3', impact: '', description: '', tech: [], github: '', demo: '', image: '' })}
          itemTitle={(item) => item.title}
          addLabel="Add project"
          renderItem={(item, update) => (
            <>
              <Grid>
                <TextField label="Title" value={item.title} onChange={(title) => update({ title })} />
                <TextField label="Category" value={item.category} onChange={(category) => update({ category })} />
                <TextField label="Impact line" value={item.impact} onChange={(impact) => update({ impact })} />
                <IconSelect label="Icon" value={item.icon} onChange={(icon) => update({ icon })} />
              </Grid>
              <AreaField label="Description" value={item.description} onChange={(description) => update({ description })} />
              <TagsField label="Tech stack" value={item.tech} onChange={(tech) => update({ tech })} />
              <Grid>
                <TextField label="Code link (GitHub)" value={item.github} onChange={(github) => update({ github })} />
                <TextField label="Project / demo link" value={item.demo} onChange={(demo) => update({ demo })} />
              </Grid>
              <MediaField
                label="Screenshot (optional)"
                hint="Shown at the top of the project card."
                accept="image/png,image/jpeg,image/webp"
                preview
                value={item.image ?? ''}
                onChange={(image) => update({ image })}
              />
            </>
          )}
        />
      </Panel>
      <Panel title="Sidebar stats">
        <ListEditor
          items={value.stats}
          onChange={(stats) => set({ stats })}
          makeNew={() => ({ label: '', value: '' })}
          itemTitle={(item) => item.label}
          addLabel="Add stat"
          renderItem={(item, update) => (
            <Grid>
              <TextField label="Label" value={item.label} onChange={(label) => update({ label })} />
              <TextField label="Value" value={item.value} onChange={(v) => update({ value: v })} />
            </Grid>
          )}
        />
      </Panel>
    </div>
  );
};

export const SkillsEditor = ({ value, onChange }: EditorProps<'skills'>) => {
  const set = (patch: Partial<SiteContent['skills']>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-6">
      <Panel title="Capability groups">
        <ListEditor
          items={value.groups}
          onChange={(groups) => set({ groups })}
          makeNew={() => ({ title: '', icon: 'Code2', level: '', summary: '', skills: [] })}
          itemTitle={(item) => item.title}
          addLabel="Add group"
          renderItem={(item, update) => (
            <>
              <Grid>
                <TextField label="Title" value={item.title} onChange={(title) => update({ title })} />
                <TextField label="Level badge" hint="e.g. Advanced" value={item.level} onChange={(level) => update({ level })} />
              </Grid>
              <IconSelect label="Icon" value={item.icon} onChange={(icon) => update({ icon })} />
              <AreaField label="Summary" value={item.summary} onChange={(summary) => update({ summary })} rows={2} />
              <TagsField label="Skills" value={item.skills} onChange={(skills) => update({ skills })} />
            </>
          )}
        />
      </Panel>
      <Panel title="Technology stack">
        <ListEditor
          items={value.stack}
          onChange={(stack) => set({ stack })}
          makeNew={() => ({ label: '', items: [] })}
          itemTitle={(item) => item.label}
          addLabel="Add category"
          renderItem={(item, update) => (
            <>
              <TextField label="Category" value={item.label} onChange={(label) => update({ label })} />
              <TagsField label="Items" value={item.items} onChange={(items) => update({ items })} />
            </>
          )}
        />
      </Panel>
    </div>
  );
};
