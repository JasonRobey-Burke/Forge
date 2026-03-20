import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSpecExpectations } from '@/hooks/useSpecs';
import { evaluateChecklist } from '@shared/checklist/evaluator';
import type { Spec } from '@shared/types';

interface GateOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spec: Spec;
  gateName: string;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

export default function GateOverrideDialog({
  open,
  onOpenChange,
  spec,
  gateName,
  onConfirm,
  isPending,
}: GateOverrideDialogProps) {
  const [reason, setReason] = useState('');
  const { data: linkedExpectations } = useSpecExpectations(spec?.id ?? '');

  const isPeerReviewGate = gateName === 'PEER_REVIEW_REQUIRED';

  const checklistExpectations = (linkedExpectations ?? []).map((e) => ({
    id: e.id,
    description: e.description ?? '',
    edge_cases: e.edge_cases ?? [],
  }));
  const result = spec?.id ? evaluateChecklist(spec, checklistExpectations) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isPeerReviewGate ? 'Peer Review Required' : 'Checklist Incomplete'}
          </DialogTitle>
          <DialogDescription>
            {isPeerReviewGate
              ? 'This spec has not been peer-reviewed. Provide a reason to override.'
              : `${result ? result.total - result.passed : 0} item(s) not yet met. Provide a reason to override.`}
          </DialogDescription>
        </DialogHeader>
        {!isPeerReviewGate && result && (
          <ul className="text-sm space-y-1">
            {result.items
              .filter((i) => !i.passed)
              .map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <span className="text-red-500 font-bold shrink-0">✗</span>
                  <span>{item.criterion}</span>
                </li>
              ))}
          </ul>
        )}
        <Textarea
          placeholder="Override reason (optional)"
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
