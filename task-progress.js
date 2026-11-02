export const STAGES=[['compression','压缩'],['upload','上传'],['recognition','识别']];
export function stageElapsed(stage,now=Date.now()){return Math.max(0,stage?.elapsedMs||0)+(stage?.status==='running'?Math.max(0,now-stage.startedAt):0);}
export function stageStart(task,key,detail='',now=Date.now()){task.stages??={};const old=task.stages[key];if(old?.status==='running'){old.detail=detail||old.detail;return old;}return task.stages[key]={status:'running',elapsedMs:old?.elapsedMs||0,startedAt:now,detail,percent:null};}
export function stageUpdate(task,key,detail,percent=null){const stage=task.stages?.[key];if(!stage)return;stage.detail=detail;stage.percent=Number.isFinite(percent)?Math.max(0,Math.min(100,percent)):null;}
export function stageEnd(task,key,{status='done',detail}={},now=Date.now()){const stage=task.stages?.[key];if(!stage)return;stage.elapsedMs=stageElapsed(stage,now);delete stage.startedAt;stage.status=status;if(detail!==undefined)stage.detail=detail;stage.percent=status==='done'?100:stage.percent;}
export function stageSnapshot(task,now=Date.now()){return Object.fromEntries(Object.entries(task.stages||{}).map(([key,s])=>[key,{...s,elapsedMs:stageElapsed(s,now),startedAt:undefined,status:s.status==='running'?'paused':s.status}]));}
export function formatElapsed(ms){const secs=Math.floor(Math.max(0,ms)/1000);return secs<60?secs+'秒':Math.floor(secs/60)+'分'+String(secs%60).padStart(2,'0')+'秒';}
export function extractStep(message){const m=/(?:提取画面|核对字幕与花字)\s*(\d+)\s*\/\s*(\d+)/.exec(message);return m&&Number(m[2])>0?Math.min(100,Number(m[1])/Number(m[2])*100):null;}
// Report bytes sent only. A 100% upload event still waits for server confirmation.
export function uploadWithProgress(url,{headers,body,onProgress=()=>{},createXHR=()=>new XMLHttpRequest()}={}){return new Promise((resolve,reject)=>{
 const xhr=createXHR();xhr.open('PUT',url,true);for(const [key,value]of new Headers(headers))xhr.setRequestHeader(key,value);
 xhr.upload.onprogress=e=>{if(e.lengthComputable&&e.total>0)onProgress({loaded:e.loaded,total:e.total,percent:Math.min(100,e.loaded/e.total*100)});};
 xhr.onload=()=>{let data;try{data=JSON.parse(xhr.responseText);}catch{reject(Error('共享后台响应异常'));return;}if(xhr.status<200||xhr.status>=300){const error=Error(data.error||'上传失败');error.status=xhr.status;reject(error);return;}resolve(data);};
 xhr.onerror=()=>reject(Error('上传网络中断，任务保存在本机'));xhr.onabort=()=>reject(Error('上传已中断'));xhr.ontimeout=()=>reject(Error('上传网络超时，任务保存在本机'));xhr.send(body);
 });}
