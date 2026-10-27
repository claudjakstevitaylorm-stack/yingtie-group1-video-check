// Bounded automatic recovery within one upload record; never manufactures a score.
export async function auditWithRecovery({extract,evaluate,onProgress=()=>{}}){
 let best=null,lastError;
 const rank=a=>a.status==='pass'||a.status==='fail'?(a.hasTextEvidence?4:3):a.hasTextEvidence?2:1;
 for(let attempt=0;attempt<2;attempt++){
  onProgress(attempt?'自动加强识别中（第2轮），无需再次点击':'正在审核');
  try{const feature=await extract({enhanced:attempt===1,mediaTimeout:attempt?90000:60000}),assessment=await evaluate(feature),candidate={feature,assessment,attempts:attempt+1};
   if(!best||rank(assessment)>=rank(best.assessment))best=candidate;
   if(assessment.status!=='review'&&assessment.hasTextEvidence)return candidate;
  }catch(e){lastError=e;if(/校验|格式不正确|不一致|不存在|停用/.test(e.message||''))throw e;}
 }
 if(!best)throw lastError||new Error('自动识别未完成');
 return{...best,attempts:2,recoveryExhausted:true};
}
