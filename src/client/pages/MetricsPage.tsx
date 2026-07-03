import { Link, useParams } from 'react-router-dom';
import { useProduct } from '@/hooks/useProducts';
import { usePipelineMetrics } from '@/hooks/useMetrics';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import Breadcrumbs from '@/components/Breadcrumbs';
import GapCheckBadge from '@/components/GapCheckBadge';
import DetailPageSkeleton from '@/components/skeletons/DetailPageSkeleton';
import { PhaseBadge } from '@/lib/phaseColors';
import TermHint from '@/components/TermHint';
import type { SpecMetricsRow } from '@/hooks/useMetrics';

function StatCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function findingsCell(row: SpecMetricsRow): string {
  if (row.first_round_findings === null) return '—';
  if (row.first_round_findings === 'not derivable') return 'not derivable';
  return String(row.first_round_findings);
}

export default function MetricsPage() {
  const { productId } = useParams<{ productId: string }>();
  const { data: product } = useProduct(productId!);
  const { data: metrics, isLoading, error } = usePipelineMetrics(productId!);
  useDocumentTitle(product?.name ? `${product.name} — Metrics` : 'Metrics');

  if (isLoading) return <DetailPageSkeleton />;
  if (error || !metrics) return <div className="text-destructive">Failed to load metrics.</div>;

  const { gate, flow, rows } = metrics;
  const rate = gate.gap_check_first_round_pass_rate;
  const rateLabel = rate.confirmed > 0
    ? `${rate.passed_first_round}/${rate.confirmed} (${Math.round((rate.passed_first_round / rate.confirmed) * 100)}%)`
    : '—';
  const reviewRate = flow.first_pass_rate_review;
  const reviewRateLabel = reviewRate.entered > 0
    ? `${reviewRate.passed}/${reviewRate.entered} (${Math.round((reviewRate.passed / reviewRate.entered) * 100)}%)`
    : '—';

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Products', href: '/products' },
        { label: product?.name ?? '...', href: `/products/${productId}` },
        { label: 'Metrics' },
      ]} />
      <h1 className="text-2xl font-bold mb-1">{product?.name} — Pipeline Metrics</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Computed read-only from the artifacts the pipeline already emits: <code>gap_check</code> annotations,
        execution reports, and phase history. Nothing is instrumented; nothing is written.
      </p>

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Gate stage</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          title="Gap-Check First-Round Pass Rate"
          value={rateLabel}
          hint={`Specs whose annotation records rounds = 1, over ${rate.confirmed} confirmed-rounds gated Spec(s)${gate.assumed > 0 ? `; ${gate.assumed} assumed row(s) excluded` : ''}. Distinct from the review-stage First-Pass Rate.`}
        />
        <StatCard
          title="Avg Rounds to Pass"
          value={gate.avg_rounds_to_pass !== null ? gate.avg_rounds_to_pass.toFixed(1) : '—'}
          hint="Gate rounds before clearing, over cleared Specs with recorded rounds."
        />
        <StatCard
          title="Gated / Ungated"
          value={`${gate.gated} / ${gate.ungated}`}
          hint="Ungated Specs have no gap_check annotation — the gate has not run."
        />
        <StatCard
          title="Assumed Rows"
          value={String(gate.assumed)}
          hint="Gated but rounds unrecorded; excluded from the first-round rate numerator AND denominator."
        />
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Flow stage</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          title="First-Pass Rate (Review)"
          value={reviewRateLabel}
          hint="Specs entering Review that were never returned to an earlier phase — the review-stage metric from docs/metrics.md."
        />
        <StatCard
          title="Avg Spec Cycle Time"
          value={flow.avg_cycle_time_days !== null ? `${flow.avg_cycle_time_days.toFixed(1)}d` : '—'}
          hint="Ready → Done, from phase history."
        />
        <StatCard
          title="Review Queue Depth"
          value={String(flow.review_queue_depth)}
          hint="Specs currently sitting in Review."
        />
        <StatCard
          title="Specs Tracked"
          value={String(rows.length)}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            Per-Spec breakdown
            <TermHint
              term="not derivable"
              description="The gap_check annotation preserves only final counts plus a round total. First-round findings are derivable only for Specs that cleared on round 1; for anything else the value genuinely is not stored anywhere."
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">
              No Specs yet — metrics appear as soon as the first Spec exists.
              Create one with <code className="font-mono text-xs">/idd-framework:write-spec</code> or the Specs tab.
            </p>
          )}
          {rows.length > 0 && <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Spec</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Gate</TableHead>
                  <TableHead className="text-right">Rounds</TableHead>
                  <TableHead className="text-right">First-Round Findings</TableHead>
                  <TableHead className="text-right">Execution Gaps</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.spec_id}>
                    <TableCell>
                      <Link to={`/specs/${row.spec_id}`} className="text-primary hover:underline">
                        <span className="font-mono text-xs text-muted-foreground mr-1.5">{row.spec_id}</span>
                        {row.title}
                      </Link>
                    </TableCell>
                    <TableCell><PhaseBadge phase={row.phase as never} /></TableCell>
                    <TableCell>
                      {row.gate === 'ungated'
                        ? <Badge variant="outline" className="text-xs text-muted-foreground">not yet gated</Badge>
                        : <GapCheckBadge gapCheck={{ status: row.gate, blockers: row.blockers ?? 0, warnings: row.warnings ?? 0, rounds: row.rounds ?? undefined }} />}
                    </TableCell>
                    <TableCell className="text-right">{row.rounds ?? (row.gate === 'ungated' ? '—' : 'assumed')}</TableCell>
                    <TableCell className="text-right">{findingsCell(row)}</TableCell>
                    <TableCell className="text-right">{row.execution_gaps ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>}
        </CardContent>
      </Card>
    </div>
  );
}
