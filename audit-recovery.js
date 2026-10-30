// One fixed high-detail profile. Retry only execution failures, never switch
// sampling profiles or keep rerolling OCR until a passing score appears.
export const AUDIT_PROFILE='stored-video-enhanced-20261030-v3';
export async function auditWithRecovery({extract,evaluate,onProgress=()=>{}}){
 let lastError;
 for(let attempt=0;attempt<2;attempt++){
  onProgress(attempt?'正在自动恢复同一识别任务，无需再次点击':'正在完整审核');
  try{const feature=await extract({enhanced:true,mediaTimeout:90000}),assessment=await evaluate(feature);return{feature,assessment,profile:AUDIT_PROFILE,attempts:attempt+1,recoveryExhausted:assessment.status==='review'};}
  catch(e){lastError=e;if(/校验|格式不正确|不一致|不存在|停用/.test(e.message||''))throw e;}
 }
 throw lastError||new Error('自动识别未完成');
}
