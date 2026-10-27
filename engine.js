import {bgmSimilarity,validBgm,extractBgm} from './bgm.js';
export const VERSION = 'clipguard-4';
export const RULE_VERSION = 'clipguard-4-any';
export const THRESHOLD = 70;
export function words(t) { return (t || '').toLowerCase().replace(/[^a-z0-9' ]/g,' ').split(/\s+/).filter(Boolean); }
// Ordered token alignment tolerates inserted promotional words and minor OCR errors.
function tokenMatch(a,b){if(a===b)return true;if(Math.min(a.length,b.length)<5||Math.abs(a.length-b.length)>1)return false;let i=0,j=0,errors=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++errors>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return errors+(a.length-i)+(b.length-j)<=1;}
export function textSimilarity(a,b){const x=words(a),y=words(b);if(!x.length||!y.length)return null;let previous=new Uint32Array(y.length+1);for(const word of x){const current=new Uint32Array(y.length+1);for(let j=1;j<=y.length;j++)current[j]=tokenMatch(word,y[j-1])?previous[j-1]+1:Math.max(previous[j],current[j-1]);previous=current;}return 100*previous[y.length]/Math.min(x.length,y.length);}
export function reliableText(text){const w=words(text);return w.length>=4&&w.filter(t=>/^[a-z']{2,}$/.test(t)).length/w.length>=.7;}
export function localFrameMatch(a,b){if(!a.tiles||!b.tiles)return false;const active=a.tiles.map((t,i)=>[t,b.tiles[i]]).filter(([x,y])=>x.detail>=12&&y.detail>=12);return active.length>=4&&active.filter(([x,y])=>frameMatch(x,y)).length>=Math.max(4,Math.ceil(active.length*2/3));}

export function frameMatch(a,b){let d=0;for(let i=0;i<63;i++)if(a.hash[i]!==b.hash[i])d++;let color=0;for(let i=0;i<12;i++)color+=Math.abs(a.color[i]-b.color[i]);return d<=9&&color<.55;}
export function visualSimilarity(a,b){if(!a?.length||!b?.length)return null;const coverage=(x,y)=>x.filter(f=>y.some(g=>frameMatch(f,g)||localFrameMatch(f,g))).length/x.length;return 100*Math.max(coverage(a,b),coverage(b,a));}
export function validFeature(f){return f&&f.version===VERSION&&typeof f.sha==='string'&&/^[a-f0-9]{64}$/.test(f.sha)&&typeof f.name==='string'&&f.name.length<=300&&Number.isFinite(f.duration)&&f.duration>0&&Array.isArray(f.frames)&&f.frames.length>0&&f.frames.length<=180&&f.frames.every(x=>x&&/^[01]{63}$/.test(x.hash)&&Array.isArray(x.color)&&x.color.length===12&&x.color.every(v=>Number.isFinite(v)&&v>=0&&v<=1))&&f.frames.every(x=>x.tiles===undefined||(Array.isArray(x.tiles)&&x.tiles.length===9&&x.tiles.every(t=>t&&/^[01]{63}$/.test(t.hash)&&Array.isArray(t.color)&&t.color.length===12&&t.color.every(v=>Number.isFinite(v)&&v>=0&&v<=1)&&Number.isFinite(t.detail)&&t.detail>=0&&t.detail<=128)))&&typeof f.overlays==='string'&&f.overlays.length<30000&&['ok','none','review'].includes(f.overlayStatus)&&typeof f.subtitles==='string'&&f.subtitles.length<30000&&['ok','none','review'].includes(f.subtitleStatus)&&validBgm(f.bgm)&&Array.isArray(f.errors)&&f.errors.length<20&&f.errors.every(e=>typeof e==='string'&&e.length<1000)&&typeof f.thumbnail==='string'&&(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(f.thumbnail))&&f.thumbnail.length<150000;}
function screenPart(f,overlay=false){
 if(f.version!==VERSION)return{status:f.subtitleStatus==='none'?'none':'review',text:''};
 return{status:overlay?f.overlayStatus:f.subtitleStatus,text:overlay?f.overlays:f.subtitles};
}
function compareText(a,b){
 if(a.status==='none'&&b.status==='none')return{value:null,state:'none'};
 if((a.status==='ok'&&!words(a.text).length)||(b.status==='ok'&&!words(b.text).length))return{value:null,state:'review'};
 if(!['ok','none'].includes(a.status)||!['ok','none'].includes(b.status))return{value:null,state:'review'};
 if(a.status==='none'||b.status==='none')return{value:0,state:'ok'};
 const value=textSimilarity(a.text,b.text);return{value,state:value===null?'review':'ok'};
}
export function compare(feature,templates){
 const rows=templates.filter(t=>t.enabled!==false).map(t=>{
  const exact=feature.sha===t.sha,visual=exact?100:t.version!==VERSION?null:visualSimilarity(feature.frames,t.frames);
  const sub=compareText(screenPart(feature),screenPart(t)),overlay=compareText(screenPart(feature,true),screenPart(t,true));
  const bothNoBgm=feature.bgm?.status==='none'&&t.bgm?.status==='none';
  const music=bothNoBgm?null:bgmSimilarity(feature.bgm,t.bgm);
  const states={visual:visual===null?'review':'ok',subtitle:sub.state,overlay:overlay.state,bgm:bothNoBgm?'none':music===null?'review':'ok'};
  const dimensions={visual,subtitle:exact&&sub.state==='ok'?100:sub.value,overlay:exact&&overlay.state==='ok'?100:overlay.value,bgm:exact&&music!==null?100:music};
  const valid=Object.entries(dimensions).filter(([,v])=>Number.isFinite(v));
  const qualifying=valid.filter(([,v])=>v<=THRESHOLD).map(([key])=>key);
  const complete=Object.values(states).every(s=>s!=='review');
  const status=exact?'fail':qualifying.length?'pass':complete&&valid.length?'fail':'review';
  const score=exact?100:valid.length?Math.min(...valid.map(([,v])=>v)):null;
  return{id:t.id,name:t.name,...dimensions,states,score,highestScore:valid.length?Math.max(...valid.map(([,v])=>v)):null,qualifying,complete,status,exact,legacy:t.version!==VERSION};
 }).sort((a,b)=>(b.score??-1)-(a.score??-1));
 const best=rows[0],status=!rows.length?'review':rows.some(r=>r.status==='fail')?'fail':rows.every(r=>r.status==='pass')?'pass':'review';
 return{score:best?.score??null,status,best,comparisons:rows,threshold:THRESHOLD,algorithm:RULE_VERSION,decision:'any-dimension-at-most',qualifying:best?.qualifying||[]};
}
let aiWorker,requests=new Map(),nextId=0;
function ensureWorker(){if(!aiWorker){aiWorker=new Worker(new URL('./recognizer.js',import.meta.url),{type:'module'});aiWorker.onmessage=({data:d})=>{const r=requests.get(d.id);if(!r)return;if(d.progress){r.progress(d.progress);return;}clearTimeout(r.timer);requests.delete(d.id);d.error?r.reject(new Error(d.error)):r.resolve(d.result);};aiWorker.onerror=()=>{for(const r of requests.values()){clearTimeout(r.timer);r.reject(new Error('识别引擎启动失败，请检查模型网络连接后重试'));}requests.clear();aiWorker?.terminate();aiWorker=null;};}return aiWorker;}
function ai(type,payload,progress){return new Promise((resolve,reject)=>{const worker=ensureWorker(),id=++nextId;const timer=setTimeout(()=>{worker.terminate();aiWorker=null;for(const r of requests.values()){clearTimeout(r.timer);r.reject(new Error('识别超时，模型可能未下载完成，请检查网络后重试'));}requests.clear();},300000);requests.set(id,{resolve,reject,progress,timer});worker.postMessage({id,type,...payload});});}
export async function initialize(progress=()=>{}){return ai('init',{},progress);}
const cos=Array.from({length:8},(_,u)=>Array.from({length:32},(_,x)=>Math.cos((2*x+1)*u*Math.PI/64)));
export function fingerprint(rgba){const gray=new Float32Array(1024),color=new Array(12).fill(0);for(let i=0;i<1024;i++){let j=i*4;gray[i]=.299*rgba[j]+.587*rgba[j+1]+.114*rgba[j+2];for(let c=0;c<3;c++)color[c*4+Math.min(3,rgba[j+c]>>6)]++;}for(let c=0;c<12;c++)color[c]/=1024;const dct=[];for(let u=0;u<8;u++)for(let v=0;v<8;v++){let sum=0;for(let x=0;x<32;x++){let row=0;for(let y=0;y<32;y++)row+=gray[x*32+y]*cos[v][y];sum+=row*cos[u][x];}if(u||v)dct.push(sum);}const median=[...dct].sort((a,b)=>a-b)[31];return{hash:dct.map(v=>v>median?'1':'0').join(''),color};}
function mediaEvent(el,event,action){return new Promise((resolve,reject)=>{const cleanup=()=>{clearTimeout(timer);el.removeEventListener(event,ok);el.removeEventListener('error',bad);};const ok=()=>{cleanup();resolve();};const bad=()=>{cleanup();reject(new Error('视频无法解码，请转为 H.264 / AAC 的 MP4 后重试'));};const timer=setTimeout(()=>{cleanup();reject(new Error('读取视频超时，请检查格式'));},20000);el.addEventListener(event,ok,{once:true});el.addEventListener('error',bad,{once:true});try{action();}catch(e){cleanup();reject(e);}});}
let extractionTail=Promise.resolve();
export function extract(file,progress=()=>{},options={}){const task=extractionTail.catch(()=>{}).then(()=>extractFile(file,progress,options));extractionTail=task.catch(()=>{});return task;}
async function extractFile(file,progress=()=>{},options={}){
 const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';video.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';document.body.append(video);const url=URL.createObjectURL(file);const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d',{willReadFrequently:true});const snap=document.createElement('canvas'),sc=snap.getContext('2d');let duration;const frames=[],ocrFrames=[];let thumbnail='';
 try{await mediaEvent(video,'loadeddata',()=>{video.src=url;video.load();});duration=video.duration;if(!Number.isFinite(duration)||duration<=0)throw new Error('无法读取有效视频时长，请检查文件');const count=Math.max(1,Math.min(180,Math.ceil(duration*2))),step=duration/count;snap.width=960;snap.height=Math.round(960*video.videoHeight/video.videoWidth);if(snap.height>1280){snap.height=1280;snap.width=Math.round(1280*video.videoWidth/video.videoHeight);}for(let i=0;i<count;i++){const time=Math.min(duration-.01,i*step+.1);if(Math.abs(video.currentTime-time)>.001)await mediaEvent(video,'seeked',()=>{video.currentTime=time;});ctx.drawImage(video,0,0,32,32);const whole=fingerprint(ctx.getImageData(0,0,32,32).data);whole.tiles=[];for(let ty=0;ty<3;ty++)for(let tx=0;tx<3;tx++){ctx.drawImage(video,tx*video.videoWidth/3,ty*video.videoHeight/3,video.videoWidth/3,video.videoHeight/3,0,0,32,32);const pixels=ctx.getImageData(0,0,32,32).data;let sum=0,squares=0;for(let at=0;at<pixels.length;at+=4){const g=.299*pixels[at]+.587*pixels[at+1]+.114*pixels[at+2];sum+=g;squares+=g*g;}whole.tiles.push({...fingerprint(pixels),detail:Math.sqrt(Math.max(0,squares/1024-(sum/1024)**2))});}frames.push(whole);{sc.drawImage(video,0,0,snap.width,snap.height);ocrFrames.push(snap.toDataURL('image/jpeg',.85));}if(i===0){const thumb=document.createElement('canvas');thumb.width=160;thumb.height=Math.round(160*video.videoHeight/video.videoWidth);thumb.getContext('2d').drawImage(video,0,0,thumb.width,thumb.height);thumbnail=thumb.toDataURL('image/jpeg',.6);}progress('提取画面 '+(i+1)+' / '+count);}}finally{video.removeAttribute('src');video.load();video.remove();URL.revokeObjectURL(url);}
 const errors=[];let subtitles='',overlays='',subtitleStatus='review',overlayStatus='review';
 const noSubtitle=options.noText||options.noSubtitle,noOverlay=options.noText||options.noOverlay;
 if(noSubtitle)subtitleStatus='none';if(noOverlay)overlayStatus='none';
 if(!noSubtitle||!noOverlay)try{
  const result=await ai('ocr',{frames:ocrFrames,height:snap.height},progress);
  if(!noSubtitle){subtitles=result.subtitles||'';subtitleStatus=reliableText(subtitles)?'ok':'review';}
  if(!noOverlay){overlays=result.overlays||'';overlayStatus=reliableText(overlays)?'ok':'review';}
 }catch(e){errors.push('画面文字识别：'+e.message);}
 if(subtitleStatus==='review')errors.push(options.forTemplate?'暂未提取到可靠字幕参考':'字幕未确认：未识别到可靠底部字幕，如确无字幕可勾选“确认无字幕”');
 if(overlayStatus==='review')errors.push(options.forTemplate?'暂未提取到可靠花字参考':'花字未确认：未识别到可靠花字，如确无花字可勾选“确认无花字”');
 let bgm={status:'review',source:'unconfirmed',frames:[]};
 if(options.bgmMode==='none')bgm={status:'none',source:'declared-none',frames:[]};
 else if(options.bgmFile)try{bgm=await extractBgm(options.bgmFile,duration,progress);}catch(e){errors.push('BGM：'+e.message);}
 if(!options.forTemplate&&bgm.status==='review'&&!errors.some(e=>e.startsWith('BGM：')))errors.push('BGM未确认：请提供与视频同起止的纯BGM片段，或确认没有BGM。口播音频不参与比对');
 progress('生成文件指纹…');const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
 return{version:VERSION,name:file.name.slice(0,300),duration,size:file.size,sha,frames,thumbnail,subtitles,subtitleStatus,overlays,overlayStatus,bgm,errors,createdAt:new Date().toISOString()};
}
