import {prepareVideoBlob,waitForMedia,seekVideoFrame} from './media-reader.js';
export const COMPRESSION_MIN_BYTES=12*1024*1024;
export function compressionPlan(width,height){const scale=Math.min(1,1280/Math.max(width,height));return{width:Math.max(2,Math.floor(width*scale/2)*2),height:Math.max(2,Math.floor(height*scale/2)*2),fps:25,videoBitsPerSecond:2500000,audioBitsPerSecond:96000};}
export function chooseCompressedFile(original,encoded){return encoded?.size>0&&encoded.size<original.size*.95?{file:encoded,compressed:true,originalBytes:original.size,bytes:encoded.size}:{file:original,compressed:false,originalBytes:original.size,bytes:original.size};}
let tail=Promise.resolve();
export function compressVideo(file,progress=()=>{},options={}){const task=tail.catch(()=>{}).then(()=>compressOne(file,progress,options));tail=task.catch(()=>{});return task;}
async function compressOne(file,progress,options){
 const unchanged=reason=>({...chooseCompressedFile(file,null),reason});
 if(!options.force&&file.size<=COMPRESSION_MIN_BYTES)return unchanged('small');
 if(typeof MediaRecorder==='undefined'||typeof document==='undefined')return unchanged('unsupported');
 const mime=['video/mp4;codecs=avc1.42001f,mp4a.40.2','video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
 if(!mime||document.hidden)return unchanged('unsupported');
 const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';video.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';document.body.append(video);
 let url,canvasStream,sourceStream,recorder,drawTimer,timeout,visibility,mediaError;
 try{progress('准备自动压缩…');const prepared=await prepareVideoBlob(file);url=URL.createObjectURL(prepared.blob);await waitForMedia(video,'loadedmetadata',()=>{video.src=url;video.load();},60000);
 const duration=video.duration,plan=compressionPlan(video.videoWidth,video.videoHeight);if(!duration||!plan.width||!plan.height)return unchanged('unreadable');
 if(!options.force&&file.size<duration*(plan.videoBitsPerSecond+plan.audioBitsPerSecond)/8*1.15)return unchanged('efficient');
 const capture=video.captureStream||video.mozCaptureStream;if(!capture)return unchanged('unsupported');
 await seekVideoFrame(video,.001,45000);const canvas=document.createElement('canvas');canvas.width=plan.width;canvas.height=plan.height;const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0,canvas.width,canvas.height);
 canvasStream=canvas.captureStream(plan.fps);sourceStream=capture.call(video);const audio=sourceStream.getAudioTracks();const stream=new MediaStream([...canvasStream.getVideoTracks(),...audio]);
 const chunks=[];let lastProgress=0,lastTime=video.currentTime,maxGap=0;
 const blob=await new Promise((resolve,reject)=>{let settled=false;const fail=error=>{if(settled)return;settled=true;reject(error);if(recorder?.state!=='inactive')try{recorder.stop();}catch{}};
 recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:plan.videoBitsPerSecond,audioBitsPerSecond:plan.audioBitsPerSecond});
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=()=>fail(new Error('浏览器编码失败'));
 recorder.onstop=()=>{if(settled)return;settled=true;resolve(new Blob(chunks,{type:recorder.mimeType||'video/mp4'}));};
 video.onended=()=>{if(recorder.state!=='inactive')recorder.stop();};mediaError=()=>fail(new Error('压缩期间视频读取失败'));video.addEventListener('error',mediaError);
 visibility=()=>{if(document.hidden)fail(new Error('页面切到后台，保留原视频'));};document.addEventListener('visibilitychange',visibility);
 drawTimer=setInterval(()=>{try{if(video.readyState>=2){ctx.drawImage(video,0,0,canvas.width,canvas.height);maxGap=Math.max(maxGap,video.currentTime-lastTime);lastTime=video.currentTime;}const now=performance.now();if(now-lastProgress>700){lastProgress=now;progress('自动压缩 '+Math.min(99,Math.round(video.currentTime/duration*100))+'%');}}catch(error){fail(error);}},1000/plan.fps);
 timeout=setTimeout(()=>fail(new Error('自动压缩超时')),Math.max(60000,duration*1800+30000));recorder.start(300);video.playbackRate=1;video.play().catch(fail);
 });
 clearInterval(drawTimer);clearTimeout(timeout);video.pause();if(maxGap>1)return unchanged('frames-skipped');
 const encoded=new File([blob],file.name.replace(/\.[^.]+$/,'')+'.mp4',{type:'video/mp4'}),choice=chooseCompressedFile(file,encoded);if(!choice.compressed)return{...choice,reason:'not-smaller'};
 const verify=document.createElement('video'),verifyUrl=URL.createObjectURL(encoded);verify.muted=true;verify.preload='metadata';try{await waitForMedia(verify,'loadedmetadata',()=>{verify.src=verifyUrl;verify.load();},20000);if(Math.abs(verify.duration-duration)>Math.max(1,duration*.03))return unchanged('duration-mismatch');await seekVideoFrame(verify,Math.min(.1,duration/2),20000);}finally{verify.removeAttribute('src');verify.load();URL.revokeObjectURL(verifyUrl);}
 progress('压缩完成：'+(file.size/1048576).toFixed(1)+' → '+(encoded.size/1048576).toFixed(1)+' MB');return{...choice,reason:'compressed',width:plan.width,height:plan.height,duration,audioTracks:audio.length};
 }catch(error){progress('本次未能压缩，将保留原文件');return{...unchanged('fallback'),error:error.message};}
 finally{clearInterval(drawTimer);clearTimeout(timeout);if(visibility)document.removeEventListener('visibilitychange',visibility);if(mediaError)video.removeEventListener('error',mediaError);if(recorder&&recorder.state!=='inactive')try{recorder.stop();}catch{};video.pause();for(const stream of [canvasStream,sourceStream])stream?.getTracks().forEach(t=>t.stop());video.removeAttribute('src');video.load();video.remove();if(url)URL.revokeObjectURL(url);}
}
