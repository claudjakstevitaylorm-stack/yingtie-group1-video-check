import {REDLINES,REDLINE_VERSION,scanRedlines} from './redline-rules.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function redlineHints(record){return record?.redlineHints?.version===REDLINE_VERSION?record.redlineHints:scanRedlines(record);}
export function redlineBadge(record){const hints=redlineHints(record);return hints.items.length?'<div class="redline-count">红线提示：'+hints.items.length+'项</div>':'';}
export function redlineChecklist(){return '<details class="redline-rules"><summary>查看红线提示规则</summary><ol>'+REDLINES.filter(r=>r.enabled).map(r=>'<li><strong>'+esc(r.id+' '+r.title)+'</strong><p>'+esc(r.suggestion)+'</p></li>').join('')+'</ol></details>';}
export function redlinePanel(record){const hints=redlineHints(record);if(!hints.items.length)return '';return '<section class="redline-panel" aria-label="红线提示"><h3>红线提示</h3><ul class="redline-hits">'+hints.items.map(item=>'<li><strong>'+esc(item.title)+'</strong>'+item.matches.map(m=>'<p>提取内容（'+esc(m.channel.replace('OCR',''))+'）：<q>'+esc(m.matched)+'</q></p>').join('')+'<p>建议：'+esc(item.suggestion)+'</p></li>').join('')+'</ul></section>';}

export function redlineResult(record){
 const hints=redlineHints(record),state=record?.state;
 if(state==='uploading'||state==='processing')return{label:'待检测',tone:'review',opinion:'视频处理完成后显示文字红线结果'};
 if(state==='failed')return{label:'未完成',tone:'review',opinion:'视频处理失败，尚无完整文字结果'};
 if(hints.items.length)return{label:'不通过',tone:'fail',opinion:hints.items.map(item=>item.title+'：'+item.suggestion).join('；')};
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
 return{label:'待复核',tone:'review',opinion:'识别结果未完整，请点击查看意见'};
}
