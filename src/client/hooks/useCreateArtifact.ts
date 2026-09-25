import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetchSourced } from '@/lib/api';
import type { CreateIntentionDraft, CreateExpectationDraft } from '@shared/schemas/creation';
import type { Intention, Expectation } from '@shared/types';
export function useCreateArtifact(type:'intentions'|'expectations') {
  const qc=useQueryClient();
  return useMutation({retry:false,mutationFn:({input,parentRevision}:{input:CreateIntentionDraft|CreateExpectationDraft;parentRevision:string})=>apiFetchSourced<Intention|Expectation>(`/${type}`,{method:'POST',headers:{'If-Match':parentRevision},body:JSON.stringify(input)}),onSuccess:()=>{void qc.invalidateQueries();}});
}
