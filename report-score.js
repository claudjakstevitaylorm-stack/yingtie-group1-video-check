export function reportScore(report){const row=report?.best;if(!row)return Number.isFinite(report?.score)?report.score:null;const values=['visual','subtitle','overlay','bgm'].map(k=>row[k]).filter(Number.isFinite);return values.length?Math.max(...values):null;}
export function scoreLabel(value){return value===null||value===undefined?'证据不足':value===0?'未检出匹配':value.toFixed(1)+'%';}

export function reviewOpinion(r){
 if(r.state==='uploading')return '视频尚未上传完成，请等待上传结束。';
 if(r.state==='processing')return '视频正在排队或审核中，完成后显示结果。';
 if(r.state==='failed')return '视频上传或处理失败，请重新提交。';
 if(r.status==='pass')return '查重通过。';
 if(r.status==='fail')return r.best?.exact?'与所选模板是同一个视频，请更换素材后重新提交。':'与所选模板重复程度过高，请调整重复内容后重新审核。';
 const errors=(r.errors||[]).join(' ');
 if(/超时/.test(errors))return '视频读取或识别超时，请保持页面打开后重新审核。';
 if(/解码|无法读取/.test(errors))return '当前浏览器未能读取视频，请更换浏览器后重新审核。';
 if(/未选择|未准备|仍在准备/.test(errors))return '对应模板尚未准备好，请重新选择模板后提交。';
 return pendingReviewReason(r);
}

export function dimensionReason(report,key){
 if(Number.isFinite(report.best?.[key])||report.best?.states?.[key]==='none')return '';
 const reason=report.best?.reasons?.[key]||report.evidenceExplanation?.[key];
 if(!reason)return report.state==='uploading'?'上传完成后进行比对。':report.state==='processing'?'正在识别，完成后显示分数。':'这份报告未保存该项的具体原因，需要重新审核。';
 const lines=reason.split('\n').filter(line=>line&&!line.startsWith('处理：')&&!line.includes('这些数量条件已满足。')).map(line=>line.replace(/上传视频「[^」]*」/g,'上传视频').replace(/模板「[^」]*」/g,'模板').replace(/不作为通过依据/g,'暂不计分'));
 return lines.join('\n');
}

export function pendingReviewReason(r){
 const labels={visual:'画面',subtitle:'字幕',overlay:'花字',bgm:'BGM'},parts=[];
 for(const key of Object.keys(labels)){
  if(Number.isFinite(r.best?.[key])||r.best?.states?.[key]==='none')continue;
  const reason=dimensionReason(r,key);let text='';
  if(key==='visual')text=r.best?.rawVisual===0?'未找到可靠匹配，不能当作0%':reason.split('\n')[0];
  else if(key==='subtitle'||key==='overlay'){
   const gaps=reason.split('\n').map(line=>{const gap=line.match(/未达标：([^。]+)/);return gap?(line.startsWith('模板')?'模板：':'上传视频：')+gap[1]:'';}).filter(Boolean);
   text=gaps.join('；')||reason.split('\n')[0];
  }else if(!parts.length)text='缺少可用于比对的纯音乐数据';
  if(text)parts.push(labels[key]+'：'+text);
 }
 return parts.length?'本次审核已结束，仍待复核。'+parts.join('。')+'。':'识别结果不完整，暂时无法确定是否通过，请重新审核。';
}
