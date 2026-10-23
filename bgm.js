// Pure accompaniment input only. Never fingerprint the video's mixed speech track.
export const BGM_VERSION='bgm-spectrum-1';
const RATE=8000,HOP=2000,N=2048,BANDS=32;
function fft(real,imag){for(let i=1,j=0;i<N;i++){let bit=N>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[real[i],real[j]]=[real[j],real[i]];}}for(let len=2;len<=N;len<<=1){const angle=-2*Math.PI/len,wr=Math.cos(angle),wi=Math.sin(angle);for(let i=0;i<N;i+=len){let ar=1,ai=0;for(let j=0;j<len/2;j++){const a=i+j,b=a+len/2,tr=real[b]*ar-imag[b]*ai,ti=real[b]*ai+imag[b]*ar;real[b]=real[a]-tr;imag[b]=imag[a]-ti;real[a]+=tr;imag[a]+=ti;const next=ar*wr-ai*wi;ai=ar*wi+ai*wr;ar=next;}}}}
export function musicFingerprint(samples){
 const frames=[];for(let pos=0;pos+N<=samples.length;pos+=HOP){const re=new Float64Array(N),im=new Float64Array(N);let energy=0;for(let i=0;i<N;i++){const v=samples[pos+i];energy+=v*v;re[i]=v*(.5-.5*Math.cos(2*Math.PI*i/(N-1)));}if(Math.sqrt(energy/N)<.0001){frames.push(new Array(BANDS).fill(0));continue;}fft(re,im);const bands=new Array(BANDS).fill(0);for(let k=21;k<922;k++){const hz=k*RATE/N;if(hz>3600)break;const band=Math.min(BANDS-1,Math.floor(Math.log(hz/80)/Math.log(3600/80)*BANDS));if(band>=0)bands[band]+=re[k]*re[k]+im[k]*im[k];}const values=bands.map(Math.sqrt),norm=Math.hypot(...values);frames.push(values.map(v=>norm?Math.round(255*v/norm):0));}return frames;
}
export function validBgm(b){if(!b||!['ok','none','review'].includes(b.status)||!Array.isArray(b.frames))return false;if(b.status!=='ok')return b.frames.length===0&&['declared-none','unconfirmed'].includes(b.source);return b.version===BGM_VERSION&&b.source==='clean-audio'&&typeof b.name==='string'&&b.name.length<=300&&/^[a-f0-9]{64}$/.test(b.sha)&&Number.isFinite(b.duration)&&b.duration>=3&&b.duration<=90&&b.frames.length>=11&&b.frames.length<=360&&b.frames.every(f=>Array.isArray(f)&&f.length===BANDS&&f.every(v=>Number.isInteger(v)&&v>=0&&v<=255));}
export function bgmSimilarity(a,b){
 if(!a||!b||a.status==='review'||b.status==='review')return null;if(a.status==='none'||b.status==='none')return 0;
 if(a.version!==BGM_VERSION||b.version!==BGM_VERSION)return null;
 const x=a.frames,y=b.frames,nx=x.map(f=>Math.hypot(...f)),ny=y.map(f=>Math.hypot(...f));
 const activeX=nx.filter(n=>n>0).length,activeY=ny.filter(n=>n>0).length,denom=Math.min(activeX,activeY);if(denom<11)return null;
 let best=0;for(let offset=-y.length+11;offset<=x.length-11;offset++){let hits=0;for(let i=Math.max(0,offset);i<Math.min(x.length,y.length+offset);i++){const j=i-offset;if(!nx[i]||!ny[j])continue;let dot=0;for(let k=0;k<BANDS;k++)dot+=x[i][k]*y[j][k];if(dot/(nx[i]*ny[j])>=.985)hits++;}best=Math.max(best,hits);}
 return best<11?0:Math.min(100,100*best/denom);
}
export async function extractBgm(file,videoDuration,progress=()=>{}){
 if(file.size>20*1024*1024)throw new Error('纯BGM片段不能超过20 MB');progress('提取纯BGM音乐指纹（不使用视频口播音轨）…');
 const bytes=await file.arrayBuffer(),ctx=new(window.AudioContext||window.webkitAudioContext)();let raw;
 try{raw=await ctx.decodeAudioData(bytes.slice(0));}finally{await ctx.close();}
 if(raw.duration<3||raw.duration>90||Math.abs(raw.duration-videoDuration)>1)throw new Error('请提供与视频同起止、时长接近的视频所用纯BGM片段（3–90秒，时长误差≤1秒）');
 const offline=new OfflineAudioContext(1,Math.ceil(raw.duration*RATE),RATE),src=offline.createBufferSource();src.buffer=raw;src.connect(offline.destination);src.start();const audio=await offline.startRendering();const frames=musicFingerprint(audio.getChannelData(0));if(frames.filter(f=>f.some(v=>v)).length<11)throw new Error('BGM片段过短或接近静音，需复核');
 const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');return{status:'ok',source:'clean-audio',version:BGM_VERSION,name:file.name.slice(0,300),duration:raw.duration,sha,frames};
}
