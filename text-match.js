// Compare both complete texts: a short shared fragment cannot stand in for a full script.
export function words(t){return (t||'').toLowerCase().replace(/[^a-z0-9' ]/g,' ').split(/\s+/).filter(Boolean);}
// Only tolerate recognisable OCR substitutions, not arbitrary real-word edits.
export function tokenMatch(a,b){if(a===b)return true;if(Math.min(a.length,b.length)<4)return false;const normalize=t=>t.toLowerCase().replace(/0/g,'o').replace(/[1|]/g,'l');if(normalize(a)===normalize(b))return true;const ambiguous=t=>normalize(t).replace(/[il]/g,'!');return /[01|]/.test(a+b)&&ambiguous(a)===ambiguous(b);}

const common=new Set('a an the of to in on at by for and or but is are was were be been being it its this that these those you your we our they their i my with as from so if than then'.split(' '));
const weight=t=>common.has(t)?.25:1;
export function textSimilarity(a,b){const x=words(a),y=words(b);if(!x.length||!y.length)return null;let previous=new Float64Array(y.length+1);for(const word of x){const current=new Float64Array(y.length+1);for(let j=1;j<=y.length;j++)current[j]=Math.max(previous[j],current[j-1],tokenMatch(word,y[j-1])?previous[j-1]+Math.min(weight(word),weight(y[j-1])):0);previous=current;}const aligned=2*previous[y.length]/(x.reduce((s,t)=>s+weight(t),0)+y.reduce((s,t)=>s+weight(t),0));
 const pairs=t=>{const m=new Map();for(let i=1;i<t.length;i++){const key=t[i-1]+' '+t[i];m.set(key,(m.get(key)||0)+1);}return m;},p=pairs(x),q=pairs(y);let shared=0;const left=new Map(p),right=new Map(q);for(const [key,n] of p){const same=Math.min(n,q.get(key)||0);shared+=same;left.set(key,n-same);right.set(key,(q.get(key)||0)-same);}const fuzzy=(a,b)=>{let matched=0;const remaining=new Map(b);for(const [key,n] of a){if(!n)continue;let need=n;const terms=key.split(' ');for(const [other,count] of remaining){if(!count||!need)continue;const pair=other.split(' ');if(tokenMatch(terms[0],pair[0])&&tokenMatch(terms[1],pair[1])){const take=Math.min(need,count);matched+=take;need-=take;remaining.set(other,count-take);}}}return matched;};shared+=Math.min(fuzzy(left,right),fuzzy(right,left));const adjacent=x.length+y.length>2?2*shared/(x.length+y.length-2):aligned;
 return 100*(.8*aligned+.2*adjacent);
}
// Rolling captions often repeat or extend over several frames. Keep the phrase once.
export function mergeScreenText(samples){const out=[];for(const raw of samples){const text=(raw||'').trim();if(!text)continue;const current=words(text);if(!current.length)continue;const prior=out.at(-1),old=prior?words(prior):[];if(old.length===current.length&&old.every((t,i)=>tokenMatch(t,current[i])))continue;
 if(old.length&&Math.min(old.length,current.length)/Math.max(old.length,current.length)>=.7){const short=old.length<=current.length?old:current,long=old.length>current.length?old:current;let contained=false;for(let start=0;start<=long.length-short.length;start++)if(short.every((t,i)=>tokenMatch(t,long[start+i]))){contained=true;break;}if(contained){if(current.length>old.length)out[out.length-1]=text;continue;}}
 let overlap=0;for(let n=Math.min(old.length,current.length);n>=2;n--)if(old.slice(-n).every((t,i)=>tokenMatch(t,current[i]))){overlap=n;break;}
 if(overlap)out[out.length-1]=old.concat(current.slice(overlap)).join(' ');else out.push(text);
 }return out.join('\n').slice(0,29999);}
