import test from 'node:test';
import assert from 'node:assert/strict';
import {compare,textSimilarity,visualSimilarity,fingerprint,validFeature,VERSION} from '../engine.js';
import {BGM_VERSION,musicFingerprint,bgmSimilarity,validBgm} from '../bgm.js';
import {splitScreenText} from '../screen-text.js';
const color=[1,0,0,0,1,0,0,0,1,0,0,0];
const black={hash:'0'.repeat(63),color},white={hash:'1'.repeat(63),color};
const none={status:'none',source:'declared-none',frames:[]},unknown={status:'review',source:'unconfirmed',frames:[]};
const frame=i=>Array.from({length:32},(_,k)=>k===i?255:0);
const music=frames=>({status:'ok',source:'clean-audio',version:BGM_VERSION,name:'bgm.wav',duration:30,sha:'c'.repeat(64),frames});
const track=music(Array.from({length:20},(_,i)=>frame(i)));
const feature=(overrides={})=>({id:'a',name:'video.mp4',sha:'a'.repeat(64),version:VERSION,frames:[black],subtitles:'one two three four five six seven',subtitleStatus:'ok',overlays:'special offer today only',overlayStatus:'ok',bgm:track,errors:[],duration:30,thumbnail:'data:image/jpeg;base64,AA==',...overrides});
const template=(overrides={})=>feature({id:'template',sha:'b'.repeat(64),enabled:true,...overrides});
test('each of the four dimensions independently permits a pass while all other scores are 100',()=>{
 for(const change of [{frames:[white]},{subtitles:'unrelated words on this other screen'},{overlays:'brand new amazing price'},{bgm:music(new Array(20).fill(frame(31)))}]){
  const result=compare(feature(change),[template()]);assert.equal(result.status,'pass');assert.equal(result.score,0);assert.equal(result.best.highestScore,100);assert.equal(result.qualifying.length,1);
 }
});
test('exactly 70 passes, all scores above 70 fail, and the unrounded value decides',()=>{
 const refs=Array.from({length:10},(_,i)=>i<7?black:white),other=[black,{hash:'01'.repeat(31)+'0',color},{hash:'10'.repeat(31)+'1',color}];
 const result=compare(feature({frames:refs}),[template({frames:other})]);assert.equal(result.score,70);assert.equal(result.status,'pass');
 const above=compare(feature({frames:refs.map((x,i)=>i===7?black:x)}),[template({frames:other})]);assert.equal(above.score,80);assert.equal(above.status,'fail');
 const tokens=Array.from({length:3002},(_,i)=>'w'+i);const near=compare(feature({subtitles:tokens.join(' ')}),[template({subtitles:tokens.slice(0,2103).concat(Array.from({length:899},(_,i)=>'z'+i)).join(' ')})]);assert.equal(near.score.toFixed(1),'70.0');assert.ok(near.score>70);assert.equal(near.status,'fail');
});
test('BGM 70 is sufficient to pass even with every other score 100; 75 alone is not',()=>{
 const b=music(Array.from({length:20},(_,i)=>frame(i<14?i:31)));assert.equal(bgmSimilarity(track,b),70);const result=compare(feature(),[template({bgm:b})]);assert.equal(result.status,'pass');assert.deepEqual(result.qualifying,['bgm']);b.frames[14]=frame(14);assert.equal(compare(feature(),[template({bgm:b})]).status,'fail');
});
test('an identified low score passes despite other missing evidence',()=>{
 const r=compare(feature({frames:[white],subtitleStatus:'review',overlayStatus:'review',bgm:unknown}),[template()]);assert.equal(r.status,'pass');assert.equal(r.best.complete,false);assert.deepEqual(r.qualifying,['visual']);
});
test('unknown and both-absent dimensions cannot create a zero or automatic pass',()=>{
 const absent={subtitles:'',subtitleStatus:'none',overlays:'',overlayStatus:'none',bgm:none};const r=compare(feature(absent),[template(absent)]);assert.equal(r.status,'fail');assert.equal(r.best.subtitle,null);assert.equal(r.best.overlay,null);assert.equal(r.best.bgm,null);assert.equal(r.best.states.bgm,'none');
 const missing=compare(feature({subtitleStatus:'review',overlayStatus:'review',bgm:unknown}),[template()]);assert.equal(missing.status,'review');assert.equal(missing.best.subtitle,null);assert.equal(missing.best.bgm,null);const blank=compare(feature({subtitles:'',subtitleStatus:'ok',overlays:'',overlayStatus:'none',bgm:none}),[template({subtitles:'',subtitleStatus:'none',overlays:'',overlayStatus:'none',bgm:none})]);assert.equal(blank.status,'review');assert.equal(blank.best.subtitle,null);
});
test('confirmed absence versus reliably present content is a real zero',()=>{
 const r=compare(feature({subtitles:'',subtitleStatus:'none'}),[template()]);assert.equal(r.status,'pass');assert.equal(r.best.subtitle,0);assert.deepEqual(r.qualifying,['subtitle']);
});
test('identical file remains 100 and fails even when recognition is incomplete',()=>{
 const r=compare(feature({subtitleStatus:'review',overlayStatus:'review',bgm:unknown}),[template({sha:'a'.repeat(64)})]);assert.equal(r.score,100);assert.equal(r.status,'fail');
});
test('speech content and recognition status never affect a result',()=>{
 for(const speechStatus of ['ok','review',undefined]){const r=compare(feature({frames:[white],speech:'same spoken text',speechStatus}),[template({speech:'same spoken text'})]);assert.equal(r.status,'pass');assert.equal(r.best.speech,undefined);}
});
test('old combined text is unscored while reliable visual evidence can still pass',()=>{
 const r=compare(feature({frames:[white]}),[template({version:'clipguard-2'})]);assert.equal(r.status,'pass');assert.equal(r.best.subtitle,null);assert.equal(r.best.overlay,null);assert.equal(r.best.legacy,true);assert.equal(compare(feature({bgm:unknown}),[template({version:'clipguard-2',bgm:unknown})]).status,'review');
});
test('no enabled or selected template never passes',()=>{assert.equal(compare(feature(),[]).status,'review');assert.equal(compare(feature(),[template({enabled:false})]).status,'review');});
test('screen text is split by line location; uncertain text is never fabricated',()=>{
 const data={blocks:[{paragraphs:[{lines:[{text:'SPECIAL OFFER',confidence:90,bbox:{y0:100,y1:140}},{text:'Daily video subtitle',confidence:92,bbox:{y0:300,y1:330}},{text:'uncertain',confidence:15,bbox:{y0:30,y1:50}}]}]}]};
 assert.deepEqual(splitScreenText(data,360),{subtitles:'Daily video subtitle',overlays:'SPECIAL OFFER',unassigned:''});assert.equal(splitScreenText({text:'fallback full-frame text'},360).unassigned,'fallback full-frame text');assert.equal(splitScreenText({text:'fallback full-frame text'},360).subtitles,'');
});
test('English text normalizes punctuation and detects containment',()=>{assert.equal(textSimilarity('Hello, this is a sentence!','hello this is a sentence'),100);assert.equal(textSimilarity('one two three four five','intro one two three four five final'),100);assert.equal(textSimilarity('','text'),null);assert.equal(textSimilarity('different words','unrelated phrases'),0);});
test('new features validate both independent text fields and reject bad data',()=>{
 assert.equal(validFeature(feature()),true);assert.equal(validFeature(feature({duration:600})),true);for(const bad of [{version:'clipguard-2'},{overlays:undefined},{overlayStatus:'invalid'},{thumbnail:'javascript:alert(1)'},{duration:0},{frames:[]},{bgm:{...none,status:'ok'}}])assert.equal(validFeature(feature(bad)),false);
});
test('visual fingerprints are deterministic and discriminate colors',()=>{
 const pixels=new Uint8ClampedArray(4096);for(let i=0;i<1024;i++){pixels[i*4]=255;pixels[i*4+3]=255;}const red=fingerprint(pixels);assert.deepEqual(fingerprint(pixels),red);for(let i=0;i<1024;i++){pixels[i*4]=0;pixels[i*4+2]=255;}assert.equal(visualSimilarity([red],[fingerprint(pixels)]),0);
});
function melody(notes,seconds=8,gain=.7){return Float32Array.from({length:seconds*8000},(_,i)=>gain*Math.sin(2*Math.PI*notes[Math.floor(i/2000)%notes.length]*i/8000));}
test('PCM music tolerates volume and trimming; different music stays low',()=>{
 const samples=melody([160,440,260,880,330,620,1100,200]),a=music(musicFingerprint(samples)),b=music(musicFingerprint(Float32Array.from(samples.subarray(16000),v=>v*.2))),c=music(musicFingerprint(melody([1700,2200,3000,1300])));assert.equal(validBgm(a),true);assert.ok(bgmSimilarity(a,b)>95);assert.ok(bgmSimilarity(a,c)<70);assert.equal(bgmSimilarity(a,none),0);assert.equal(bgmSimilarity(a,unknown),null);
});
