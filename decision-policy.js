export const DECISION_POLICY='three-dimensions-all70-mean60';
export const DIMENSIONS=['visual','subtitle','overlay'];
export const DIMENSION_LIMIT=70;
export const AVERAGE_LIMIT=60;
export function assessDimensions(row,{exact=false}={}){
 const valid=DIMENSIONS.filter(k=>Number.isFinite(row[k])&&row[k]>=0&&row[k]<=100&&row.states?.[k]!=='review'&&row.states?.[k]!=='none');
 const exceeded=valid.filter(k=>row[k]>DIMENSION_LIMIT),complete=valid.length===3;
 const average=complete?valid.reduce((sum,k)=>sum+row[k],0)/3:null;
 const averageExceeded=average!==null&&average>AVERAGE_LIMIT;
 return{status:exact||exceeded.length||averageExceeded?'fail':complete?'pass':'review',score:average,averageScore:average,complete,exceeded,averageExceeded,missing:DIMENSIONS.filter(k=>!valid.includes(k)),qualifying:valid.filter(k=>row[k]<=DIMENSION_LIMIT)};
}
export function usesThreeDimensions(report){return report?.decision===DECISION_POLICY;}
