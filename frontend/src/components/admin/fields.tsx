import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, FileUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { assetUrl } from '@/config/env';
import { useToast } from '@/hooks/use-toast';
import { iconNames } from '@/lib/icons';
import { adminApi } from '@/services/admin.service';

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground';

interface BaseProps {
  label: string;
  hint?: string;
}

const Hint = ({ children }: { children?: ReactNode }) =>
  children ? <p className="mt-1 text-xs text-muted-foreground/80">{children}</p> : null;

export const TextField = ({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
}: BaseProps & { value: string; onChange: (value: string) => void; placeholder?: string; type?: string; error?: string }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={error ? 'border-destructive focus-visible:ring-destructive' : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : (
        <Hint>{hint}</Hint>
      )}
    </div>
  );
};

export const AreaField = ({
  label,
  hint,
  value,
  onChange,
  rows = 3,
}: BaseProps & { value: string; onChange: (value: string) => void; rows?: number }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <Textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="resize-y" />
      <Hint>{hint}</Hint>
    </div>
  );
};

export const SwitchField = ({
  label,
  hint,
  value,
  onChange,
}: BaseProps & { value: boolean; onChange: (value: boolean) => void }) => (
  <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-background/40 px-4 py-3">
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <Hint>{hint}</Hint>
    </div>
    <Switch checked={value} onCheckedChange={onChange} aria-label={label} />
  </div>
);

const parseTags = (text: string) =>
  text
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

/** Comma-separated list input. Keeps the raw text locally so typing a trailing comma is not swallowed. */
export const TagsField = ({
  label,
  hint,
  value,
  onChange,
}: BaseProps & { value: string[]; onChange: (value: string[]) => void }) => {
  const id = useId();
  const [text, setText] = useState(value.join(', '));

  useEffect(() => {
    if (parseTags(text).join('\u0000') !== value.join('\u0000')) setText(value.join(', '));
    // Only resync when the value changes from outside (e.g. JSON import), not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <Input
        id={id}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseTags(e.target.value));
        }}
      />
      <Hint>{hint ?? 'Separate items with commas.'}</Hint>
    </div>
  );
};

export const IconSelect = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => {
  const id = useId();
  const options = iconNames.includes(value) ? iconNames : [value, ...iconNames];
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
};

/** URL input plus an upload button. Uploaded files are stored in Redis and the field is set to their URL. */
export const MediaField = ({
  label,
  hint,
  value,
  onChange,
  accept,
  preview = false,
}: BaseProps & { value: string; onChange: (value: string) => void; accept: string; preview?: boolean }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const id = useId();

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const media = await adminApi.uploadMedia(file);
      onChange(`/api/media/${media.id}`);
      toast({ title: 'Uploaded', description: `${media.name} is ready. Remember to save & publish.` });
    } catch (error) {
      toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="flex gap-2">
        <Input id={id} value={value} placeholder="https://… or upload a file" onChange={(e) => onChange(e.target.value)} />
        <input ref={inputRef} type="file" accept={accept} hidden onChange={(e) => upload(e.target.files?.[0])} />
        <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()} className="shrink-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          Upload
        </Button>
      </div>
      {preview && value && (
        <img src={assetUrl(value)} alt="" className="mt-2 h-20 w-20 rounded-lg border border-border/70 object-cover" />
      )}
      <Hint>{hint}</Hint>
    </div>
  );
};

/** Generic add / remove / reorder editor for arrays of objects. */
export function ListEditor<T>({
  items,
  onChange,
  makeNew,
  itemTitle,
  renderItem,
  addLabel = 'Add item',
}: {
  items: T[];
  onChange: (items: T[]) => void;
  makeNew: () => T;
  itemTitle: (item: T, index: number) => string;
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  addLabel?: string;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="rounded-xl border border-border/70 bg-background/30 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-semibold text-foreground">
              <span className="mr-2 text-muted-foreground">#{index + 1}</span>
              {itemTitle(item, index) || 'Untitled'}
            </p>
            <div className="flex shrink-0 gap-1">
              <Button type="button" size="icon" variant="ghost" aria-label="Move up" disabled={index === 0} onClick={() => move(index, index - 1)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="ghost" aria-label="Move down" disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Remove"
                className="text-destructive hover:text-destructive"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            {renderItem(item, (patch) => onChange(items.map((current, i) => (i === index ? { ...current, ...patch } : current))), index)}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...items, makeNew()])}>
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );
}

export const Panel = ({ title, description, children }: { title: string; description?: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-border/70 bg-card/50 p-5 sm:p-6">
    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    <div className="mt-5 space-y-4">{children}</div>
  </section>
);

export const Grid = ({ children }: { children: ReactNode }) => <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
