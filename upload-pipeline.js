// Per-page upload and audit lanes. Uploads can continue while one audit is running.
export function createUploadPipeline({getItems,upload,audit,onError=()=>{},onChange=()=>{},uploadConcurrency=2}){
 let running=false,stopping=false,uploads=0,audits=0,completion,resolveCompletion;
 const notify=()=>onChange({running,stopping,uploads,audits});
 const launch=(q,phase,work)=>{if(phase==='upload'){uploads++;q.started=true;q.uploading=true;}else{audits++;q.auditing=true;}Promise.resolve().then(()=>work(q)).then(()=>{if(phase==='upload')q.videoUploaded=true;else q.done=true;}).catch(async error=>{q.failed=true;q.done=true;try{await onError(q,error,phase);}catch{}}).finally(()=>{if(phase==='upload'){uploads--;q.uploading=false;}else{audits--;q.auditing=false;}pump();});};
 function pump(){
  if(!running)return;
  if(!stopping)while(uploads<uploadConcurrency){const q=getItems().find(q=>!q.done&&!q.started);if(!q)break;launch(q,'upload',upload);}
  if(!audits){const q=getItems().find(q=>q.videoUploaded&&!q.done&&!q.uploading&&!q.auditing);if(q)launch(q,'audit',audit);}
  if(!uploads&&!audits){running=false;const resolve=resolveCompletion;resolveCompletion=null;notify();resolve?.({stopped:stopping});return;}
  notify();
 }
 return{get running(){return running;},get stopping(){return stopping;},start(){if(running)return completion;running=true;stopping=false;completion=new Promise(resolve=>{resolveCompletion=resolve;});pump();return completion;},wake(){pump();},stop(){stopping=true;pump();}};
}
