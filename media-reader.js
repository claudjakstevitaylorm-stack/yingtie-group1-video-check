// Move a trailing ISO-BMFF movie index before media data without re-encoding.
const containers=new Set(['moov','trak','mdia','minf','stbl']);
const typeAt=(v,p)=>String.fromCharCode(v.getUint8(p+4),v.getUint8(p+5),v.getUint8(p+6),v.getUint8(p+7));
function boxAt(v,p,end){if(p+8>end)throw new Error('incomplete atom');let size=v.getUint32(p),header=8;if(size===1){if(p+16>end)throw new Error('incomplete extended atom');size=Number(v.getBigUint64(p+8));header=16;}else if(size===0)size=end-p;if(!Number.isSafeInteger(size)||size<header||p+size>end)throw new Error('invalid atom');return{start:p,size,header,type:typeAt(v,p),end:p+size};}
export async function prepareVideoBlob(file){
 try{const boxes=[];let p=0;while(p<file.size){const bytes=await file.slice(p,Math.min(file.size,p+16)).arrayBuffer(),v=new DataView(bytes);if(v.byteLength<8)throw new Error('short file');let size=v.getUint32(0),header=8;if(size===1){if(v.byteLength<16)throw new Error('short atom');size=Number(v.getBigUint64(8));header=16;}else if(size===0)size=file.size-p;if(!Number.isSafeInteger(size)||size<header||p+size>file.size)throw new Error('bad atom');boxes.push({start:p,size,end:p+size,type:typeAt(v,0)});p+=size;}
 const moov=boxes.find(b=>b.type==='moov'),mdat=boxes.find(b=>b.type==='mdat');if(!moov||!mdat||moov.start<mdat.start||moov.size>32*1024*1024)return{blob:file,optimized:false};
 const bytes=await file.slice(moov.start,moov.end).arrayBuffer(),v=new DataView(bytes);let adjusted=0;
 const translate=offset=>offset>=mdat.start&&offset<moov.start?offset+moov.size:offset;
 function visit(start,end){let at=start;while(at<end){const b=boxAt(v,at,end);if(containers.has(b.type))visit(at+b.header,b.end);else if(b.type==='stco'||b.type==='co64'){const width=b.type==='stco'?4:8,pos=at+b.header;if(pos+8>b.end)throw new Error('bad offset table');const count=v.getUint32(pos+4);if(pos+8+count*width>b.end)throw new Error('truncated offsets');for(let i=0;i<count;i++){const q=pos+8+i*width,old=width===4?v.getUint32(q):Number(v.getBigUint64(q));if(!Number.isSafeInteger(old))throw new Error('offset too large');const next=translate(old);if(width===4&&next>0xffffffff)throw new Error('offset overflow');if(width===4)v.setUint32(q,next);else v.setBigUint64(q,BigInt(next));adjusted++;}}at=b.end;}}
 visit(0,v.byteLength);if(!adjusted)return{blob:file,optimized:false};const parts=[];for(const b of boxes){if(b===mdat)parts.push(bytes);if(b!==moov)parts.push(file.slice(b.start,b.end));}return{blob:new Blob(parts,{type:'video/mp4'}),optimized:true};
 }catch{return{blob:file,optimized:false};}
}
export function waitForMedia(video,event,action,timeoutMs=60000){
 return new Promise((resolve,reject)=>{let timer,poll;const done=error=>{clearTimeout(timer);clearInterval(poll);for(const name of ['loadedmetadata','loadeddata','canplay','seeked','error'])video.removeEventListener(name,check);error?reject(error):resolve();};
 const check=()=>{if(video.error)return done(new Error('浏览器无法解码此视频（错误码'+video.error.code+'），请尝试更换浏览器'));const ready=event==='loadedmetadata'?video.readyState>=1&&Number.isFinite(video.duration)&&video.duration>0:video.readyState>=2&&!video.seeking;if(ready)done();};
 for(const name of ['loadedmetadata','loadeddata','canplay','seeked','error'])video.addEventListener(name,check);timer=setTimeout(()=>done(new Error(event==='loadedmetadata'?'视频信息读取超时，请保持页面打开后重新审核':'视频画面读取超时，请保持页面打开后重新审核')),timeoutMs);poll=setInterval(check,150);try{action();check();}catch(e){done(e);}
 });
}
export async function seekVideoFrame(video,time,timeoutMs=45000){
 if(Math.abs(video.currentTime-time)<.001&&video.readyState>=2&&!video.seeking)return;
 try{await waitForMedia(video,'seeked',()=>{video.currentTime=time;},timeoutMs);}catch(error){if(video.error)throw error;await waitForMedia(video,'seeked',()=>{video.currentTime=Math.max(0,time-.05);},timeoutMs);await waitForMedia(video,'seeked',()=>{video.currentTime=time;},timeoutMs);}
}
