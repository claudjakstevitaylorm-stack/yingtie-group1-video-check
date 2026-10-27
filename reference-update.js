// Capture the batch before starting; unrelated current references are never queued.
export function referenceUpdateTargets(templates,selectedId=null){return templates.filter(t=>t.referenceUpdateRequired||(t.id===selectedId&&!t.featureReady));}
