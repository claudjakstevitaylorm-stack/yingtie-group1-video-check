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
 const missing=['visual','subtitle','overlay'].filter(k=>r.best?.states?.[k]==='review').map(k=>({visual:'画面',subtitle:'字幕',overlay:'花字'}[k]));
 return missing.length?missing.join('、')+'识别不完整，暂时无法确定是否通过。请确认模板选择正确、文字清晰后重新审核。':'识别结果不完整，暂时无法确定是否通过，请重新审核。';
}
