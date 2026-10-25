import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, ExternalLink, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { assetUrl } from '@/config/env';
import { useToast } from '@/hooks/use-toast';
import { adminApi } from '@/services/admin.service';
import { ApiError } from '@/services/http';
import type { MediaItem } from '@/types/content';
import { Panel } from './fields';

const formatSize = (bytes: number) => (bytes > 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** `contentJson` is used to warn before deleting a file the site still references. */
const MediaLibrary = ({ contentJson }: { contentJson: string }) => {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      setItems(await adminApi.listMedia());
    } catch (error) {
      toast({ title: 'Could not load media', description: error instanceof Error ? error.message : '', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      await adminApi.uploadMedia(file);
      await load();
      toast({ title: 'Uploaded', description: file.name });
    } catch (error) {
      toast({ title: 'Upload failed', description: error instanceof Error ? error.message : '', variant: 'destructive' });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (item: MediaItem) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      try {
        await adminApi.deleteMedia(item.id);
      } catch (error) {
        // The server knows what the LIVE site uses; never break it without an explicit second confirmation.
        if (!(error instanceof ApiError && error.status === 409)) throw error;
        if (!window.confirm(`"${item.name}" is used on the live site right now. Deleting it will break that image or link.\n\nDelete anyway?`)) return;
        await adminApi.deleteMedia(item.id, true);
      }
      await load();
    } catch (error) {
      toast({ title: 'Delete failed', description: error instanceof Error ? error.message : '', variant: 'destructive' });
    }
  };

  const cleanup = async () => {
    if (!window.confirm('Delete every uploaded file that the published site does not use (older than 1 hour)?\n\nFiles used only by edits you have not published yet may be removed.')) return;
    try {
      const { deleted } = await adminApi.cleanupMedia();
      await load();
      toast({ title: deleted ? `Removed ${deleted} unused file${deleted === 1 ? '' : 's'}` : 'Nothing to clean up', description: 'Files in use were kept.' });
    } catch (error) {
      toast({ title: 'Cleanup failed', description: error instanceof Error ? error.message : '', variant: 'destructive' });
    }
  };

  const copy = async (item: MediaItem) => {
    try {
      await navigator.clipboard.writeText(`/api/media/${item.id}`);
      toast({ title: 'Copied', description: 'Paste it into any link or image field.' });
    } catch {
      toast({ title: 'Copy failed', description: `/api/media/${item.id}`, variant: 'destructive' });
    }
  };

  return (
    <Panel title="Media library" description="Images and PDFs stored in Redis. Max 8 MB each. Use the Upload buttons in the other tabs to attach a file directly.">
      <input ref={inputRef} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" onChange={(e) => upload(e.target.files?.[0])} />
      <Button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Upload file
      </Button>
      <Button type="button" variant="outline" onClick={cleanup} className="ml-2">
        <Trash2 className="h-4 w-4" />
        Clean up unused
      </Button>

      {items === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 rounded-xl border border-border/70 bg-background/30 p-3">
              {item.mime.startsWith('image/') ? (
                <img src={assetUrl(`/api/media/${item.id}`)} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <FileText className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(item.size)} · {new Date(item.createdAt).toLocaleDateString()}
                  {contentJson.includes(item.id) && <span className="ml-2 text-primary">in use</span>}
                </p>
                <div className="mt-2 flex gap-1">
                  <Button type="button" size="icon" variant="ghost" aria-label="Copy URL" onClick={() => copy(item)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" aria-label="Open" asChild>
                    <a href={assetUrl(`/api/media/${item.id}`)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button type="button" size="icon" variant="ghost" aria-label="Delete" className="text-destructive hover:text-destructive" onClick={() => remove(item)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};

export default MediaLibrary;
