import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
export default function DraftGuard({dirty,onDiscard,saving=false,pending,onCancel,onProceed,canLeave}:{dirty: boolean;saving?:boolean;onDiscard:()=>void;pending:boolean;onCancel:()=>void;onProceed:()=>void;canLeave:()=>boolean}) {
  const blocker=useBlocker(()=>(dirty||saving)&&!canLeave());
  useEffect(()=>{
    const protect=(event:BeforeUnloadEvent)=>{if((dirty||saving)&&!canLeave()){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect);
  },[dirty,saving,canLeave]);
  const blocked=blocker.state==='blocked';
  useEffect(()=>{if(saving&&blocker.state==='blocked')blocker.reset();},[saving,blocker]);
  function keep(){if(blocked) blocker.reset(); else onCancel();}
  return <Dialog open={!saving&&(pending||blocked)} onOpenChange={open=>{if(!open)keep();}}><DialogContent>
    <DialogTitle>Unsaved changes</DialogTitle><DialogDescription>Your draft has unsaved changes. {saving?'A save is in progress. Wait before leaving.':'Discard it to continue?'}</DialogDescription>
    <div className="flex justify-end gap-3"><Button variant="outline" onClick={keep}>Keep editing</Button><Button disabled={saving} onClick={()=>{if(saving)return;onDiscard();if(blocked)blocker.proceed();else onProceed();}}>Discard changes</Button></div>
  </DialogContent></Dialog>;
}
