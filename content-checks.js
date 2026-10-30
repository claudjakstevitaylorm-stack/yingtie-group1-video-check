// Internal business configuration supplied in UK_V11_FULL.md; not live pricing.
export const CONTENT_POLICY={version:'UK-RAIL-COMPLIANCE-1.1-1020',railcardPercent:20,ticketPercent:20,traincard:{price:22,percent:15,days:90,perOrder:10,uses:70}};
const codePattern=/\b(?:promo\s+code|coupon\s+code|discount\s+code|search(?:\s+for)?|enter(?:\s+(?:the\s+)?code)?|use\s+(?:the\s+)?code)\s*[:=：\-]?\s*["“'‘]?([a-z0-9]{2,12})\b/gi;
export function codeMentions(text=''){return Array.from(text.matchAll(codePattern)).filter(m=>/[a-z]/i.test(m[1])&&/\d/.test(m[1])).map(m=>({code:m[1].toUpperCase(),text:m[0],index:m.index}));}
export function needsContentSample(input){return codeMentions((input.subtitles||'')+'\n'+(input.overlays||'')).length>0||/\b(?:railcard|traincard|train tickets?|coupon)\b/i.test((input.subtitles||'')+' '+(input.overlays||''));}
function repeated(input,key,phrase){const samples=input.evidence?.textSamples;if(!Array.isArray(samples))return false;const normalize=s=>s.toLowerCase().replace(/\s+/g,' ').trim();return new Set(samples.filter(s=>Number.isInteger(s.frame)&&normalize(s[key]||'').includes(normalize(phrase))).map(s=>s.frame)).size>=2;}
function ranges(input,key,phrase){const times=input.evidence?.sampleTimes,samples=input.evidence?.textSamples,T=input.duration;if(!Array.isArray(times)||!Array.isArray(samples)||!(T>0)||times.some((t,i)=>!Number.isFinite(t)||t<0||t>=T||(i>0&&t<=times[i-1])))return [];const indices=[...new Set(samples.filter(s=>Number.isInteger(s.frame)&&s.frame>=0&&s.frame<times.length&&(s[key]||'').toLowerCase().includes(phrase.toLowerCase())).map(s=>s.frame))].sort((a,b)=>a-b),out=[];for(const i of indices){const start=i? (times[i-1]+times[i])/2:0,end=i<times.length-1?(times[i]+times[i+1])/2:T,last=out.at(-1);if(last&&last.last===i-1){last.end=end;last.last=i;}else out.push({start,end,last:i});}return out.map(({start,end})=>({start,end}));}
const item=(id,title,suggestion,matches)=>({id,title,suggestion,noticeOnly:true,status:'notice-only',matches});
// Text-only checks: direct instructions can block; context-dependent claims are cues.
export const CONTENT_TEXT_RULES=[
 {id:'UK-C03-PAYMENT',title:'明确逃票操作',suggestion:'删除绕过验票或不付票款的操作指令。',blocking:true,patterns:[/\b(?:jump|climb over) (?:the )?(?:ticket )?barriers? to (?:avoid|skip) (?:paying|payment)\b/gi,/\b(?:follow|tailgate) (?:another passenger|someone) through (?:the )?(?:ticket )?(?:gate|barrier)s? without (?:paying|a ticket)\b/gi,/(?:跟随他人|尾随乘客)(?:通过|穿过)闸机(?:来|以)?(?:逃票|免付票款)/g]},
 {id:'UK-C04-DIRECT',title:'绕平台向私人账户付款',suggestion:'删除绕过TrainPal/Trip向供应商私人账户付款的指令。',blocking:true,patterns:[/\b(?:bypass|skip) (?:trainpal|trip(?:\.com)?) (?:and|then) (?:pay|send money to) (?:the )?supplier[’']?s? (?:private|personal) account\b/gi,/(?:绕过|跳过)(?:TrainPal|Trip(?:\.com)?)[，,、 ]*(?:直接)?(?:向|给)供应商私人账户(?:付款|转账)/gi]},
 {id:'UK-C01-CLAIM',title:'保底收益或医疗效果承诺',suggestion:'核对原句，删除无依据的保底收益或治疗效果承诺。',patterns:[/零风险|躺赚|保证省\s*[£￡]\s*\d+(?:\.\d+)?|彻底根治|药到病除|无副作用|立马见效/g,/\b(?:guaranteed to save|guarantee (?:you will|you’ll|you'll) save)\s*£\s*\d+(?:\.\d+)?/gi,/\b(?:guaranteed profit|zero risk|no side effects|cures cancer)\b/gi]},
 {id:'UK-C08-WORDS',title:'迷信或权威宣传用词',suggestion:'核对是否属于宣传承诺，改为客观旅行或产品说明。',patterns:[/招财|转运|逢凶化吉|逆天改命|助吉避凶|旺财|旺夫|克夫|算命|风水|塔罗|水逆|国家级|国宴|特供|专供|军用|免检|老字号|中国驰名商标|人民币图样/g]},
 {id:'UK-C02-ENDORSEMENT',title:'平台背书表述需核对',suggestion:'核对平台授权；无对应授权时删除官方背书表述。',patterns:[/\bTikTok\s+(?:best[ -]?seller|officially recommends?|officially endorsed)\b/gi]},
 {id:'UK-C05-CN',title:'明确优先推荐运营商',suggestion:'删除优先、首选或总是选择，改为客观线路说明或普通推荐。',blocking:true,patterns:[/(?:优先选择|首选|总是选择)\s*(?:GWR|LNER|Avanti(?: West Coast)?|ScotRail|Thameslink|Southern|Northern|South Western Railway|Greater Anglia|Chiltern Railways|Elizabeth line)(?![a-z])/gi]}
];
function contraryContext(text,hit){
 const start=Math.max(text.lastIndexOf('\n',hit.index-1),text.lastIndexOf('。',hit.index-1),text.lastIndexOf('!',hit.index-1),text.lastIndexOf('?',hit.index-1));
 const prefix=text.slice(start+1,hit.index);
 // Ignore warnings, negated instructions and quoted examples of forbidden wording.
 return /\b(?:do not|don[’']t|never|avoid|not|illegal|forbidden|example)\b|不要|不得|禁止|不能|不应|避免|错误示例|违规示例/i.test(prefix)||/is (?:illegal|forbidden)|违法|不可取/i.test(text.slice(hit.index+hit[0].length,hit.index+hit[0].length+35));
}
function languageChecks(input,channels){
 const out=[];
 for(const rule of CONTENT_TEXT_RULES){
  const matches=[];
  for(const [key,channel]of channels){
   // App UI fragments are not narration. Only explicit provided text or repeated OCR.
   const text=typeof input[key]==='string'?input[key].slice(0,30000):'';
   for(const pattern of rule.patterns)for(const hit of text.matchAll(new RegExp(pattern.source,pattern.flags))){
    if(contraryContext(text,hit)||key!=='supplementalText'&&!repeated(input,key,hit[0]))continue;
    if(matches.some(m=>m.channel===channel&&m.matched===hit[0]))continue;
    matches.push({channel,matched:hit[0],ranges:ranges(input,key,hit[0])});
    if(matches.length>=3)break;
   }
  }
  if(matches.length)out.push({...item(rule.id,rule.title,rule.suggestion,matches.slice(0,3)),noticeOnly:!rule.blocking});
 }
 return out;
}
export function contentChecks(input={}){
 const items=[],codes=new Map(),channels=[['subtitles','字幕OCR'],['overlays','花字OCR'],['supplementalText','补充文案']];
 for(const [key,channel]of channels){const text=(key==='overlays'?[input.overlays,input.interfaceText].filter(Boolean).join('\n'):typeof input[key]==='string'?input[key]:'').slice(0,30000);
  for(const hit of codeMentions(text)){if(key!=='supplementalText'&&!repeated(input,key,hit.text))continue;if(!codes.has(hit.code))codes.set(hit.code,{channel,matched:hit.code,ranges:ranges(input,key,hit.text)});}
  // Scope numbers to a single product sentence. Mere co-occurrence across scenes
  // cannot establish a conflicting offer; these remain non-blocking cues.
  const patterns=[{re:/\btraincard\s+(?:costs?\s+)?£\s*(\d+(?:\.\d{1,2})?)/gi,value:CONTENT_POLICY.traincard.price,label:'购卡价格',unit:'£'}, {re:/\btraincard\s+(?:(?:gives?|saves?|offers?)\s+)?(\d+(?:\.\d+)?)\s*%\s*(?:off)?/gi,value:CONTENT_POLICY.traincard.percent,label:'购票折扣',unit:'%'},{re:/\brailcard\s+(?:(?:coupon|voucher)\s+)(?:(?:saves?|offers?)\s+)?(\d+)\s*%\s*off/gi,value:CONTENT_POLICY.railcardPercent,label:'Railcard优惠券折扣',unit:'%'},{re:/\btraincard\s+(?:is\s+)?valid\s+for\s+(\d+)\s+days\b/gi,value:CONTENT_POLICY.traincard.days,label:'有效期',unit:'天'},{re:/\btraincard\s+(?:(?:allows?|offers?)\s+)?(\d+)\s+uses\b/gi,value:CONTENT_POLICY.traincard.uses,label:'使用次数上限',unit:'次'},{re:/\btraincard\s+(?:(?:saves?|offers?)\s+)?(?:up\s+to\s+)?£\s*(\d+)\s+per\s+order\b/gi,value:CONTENT_POLICY.traincard.perOrder,label:'每单优惠上限',unit:'£'}];
  for(const p of patterns)for(const hit of text.matchAll(p.re)){if(Number(hit[1])===p.value)continue;if(key!=='supplementalText'&&!repeated(input,key,hit[0]))continue;items.push(item('UK-W01','优惠数值需核对',p.label+'与本次业务配置'+(p.unit==='£'?'£'+p.value:p.value+p.unit)+'不一致，请核对对应产品和活动。',[{channel,matched:hit[0],ranges:ranges(input,key,hit[0])}]));}
  const claims=/\btraincard\s+(?:has\s+)?(?:unlimited\s+(?:uses?|savings?)|no\s+(?:cap|limit|expiry))\b/gi;
  for(const hit of text.matchAll(claims)){if(key!=='supplementalText'&&!repeated(input,key,hit[0]))continue;items.push(item('UK-W01-LIMIT','Traincard限制需核对','本次配置：90天、最多70次、每单最多省£10；请核对无限制表述。',[{channel,matched:hit[0],ranges:ranges(input,key,hit[0])}]));}
 }
 if(codes.size>1)items.push(item('UK-Q01-CODE','检测到多个优惠码','若属于同一优惠，请统一Code；不同活动分别说明即可。',[...codes.values()].slice(0,6)));
 const a=input.audioQuality;if(a?.version===1&&a.status==='checked')for(const issue of a.issues||[]){const labels={silence:['疑似异常静音','此处音轨接近静音；若非有意留白，请补充声音。'],clipping:['疑似爆音','此处连续出现满幅音频样本，请试听并降低失真。'],jump:['音量明显突变','此处音量突变，请试听并平衡音量。']},label=labels[issue.type];if(label&&Number.isFinite(issue.start)&&Number.isFinite(issue.end)&&issue.start>=0&&issue.end>issue.start&&issue.end<=input.duration)items.push(item('UK-D02-'+issue.type,label[0],label[1],[{channel:'音轨检测',matched:label[0],ranges:[{start:issue.start,end:issue.end}]}]));}
 return [...languageChecks(input,channels),...items].slice(0,24);
}
