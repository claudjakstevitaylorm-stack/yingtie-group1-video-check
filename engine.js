import {prepareVideoBlob,waitForMedia,seekVideoFrame} from './media-reader.js';
import {bgmSimilarity,validBgm,extractBgm} from './bgm.js';
export const VERSION = 'clipguard-4';
export const RULE_VERSION = 'clipguard-4-evidence-3-any';
export const THRESHOLD = 70;
export function words(t) { return (t || '').toLowerCase().replace(/[^a-z0-9' ]/g,' ').split(/\s+/).filter(Boolean); }
// Ordered token alignment tolerates inserted promotional words and minor OCR errors.
function tokenMatch(a,b){if(a===b)return true;if(Math.min(a.length,b.length)<5||Math.abs(a.length-b.length)>1)return false;let i=0,j=0,errors=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++errors>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return errors+(a.length-i)+(b.length-j)<=1;}
export function textSimilarity(a,b){const x=words(a),y=words(b);if(!x.length||!y.length)return null;let previous=new Uint32Array(y.length+1);for(const word of x){const current=new Uint32Array(y.length+1);for(let j=1;j<=y.length;j++)current[j]=tokenMatch(word,y[j-1])?previous[j-1]+1:Math.max(previous[j],current[j-1]);previous=current;}return 100*previous[y.length]/Math.min(x.length,y.length);}
export function textQuality(text){const all=words(text),candidates=all.filter(t=>/[a-z]/.test(t)),meaningful=candidates.filter(t=>/^[a-z']{2,}$/.test(t));return{all,meaningful,unique:new Set(meaningful).size,ratio:candidates.length?meaningful.length/candidates.length:0};}
export function reliableText(text){const q=textQuality(text);return q.meaningful.length>=12&&q.ratio>=.85&&q.unique>=8;}
export function localFrameMatch(a,b){if(!a.tiles||!b.tiles)return false;const active=a.tiles.map((t,i)=>[t,b.tiles[i]]).filter(([x,y])=>x.detail>=12&&y.detail>=12);return active.length>=4&&active.filter(([x,y])=>frameMatch(x,y)).length>=Math.max(4,Math.ceil(active.length*2/3));}

export function frameMatch(a,b){let d=0;for(let i=0;i<63;i++)if(a.hash[i]!==b.hash[i])d++;let color=0;for(let i=0;i<12;i++)color+=Math.abs(a.color[i]-b.color[i]);return d<=9&&color<.55;}
export function visualSimilarity(a,b){if(!a?.length||!b?.length)return null;const coverage=(x,y)=>x.filter(f=>y.some(g=>frameMatch(f,g)||localFrameMatch(f,g))).length/x.length;return 100*Math.max(coverage(a,b),coverage(b,a));}
export function hasEvidence(f){const e=f?.evidence,n=f?.frames?.length;if(e?.version!==1||e.sampleCount!==n||!Array.isArray(e.sampleTimes)||e.sampleTimes.length!==n)return false;let previous=-1;for(const time of e.sampleTimes){if(!Number.isFinite(time)||time<0||time>=f.duration||time<=previous)return false;previous=time;}for(const key of ['subtitleFrames','overlayFrames'])if(!Array.isArray(e[key])||new Set(e[key]).size!==e[key].length||!e[key].every(i=>Number.isInteger(i)&&i>=0&&i<n))return false;if(e.textSamples!==undefined&&(!Array.isArray(e.textSamples)||e.textSamples.length>n||new Set(e.textSamples.map(x=>x?.frame)).size!==e.textSamples.length||!e.textSamples.every(x=>x&&Number.isInteger(x.frame)&&x.frame>=0&&x.frame<n&&['subtitles','overlays'].every(k=>typeof x[k]==='string'&&x[k].length<=500))))return false;return true;}
function textReliable(f,overlay){if(!hasEvidence(f))return false;const list=f.evidence[overlay?'overlayFrames':'subtitleFrames'];return list.length>=Math.max(3,Math.ceil(f.frames.length*.4))&&reliableText(overlay?f.overlays:f.subtitles);}
function musicReliable(f){const b=f.bgm;return validBgm(b)&&b.status==='ok'&&Math.abs(b.duration-f.duration)<=1&&b.frames.length>=Math.max(11,Math.ceil((b.duration*4-.256)*.8))&&b.frames.filter(frame=>frame.some(v=>v>0)).length>=Math.ceil(b.frames.length*.8);}
function visualReliable(f){if(!hasEvidence(f)||f.frames.length<Math.min(12,Math.ceil(f.duration*2)))return false;const rich=f.frames.filter(frame=>frame.tiles?.filter(t=>t.detail>=12).length>=4);return rich.length>=Math.ceil(f.frames.length*.6);}
export function validFeature(f){return f&&(f.evidence===undefined||hasEvidence(f))&&f.version===VERSION&&typeof f.sha==='string'&&/^[a-f0-9]{64}$/.test(f.sha)&&typeof f.name==='string'&&f.name.length<=300&&Number.isFinite(f.duration)&&f.duration>0&&Array.isArray(f.frames)&&f.frames.length>0&&f.frames.length<=180&&f.frames.every(x=>x&&/^[01]{63}$/.test(x.hash)&&Array.isArray(x.color)&&x.color.length===12&&x.color.every(v=>Number.isFinite(v)&&v>=0&&v<=1))&&f.frames.every(x=>x.tiles===undefined||(Array.isArray(x.tiles)&&x.tiles.length===9&&x.tiles.every(t=>t&&/^[01]{63}$/.test(t.hash)&&Array.isArray(t.color)&&t.color.length===12&&t.color.every(v=>Number.isFinite(v)&&v>=0&&v<=1)&&Number.isFinite(t.detail)&&t.detail>=0&&t.detail<=128)))&&typeof f.overlays==='string'&&f.overlays.length<30000&&['ok','none','review'].includes(f.overlayStatus)&&typeof f.subtitles==='string'&&f.subtitles.length<30000&&['ok','none','review'].includes(f.subtitleStatus)&&validBgm(f.bgm)&&Array.isArray(f.errors)&&f.errors.length<20&&f.errors.every(e=>typeof e==='string'&&e.length<1000)&&typeof f.thumbnail==='string'&&(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(f.thumbnail))&&f.thumbnail.length<150000;}
function screenPart(f,overlay=false){const status=overlay?f.overlayStatus:f.subtitleStatus;return{status:f.version!==VERSION?'review':status,text:overlay?f.overlays:f.subtitles,reliable:textReliable(f,overlay)};}
function compareText(a,b){
 if(a.status==='none'&&b.status==='none')return{value:null,state:'none',reason:'双方声明没有该内容，不计分'};
 if(a.status==='none'||b.status==='none')return{value:null,state:'review',reason:'单方声明没有内容不能证明0%重复，不作为通过依据'};
 if(a.status!=='ok'||b.status!=='ok'||!a.reliable||!b.reliable)return{value:null,state:'review',reason:'文字样本不足：双方需至少12词、8个不同词，并覆盖至少40%的抽样画面'};
 const value=textSimilarity(a.text,b.text);return{value,state:value===null?'review':'ok',reason:value===0?'可靠文字样本未检出相同词序，不能解释为整片完全不同':''};
}
export function compare(feature,templates){
 const rows=templates.filter(t=>t.enabled!==false).map(t=>{
  const exact=feature.sha===t.sha,rawVisual=feature.version===t.version?visualSimilarity(feature.frames,t.frames):null,visualProof=visualReliable(feature)&&visualReliable(t);
  const visual=exact?100:visualProof&&rawVisual>0?rawVisual:null;
  const sub=compareText(screenPart(feature),screenPart(t)),overlay=compareText(screenPart(feature,true),screenPart(t,true));
  const bothNoBgm=feature.bgm?.status==='none'&&t.bgm?.status==='none',absenceMusic=feature.bgm?.status==='none'||t.bgm?.status==='none';
  const music=absenceMusic||!musicReliable(feature)||!musicReliable(t)?null:bgmSimilarity(feature.bgm,t.bgm);
  const states={visual:visual===null?'review':'ok',subtitle:sub.state,overlay:overlay.state,bgm:bothNoBgm?'none':music===null?'review':'ok'};
  const reasons={visual:exact?'原片文件指纹完全一致':!visualProof?'画面抽样证据不足，需更新参考或重新审核':rawVisual===0?'抽样画面未达到可靠匹配阈值，不能据此认定0%重复，不作为通过依据':'',subtitle:sub.reason,overlay:overlay.reason,bgm:bothNoBgm?'双方均无BGM，不计分':absenceMusic?'单方无BGM声明不等于0%重复，不作为通过依据':music===null?'未提供双方可靠纯BGM证据，不计分':''};
  Object.assign(reasons,explainEvidence(feature,t,{visual,subtitle:sub.value,overlay:overlay.value,bgm:music,states,rawVisual,exact}));
  const dimensions={visual,subtitle:exact&&sub.state==='ok'?100:sub.value,overlay:exact&&overlay.state==='ok'?100:overlay.value,bgm:exact&&music!==null?100:music};
  const valid=Object.entries(dimensions).filter(([,v])=>Number.isFinite(v)),qualifying=valid.filter(([,v])=>v<=THRESHOLD).map(([key])=>key),complete=Object.values(states).every(s=>s!=='review');
  const status=exact?'fail':qualifying.length?'pass':complete&&valid.length?'fail':'review',highest=valid.length?Math.max(...valid.map(([,v])=>v)):null;
  return{id:t.id,name:t.name,...dimensions,states,reasons,rawVisual,score:exact?100:highest,decisionScore:exact?100:valid.length?Math.min(...valid.map(([,v])=>v)):null,highestScore:highest,qualifying,complete,status,exact,legacy:t.version!==VERSION||!hasEvidence(t)};
 }).sort((a,b)=>(b.score??-1)-(a.score??-1));
 const best=rows[0],status=!rows.length?'review':rows.some(r=>r.status==='fail')?'fail':rows.every(r=>r.status==='pass')?'pass':'review';
 return{score:best?.score??null,status,best,comparisons:rows,threshold:THRESHOLD,algorithm:RULE_VERSION,decision:'any-reliable-dimension-at-most',scoreMeaning:'highest-reliable-dimension-not-whole-video',qualifying:best?.qualifying||[]};
}
let aiWorker,requests=new Map(),nextId=0;
function ensureWorker(){if(!aiWorker){aiWorker=new Worker(new URL('./recognizer.js',import.meta.url),{type:'module'});aiWorker.onmessage=({data:d})=>{const r=requests.get(d.id);if(!r)return;if(d.progress){r.heartbeat();r.progress(d.progress);return;}clearTimeout(r.timer);requests.delete(d.id);d.error?r.reject(new Error(d.error)):r.resolve(d.result);};aiWorker.onerror=()=>{for(const r of requests.values()){clearTimeout(r.timer);r.reject(new Error('识别引擎启动失败，请检查模型网络连接后重试'));}requests.clear();aiWorker?.terminate();aiWorker=null;};}return aiWorker;}
function ai(type,payload,progress){return new Promise((resolve,reject)=>{const worker=ensureWorker(),id=++nextId;let timer;const deadline=Date.now()+Math.max(300000,(payload.frames?.length||1)*20000+180000);const heartbeat=()=>{clearTimeout(timer);timer=setTimeout(()=>{worker.terminate();aiWorker=null;for(const r of requests.values()){clearTimeout(r.timer);r.reject(new Error('文字识别长时间无响应，请保持页面打开后重新审核'));}requests.clear();},Math.max(1,Math.min(120000,deadline-Date.now())));const request=requests.get(id);if(request)request.timer=timer;};requests.set(id,{resolve,reject,progress,timer,heartbeat});heartbeat();worker.postMessage({id,type,...payload});});}
export async function initialize(progress=()=>{}){return ai('init',{},progress);}
const cos=Array.from({length:8},(_,u)=>Array.from({length:32},(_,x)=>Math.cos((2*x+1)*u*Math.PI/64)));
export function fingerprint(rgba){const gray=new Float32Array(1024),color=new Array(12).fill(0);for(let i=0;i<1024;i++){let j=i*4;gray[i]=.299*rgba[j]+.587*rgba[j+1]+.114*rgba[j+2];for(let c=0;c<3;c++)color[c*4+Math.min(3,rgba[j+c]>>6)]++;}for(let c=0;c<12;c++)color[c]/=1024;const dct=[];for(let u=0;u<8;u++)for(let v=0;v<8;v++){let sum=0;for(let x=0;x<32;x++){let row=0;for(let y=0;y<32;y++)row+=gray[x*32+y]*cos[v][y];sum+=row*cos[u][x];}if(u||v)dct.push(sum);}const median=[...dct].sort((a,b)=>a-b)[31];return{hash:dct.map(v=>v>median?'1':'0').join(''),color};}
function mediaEvent(el,event,action,timeoutMs=20000){return new Promise((resolve,reject)=>{const cleanup=()=>{clearTimeout(timer);el.removeEventListener(event,ok);el.removeEventListener('error',bad);};const ok=()=>{cleanup();resolve();};const bad=()=>{cleanup();reject(new Error('浏览器暂时无法解码此视频，MP4和MOV均可上传，请尝试重新审核或更换浏览器'));};const timer=setTimeout(()=>{cleanup();reject(new Error('读取视频超时，请保持页面打开后重新审核'));},timeoutMs);el.addEventListener(event,ok,{once:true});el.addEventListener('error',bad,{once:true});try{action();}catch(e){cleanup();reject(e);}});}
let extractionTail=Promise.resolve();
export function extract(file,progress=()=>{},options={}){const task=extractionTail.catch(()=>{}).then(()=>extractFile(file,progress,options));extractionTail=task.catch(()=>{});return task;}
async function extractFile(file,progress=()=>{},options={}){
 const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';video.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';document.body.append(video);progress('准备视频读取…');const prepared=await prepareVideoBlob(file);const url=URL.createObjectURL(prepared.blob);const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d',{willReadFrequently:true});const snap=document.createElement('canvas'),sc=snap.getContext('2d');let duration;const frames=[],ocrFrames=[],sampleTimes=[];let thumbnail='';
 try{await waitForMedia(video,'loadedmetadata',()=>{video.src=url;video.load();},Math.max(options.mediaTimeout||0,60000));duration=video.duration;if(!Number.isFinite(duration)||duration<=0)throw new Error('无法读取有效视频时长，请检查文件');const count=Math.max(1,Math.min(180,Math.ceil(duration*2))),step=duration/count;snap.width=960;snap.height=Math.round(960*video.videoHeight/video.videoWidth);if(snap.height>1280){snap.height=1280;snap.width=Math.round(1280*video.videoWidth/video.videoHeight);}for(let i=0;i<count;i++){const time=Math.min(duration-.01,i*step+.1);await seekVideoFrame(video,time,Math.max(options.mediaTimeout||0,45000));ctx.drawImage(video,0,0,32,32);const whole=fingerprint(ctx.getImageData(0,0,32,32).data);whole.tiles=[];for(let ty=0;ty<3;ty++)for(let tx=0;tx<3;tx++){ctx.drawImage(video,tx*video.videoWidth/3,ty*video.videoHeight/3,video.videoWidth/3,video.videoHeight/3,0,0,32,32);const pixels=ctx.getImageData(0,0,32,32).data;let sum=0,squares=0;for(let at=0;at<pixels.length;at+=4){const g=.299*pixels[at]+.587*pixels[at+1]+.114*pixels[at+2];sum+=g;squares+=g*g;}whole.tiles.push({...fingerprint(pixels),detail:Math.sqrt(Math.max(0,squares/1024-(sum/1024)**2))});}frames.push(whole);sampleTimes.push(time);{sc.drawImage(video,0,0,snap.width,snap.height);ocrFrames.push(snap.toDataURL('image/jpeg',.85));}if(i===0){const thumb=document.createElement('canvas');thumb.width=160;thumb.height=Math.round(160*video.videoHeight/video.videoWidth);thumb.getContext('2d').drawImage(video,0,0,thumb.width,thumb.height);thumbnail=thumb.toDataURL('image/jpeg',.6);}progress('提取画面 '+(i+1)+' / '+count);}}finally{video.removeAttribute('src');video.load();video.remove();URL.revokeObjectURL(url);}
 let textEvidence={subtitleFrames:[],overlayFrames:[]};const errors=[];let subtitles='',overlays='',subtitleStatus='review',overlayStatus='review';
 const noSubtitle=options.noText||options.noSubtitle,noOverlay=options.noText||options.noOverlay;
 if(noSubtitle)subtitleStatus='none';if(noOverlay)overlayStatus='none';
 if(!noSubtitle||!noOverlay)try{
  const result=await ai('ocr',{frames:ocrFrames,height:snap.height},progress);textEvidence={subtitleFrames:result.subtitleFrames||[],overlayFrames:result.overlayFrames||[],textSamples:result.textSamples||[]};
  if(!noSubtitle){subtitles=result.subtitles||'';subtitleStatus=reliableText(subtitles)?'ok':'review';}
  if(!noOverlay){overlays=result.overlays||'';overlayStatus=reliableText(overlays)?'ok':'review';}
 }catch(e){errors.push('画面文字识别：'+e.message);}
 if(subtitleStatus==='review')errors.push(options.forTemplate?'参考字幕证据不足（缺失、短文本或识别不确定）':subtitles.trim()?'已识别字幕但词量或多样性不足，不作为低分通过依据':'未提取到可靠字幕，不作为低分通过依据');
 if(overlayStatus==='review')errors.push(options.forTemplate?'参考花字证据不足（缺失、短文本或识别不确定）':overlays.trim()?'已识别花字但词量或多样性不足，不作为低分通过依据':'未提取到可靠花字，不作为低分通过依据');
 let bgm={status:'review',source:'unconfirmed',frames:[]};
 if(options.bgmMode==='none')bgm={status:'none',source:'declared-none',frames:[]};
 else if(options.bgmFile)try{bgm=await extractBgm(options.bgmFile,duration,progress);}catch(e){errors.push('BGM：'+e.message);}
 if(!options.forTemplate&&bgm.status==='review'&&!errors.some(e=>e.startsWith('BGM：')))errors.push('BGM未确认：请提供与视频同起止的纯BGM片段，或确认没有BGM。口播音频不参与比对');
 progress('生成文件指纹…');const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
 return{version:VERSION,name:file.name.slice(0,300),duration,size:file.size,sha,frames,evidence:{version:1,sampleCount:frames.length,sampleTimes,...textEvidence},thumbnail,subtitles,subtitleStatus,overlays,overlayStatus,bgm,errors,createdAt:new Date().toISOString()};
}

// Explain available measurements without changing scores or historical verdicts.
export function explainEvidence(video,template,row){
 template=template||{explanationUnavailable:true};
 const result={},labels={subtitle:'字幕',overlay:'花字'};
 const side=(f,label,key)=>{if(f.explanationUnavailable)return '模板：这份旧报告没有返回检测时的模板明细，暂时无法判断模板哪项未达标；不能当成模板没有文字。';const quality=textQuality(f[key==='subtitle'?'subtitles':'overlays']),tokens=quality.all,valid=quality.meaningful,unique=quality.unique,e=f.evidence,n=e?.sampleCount,seen=e?.[key==='subtitle'?'subtitleFrames':'overlayFrames']?.length,ratio=quality.ratio;const gaps=[];
 if(valid.length<12)gaps.push('有效英文词数少于12');if(unique<8)gaps.push('不同有效词少于8');if(ratio<.85)gaps.push('有效英文词比例低于85%');
 if(!Number.isInteger(n)||!Number.isInteger(seen))gaps.push('未保存文字出现在哪些抽样画面的记录');else if(seen<Math.max(3,Math.ceil(n*.4)))gaps.push('文字仅出现在'+seen+'/'+n+'张抽样画面中，至少需'+Math.max(3,Math.ceil(n*.4))+'张');
 const status=f[key==='subtitle'?'subtitleStatus':'overlayStatus'];if(status==='none')gaps.push('被标记为没有'+labels[key]);else if(status!=='ok'&&!gaps.length)gaps.push('识别状态未确认');
 return label+'：'+tokens.length+'词、'+unique+'个不同有效词，有效英文词占'+Math.round(ratio*100)+'%'+(Number.isInteger(n)&&Number.isInteger(seen)?'，'+seen+'/'+n+'张画面识别到文字':'')+'。'+(gaps.length?'未达标：'+gaps.join('；')+'。':'这些数量条件已满足。');};
 for(const key of ['subtitle','overlay'])if(!Number.isFinite(row[key]))result[key]=row.states?.[key]==='none'?'上传视频和模板均标记为没有'+labels[key]+'，本项不参与比较，不是识别失败。':side(video,'上传视频「'+(video.name||'此视频')+'」',key)+'\n'+side(template,'模板「'+(template.name||'对应模板')+'」',key)+'\n处理：若缺的是模板，请更新该模板的识别参考；若缺的是上传视频，请重新审核。文字太少或太小无法辨认时，本项暂不计分，不要求为了凑词数修改视频。';
 if(!Number.isFinite(row.visual)){
 const sample=f=>f.frames?.length??f.evidence?.sampleCount;
 const count=f=>Number.isInteger(sample(f))?sample(f)+'张':'未保存';
 if(row.rawVisual===0)result.visual='已比较上传视频的'+count(video)+'抽样画面与模板的'+count(template)+'抽样画面，没有找到符合当前算法条件的匹配画面。可能是内容不同，也可能是裁剪、遮挡、缩放等使算法未匹配到，不能直接当成0%重复，不作为通过依据。\n处理：先确认选对了模板；若肉眼看起来相同，应改进画面识别，反复点审核未必能解决。';
 else{const describe=(f,label)=>{if(f.explanationUnavailable)return '模板：这份报告未返回检测时的画面抽样明细。';const n=sample(f),required=Math.min(12,Math.ceil(f.duration*2));const rich=f.frames?.filter(x=>x.tiles?.filter(t=>t.detail>=12).length>=4).length;return label+'：抽样'+count(f)+'（至少需'+required+'张）'+(Number.isInteger(rich)?'，其中'+rich+'张有足够画面细节（至少需'+Math.ceil(n*.6)+'张）':'，旧报告未保存逐张画面细节')+'。';};result.visual=describe(video,'上传视频')+'\n'+describe(template,'模板')+'\n处理：缺模板数据就更新模板识别参考；缺视频数据就重新审核。';}}
 if(!Number.isFinite(row.bgm)&&row.states?.bgm==='none')result.bgm='上传视频和模板均标记为无BGM，本项不参与比较，不是识别失败。';
 else if(!Number.isFinite(row.bgm)){const describe=(f,label)=>label+'：'+(f.explanationUnavailable?'这份报告未返回检测时的BGM明细':f.bgm?.status==='none'?'标记为无BGM':f.bgm?.status!=='ok'?'未提供或未成功提取纯BGM':musicReliable(f)?'纯BGM数据完整':!Array.isArray(f.bgm?.frames)?'旧报告未保留音乐指纹明细':Math.abs(f.bgm.duration-f.duration)>1?'BGM长'+f.bgm.duration.toFixed(1)+'秒，视频长'+f.duration.toFixed(1)+'秒，时长不对应':'纯BGM指纹数量或有效声音覆盖不足');result.bgm=describe(video,'上传视频')+'；'+describe(template,'模板')+'。双方没有可用的音乐比对数据，本项不计分。处理：确实要比BGM时提供与视频同起止的纯BGM；口播不参与，也不会因为BGM缺失单独判不通过。';}
 return result;
}
