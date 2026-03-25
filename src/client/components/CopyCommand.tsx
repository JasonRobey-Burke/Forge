import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyCommandProps {
  label: string;
  command: string;
}

export default function CopyCommand({ label, command }: CopyCommandProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-3 rounded-md border border-dashed border-muted-foreground/30 bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="text-xs bg-background rounded px-1.5 py-0.5 font-mono flex-1 select-all">
          {command}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
