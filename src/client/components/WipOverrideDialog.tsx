import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PHASE_LABELS: Record<string, string> = {
  Draft: 'Draft',
  Ready: 'Ready',
  InProgress: 'In Progress',
  Review: 'Review',
  Validating: 'Validating',
  Done: 'Done',
};

interface WipOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: string;
  currentCount: number;
  limit: number;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

export default function WipOverrideDialog({
  open,
  onOpenChange,
  phase,
  currentCount,
  limit,
  onConfirm,
  isPending,
}: WipOverrideDialogProps) {
  const [reason, setReason] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>WIP Limit Reached</DialogTitle>
          <DialogDescription>
            <Badge variant="destructive" className="mr-1">
              {PHASE_LABELS[phase] ?? phase}
            </Badge>{' '}
            already has {currentCount}/{limit} specs. Provide a reason to override the limit.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Override reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(reason)} disabled={isPending}>
            {isPending ? 'Moving...' : 'Override and Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
