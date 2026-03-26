import { Check, X } from 'lucide-react';
import CollapsibleSection from '@/components/CollapsibleSection';
import { Badge } from '@/components/ui/badge';

interface AdditionalFieldsProps {
  extras: Record<string, unknown>;
  title?: string;
  defaultOpen?: boolean;
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string');
}

function isObjectArray(value: unknown): value is Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((v) => typeof v === 'object' && v !== null && !Array.isArray(v))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function renderValue(key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'boolean') {
    return (
      <div key={key} className="space-y-1">
        <p className="text-sm text-muted-foreground">{formatKey(key)}</p>
        <div className="text-sm">
          {value ? (
            <Check className="h-4 w-4 text-green-500 inline" />
          ) : (
            <X className="h-4 w-4 text-gray-400 inline" />
          )}
        </div>
      </div>
    );
  }

  if (typeof value === 'string') {
    return (
      <div key={key} className="space-y-1">
        <p className="text-sm text-muted-foreground">{formatKey(key)}</p>
        <p className="text-sm whitespace-pre-wrap">{value}</p>
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div key={key} className="space-y-1">
        <p className="text-sm text-muted-foreground">{formatKey(key)}</p>
        <p className="text-sm">{String(value)}</p>
      </div>
    );
  }

  if (isStringArray(value)) {
    const allShort = value.every((s) => s.length < 60);
    if (allShort) {
      return (
        <div key={key} className="space-y-1">
          <p className="text-sm text-muted-foreground">{formatKey(key)}</p>
          <div className="flex flex-wrap gap-1">
            {value.map((item, i) => (
              <Badge key={i} variant="secondary">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div key={key} className="space-y-1">
        <p className="text-sm text-muted-foreground">{formatKey(key)}</p>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {value.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (isObjectArray(value)) {
    return (
      <div key={key} className="space-y-1">
        <p className="text-sm text-muted-foreground">{formatKey(key)}</p>
        <div className="space-y-2">
          {value.map((obj, i) => (
            <div key={i} className="rounded-lg border p-3 bg-muted/30">
              <div className="space-y-2">
                {Object.entries(obj).map(([k, v]) => {
                  if (v === null || v === undefined) return null;
                  return renderValue(k, v);
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isRecord(value)) {
    return (
      <CollapsibleSection key={key} title={formatKey(key)} defaultOpen={false}>
        <div className="space-y-3">
          {Object.entries(value).map(([k, v]) => {
            if (v === null || v === undefined) return null;
            return renderValue(k, v);
          })}
        </div>
      </CollapsibleSection>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div key={key} className="space-y-1">
        <p className="text-sm text-muted-foreground">{formatKey(key)}</p>
        <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
      </div>
    );
  }

  return null;
}

export default function AdditionalFields({
  extras,
  title = 'Additional Details',
  defaultOpen = false,
}: AdditionalFieldsProps) {
  if (Object.keys(extras).length === 0) {
    return null;
  }

  return (
    <CollapsibleSection title={title} defaultOpen={defaultOpen}>
      <div className="space-y-3">
        {Object.entries(extras).map(([key, value]) => {
          if (value === null || value === undefined) return null;
          return renderValue(key, value);
        })}
      </div>
    </CollapsibleSection>
  );
}
