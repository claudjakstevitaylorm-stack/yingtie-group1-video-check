export function reportScore(report){const row=report?.best;if(!row)return Number.isFinite(report?.score)?report.score:null;const values=['visual','subtitle','overlay','bgm'].map(k=>row[k]).filter(Number.isFinite);return values.length?Math.max(...values):null;}
export function scoreLabel(value){return value===null||value===undefined?'证据不足':value===0?'未检出匹配':value.toFixed(1)+'%';}
