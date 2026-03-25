import { useState, useEffect } from 'react';
import type { RefObject } from 'react';
import { Button } from '@/components/ui/button';

interface StickyEditBarProps {
  editing: boolean;
  actionBarRef: RefObject<HTMLDivElement | null>;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export default function StickyEditBar({ editing, actionBarRef, onSave, onCancel, isPending }: StickyEditBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = actionBarRef.current;
    if (!editing || !el) {
      setVisible(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [editing, actionBarRef]);

  if (!editing || !visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-between bg-zinc-900 px-6 py-3 shadow-lg">
      <span className="text-sm text-zinc-400">Unsaved changes</span>
      <div className="flex gap-2">
        <Button size="sm" variant="default" onClick={onSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </Button>
        <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-zinc-200" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
