import test from 'node:test';import assert from 'node:assert/strict';
import {recoveryEligible,recoverySelection} from '../recovery-policy.js';
import {createLocalEnv} from '../scripts/local-env.mjs';
const policy={version:'clipguard-4',ruleVersion:'clipguard-4-evidence-10-three-all-mean60',analysisRevision:'current'};
const report=(n,extras={})=>({version:policy.version,algorithm:`clipguard-4-evidence-${n}-three-all-mean60`,analysisRevision:'current',...extras});
test('a future version bump automatically admits every prior supported revision without editing a list',()=>{
 for(const current of [10,11,12,20])for(let previous=6;previous<current;previous++){
  const p={...policy,ruleVersion:`clipguard-4-evidence-${current}-three-all-mean60`};assert.equal(recoveryEligible(report(previous),p),true);
 }
 assert.equal(recoveryEligible(report(11),policy),false);assert.equal(recoveryEligible(report(5),policy),false);assert.equal(recoveryEligible({...report(9),version:'clipguard-1'},policy),false);assert.equal(recoveryEligible({...report(9),algorithm:'clipguard-4-evidence-9-any'},policy),false);
});
test('extraction upgrades recover once, while current complete evidence is never rerolled',()=>{
 assert.equal(recoveryEligible(report(10),policy),false);
 assert.equal(recoveryEligible(report(10,{analysisRevision:'old',automaticReview:{source:'stored-video-recovery'}}),policy),true);
 assert.equal(recoveryEligible(report(10,{automaticReview:{source:'cached-evidence'}}),policy),true);
 assert.equal(recoveryEligible(report(10,{automaticReview:{source:'stored-video-recovery'}}),policy),false);
 assert.equal(recoveryEligible(report(10,{analysisRevision:'old'}),policy,{fresh:false}),false);
});
test('database candidate filtering and browser eligibility agree across current, older and future releases',()=>{
 const env=createLocalEnv();const cases=[report(6),report(9),report(10),report(10,{analysisRevision:'old'}),report(10,{automaticReview:{source:'cached-evidence'}}),report(11),report(3),{...report(9),algorithm:'clipguard-4-evidence-09-three-all-mean60'}, {...report(9),version:'clipguard-1'}];
 cases.forEach((r,i)=>env.sqlite.prepare('INSERT INTO shared_uploads(id,member,name,kind,state,size,mime,created_at,updated_at,owner_hash,video_ready,status,report,team) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('case'+i,'test','sample.mp4','video','complete',1,'video/mp4','now','now','a'.repeat(64),1,'review',JSON.stringify(r),'1'));
 for(const current of [10,11,20])for(const fresh of [false,true]){
  const p={...policy,ruleVersion:`clipguard-4-evidence-${current}-three-all-mean60`},selection=recoverySelection(p,{fresh}),rows=env.sqlite.prepare('SELECT id FROM shared_uploads WHERE '+selection.sql).all('1',...selection.args),actual=new Set(rows.map(r=>r.id));
  cases.forEach((r,i)=>assert.equal(actual.has('case'+i),recoveryEligible(r,p,{fresh}),JSON.stringify({current,fresh,r})));
 }
});

test('legacy execution-error reports without features are recoverable but never treated as audited',async()=>{
 const {executionFailure}=await import('../recovery-policy.js'),{reviewOutcome}=await import('../redline-ui.js');
 const r={algorithm:policy.ruleVersion,status:'review',state:'complete',errors:['A requested file or directory could not be found at the time an operation was processed.'],comparisons:[]};assert.equal(executionFailure(r),true);assert.equal(recoveryEligible(r,policy),true);assert.equal(reviewOutcome(r).label,'处理失败');assert.equal(recoveryEligible({...r,algorithm:'unknown'},policy),false);
 const env=createLocalEnv();env.sqlite.prepare('INSERT INTO shared_uploads(id,member,name,kind,state,size,mime,created_at,updated_at,owner_hash,video_ready,status,report,team) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('error','test','sample.mp4','video','complete',1,'video/mp4','now','now','a'.repeat(64),1,'review',JSON.stringify(r),'1');const selection=recoverySelection(policy);assert.equal(env.sqlite.prepare('SELECT id FROM shared_uploads WHERE '+selection.sql).all('1',...selection.args).length,1);
});
