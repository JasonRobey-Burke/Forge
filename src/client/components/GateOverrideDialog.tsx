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
  const isGapCheckGate = gateName.startsWith('GAP_CHECK_');

  const gapCheckCopy: Record<string, { title: string; description: string }> = {
    GAP_CHECK_REQUIRED: {
      title: 'Gap-Check Required',
      description:
        'This Spec has not passed the adversarial gap-check gate. Doctrine: every Spec is gap-checked before execution so the implementing agent never has to guess. Run /idd-framework:gap-check, or provide a reason to override.',
    },
    GAP_CHECK_BLOCKED: {
      title: 'Gap-Check Blocked',
      description: `The gap-check gate reported ${spec?.gap_check?.blockers ?? '?'} unresolved Blocker(s). Doctrine: Blockers are fixed in the Spec by its author, never worked around at execution time. Overriding here is recorded in the audit trail.`,
    },
    GAP_CHECK_WARNINGS_UNACKNOWLEDGED: {
      title: 'Gap-Check Warnings Not Acknowledged',
      description: `The gap-check gate reported ${spec?.gap_check?.warnings ?? '?'} Warning(s) with no recorded human acknowledgment. Review the report and set gap_check.warnings_acknowledged: true, or provide a reason to override.`,
    },
  };

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
            {isGapCheckGate
              ? gapCheckCopy[gateName]?.title ?? 'Gap-Check Gate'
              : isPeerReviewGate ? 'Peer Review Required' : 'Checklist Incomplete'}
          </DialogTitle>
          <DialogDescription>
            {isGapCheckGate
              ? gapCheckCopy[gateName]?.description ?? 'The gap-check gate blocked this transition. Provide a reason to override.'
              : isPeerReviewGate
                ? 'This spec has not been peer-reviewed. Provide a reason to override.'
                : `${result ? result.total - result.passed : 0} item(s) not yet met. Provide a reason to override.`}
          </DialogDescription>
        </DialogHeader>
        {!isPeerReviewGate && !isGapCheckGate && result && (
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
