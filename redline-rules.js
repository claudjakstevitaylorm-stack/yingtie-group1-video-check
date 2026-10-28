export const REDLINE_VERSION='image-redlines-20261028-8';
const operators='GWR|LNER|Avanti(?: West Coast)?|ScotRail|Thameslink|Southern|Northern|South Western Railway|Greater Anglia|Chiltern Railways|Elizabeth line';
// These are review cues from the new screenshots, not automatic compliance verdicts.
export const REDLINES=[
 {id:'RL-01',title:'竞品拉踩',check:'检查画面打叉、脚本明确贬低其他品牌的内容。',suggestion:'删除直接拉踩，改为自身功能的客观说明。',patterns:[/\b(?:trainline|omio)\b[^.!?\n]{0,40}\b(?:terrible|scam|rip[- ]?off|awful|rubbish)\b/gi,/\b(?:never use|do not use|don.t use|avoid)\s+(?:trainline|omio)\b/gi,/(?:Trainline|Omio).{0,15}(?:太坑|坑钱|垃圾|别用)/gi]},
 {id:'RL-02',title:'第三方标识、App界面及运营商Logo',check:'人工查看其他公司的Logo、UI、商号、IP图像；截图对运营商脚本给出1.5秒内、正面≤整幅1/10、侧面≤整幅2/5等口径，需逐镜核对，不能由抽帧或OCR推算连续时长。',suggestion:'优先替换为自有品牌或合规素材；有专项豁免时明确记录。',conflict:true},
 {id:'RL-03',title:'铁路负面环境、事故及Amber素材',check:'人工核对环境脏乱、真实铁路故障/事故及已提供的Amber限制；不得凭视觉冲击推定事故。',suggestion:'按实际业务限制替换素材，先核对应豁免。',conflict:true},
 {id:'RL-04',title:'供应商负面引导',check:'检查是否直接贬低铁路供应商，而非中性描述服务。',suggestion:'改为客观线路、票种或服务说明。',patterns:[new RegExp('\\b(?:'+operators+')\\b[^.!?\\n]{0,40}\\b(?:terrible|awful|scam|rubbish)\\b','gi')]},
 {id:'RL-05',title:'虚假价格图及路线价格真实性',check:'人工核对价格原图、站内票价/购票页、路线与承诺对象；不凭模糊数字判断造假。',suggestion:'使用真实匹配票价证据，不要求伪造截图。',conflict:true},
 {id:'RL-06',title:'冷知识真实性',check:'核对脚本和承担事实说明的画面，不凭素材质感判断真假。',suggestion:'补充可核验资料或修改不准确事实。'},
 {id:'RL-07',title:'绝对化营销表述',check:'检查最便宜、最低价格、最佳、领先、最棒、无敌等用语及其上下文；用户允许英文the best，不据此触发红线。',suggestion:'改为有证据支持的具体事实或非绝对化表述。',patterns:[/最便宜|最低价格|最佳|最棒|无敌|世界第一/g,/\b(?:the cheapest|lowest (?:price|fare)s?|unbeatable|world.s (?:best|safest))\b/gi]},
 {id:'RL-08',title:'虚构评论引导口碑',check:'人工核对评论来源，不能捏造“真的只花了£1”等证言。',suggestion:'使用真实且有来源的用户反馈。'},
 {id:'RL-09',title:'歧视与偏见',check:'人工核对种族、性别、地域、阶级等偏见或歧视表达。',suggestion:'删除有明确歧视导向的表达，勿凭单词推断语义。'},
 {id:'RL-10',title:'名人肖像、版权和名人Meme',check:'人工核对人物/素材来源、授权与实际用途，尤其名人Meme；不凭影视质感断言侵权。',suggestion:'使用自有、授权或符合现行豁免的素材。',conflict:true},
 {id:'RL-11',title:'敏感内容',check:'人工查看黄赌毒、药物、政治、血腥暴力，以及截图提到的酒精和宗教内容。普通旅游场所、站名或正常饮酒可能有豁免，关键词本身不能证明违规。',suggestion:'先确认适用口径、语境与豁免，再决定是否替换。',conflict:true,patterns:[/\b(?:beer|wine|vodka|alcohol|casino|cocaine|heroin|bloodshed|pornography|religion|politics|prayer|church|mosque|temple)\b/gi,/黄赌毒|血腥暴力|毒品|宗教仪式|政治宣传/g]},
 {id:'RL-12',title:'禁止引导不在线下/火车站购票',check:'截图已明确旧的替换话术Never buy train tickets offline也不能再使用。',suggestion:'改为在TrainPal/Trip内查询实际票价，不引导贬低或避开官方购票渠道。',patterns:[/\bnever\s+buy\s+(?:train\s+)?tickets?\s+offline\b/gi,/(?:千万)?(?:不要|别).{0,10}(?:火车站|线下).{0,8}(?:买票|购票)/g]},
 {id:'RL-13',title:'真人网络头像',check:'人工查看评论截图等是否使用真人网络头像，截图建议改为AI生成头像；与原文允许的打码/授权情形须核对口径。',suggestion:'按适用规则处理头像，避免冒充真实用户。',conflict:true},
 {id:'RL-14',title:'虚假评价与虚假回复',check:'人工核对评价、回复和口碑来源，打码不等于来源真实。',suggestion:'不发布虚构评价或伪造用户回复。'},
 {id:'RL-15',title:'5000粉以上KOL/网红怼脸素材',check:'人工核实是否属于截图限定的5000粉以上KOL及怼脸素材；不能从脸或画质猜粉丝量。与授权/短时/侧脸豁免需核对。',suggestion:'核实人物及授权、替换素材或按适用规则处理。',conflict:true},
 {id:'RL-16',title:'路线绝对报价缺少from/起',check:'检查具体路线“只需£x”等绝对价格表述；提示回看票价支持和实际文案。',suggestion:'优先改为London to Liverpool from £x等“£x起”，金额必须真实。',conflict:true,patterns:[/\b[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}\s+to\s+[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}\s+(?:(?:only|just|for)\s*)?£\s*\d+(?:\.\d{1,2})?/g,/(?:伦敦|利物浦|爱丁堡|曼彻斯特).{0,12}(?:只需|只要)\s*[£￡]?\s*\d+/g]},
 {id:'RL-17',title:'英文语法、拼写及TrainPal名称',enabled:false,check:'已停用品牌拼写自动判断，避免OCR误读产生红线提示。',suggestion:'品牌拼写不参与自动红线判断。'},
 {id:'RL-18',title:'工作人员不会告诉你的话术',check:'检查“乘务员不会告诉你”“staff won’t tell you”等暗示，不把普通staff单词本身当违规。',suggestion:'改为客观、可核验的公开购票信息，避免踩工作人员。',conflict:true,patterns:[/\b(?:staff|conductors?|train crew)\s+(?:won.?t|will not|do not|don.?t|never)\s+(?:ever\s+)?tell\s+you\b/gi,/(?:乘务员|工作人员|员工).{0,10}(?:不会|不肯|不愿).{0,5}告诉你/g]},
 {id:'RL-19',title:'90% off优惠券承诺',check:'检查90% off优惠券话术，按实际产品、活动和上限核实，不能自动把所有优惠均改成20%。',suggestion:'删除不符合实际活动的90% off承诺，使用有依据的20% off等口径。',patterns:[/\b90\s*%\s*(?:off|discount)\b/gi,/(?:优惠券|折扣券).{0,15}90\s*%/g]},
 {id:'RL-20',title:'英镑符号和币种',check:'人工核对£符号、票价币种及计价含义，不仅凭另一币种出现就认定错误。',suggestion:'使用与真实价格及活动一致的币种符号。'},
 {id:'RL-21',title:'hidden服务、铁路内幕或不公开秘密',check:'截图要求避免hidden服务、铁路行业内幕、火车秘密、不公开和staff不会告诉你的口吻；原文有语境豁免，冲突时先人工确认。',suggestion:'删除内幕/隐瞒式引导，改为正常票种、公开功能和购票步骤。',conflict:true,patterns:[/\bhidden\s+(?:services?|fares?|discounts?|deals?|coupons?|entr(?:y|ance))\b/gi,/\b(?:railway|rail|train)\s+(?:industry\s+)?(?:secrets?|insiders?)\b/gi,/(?:铁路|火车|英铁).{0,10}(?:内幕|秘密|不公开)/g]},
 {id:'RL-22',title:'choose/go with特定运营商',check:'检查choose/go with特定TOC的话术，不把客观线路说明、try或take a look at当作相同表述。',suggestion:'按截图改为could go GWR、try GWR、take a look at等较弱表述。',conflict:true,patterns:[new RegExp('\\b(?:choose|go(?:\\s+with)?)\\s+(?:the\\s+)?(?:'+operators+')\\b','gi')],skip:(match,prefix)=>/\b(?:could|might|may)\s*$/i.test(prefix)},
 {id:'RL-23',title:'Platform-subsidised用词',check:'检查Platform-subsidised / Platform-subsidized / 平台补贴等表述。',suggestion:'按截图改为Retailer-subsidised（供应商补贴），并核实实际活动含义。',patterns:[/\bplatform[\s=‐‑–-]+subsidi[sz]ed\b/gi,/平台补贴/g]}
].map(rule=>({enabled:true,...rule}));
export function scanRedlines(input={}){
 const channels=[['字幕OCR',input.subtitles],['花字OCR',input.overlays],['补充文案',input.supplementalText]],items=[];
 for(const rule of REDLINES.filter(r=>r.enabled&&r.patterns)){const matches=[];for(const [channel,value] of channels){if(typeof value!=='string')continue;const text=value.slice(0,30000);for(const original of rule.patterns){const pattern=new RegExp(original.source,original.flags);for(const found of text.matchAll(pattern)){const prefix=text.slice(Math.max(0,found.index-24),found.index);if(rule.skip?.(found[0],prefix,{channel,input,text,index:found.index}))continue;const excerpt=text.slice(Math.max(0,found.index-35),Math.min(text.length,found.index+found[0].length+55)).trim();if(!matches.some(m=>m.channel===channel&&m.matched===found[0]))matches.push({channel,matched:found[0],excerpt});if(matches.length>=3)break;}if(matches.length>=3)break;}if(matches.length>=3)break;}for(const match of matches)match.ranges=redlineTimeRanges(input,rule,match);if(matches.length)items.push({id:rule.id,title:rule.title,check:rule.check,suggestion:rule.suggestion,conflictingPolicy:!!rule.conflict,status:'notice-only',matches});}
 return{version:REDLINE_VERSION,mode:'text-alert-only',automaticDecision:false,items,hasTextEvidence:channels.some(([,text])=>typeof text==='string'&&text.trim().length>0),notAutomaticallyChecked:['原音口播','Logo和画面语义','人脸、人物授权及粉丝量','真实价格/评论来源','连续露出时长和面积'],notice:'仅基于已有OCR/提供文案的红线线索，须回看原片确认；不等于已完成内容审核，不改变查重结论。'};
}

// OCR positions are sampling windows, not exact word onset/offset times.
export function redlineTimeRanges(input,rule,match){
 const key={'字幕OCR':'subtitles','花字OCR':'overlays'}[match.channel],e=input.evidence,times=e?.sampleTimes,samples=e?.textSamples,duration=input.duration;
 if(!key||!Array.isArray(times)||!Array.isArray(samples)||!Number.isFinite(duration)||duration<=0||!times.length||times.some((t,i)=>!Number.isFinite(t)||t<0||t>=duration||(i&&t<=times[i-1])))return [];
 const normalize=s=>s.replace(/\s+/g,' ').trim(),indices=[];
 for(const sample of samples){const i=sample?.frame,text=sample?.[key];if(!Number.isInteger(i)||i<0||i>=times.length||typeof text!=='string')continue;
  const hit=rule.patterns.some(original=>Array.from(text.matchAll(new RegExp(original.source,original.flags))).some(found=>!rule.skip?.(found[0],text.slice(Math.max(0,found.index-24),found.index),{channel:match.channel,input,text,index:found.index})&&normalize(found[0])===normalize(match.matched)));
  if(hit)indices.push(i);
 }
 const windows=[];for(const i of [...new Set(indices)].sort((a,b)=>a-b)){const start=i===0?0:(times[i-1]+times[i])/2,end=i===times.length-1?duration:(times[i]+times[i+1])/2,last=windows.at(-1);if(last&&i===last.last+1){last.end=end;last.last=i;}else windows.push({start,end,last:i});}
 return windows.map(({start,end})=>({start:Math.round(start*1000)/1000,end:Math.round(end*1000)/1000}));
}
