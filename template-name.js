export function composeTemplateName(hitName,member){
 if(typeof hitName!=='string'||!hitName.trim())throw new Error('请填写爆款名字，模板名格式：爆款名字+个人名字');
 const hit=hitName.trim();if(hit.length>120||/[+\r\n\u0000]/.test(hit))throw new Error('爆款名字请使用120字以内的文字，不包含加号或换行');
 if(typeof member!=='string'||!member.trim()||member.trim().length>30||/[+\r\n\u0000]/.test(member))throw new Error('个人名字请使用30字以内的文字，不包含加号或换行');
 return hit+'+'+member.trim();
}
export function initialHitName(filename,member){const suffix='+'+member;let base=String(filename||'');if(base.endsWith(suffix))base=base.slice(0,-suffix.length);else{base=base.replace(/\.(mp4|mov|webm|m4v|ogg)$/i,'');if(base.endsWith(suffix))base=base.slice(0,-suffix.length);}return base.replace(/[+\r\n\u0000]/g,' ').trim().slice(0,120);}

export function templateNameParts(name,member,category){const parts=String(name||'').split('+');if(parts.length===2&&parts[0]&&parts[1])return{hitName:parts[0],personalName:parts[1]};return{hitName:category&&category!=='未分类'?category:initialHitName(name,member)||'未分类',personalName:member};}
