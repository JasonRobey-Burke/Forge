import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FileSearch, FileCog, FileCheck, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import GapCheckBadge from '@/components/GapCheckBadge';
import CopyCommand from '@/components/CopyCommand';
import { useSpecReviewFiles, type ReviewKind } from '@/hooks/useReviews';
import { useAcknowledgeWarnings } from '@/hooks/useSpecs';
import type { Spec } from '@shared/types';

const KIND_LABELS: Record<ReviewKind, string> = {
  'gap-check': 'Gap-Check Report',
  execution: 'Execution Report',
  review: 'Tech Review',
  'deep-review': 'Deep Review',
  other: 'Review',
};

const KIND_ICONS: Record<ReviewKind, typeof FileText> = {
  'gap-check': FileSearch,
  execution: FileCog,
  review: FileCheck,
  'deep-review': FileCheck,
  other: FileText,
};

interface GapCheckSectionProps {
  spec: Spec;
}

/**
 * The gap-check gate panel on a Spec's detail page: annotation summary,
 * link to the report, and every review file the pipeline has filed for
 * this Spec (gap-check, execution, tech/deep review).
 */
export default function GapCheckSection({ spec }: GapCheckSectionProps) {
  const gc = spec.gap_check;
  const { data: reviewFiles } = useSpecReviewFiles(spec.id);
  const acknowledge = useAcknowledgeWarnings();

  function handleAcknowledge() {
    acknowledge.mutate(
      { specId: spec.id },
      {
        onSuccess: () => toast.success('Warnings acknowledged — recorded on the gap_check annotation'),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to acknowledge warnings'),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          Gap-Check Gate
          <GapCheckBadge gapCheck={gc} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {gc ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span><span className="text-muted-foreground">Blockers:</span> <span className={gc.blockers > 0 ? 'font-semibold text-red-600' : ''}>{gc.blockers}</span></span>
            <span><span className="text-muted-foreground">Warnings:</span> <span className={gc.warnings > 0 ? 'font-semibold text-amber-600' : ''}>{gc.warnings}</span></span>
            <span><span className="text-muted-foreground">Rounds:</span> {gc.rounds ?? 'unrecorded'}</span>
            {gc.date && <span><span className="text-muted-foreground">Gated:</span> {gc.date}</span>}
            {gc.status === 'warnings' && (
              <Badge variant={gc.warnings_acknowledged ? 'secondary' : 'destructive'} className="text-xs">
                {gc.warnings_acknowledged ? 'Warnings acknowledged' : 'Acknowledgment pending'}
              </Badge>
            )}
            {gc.status === 'warnings' && !gc.warnings_acknowledged && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAcknowledge}
                disabled={acknowledge.isPending}
              >
                {acknowledge.isPending ? 'Recording...' : 'Acknowledge warnings'}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This Spec has not passed through the adversarial gap-check gate. Doctrine: every Spec
              is gap-checked before execution — the gate simulates the implementing agent and reports
              every point where it would have to guess.
            </p>
            <CopyCommand
              label="Run the gate in Claude Code:"
              command={`/idd-framework:gap-check ${spec.id}`}
            />
          </div>
        )}

        {reviewFiles && reviewFiles.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-1">Pipeline reports</p>
            <ul className="space-y-1">
              {reviewFiles.map((file) => {
                const Icon = KIND_ICONS[file.kind];
                return (
                  <li key={file.name}>
                    <Link
                      to={`/reviews/${encodeURIComponent(file.name)}`}
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>{KIND_LABELS[file.kind]}</span>
                      <span className="font-mono text-xs text-muted-foreground">{file.name}.md</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
