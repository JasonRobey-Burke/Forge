import { useEffect, useRef, useState } from 'react';
import type { ArtifactRef, Versioned } from '@shared/types/source';
import { reduceDraft, draftKey, readRecovery, clearRecovery, validRecovery, type ArtifactDraft } from '@/lib/artifactDraft';
export function useArtifactDraft<T>(ref:ArtifactRef,record:Versioned<T>,initial?:ArtifactDraft<T>) {
  const locked=useRef(false);
  const [pending,setPending]=useState(false);
  function setSaving(value:boolean){locked.current=value;setPending(value);}
  const latest=useRef(record); latest.current=record;
  const [draft,setDraft]=useState<ArtifactDraft<T>>(()=>initial??({ref,source:record.source,baseline:record.data,values:record.data,dirty:false,recovery_unavailable:false}));
  const current=useRef(draft); current.current=draft;
  const [recovery,setRecovery]=useState<ArtifactDraft<T>|null>(()=>{try{return readRecovery<T>(ref,record.source,record.data);}catch{return null;}});
  useEffect(()=>{try{readRecovery(ref,record.source,record.data);}catch{setDraft(d=>({...d,recovery_unavailable:true}));}},[]);
  useEffect(()=>{setDraft(d=>reduceDraft(d,{type:'external',source:record.source}));},[record.source.revision]);
  function publish(next:ArtifactDraft<T>) {current.current=next;setDraft(next);}
  function change(values:T) {
    if(locked.current)return;
    let next=reduceDraft(current.current,{type:'edit',values});
    try {
      if(next.dirty) sessionStorage.setItem(draftKey(ref,next.source),JSON.stringify({version:1,ref,source:next.source,baseline:next.baseline,values}));
      else clearRecovery(ref,next.source);
    }catch{next={...next,recovery_unavailable:true};}
    publish(next);
  }
  function adopt(next:Versioned<T>) {
    let updated=reduceDraft(current.current,{type:'saved',record:next});
    try{clearRecovery(ref,current.current.source);}catch{updated={...updated,recovery_unavailable:true};}
    setRecovery(null);publish(updated);
  }
  return {draft,change,pending,setSaving,saved:adopt,reload:(next:Versioned<T>)=>{if(!locked.current)adopt(next);},discard:()=>{if(!locked.current)adopt(latest.current);},recovery,
    restore:(recovered:ArtifactDraft<T>)=>{
      if(locked.current)return;
      if(!validRecovery(recovered,ref,record.source,record.data)) return;
      publish(reduceDraft(recovered,{type:'external',source:latest.current.source}));setRecovery(null);
    }};
}
