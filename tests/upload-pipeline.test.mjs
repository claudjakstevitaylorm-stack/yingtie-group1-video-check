import test from 'node:test';
import assert from 'node:assert/strict';
import {createUploadPipeline} from '../upload-pipeline.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const tick=()=>new Promise(r=>setImmediate(r));
async function until(check){for(let i=0;i<100;i++){if(check())return;await tick();}assert.fail('pipeline did not reach expected state');}
const item=id=>({id,done:false,videoUploaded:false});
test('batch and later additions upload while the first audit is still running',async()=>{
 const jobs=[item('a'),item('b')],events=[],gate=deferred();const pipe=createUploadPipeline({getItems:()=>jobs,upload:async q=>events.push('upload:'+q.id),audit:async q=>{events.push('audit:'+q.id);if(q.id==='a')await gate.promise;}});
 const completion=pipe.start();assert.equal(pipe.start(),completion);await until(()=>jobs[0].auditing&&jobs[1].videoUploaded);jobs.push(item('c'));pipe.wake();await until(()=>jobs[2].videoUploaded);assert.equal(jobs[0].done,false);assert.equal(jobs[1].done,false);assert.equal(events.includes('upload:c'),true);assert.equal(events.includes('audit:b'),false);gate.resolve();await completion;assert.ok(jobs.every(q=>q.done));assert.equal(events.filter(e=>e==='upload:a').length,1);
});
test('uploads use bounded parallel slots while audits remain serial',async()=>{
 const jobs=Array.from({length:6},(_,i)=>item(i)),gates=jobs.map(deferred);let uploads=0,maxUploads=0,audits=0,maxAudits=0;const pipe=createUploadPipeline({getItems:()=>jobs,upload:async q=>{uploads++;maxUploads=Math.max(maxUploads,uploads);await gates[q.id].promise;uploads--;},audit:async()=>{audits++;maxAudits=Math.max(maxAudits,audits);await tick();audits--;}});const complete=pipe.start();await until(()=>uploads===2);assert.equal(jobs[2].started,undefined);for(const g of gates)g.resolve();await complete;assert.equal(maxUploads,2);assert.equal(maxAudits,1);assert.ok(jobs.every(q=>q.done));
});
test('one failed upload or audit does not block the rest of the batch',async()=>{
 const jobs=['upload-fail','audit-fail','ok'].map(item),errors=[];const pipe=createUploadPipeline({getItems:()=>jobs,upload:async q=>{if(q.id==='upload-fail')throw new Error('network');},audit:async q=>{if(q.id==='audit-fail')throw new Error('ocr');},onError:async(q,e,phase)=>errors.push([q.id,phase])});await pipe.start();assert.deepEqual(errors,[['upload-fail','upload'],['audit-fail','audit']]);assert.ok(jobs.every(q=>q.done));assert.equal(jobs[2].failed,undefined);
});
test('stop drains already uploaded audits and resume never reuploads completed items',async()=>{
 const jobs=[item('a'),item('b')],gate=deferred(),uploaded=[];const pipe=createUploadPipeline({getItems:()=>jobs,uploadConcurrency:1,upload:async q=>{uploaded.push(q.id);if(q.id==='a')await gate.promise;},audit:async()=>{}});const first=pipe.start();await until(()=>uploaded.length===1);pipe.stop();gate.resolve();assert.equal((await first).stopped,true);assert.equal(jobs[0].done,true);assert.equal(jobs[1].started,undefined);await pipe.start();assert.deepEqual(uploaded,['a','b']);assert.equal(jobs[1].done,true);
});
test('queues in two pages progress independently and removed waiting items stay removed',async()=>{
 const jobs=[item('blocked'),item('removed')],other=[item('independent')],gate=deferred(),uploaded=[];const first=createUploadPipeline({getItems:()=>jobs,uploadConcurrency:1,upload:async q=>{uploaded.push(q.id);await gate.promise;},audit:async()=>{}}),second=createUploadPipeline({getItems:()=>other,upload:async()=>{},audit:async()=>{}});const complete=first.start();await until(()=>uploaded.length===1);jobs.splice(1,1);await second.start();assert.equal(other[0].done,true);assert.equal(jobs[0].done,false);gate.resolve();await complete;assert.deepEqual(uploaded,['blocked']);
});
