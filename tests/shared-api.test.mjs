import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/index.js';
import {createLocalEnv} from '../scripts/local-env.mjs';
import {VERSION} from '../engine.js';
const A='a'.repeat(64),B='b'.repeat(64);
const bytes=new Uint8Array([0,1,2,3,4,5,6,7,8,9]);
const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
const feature={version:VERSION,name:'test.mp4',sha,duration:30,size:10,frames:[{hash:'0'.repeat(63),color:[1,0,0,0,1,0,0,0,1,0,0,0]}],subtitles:'this is a long enough english caption sentence',bgm:{status:'none',source:'declared-none',frames:[]},subtitleStatus:'ok',overlays:'special offer now',overlayStatus:'ok',errors:[],thumbnail:'data:image/jpeg;base64,AA=='};
function client(env,token){return async(path,method='GET',body,headers={})=>{const h={...headers};if(token)h['X-Owner-Token']=token;if(body&&!(body instanceof Uint8Array)){h['Content-Type']='application/json';body=JSON.stringify(body);}return worker.fetch(new Request('https://example.test'+path,{method,headers:h,...(body?{body}: {})}),env);};}
async function uploaded(env,kind='video',token=A,scope={}){const c=client(env,token);const r=await c('/api/uploads','POST',{name:'sample.mp4',member:'组员甲',size:bytes.length,mime:'video/mp4',kind,...(kind==='template'?{hitName:'sample'}:{}),...scope});assert.equal(r.status,201);const start=await r.json();const put=await c(start.uploadUrl,'PUT',bytes,{'X-Video-Sha256':sha,'Content-Length':String(bytes.length)});assert.equal(put.status,200);return{c,id:start.id};}
test('two independent browsers and anonymous visitors see the same original video and report',async()=>{const env=createLocalEnv(),{c,id}=await uploaded(env);const done=await c('/api/uploads/'+id+'/finalize','POST',{feature:{...feature,speech:'same speech must be ignored',speechStatus:'review'}});assert.equal(done.status,200);const other=client(env,B),list=await(await other('/api/records')).json();assert.equal(list.total,1);assert.equal(list.records[0].member,'组员甲');assert.equal(list.records[0].canEdit,false);assert.equal(list.records[0].status,'review');assert.equal(list.records[0].videoUrl,'/api/videos/'+id);const video=await client(env)('/api/videos/'+id);assert.deepEqual(new Uint8Array(await video.arrayBuffer()),bytes);const detail=await(await other('/api/records/'+id)).json();assert.equal(detail.speech,undefined);assert.equal(detail.bgm.status,'none');assert.equal(detail.owner_hash,undefined);assert.equal((await(await c('/api/records')).json()).records[0].canEdit,true);});
test('video playback supports range requests and rejects invalid ranges',async()=>{const env=createLocalEnv(),{id}=await uploaded(env);const c=client(env);const part=await c('/api/videos/'+id,'GET',undefined,{Range:'bytes=2-5'});assert.equal(part.status,206);assert.equal(part.headers.get('Content-Range'),'bytes 2-5/10');assert.deepEqual(new Uint8Array(await part.arrayBuffer()),bytes.slice(2,6));const suffix=await c('/api/videos/'+id,'GET',undefined,{Range:'bytes=-2'});assert.deepEqual(new Uint8Array(await suffix.arrayBuffer()),bytes.slice(-2));assert.equal((await c('/api/videos/'+id,'GET',undefined,{Range:'bytes=100-'})).status,416);assert.equal((await c('/api/videos/'+id,'HEAD')).headers.get('Content-Length'),'10');});
test('shared templates are visible to all browsers and scores are recomputed by server',async()=>{const env=createLocalEnv(),template=await uploaded(env,'template');await template.c('/api/uploads/'+template.id+'/finalize','POST',{feature});const other=client(env,B);assert.equal((await(await other('/api/templates')).json()).templates.length,1);const video=await uploaded(env,'video',B,{category:'未分类',templateId:template.id});const result=await(await video.c('/api/uploads/'+video.id+'/finalize','POST',{feature,status:'pass',score:0})).json();assert.equal(result.record.score,100);assert.equal(result.record.status,'fail');assert.equal(result.record.comparisons[0].id,template.id);assert.equal((await(await other('/api/stats')).json()).total,1);});
test('other browsers cannot finalize, delete or toggle someone else’s upload',async()=>{const env=createLocalEnv(),{id,c}=await uploaded(env,'template');const other=client(env,B);assert.equal((await other('/api/uploads/'+id+'/finalize','POST',{feature})).status,403);assert.equal((await other('/api/uploads/'+id,'DELETE')).status,403);await c('/api/uploads/'+id+'/finalize','POST',{feature});assert.equal((await other('/api/templates/'+id,'PATCH',{enabled:false})).status,403);assert.equal((await c('/api/templates/'+id,'PATCH',{enabled:false})).status,200);assert.equal((await(await other('/api/templates')).json()).templates[0].enabled,false);});
test('upload errors and missing recognition cannot turn into a pass',async()=>{const env=createLocalEnv(),{c,id}=await uploaded(env);const result=await(await c('/api/uploads/'+id+'/finalize','POST',{error:'解码失败'})).json();assert.equal(result.record.status,'review');assert.equal(result.record.state,'complete');assert.match(result.record.errors[0],/解码失败/);const pending=await(await c('/api/uploads','POST',{name:'broken.mp4',member:'甲',size:10,mime:'video/mp4',kind:'video'})).json();const failed=await(await c('/api/uploads/'+pending.id+'/finalize','POST',{error:'网络中断'})).json();assert.equal(failed.record.state,'failed');assert.equal(failed.record.videoUrl,null);});
test('size and fingerprint are checked and duplicate finalization is idempotent',async()=>{const env=createLocalEnv(),c=client(env,A);assert.equal((await c('/api/uploads','POST',{name:'x',member:'甲',size:200*1024*1024,mime:'video/mp4',kind:'video'})).status,400);const upload=await uploaded(env);assert.equal((await c('/api/uploads/'+upload.id+'/finalize','POST',{feature:{...feature,sha:'f'.repeat(64)}})).status,400);await c('/api/uploads/'+upload.id+'/finalize','POST',{feature});await c('/api/uploads/'+upload.id+'/finalize','POST',{feature});assert.equal((await(await c('/api/records')).json()).total,1);assert.equal((await c('/api/uploads/'+upload.id,'DELETE')).status,200);assert.equal((await(await c('/api/records')).json()).total,0);assert.equal((await client(env)('/api/videos/'+upload.id)).status,404);});
test('searches are parameterized, filters are shared, and CORS permits the GitHub frontend',async()=>{
 const env=createLocalEnv(),{c,id}=await uploaded(env);
 await c('/api/uploads/'+id+'/finalize','POST',{feature});
 const found=await (await c('/api/records?search='+encodeURIComponent('组员甲'))).json();
 assert.equal(found.total,1);
 const injection=await (await c('/api/records?search='+encodeURIComponent("' OR 1=1 --"))).json();
 assert.equal(injection.total,0);
 const preflight=await c('/api/records','OPTIONS');
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'*');
});
test('R2 receives the readable half of a fixed-length stream in the Worker runtime',async()=>{
 const original=globalThis.FixedLengthStream,known=new WeakSet();
 globalThis.FixedLengthStream=class extends TransformStream{constructor(length){super();assert.equal(length,bytes.length);known.add(this.readable);}};
 try{const env=createLocalEnv(),put=env.BUCKET.put.bind(env.BUCKET);env.BUCKET.put=async(key,value,options)=>{assert.ok(known.has(value),'R2 needs a stream with known length');return put(key,value,options);};await uploaded(env);}finally{if(original===undefined)delete globalThis.FixedLengthStream;else globalThis.FixedLengthStream=original;}
});

test('reuploading an owned template upgrades its feature version without erasing old reports',async()=>{
 const env=createLocalEnv(),first=await uploaded(env,'template');await first.c('/api/uploads/'+first.id+'/finalize','POST',{feature});
 await env.DB.prepare('UPDATE shared_templates SET feature=? WHERE id=?').bind(JSON.stringify({...feature,id:first.id,version:'clipguard-1',speech:'legacy words',speechStatus:'ok'}),first.id).run();
 const next=await uploaded(env,'template'),updated=await next.c('/api/uploads/'+next.id+'/finalize','POST',{feature});assert.equal(updated.status,200);
 const templates=(await(await next.c('/api/templates')).json()).templates;assert.equal(templates.length,1);assert.equal(templates[0].id,next.id);assert.equal(templates[0].version,VERSION);assert.equal(templates[0].speech,undefined);assert.equal((await first.c('/api/records/'+first.id)).status,200);
 const other=await uploaded(env,'template',B);assert.equal((await other.c('/api/uploads/'+other.id+'/finalize','POST',{feature})).status,409);
});

test('template categories match the supplied folder names and old rows remain uncategorized',async()=>{
 const env=createLocalEnv(),upload=await uploaded(env,'template');await upload.c('/api/uploads/'+upload.id+'/finalize','POST',{feature});
 const data=await(await upload.c('/api/templates')).json();assert.deepEqual(data.categories,['无人检票','拆票','Avanti','伊丽莎白','列车分厢','欧洲之星','车门关闭','LNER','GWR','豪华卧铺','睡眠列车','未分类']);assert.equal(data.templates[0].category,'未分类');
 const other=client(env,B);assert.equal((await other('/api/templates/'+upload.id,'PATCH',{category:'Avanti'})).status,403);
 assert.equal((await upload.c('/api/templates/'+upload.id,'PATCH',{category:'Avanti'})).status,200);
 assert.equal((await(await other('/api/templates')).json()).templates[0].category,'Avanti');
 assert.equal((await upload.c('/api/templates/'+upload.id,'PATCH',{category:'bad-category'})).status,400);
});
test('selected template alone determines the result even when an unselected template is identical',async()=>{
 const env=createLocalEnv(),selected=await uploaded(env,'template',A,{category:'Avanti'});
 const different={...feature,frames:[{...feature.frames[0],hash:'1'.repeat(63)}],subtitles:'unrelated picture words provide different information',sha:'f'.repeat(64)};
 // Separate original file checksum for the selected template; an identical-to-upload template must not influence this result.
 await env.BUCKET.put('videos/'+selected.id,new Blob([bytes]).stream(),{customMetadata:{sha:different.sha}});
 await selected.c('/api/uploads/'+selected.id+'/finalize','POST',{feature:different});
 const ignored=await uploaded(env,'template',A,{category:'Avanti'});await ignored.c('/api/uploads/'+ignored.id+'/finalize','POST',{feature});
 const video=await uploaded(env,'video',B,{category:'Avanti',templateId:selected.id});
 const result=await(await video.c('/api/uploads/'+video.id+'/finalize','POST',{feature,templateId:ignored.id})).json();
 assert.equal(result.record.status,'pass');assert.equal(result.record.score,0);assert.equal(result.record.templateCount,1);assert.equal(result.record.best.id,selected.id);assert.equal(result.record.selectedTemplateId,selected.id);assert.equal(result.record.category,'Avanti');
 const rows=await(await client(env)('/api/records?category='+encodeURIComponent('Avanti'))).json();assert.equal(rows.total,1);assert.equal(rows.records[0].selectedTemplateName,'sample+组员甲');assert.equal((await(await client(env)('/api/records?category=LNER')).json()).total,0);
});
test('invalid, mismatched, disabled or missing selections never fall back to the whole library',async()=>{
 const env=createLocalEnv(),template=await uploaded(env,'template',A,{category:'LNER'});await template.c('/api/uploads/'+template.id+'/finalize','POST',{feature});
 const c=client(env,B),registration={name:'upload.mp4',member:'乙',size:10,mime:'video/mp4',kind:'video'};
 assert.equal((await c('/api/uploads','POST',{...registration,category:'Avanti',templateId:template.id})).status,409);
 assert.equal((await c('/api/uploads','POST',{...registration,category:'LNER',templateId:crypto.randomUUID()})).status,409);
 const missing=await uploaded(env,'video',B,{category:'LNER'});const missingResult=await(await missing.c('/api/uploads/'+missing.id+'/finalize','POST',{feature})).json();assert.equal(missingResult.record.status,'review');assert.equal(missingResult.record.comparisons.length,0);
 for(const mutation of [{enabled:false},{category:'GWR'}]){
  await template.c('/api/templates/'+template.id,'PATCH',{enabled:true,category:'LNER'});
  const pending=await uploaded(env,'video',B,{category:'LNER',templateId:template.id});await template.c('/api/templates/'+template.id,'PATCH',mutation);
  const r=await(await pending.c('/api/uploads/'+pending.id+'/finalize','POST',{feature})).json();assert.equal(r.record.status,'review');assert.equal(r.record.comparisons.length,0);assert.match(r.record.errors.join(' '),/所选模板/);
 }
});

test('server applies the any-dimension rule with separate subtitle and decorative text scores',async()=>{
 const env=createLocalEnv(),ref=await uploaded(env,'template',A,{category:'Avanti'});
 const reference={...feature,sha:'e'.repeat(64),overlays:'buy our popular products',bgm:{status:'review',source:'unconfirmed',frames:[]}};
 await env.BUCKET.put('videos/'+ref.id,new Blob([bytes]).stream(),{customMetadata:{sha:reference.sha}});await ref.c('/api/uploads/'+ref.id+'/finalize','POST',{feature:reference});
 const video=await uploaded(env,'video',B,{category:'Avanti',templateId:ref.id});const result=await(await video.c('/api/uploads/'+video.id+'/finalize','POST',{feature:{...feature,bgm:{status:'review',source:'unconfirmed',frames:[]}}})).json();
 assert.equal(result.record.status,'pass');assert.equal(result.record.best.visual,100);assert.equal(result.record.best.subtitle,100);assert.equal(result.record.best.overlay,0);assert.equal(result.record.best.bgm,null);assert.deepEqual(result.record.qualifying,['overlay']);assert.equal(result.record.score,0);assert.equal(result.record.decision,'any-dimension-at-most');assert.equal(result.record.overlays,feature.overlays);
});

test('templates enter the library without feature extraction, review status or a content decision',async()=>{
 const env=createLocalEnv(),upload=await uploaded(env,'template',A,{hitName:'伊丽莎白爆款',category:'伊丽莎白'});
 const response=await upload.c('/api/uploads/'+upload.id+'/finalize','POST',{templateOnly:true});assert.equal(response.status,200);const accepted=await response.json();assert.equal(accepted.record.status,null);assert.equal(accepted.record.reviewRequired,false);assert.equal(accepted.record.name,'伊丽莎白爆款+组员甲');assert.equal(accepted.record.state,'complete');
 let templates=(await(await upload.c('/api/templates')).json()).templates;assert.equal(templates.length,1);assert.equal(templates[0].featureReady,false);assert.equal(templates[0].preparationState,'pending');assert.equal(templates[0].reviewRequired,false);
 const cannotUse=await upload.c('/api/uploads','POST',{name:'check.mp4',member:'甲',kind:'video',mime:'video/mp4',size:10,category:'伊丽莎白',templateId:upload.id});assert.equal(cannotUse.status,409);
 await upload.c('/api/templates/'+upload.id+'/features','POST',{error:'OCR模型暂时不可用'});templates=(await(await upload.c('/api/templates')).json()).templates;assert.equal(templates.length,1);assert.equal(templates[0].preparationState,'error');assert.equal((await(await upload.c('/api/records/'+upload.id)).json()).status,null);
 const prepare=await upload.c('/api/templates/'+upload.id+'/features','POST',{feature:{...feature,subtitleStatus:'review',overlayStatus:'review',bgm:{status:'review',source:'unconfirmed',frames:[]},errors:['文字尚无可靠参考']}});assert.equal(prepare.status,200);templates=(await(await upload.c('/api/templates')).json()).templates;assert.equal(templates[0].featureReady,true);assert.equal(templates[0].name,'伊丽莎白爆款+组员甲');assert.equal((await(await prepare.json()).record).status,null);await env.DB.prepare('UPDATE shared_uploads SET report=?,status=? WHERE id=?').bind(JSON.stringify({status:'review',score:null}),'review',upload.id).run();assert.equal((await(await upload.c('/api/records/'+upload.id)).json()).status,null);
});
test('template names require a hit name plus the uploader name and can be renamed by the original browser',async()=>{
 const env=createLocalEnv(),upload=await uploaded(env,'template',A,{hitName:'无人检票爆款'});await upload.c('/api/uploads/'+upload.id+'/finalize','POST',{feature});
 const other=client(env,B);assert.equal((await other('/api/templates/'+upload.id,'PATCH',{hitName:'不得覆盖'})).status,403);
 assert.equal((await upload.c('/api/templates/'+upload.id,'PATCH',{hitName:'新的爆款名字'})).status,200);
 const t=(await(await other('/api/templates')).json()).templates[0];assert.equal(t.name,'新的爆款名字+组员甲');assert.equal((await(await upload.c('/api/records/'+upload.id)).json()).name,t.name);
 for(const hitName of ['', '爆款+额外名字', 'x'.repeat(121), 'bad\nname'])assert.equal((await upload.c('/api/templates/'+upload.id,'PATCH',{hitName})).status,400);
 const missing=await upload.c('/api/uploads','POST',{name:'original.mp4',member:'甲',kind:'template',size:10,mime:'video/mp4'});assert.equal(missing.status,400);const pending=await uploaded(env,'template',A,{hitName:'待准备的新模板'});await pending.c('/api/uploads/'+pending.id+'/finalize','POST',{templateOnly:true});await pending.c('/api/templates/'+pending.id,'PATCH',{hitName:'准备期间已改名'});await pending.c('/api/templates/'+pending.id+'/features','POST',{feature});assert.equal((await(await pending.c('/api/templates')).json()).templates[0].name,'准备期间已改名+组员甲');
});
test('only the template uploader can prepare reference features and the file checksum is enforced',async()=>{
 const env=createLocalEnv(),upload=await uploaded(env,'template');await upload.c('/api/uploads/'+upload.id+'/finalize','POST',{templateOnly:true});
 assert.equal((await client(env,B)('/api/templates/'+upload.id+'/features','POST',{feature})).status,403);
 assert.equal((await upload.c('/api/templates/'+upload.id+'/features','POST',{feature:{...feature,sha:'f'.repeat(64)}})).status,400);
 await upload.c('/api/uploads/'+upload.id,'DELETE');assert.equal((await upload.c('/api/templates/'+upload.id+'/features','POST',{feature})).status,404);
});
