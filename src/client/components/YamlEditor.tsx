import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRawYaml, useSaveRawYaml } from '@/hooks/useRawYaml';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface YamlEditorProps {
  type: string;  // 'products' | 'intentions' | 'expectations' | 'specs'
  id: string;
  onClose: () => void;
}

export default function YamlEditor({ type, id, onClose }: YamlEditorProps) {
  const { data, isLoading } = useRawYaml(type, id);
  const saveRaw = useSaveRawYaml();
  const [content, setContent] = useState('');

  useEffect(() => {
    if (data?.content) {
      setContent(data.content);
    }
  }, [data?.content]);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading YAML...</div>;
  }

  function handleSave() {
    saveRaw.mutate(
      { type, id, content },
      {
        onSuccess: () => {
          toast.success('YAML saved');
          onClose();
        },
        onError: (err) => {
          toast.error(`Save failed: ${err.message}`);
        },
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Edit YAML</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveRaw.isPending}
          >
            {saveRaw.isPending ? 'Saving...' : 'Save'}
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="font-mono text-sm min-h-[400px] resize-y"
        spellCheck={false}
      />
    </div>
  );
}
