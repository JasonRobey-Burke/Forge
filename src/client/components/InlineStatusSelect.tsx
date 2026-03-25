import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InlineStatusSelectProps {
  value: string;
  labels: Record<string, string>;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function InlineStatusSelect({ value, labels, onChange, disabled }: InlineStatusSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-7 w-auto gap-1.5 rounded-full border-dashed px-2.5 text-xs font-semibold focus:ring-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(labels).map(([key, label]) => (
          <SelectItem key={key} value={key}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
