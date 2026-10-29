// All records, not just the currently loaded 20-row page. UTC+8 calendar day.
export function uploadDay(now=new Date(),selected=''){const date=selected||new Date(now.getTime()+8*3600000).toISOString().slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date){const e=new Error('请选择有效日期');e.status=400;throw e;}const start=new Date(date+'T00:00:00+08:00');return{date,start:start.toISOString(),end:new Date(start.getTime()+86400000).toISOString()};}

const fingerprints=new Map();
const valid=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
export async function dailyUploads(env,now=new Date(),selected=''){
 const day=uploadDay(now,selected),{results:rows}=await env.DB.prepare("SELECT id,member,state,status,created_at,video_ready,json_extract(report,'$.sha') AS sha,json_extract(report,'$.storage.sourceSha') AS source_sha,json_extract(report,'$.storage.storedSha') AS stored_sha FROM shared_uploads WHERE kind='video' AND created_at>=? AND created_at<? ORDER BY created_at DESC,id DESC").bind(day.start,day.end).all();
 const uploaded=rows.filter(r=>r.video_ready),parent=new Map(),find=x=>{if(!parent.has(x))parent.set(x,x);if(parent.get(x)!==x)parent.set(x,find(parent.get(x)));return parent.get(x);};
 // Both hashes link an original file and its automatic compressed copy, so a
 // retry of the stored copy does not become an extra video. No media download.
 let next=0;await Promise.all(Array.from({length:Math.min(4,uploaded.length)},async()=>{while(next<uploaded.length){const r=uploaded[next++];let info;const cached=fingerprints.get(r.id);if(valid(r.source_sha)&&valid(r.stored_sha))info={sourceSha:r.source_sha,sha:r.stored_sha};else if(cached)info=cached;else{try{info=(await env.BUCKET.head('videos/'+r.id))?.customMetadata;}catch{}if(info){fingerprints.set(r.id,info);if(fingerprints.size>2000)fingerprints.delete(fingerprints.keys().next().value);}}const source=info?.sourceSha,stored=info?.sha;r.hash=valid(source)?source:valid(r.sha)?r.sha:valid(stored)?stored:null;if(r.hash)find(r.hash);if(valid(source)&&valid(stored))parent.set(find(stored),find(source));if(valid(r.sha)&&r.hash)parent.set(find(r.sha),find(r.hash));}}));
 const groups=new Map();let pass=0,fail=0,review=0,pending=0;
 for(const r of rows){const name=(r.member||'未填写').trim()||'未填写';if(!groups.has(name))groups.set(name,{member:name,total:0,duplicates:0,pending:0,unverified:0,seen:new Set()});const g=groups.get(name);if(!r.video_ready){g.pending++;pending++;continue;}const key=r.hash?find(r.hash):'record:'+r.id;if(!r.hash)g.unverified++;if(g.seen.has(key)){g.duplicates++;continue;}g.seen.add(key);g.total++;if(r.state==='complete'&&r.status==='pass')pass++;else if(r.state==='complete'&&r.status==='fail')fail++;else review++;}
 const members=[...groups.values()].map(({seen,...g})=>g).sort((a,b)=>b.total-a.total||a.member.localeCompare(b.member,'zh-CN'));
 return{date:day.date,total:members.reduce((s,g)=>s+g.total,0),pass,fail,review,members,duplicates:members.reduce((s,g)=>s+g.duplicates,0),pending,unverified:members.reduce((s,g)=>s+g.unverified,0)};
}
