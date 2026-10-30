import {assessDimensions,usesThreeDimensions,DIMENSIONS} from './decision-policy.js';
export function reportScore(report){const row=report?.best;if(!row)return null;if(usesThreeDimensions(report))return assessDimensions(row).averageScore;const values=['visual','subtitle','overlay','bgm'].filter(k=>row.states?.[k]!=='none').map(k=>row[k]).filter(v=>Number.isFinite(v)&&v>=0&&v<=100);return values.length?values.reduce((sum,v)=>sum+v,0)/values.length:null;}
export function scoreBasis(report){const labels={visual:'画面',subtitle:'字幕',overlay:'花字',bgm:'BGM'},row=report?.best;if(!row)return '';if(usesThreeDimensions(report)){const verdict=assessDimensions(row);return verdict.complete?'总分＝（画面＋字幕＋花字）÷3；每项≤70%，且总分≤60%通过。':'三项尚未全部计分，暂不计算总分；未计分项不按0%处理。';}const included=Object.keys(labels).filter(k=>row.states?.[k]!=='none'&&Number.isFinite(row[k])&&row[k]>=0&&row[k]<=100);if(!included.length)return '暂无可计分项目，平均查重率待确认。';const excluded=Object.keys(labels).filter(k=>!included.includes(k));return '平均分仅按'+included.map(k=>labels[k]).join('、')+'计算（'+included.length+'/4项）'+(excluded.length?'；'+excluded.map(k=>labels[k]).join('、')+'未计入。':'。');}
export function scoreLabel(value){return value===null||value===undefined?'证据不足':value===0?'未检出匹配':value.toFixed(1)+'%';}

export function reviewOpinion(r){
 if(r.state==='uploading')return '视频尚未上传完成，请等待上传结束。';
 if(r.state==='processing')return '视频正在排队或审核中，完成后显示结果。';
 if(r.state==='failed')return '视频上传或处理失败，请重新提交。';
 if(r.status==='pass')return '查重通过。';
 if(r.status==='fail'&&usesThreeDimensions(r)&&!r.best?.exact){const v=assessDimensions(r.best||{}),labels={visual:'画面',subtitle:'字幕',overlay:'花字'},parts=v.exceeded.map(k=>labels[k]+'重复度'+r.best[k].toFixed(1)+'%，超过70%');if(v.averageExceeded)parts.push('三项平均'+v.averageScore.toFixed(1)+'%，超过60%');return parts.length?parts.join('；')+'。':'重复度超过审核标准，请调整后重新提交。';}
 if(r.status==='fail')return r.best?.exact?'与所选模板是同一个视频，请更换素材后重新提交。':'与所选模板重复程度过高，请调整重复内容后重新审核。';
 const errors=(r.errors||[]).join(' ');
 if(/超时/.test(errors))return '视频读取或识别超时，请保持页面打开后重新审核。';
 if(/解码|无法读取/.test(errors))return '当前浏览器未能读取视频，请更换浏览器后重新审核。';
 if(/未选择|未准备|仍在准备/.test(errors))return '对应模板尚未准备好，请重新选择模板后提交。';
 return pendingReviewReason(r);
}

export function dimensionReason(report,key){
 if(key==='visual'&&report.best?.visualEvidence?.kind==='full-coverage-conservative'&&Number.isFinite(report.best.visual))return report.best.visual===0?'整段抽样比对未检出重复片段。':'疑似相似片段已计入保守估计。';
 if(Number.isFinite(report.best?.[key])||report.best?.states?.[key]==='none')return '';
 const reason=report.best?.reasons?.[key]||report.evidenceExplanation?.[key];
 if(!reason)return report.state==='uploading'?'上传完成后进行比对。':report.state==='processing'?'正在识别，完成后显示分数。':'这份报告未保存该项的具体原因，需要重新审核。';
 if(key==='bgm')return '未取得可比的纯音乐音轨，无法比较BGM；不代表视频没有音乐。';
 if(key==='visual')return report.best?.rawVisual===0||/没有找到.*匹配|未达到可靠匹配/.test(reason)?'已比对画面，但未确认相似片段；不按0%处理，未计入平均。':'视频或模板未取得足够画面，无法比较；未计入平均。';
 const summaries=reason.split('\n').filter(line=>line&&!line.startsWith('处理：')&&!line.includes('这些数量条件已满足。')).map(line=>{
  const side=line.startsWith('模板')?'模板：':line.startsWith('上传视频')?'上传视频：':'',parts=[];
  const count=line.match(/：(\d+)词/),coverage=line.match(/文字仅出现在(\d+)\/(\d+)张/),ratio=line.match(/有效英文词占(\d+)%/);
  if(/(?:有效英文)?词数少于12/.test(line))parts.push(count?'只识别到'+count[1]+'个词':'识别到的词数不足');
  else if(/不同有效词少于8/.test(line))parts.push('不同词不足8个');
  if(coverage)parts.push('仅在'+coverage[1]+'张画面识别到文字');
  if(/有效英文词比例低于85%/.test(line))parts.push(ratio?'有效英文词占'+ratio[1]+'%，低于85%':'有效英文词比例不足85%');
  if(parts.length)return side+parts.join('，')+'，暂不计分。';
  if(/没有返回|未返回|未保存/.test(line))return side+'缺少识别记录，需重新审核。';
  if(/单方声明|标记为没有/.test(line))return side+'未确认可比文字，暂不计分。';
  return side+'未提取到足够可靠的文字，暂不计分。';
 });
 return [...new Set(summaries)].join('\n');
}

export function pendingReviewReason(r){
 const labels=usesThreeDimensions(r)?{visual:'画面',subtitle:'字幕',overlay:'花字'}:{visual:'画面',subtitle:'字幕',overlay:'花字',bgm:'BGM'},parts=[];
 for(const key of Object.keys(labels)){
  if(Number.isFinite(r.best?.[key])||!usesThreeDimensions(r)&&r.best?.states?.[key]==='none')continue;
  let text=(usesThreeDimensions(r)&&r.best?.states?.[key]==='none'?'双方没有可比内容，未计分。':dimensionReason(r,key)).replace(/，暂不计分。/g,'').replace(/。$/,'').replace(/\n/g,'；');
  if(key==='bgm'&&parts.length)text='';
  if(text)parts.push(labels[key]+'：'+text);
 }
 return parts.length?(r.automaticAudit?.exhausted?'已自动加强识别，仍缺少可靠证据。':'本次审核已结束，仍待复核。')+parts.join('。')+'。':'识别结果不完整，暂不能判定；请确认模板是否对应。';
}
