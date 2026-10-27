import {VERSION} from '../engine.js';
export const alpha='alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec romeo sierra tango';
export const colors='red green blue orange purple silver white black cyan magenta violet brown peach navy ivory crimson yellow indigo pink gold';
export const color=[1,0,0,0,1,0,0,0,1,0,0,0];
export function frames(kind='a',n=24){return Array.from({length:n},(_,i)=>{const base=kind==='a'?'0'.repeat(63):kind==='b'?'1'.repeat(63):'01'.repeat(31)+'0',hash=base.slice(0,i%4)+(base[i%4]==='0'?'1':'0')+base.slice(i%4+1),tile={hash,color,detail:40};return{hash,color,tiles:Array.from({length:9},()=>({...tile}))};});}
export function proof(fs,duration=30){return{version:1,sampleCount:fs.length,sampleTimes:fs.map((_,i)=>i*duration/fs.length+.001),subtitleFrames:fs.map((_,i)=>i),overlayFrames:fs.map((_,i)=>i)};}
export function feature(overrides={}){const fs=overrides.frames||frames(),duration=overrides.duration||30;return{version:VERSION,name:'video.mp4',sha:'a'.repeat(64),frames:fs,evidence:proof(fs,duration),duration,thumbnail:'data:image/jpeg;base64,AA==',subtitles:alpha,subtitleStatus:'ok',overlays:alpha,overlayStatus:'ok',bgm:{status:'none',source:'declared-none',frames:[]},errors:[],...overrides};}
