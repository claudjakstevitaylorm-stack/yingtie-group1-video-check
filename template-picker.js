export function categoryTemplates(templates,category){return templates.filter(t=>t.category===category);}
export function templateState(t){return t.enabled===false?'已停用':t.featureReady?'可检测':'检测时自动准备';}
export function selectedEnabledTemplate(templates,category,id){return templates.find(t=>t.category===category&&t.id===id&&t.enabled!==false);}
export function categoryPreparationTargets(templates,category){return categoryTemplates(templates,category).filter(t=>t.enabled!==false&&!t.featureReady);}
