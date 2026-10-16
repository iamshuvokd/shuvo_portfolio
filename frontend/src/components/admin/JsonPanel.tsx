import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { withDefaults } from '@/services/content.service';
import type { SiteContent } from '@/types/content';
import { Panel } from './fields';

/** Power-user escape hatch: edit the entire document as JSON, then apply it to the form. */
const JsonPanel = ({ content, onApply }: { content: SiteContent; onApply: (content: SiteContent) => void }) => {
  const [text, setText] = useState(() => JSON.stringify(content, null, 2));
  const [error, setError] = useState('');

  useEffect(() => {
    setText(JSON.stringify(content, null, 2));
    setError('');
  }, [content]);

  const apply = () => {
    try {
      const parsed = JSON.parse(text) as SiteContent;
      if (!parsed || typeof parsed !== 'object' || !parsed.profile) throw new Error('Missing "profile" section');
      onApply(withDefaults(parsed));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  return (
    <Panel title="Raw JSON" description="Edit everything at once. Click Apply to load it into the form, then Save & publish. The server re-validates before publishing.">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={24} spellCheck={false} className="font-mono text-xs" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="button" onClick={apply}>
        Apply to form
      </Button>
    </Panel>
  );
};

export default JsonPanel;
