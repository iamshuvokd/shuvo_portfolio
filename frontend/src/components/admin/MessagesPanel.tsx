import { useCallback, useEffect, useState } from 'react';
import { Mail, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { adminApi } from '@/services/admin.service';
import type { ContactMessage } from '@/types/content';
import { Panel } from './fields';

const MessagesPanel = () => {
  const [items, setItems] = useState<ContactMessage[] | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      setItems(await adminApi.listMessages());
    } catch (error) {
      toast({ title: 'Could not load messages', description: error instanceof Error ? error.message : '', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    if (!window.confirm('Delete this message?')) return;
    await adminApi.deleteMessage(id).catch(() => undefined);
    load();
  };

  return (
    <Panel title="Inbox" description="Messages sent through the contact form while the backend is online.">
      <Button type="button" variant="outline" onClick={load}>
        <RefreshCw className="h-4 w-4" />
        Refresh
      </Button>
      {items === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No messages yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((message) => (
            <li key={message.id} className="rounded-xl border border-border/70 bg-background/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{message.name}</p>
                  <a href={`mailto:${message.email}`} className="break-all text-sm text-primary hover:underline">
                    {message.email}
                  </a>
                  <p className="text-xs text-muted-foreground">{new Date(message.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" size="icon" variant="ghost" aria-label="Reply" asChild>
                    <a href={`mailto:${message.email}?subject=Re: your message`}>
                      <Mail className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button type="button" size="icon" variant="ghost" aria-label="Delete" className="text-destructive hover:text-destructive" onClick={() => remove(message.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Rendered as text (React escapes it), never as HTML. */}
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{message.message}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};

export default MessagesPanel;
