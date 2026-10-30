import test from 'node:test';import assert from 'node:assert/strict';
import {contentChecks,codeMentions} from '../content-checks.js';import {scanRedlines} from '../redline-rules.js';import {redlinePanel,reviewOutcome} from '../redline-ui.js';import {analyzeAudio,validAudioQuality,extractAudioQuality} from '../audio-quality.js';import {validFeature} from '../engine.js';import {feature} from './evidence-fixture.mjs';
const observed=(a,b=a)=>({state:'complete',status:'pass',duration:5,overlays:a+'\n'+b,evidence:{sampleTimes:[.1,1.1,2.1,3.1,4.1],textSamples:[{frame:0,overlays:a,subtitles:''},{frame:1,overlays:a,subtitles:''},{frame:3,overlays:b,subtitles:''},{frame:4,overlays:b,subtitles:''}]}});
test('code consistency needs repeated explicit cues and keeps distinct offers non-blocking',()=>{assert.deepEqual(codeMentions('Search “cs6” enter code LS11').map(x=>x.code),['CS6','LS11']);assert.equal(codeMentions('TrainPal 20% off').length,0);assert.equal(contentChecks(observed('Search cs6','Search CS6')).length,0);const r=observed('Search cs6','Enter code ls11'),hits=contentChecks(r);assert.equal(hits[0].id,'UK-Q01-CODE');assert.equal(hits[0].matches.length,2);assert.ok(hits[0].matches.every(m=>m.ranges.length));assert.equal(reviewOutcome(r).label,'通过');assert.match(redlinePanel(r),/不影响通过/);const isolated={...r,evidence:{...r.evidence,textSamples:[r.evidence.textSamples[0],r.evidence.textSamples[2]]}};assert.equal(contentChecks(isolated).length,0);});
test('product configuration checks are scoped and do not confuse normal Railcard fare discounts',()=>{for(const text of ['Traincard £22','Traincard gives 15% off','Railcard coupon 20% off','Railcard 33% off'])assert.equal(contentChecks(observed(text)).length,0);for(const text of ['Traincard £25','Traincard gives 25% off','Railcard coupon 90% off','Traincard unlimited uses','Traincard valid for 30 days','Traincard 100 uses','Traincard saves £20 per order']){assert.ok(contentChecks(observed(text)).some(x=>x.id.startsWith('UK-W01')));assert.equal(reviewOutcome(observed(text)).tone,scanRedlines(observed(text)).items.some(i=>!i.noticeOnly)?'fail':'pass');}assert.equal(contentChecks({overlays:'Traincard £25',evidence:{textSamples:[]}}).length,0);});
test('explicit banned wording still blocks and allowed travel language does not',()=>{for(const t of ['Never buy train tickets offline','always pick GWR','prioritise LNER','go with GWR first'])assert.equal(reviewOutcome(observed(t)).label,'不通过');for(const t of ['TrainPall','hidden coupon entry','staff will not tell you','travel secrets','try GWR','choose GWR','Beer in a church tour'])assert.equal(reviewOutcome(observed(t)).label,'通过');});
test('audio cues detect >=3s silence, sustained full-scale samples and channel-specific clipping',()=>{const rate=1000;const silent=new Float32Array(4000);const silence=analyzeAudio([silent],rate);assert.deepEqual(silence.issues,[{type:'silence',start:0,end:4}]);assert.equal(analyzeAudio([silent.slice(0,2999)],rate).issues.length,0);const tone=Float32Array.from({length:4000},(_,i)=>.2*Math.sin(i*.2));assert.equal(analyzeAudio([tone],rate).issues.length,0);const clipped=new Float32Array(1000).fill(1);assert.ok(analyzeAudio([clipped,new Float32Array(1000)],rate).issues.some(x=>x.type==='clipping'));assert.equal(analyzeAudio([Float32Array.from({length:1000},(_,i)=>i===500?1:.1)],rate).issues.length,0);const jump=Float32Array.from({length:2000},(_,i)=>i<1000?.02:.5);assert.ok(analyzeAudio([jump],rate).issues.some(x=>x.type==='jump'));});
test('audio cue ranges are bounded, persisted by feature validation, and never change duplicate scores',()=>{const r={...observed('normal trip'),audioQuality:analyzeAudio([new Float32Array(5000)],1000),score:53.8};assert.ok(validAudioQuality(r.audioQuality,5));assert.equal(reviewOutcome(r).label,'通过');assert.equal(r.score,53.8);assert.match(redlinePanel(r),/00:00–00:05/);assert.equal(validFeature(feature({audioQuality:r.audioQuality,duration:5})),true);assert.equal(validFeature(feature({audioQuality:{...r.audioQuality,issues:[{type:'silence',start:0,end:999}]}})),false);assert.match(redlinePanel({...r,audioQuality:{version:1,status:'unavailable',duration:5,channels:0,issues:[]}}),/未判断音频质量/);});
test('unsupported audio decoding returns unavailable and does not fail a task',async()=>{const a=await extractAudioQuality(new Blob([new Uint8Array([1,2,3])]),5);assert.equal(a.status,'unavailable');assert.equal(a.issues.length,0);});

test('V11 direct evasion and off-platform private payment instructions require repeated text evidence',()=>{
 for(const [text,id]of [
  ['Jump the ticket barrier to avoid paying','UK-C03-PAYMENT'],
  ['Follow another passenger through the ticket gate without a ticket','UK-C03-PAYMENT'],
  ['尾随乘客通过闸机逃票','UK-C03-PAYMENT'],
  ["Bypass TrainPal and pay the supplier's private account",'UK-C04-DIRECT'],
  ['绕过TrainPal向供应商私人账户转账','UK-C04-DIRECT'],
  ['优先选择LNER','UK-C05-CN']]){
  const r=observed(text),hit=scanRedlines(r).items.find(i=>i.id===id);
  assert.ok(hit,text);assert.equal(hit.noticeOnly,false);assert.ok(hit.matches[0].ranges.length);assert.equal(reviewOutcome(r).label,'不通过');
  assert.equal(contentChecks({...r,evidence:{...r.evidence,textSamples:r.evidence.textSamples.slice(0,1)}}).some(i=>i.id===id),false);
 }
});
test('V11 context-dependent product claims are non-blocking cues with exact evidence',()=>{
 for(const [text,id]of [['Guaranteed to save £200','UK-C01-CLAIM'],['TrainPal零风险','UK-C01-CLAIM'],['旅行可招财转运','UK-C08-WORDS'],['TikTok Best seller','UK-C02-ENDORSEMENT']]){
  const r=observed(text),hit=contentChecks(r).find(i=>i.id===id);assert.ok(hit,text);assert.equal(hit.noticeOnly,true);assert.ok(hit.matches[0].matched);assert.equal(reviewOutcome(r).label,'通过');
 }
});
test('V11 negated instructions, safety education and permitted travel language stay clear',()=>{
 for(const text of [
  'Never jump the ticket barrier to avoid paying',
  "Do not bypass TrainPal and pay the supplier's private account",
  '禁止尾随乘客通过闸机逃票','不要优先选择LNER','避免招财转运等迷信用语',
  'Fare evasion is illegal — use split ticketing instead',
  'Use this hack to get cheaper tickets','Hop off early with an Off-Peak ticket',
  'Tap three times to open the hidden coupon entry, then enter your code',
  'Save a fortune','Save big','the best','TRAINPAL','TrainPall',
  'take the Caledonian Sleeper','优先选择Caledonian Sleeper','try GWR',
  'Visit a church then enjoy a beer','🇬🇧 UK train tips',
  'Search CS6 in TrainPal','Contact us on WhatsApp','TrainPal zero booking fees'
 ])assert.equal(contentChecks(observed(text)).length,0,text);
});
test('V11 re-evaluates saved old hints without rerunning video or making up timecodes',()=>{
 const r={...observed('旅行可招财'),redlineHints:{version:'uk-content-20261028-9',items:[],hasTextEvidence:true}};
 assert.match(redlinePanel(r),/迷信或权威宣传用词/);assert.match(redlinePanel(r),/约 00:00–/);
 const extra=contentChecks({supplementalText:'Guaranteed to save £200'}).find(i=>i.id==='UK-C01-CLAIM');assert.deepEqual(extra.matches[0].ranges,[]);
 assert.equal(contentChecks({overlays:'Guaranteed to save £200'}).length,0);
 assert.equal(contentChecks({interfaceText:'TikTok Best seller',evidence:r.evidence}).length,0);
});
