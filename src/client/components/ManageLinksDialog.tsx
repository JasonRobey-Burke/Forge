import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProductExpectations } from '@/hooks/useExpectations';
import { useIntentions } from '@/hooks/useIntentions';
import { useSpecs, useUpdateSpec } from '@/hooks/useSpecs';
import { EXPECTATION_STATUS_LABELS } from '@/lib/phaseColors';
import type { Spec } from '@shared/types';

interface ManageLinksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spec: Spec & {source: import('@shared/types/source').SourceMeta};
  linkedExpectationIds: string[];
}

function CheckRow({
  id, checked, onToggle, children,
}: { id: string; checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60 cursor-pointer"
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 h-4 w-4 rounded border-input shrink-0"
      />
      <span className="min-w-0">{children}</span>
    </label>
  );
}

/**
 * One place to edit everything a Spec points at: linked Expectations
 * (the contract it implements), the Intentions it serves, and the sibling
 * Specs it depends on. Everything here was previously editable only by
 * hand-editing YAML.
 */
export default function ManageLinksDialog({ open, onOpenChange, spec, linkedExpectationIds }: ManageLinksDialogProps) {
  const { data: expectations } = useProductExpectations(spec.product_id);
  const { data: intentions } = useIntentions(spec.product_id);
  const { data: siblings } = useSpecs(spec.product_id);
  const updateSpec = useUpdateSpec();
  const busy=useRef(false);

  const [revision, setRevision] = useState('');
  const [expIds, setExpIds] = useState<Set<string>>(new Set());
  const [intentionIds, setIntentionIds] = useState<Set<string>>(new Set());
  const [dependsOn, setDependsOn] = useState<Set<string>>(new Set());

  // Reset selections from the spec each time the dialog opens
  useEffect(() => {
    if (open) {
      setRevision(spec.source.revision);
      setExpIds(new Set(linkedExpectationIds));
      setIntentionIds(new Set(spec.intentions ?? []));
      setDependsOn(new Set(spec.depends_on ?? []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const expectationsByIntention = useMemo(() => {
    const groups = new Map<string, typeof expectations>();
    for (const exp of expectations ?? []) {
      const list = groups.get(exp.intention_id) ?? [];
      list.push(exp);
      groups.set(exp.intention_id, list);
    }
    return groups;
  }, [expectations]);

  const intentionTitle = (id: string) => intentions?.find((i) => i.id === id)?.title ?? id;

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    if(busy.current)return;
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  }

  const isPending = updateSpec.isPending;

  async function handleSave() {
    if(busy.current)return;busy.current=true;
    try {
      await updateSpec.mutateAsync({
        id: spec.id, revision, expectation_ids: [...expIds],
        product_id: spec.product_id,
        intentions: [...intentionIds],
        depends_on: [...dependsOn],
      });
      toast.success('Links updated');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update links');
    } finally {busy.current=false;}
  }

  const otherSpecs = (siblings ?? []).filter((s) => s.id !== spec.id);

  return (
    <Dialog open={open} onOpenChange={next=>{if(!busy.current)onOpenChange(next);}}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage links</DialogTitle>
          <DialogDescription>
            What this Spec implements (Expectations), serves (Intentions), and builds on (other Specs).
          </DialogDescription>
        </DialogHeader>

        <fieldset disabled={isPending} className="max-h-[55vh] overflow-y-auto space-y-5 pr-1">
          <section>
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
              Expectations
              <Badge variant="secondary" className="text-xs">{expIds.size} linked</Badge>
            </h3>
            {(expectations ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground px-2">
                No Expectations exist for this product yet. Define them first — a Spec with no linked Expectation cannot reach Ready.
              </p>
            ) : (
              [...expectationsByIntention.entries()].map(([intId, exps]) => (
                <div key={intId} className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground px-2 mb-0.5">
                    {intentionTitle(intId)}
                  </p>
                  {(exps ?? []).map((exp) => (
                    <CheckRow
                      key={exp.id}
                      id={`link-exp-${exp.id}`}
                      checked={expIds.has(exp.id)}
                      onToggle={() => toggle(expIds, setExpIds, exp.id)}
                    >
                      <span className="font-mono text-xs text-muted-foreground mr-1.5">{exp.id}</span>
                      {exp.title}
                      <Badge variant="outline" className="ml-2 text-xs">
                        {EXPECTATION_STATUS_LABELS[exp.status] ?? exp.status}
                      </Badge>
                    </CheckRow>
                  ))}
                </div>
              ))
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
              Intentions
              <Badge variant="secondary" className="text-xs">{intentionIds.size} linked</Badge>
            </h3>
            {(intentions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground px-2">No Intentions exist for this product yet.</p>
            ) : (
              (intentions ?? []).map((intention) => (
                <CheckRow
                  key={intention.id}
                  id={`link-int-${intention.id}`}
                  checked={intentionIds.has(intention.id)}
                  onToggle={() => toggle(intentionIds, setIntentionIds, intention.id)}
                >
                  <span className="font-mono text-xs text-muted-foreground mr-1.5">{intention.id}</span>
                  {intention.title}
                </CheckRow>
              ))
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
              Depends on
              <Badge variant="secondary" className="text-xs">{dependsOn.size} linked</Badge>
            </h3>
            {otherSpecs.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2">No other Specs in this product.</p>
            ) : (
              otherSpecs.map((s) => (
                <CheckRow
                  key={s.id}
                  id={`link-dep-${s.id}`}
                  checked={dependsOn.has(s.id)}
                  onToggle={() => toggle(dependsOn, setDependsOn, s.id)}
                >
                  <span className="font-mono text-xs text-muted-foreground mr-1.5">{s.id}</span>
                  {s.title}
                </CheckRow>
              ))
            )}
          </section>
        </fieldset>

        {updateSpec.error && <p role="alert" className="text-destructive">{updateSpec.error.message}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save links'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
