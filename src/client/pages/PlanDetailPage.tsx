import { useParams } from 'react-router-dom';
import { usePlan } from '@/hooks/usePlans';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent } from '@/components/ui/card';
import Breadcrumbs from '@/components/Breadcrumbs';
import DetailPageSkeleton from '@/components/skeletons/DetailPageSkeleton';
import MarkdownRenderer from '@/components/MarkdownRenderer';

export default function PlanDetailPage() {
  const { name } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name ?? '');
  const { data: plan, isLoading, error } = usePlan(decodedName);
  useDocumentTitle(decodedName || 'Plan');

  if (isLoading) return <DetailPageSkeleton />;
  if (error || !plan) return <div className="text-destructive">Plan not found.</div>;

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Plans', href: '/plans' },
        { label: plan.name },
      ]} />

      <h1 className="text-xl font-semibold mb-4">{plan.name}</h1>

      <Card>
        <CardContent className="pt-6">
          <MarkdownRenderer content={plan.content} />
        </CardContent>
      </Card>
    </div>
  );
}
