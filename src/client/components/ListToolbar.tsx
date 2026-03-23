import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterConfig {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  allLabel?: string;
}

interface ListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  filters?: FilterConfig[];
}

export default function ListToolbar({ search, onSearchChange, placeholder = 'Search...', filters }: ListToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-3">
      <Input
        type="search"
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-xs"
      />
      {filters?.map((filter) => (
        <Select key={filter.label} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{filter.allLabel ?? `All ${filter.label}`}</SelectItem>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
