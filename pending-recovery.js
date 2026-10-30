// One idle-browser recovery at a time. Existing files/records are reused;
// pending items never become passing merely because recovery failed.
export function createPendingRecovery({canStart,candidates,load,analyze,submit,onState=()=>{}}){
 let running=false;const attempted=new Set(),failures=new Map();
 return{get running(){return running;},async start(){if(running||!canStart())return{processed:0};running=true;let processed=0;try{const list=await candidates();for(const item of list){if(!canStart())break;if(attempted.has(item.id))continue;attempted.add(item.id);onState(item.id,'running');try{const file=await load(item);if(file?.busy){attempted.delete(item.id);onState(item.id,'idle');continue;}if(!file){onState(item.id,'complete');continue;}if(!canStart()){attempted.delete(item.id);onState(item.id,'idle');break;}const feature=await analyze(file,item);await submit(feature,item);processed++;onState(item.id,'complete');}catch(error){const count=(failures.get(item.id)||0)+1;failures.set(item.id,count);if(count<2&&/network|fetch|网络|超时/i.test(error.message||''))attempted.delete(item.id);onState(item.id,'failed',error);}}return{processed};}finally{running=false;}}};
}
