import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import type { ArtifactType, SourceMeta } from '@shared/types/source';
import { ExpectationStatus, IntentionStatus, ProductStatus, Priority } from '@shared/types/enums';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { Button } from '@/components/ui/button';
import ProductFields from './ProductFields';
import IntentionFields from './IntentionFields';
import ExpectationFields from './ExpectationFields';
export default function ArtifactFields({type,source}:{type:ArtifactType;source:SourceMeta}) {return type==='products'?<ProductFields source={source}/>:type==='intentions'?<IntentionFields source={source}/>:<ExpectationFields source={source}/>;}
export const fieldNames = {
  products:['name','problem_statement','vision','target_audience','owner','status','context','wip_limits'],
  intentions:['title','description','rationale','owner','priority','status','dependencies'],
  expectations:['title','description','validation_criteria','owner','complexity','status','deferred_reason','edge_cases'],
  specs:[],
};
export function CommonArtifactFields({type,source}:{type:ArtifactType;source:SourceMeta}) {
  const {register,watch,setValue,formState:{errors}}=useFormContext<Record<string,unknown>>();
  const [preview,setPreview]=useState(false);
  const [replaceStatus,setReplaceStatus]=useState(false);
  const labels:Record<string,string>={name:'Name',title:'Title',problem_statement:'Problem statement',vision:'Vision',target_audience:'Primary audience',description:type==='expectations'?'Measurable outcome':'Purpose',validation_criteria:'Validation criteria',owner:'Owner',priority:'Priority',status:'Status',complexity:'Complexity',edge_cases:'Confirmed edge cases · one per line',dependencies:'Dependencies · one intention ID per line',rationale:'Rationale',deferred_reason:'Deferral reason'};
  const options:Record<string,string[]>={status:Object.values(type==='products'?ProductStatus:type==='intentions'?IntentionStatus:ExpectationStatus),priority:Object.values(Priority),complexity:['low','medium','high']};
  return <div className="space-y-5">{fieldNames[type].filter(n=>!['context','wip_limits'].includes(n)).map(name=>{
    const reason=source.read_only_fields[name]??source.read_only_fields['*'];
    const value=watch(name);
    const id=`artifact-${name}`;
    const accessibility={'aria-invalid':errors[name]?true:undefined,'aria-describedby':[reason?`${id}-note`:null,errors[name]?`${id}-error`:null].filter(Boolean).join(' ')||undefined};
    const choices=options[name];
    const unknownStatus=name==='status'&&!!value&&!choices?.includes(String(value));
    const prose=['description','problem_statement','vision','rationale','validation_criteria','deferred_reason'].includes(name);
    return <div key={name}><div className="mb-2 flex items-center justify-between"><label htmlFor={id} className="text-sm font-semibold">{labels[name]}</label>{name==='description'&&<Button type="button" size="sm" variant="ghost" onClick={()=>setPreview(!preview)}>Preview</Button>}</div>
      {choices?<select id={id} {...accessibility} className="w-full rounded-md border bg-white p-2 text-sm" disabled={!!reason||(unknownStatus&&!replaceStatus)} {...register(name)}><option value="">Not set</option>{!choices.includes(String(value??''))&&!!value&&<option value={String(value)}>{String(value)} (current)</option>}{choices.map(choice=><option key={choice} value={choice}>{choice}</option>)}</select>
      :['edge_cases','dependencies'].includes(name)?<textarea id={id} {...accessibility} rows={4} readOnly={!!reason} className="w-full rounded-md border p-3 text-sm" value={Array.isArray(value)?value.join('\n'):String(value??'')} onChange={e=>setValue(name,(name==='dependencies'?e.target.value.split('\n').filter(Boolean):e.target.value.split('\n')),{shouldDirty:true})}/>
      :prose?<textarea id={id} {...accessibility} rows={name==='description'?5:3} readOnly={!!reason} className="w-full rounded-md border p-3 text-sm" {...register(name)}/>
      :<input id={id} {...accessibility} readOnly={!!reason} className="w-full rounded-md border p-2 text-sm" {...register(name)}/>}
      {unknownStatus&&!reason&&!replaceStatus&&<Button type="button" variant="outline" size="sm" onClick={()=>setReplaceStatus(true)}>Replace unknown status</Button>}
      {reason&&<p id={`${id}-note`} className="mt-1 text-sm text-amber-800">{reason}</p>}
      {errors[name]&&<p id={`${id}-error`} role="alert" className="text-sm text-red-700">{String(errors[name]?.message)}</p>}
      {name==='description'&&preview&&<div className="mt-2 rounded border bg-stone-50 p-3"><MarkdownRenderer content={String(value??'')}/></div>}
    </div>;
  })}<p className="text-xs text-stone-600">Editing status does not add validation evidence.</p></div>;
}
