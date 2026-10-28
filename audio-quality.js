// Technical signal cues only: no speech recognition, source separation or BGM matching.
export function analyzeAudio(channels,rate){
 if(!Array.isArray(channels)||!channels.length||!(rate>0)||!channels[0]?.length)throw new Error('没有可分析的音轨');
 const length=channels[0].length,duration=length/rate,hop=Math.max(1,Math.round(rate*.05)),windows=[];
 for(let start=0;start<length;start+=hop){const end=Math.min(length,start+hop);let energy=0,clipped=false;
  for(const data of channels){let consecutive=0,count=0,sum=0,channelClipped=false;for(let i=start;i<end;i++){const x=data[i]||0;sum+=x*x;if(Math.abs(x)>=.9999){count++;consecutive++;}else consecutive=0;if(consecutive>=3)channelClipped=true;}energy=Math.max(energy,sum/(end-start));clipped=clipped||channelClipped&&count/(end-start)>=.005;}
  windows.push({start:start/rate,end:end/rate,rms:Math.sqrt(energy),clipped});
 }
 const issues=[];for(const [type,test,min]of [['silence',w=>w.rms<=.001,3],['clipping',w=>w.clipped,.15]]){let run=null;const flush=()=>{if(run&&run.end-run.start>=min-1e-6)issues.push({type,start:run.start,end:run.end});run=null;};for(const w of windows){if(test(w)){if(run)run.end=w.end;else run={start:w.start,end:w.end};}else flush();}flush();}
 const seconds=[];for(let i=0;i<windows.length;i+=20){const group=windows.slice(i,i+20);seconds.push({start:group[0].start,end:group.at(-1).end,rms:Math.sqrt(group.reduce((s,w)=>s+w.rms*w.rms,0)/group.length)});}
 for(let i=1;i<seconds.length;i++){const a=seconds[i-1],b=seconds[i];if(Math.min(a.rms,b.rms)>.01&&Math.abs(20*Math.log10(b.rms/a.rms))>18)issues.push({type:'jump',start:a.start,end:b.end});}
 return{version:1,status:'checked',duration,channels:channels.length,issues:issues.sort((a,b)=>a.start-b.start).slice(0,12)};
}
export function validAudioQuality(a,duration){return a===undefined||a?.version===1&&['checked','unavailable'].includes(a.status)&&typeof a.reason==='undefined'&&Number.isFinite(a.duration)&&Math.abs(a.duration-duration)<1&&Number.isInteger(a.channels)&&a.channels>=0&&a.channels<=32&&Array.isArray(a.issues)&&a.issues.length<=12&&a.issues.every(i=>['silence','clipping','jump'].includes(i?.type)&&Number.isFinite(i.start)&&Number.isFinite(i.end)&&i.start>=0&&i.end>i.start&&i.end<=duration)&&(a.status!=='unavailable'||a.issues.length===0);}
export async function extractAudioQuality(file,duration,progress=()=>{}){
 let ctx;const unavailable={version:1,status:'unavailable',duration,channels:0,issues:[]};
 try{const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return unavailable;progress('检查音轨静音、爆音与音量变化…');ctx=new C();let timer;const buffer=await Promise.race([ctx.decodeAudioData(await file.arrayBuffer()),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('音轨读取超时')),20000);})]).finally(()=>clearTimeout(timer));if(Math.abs(buffer.duration-duration)>=1)return unavailable;const result=analyzeAudio(Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i)),buffer.sampleRate);return{...result,duration,issues:result.issues.map(i=>({...i,end:Math.min(duration,i.end)})).filter(i=>i.end>i.start)};}catch{return unavailable;}finally{try{await ctx?.close();}catch{}}
}
