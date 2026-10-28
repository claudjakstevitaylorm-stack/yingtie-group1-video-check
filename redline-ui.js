import {reviewOpinion} from './report-score.js';
import {REDLINES,REDLINE_VERSION,scanRedlines} from './redline-rules.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function redlineHints(record){return record?.redlineHints?.version===REDLINE_VERSION?record.redlineHints:scanRedlines(record);}
export function redlineBadge(record){const hints=redlineHints(record);return hints.items.length?'<div class="redline-count">红线提示：'+hints.items.length+'项</div>':'';}
export function redlineChecklist(){return '<details class="redline-rules"><summary>查看红线提示规则</summary><ol>'+REDLINES.filter(r=>r.enabled).map(r=>'<li><strong>'+esc(r.id+' '+r.title)+'</strong><p>'+esc(r.suggestion)+'</p></li>').join('')+'</ol></details>';}
export function timeLabel(seconds){const n=Math.max(0,Math.floor(seconds));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function matchTimes(match){const ranges=Array.isArray(match.ranges)?match.ranges.filter(r=>Number.isFinite(r?.start)&&Number.isFinite(r?.end)&&r.start>=0&&r.end>r.start):[];return ranges.length?'<span class="redline-times">'+ranges.map(r=>'<button type="button" class="redline-time" data-action="seek-redline" data-start="'+r.start+'" aria-label="播放约'+timeLabel(r.start)+'至'+timeLabel(Math.ceil(r.end))+'的片段">约 '+timeLabel(r.start)+'–'+timeLabel(Math.ceil(r.end))+' ↗</button>').join('')+'</span>':match.channel==='补充文案'?'<span class="redline-time-note">补充文案无视频时间</span>':'<span class="redline-time-note">未保存时间位置，重新审核后可定位</span>';}
export function redlinePanel(record){const hints=redlineHints(record);const section=(items,notice)=>!items.length?'':'<section class="redline-panel'+(notice?' content-notices':'')+'" aria-label="'+(notice?'审核提醒':'红线提示')+'"><h3>'+(notice?'审核提醒（不影响通过）':'红线提示')+'</h3><ul class="redline-hits">'+items.map(item=>'<li><strong>'+esc(item.title)+'</strong>'+item.matches.map(m=>'<p>提取内容（'+esc(m.channel.replace('OCR',''))+'）：<q>'+esc(m.matched)+'</q></p>'+matchTimes(m)).join('')+'<p>建议：'+esc(item.suggestion)+'</p></li>').join('')+'</ul></section>';let html=section(hints.items.filter(i=>!i.noticeOnly),false)+section(hints.items.filter(i=>i.noticeOnly),true);if(record.audioQuality?.status==='unavailable')html+='<p class="audio-check-note">音频暂未读出，未判断音频质量。</p>';return html;}

export function redlineResult(record){
 const hints=redlineHints(record),state=record?.state;
 if(state==='uploading'||state==='processing')return{label:'待检测',tone:'review',opinion:'视频处理完成后显示文字红线结果'};
 if(state==='failed')return{label:'未完成',tone:'review',opinion:'视频处理失败，尚无完整文字结果'};
 const blocking=hints.items.filter(i=>!i.noticeOnly);
 if(blocking.length)return{label:'不通过',tone:'fail',opinion:blocking.map(item=>item.title+'：'+item.suggestion).join('；')};
 if(!hints.hasTextEvidence)return{label:'待确认',tone:'review',opinion:'尚无字幕或花字识别结果，无法判断文字红线'};
 return{label:'通过',tone:'pass',opinion:'未检出文字红线'};
}

export function reviewOutcome(record){
 if(record.state==='uploading')return{label:'上传中',tone:'review',opinion:''};
 if(record.state==='processing')return{label:'审核中',tone:'review',opinion:''};
 if(record.state==='failed')return{label:'上传失败',tone:'fail',opinion:'视频未处理成功，请重新提交'};
 const red=redlineResult(record);
 if(record.status==='fail'||red.tone==='fail')return{label:'不通过',tone:'fail',opinion:[record.status==='fail'?'查重未通过':'',red.tone==='fail'?red.opinion:''].filter(Boolean).join('；')};
 if(record.status==='pass'&&red.tone==='pass')return{label:'通过',tone:'pass',opinion:''};
 return{label:'待复核',tone:'review',opinion:record.status==='review'?reviewOpinion(record):red.opinion};
}
