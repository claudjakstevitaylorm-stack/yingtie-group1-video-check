// One compatibility contract shared by browser, SQL selection and lease claims.
// New rule revisions automatically recover older three-dimension reports once.
const PREFIX='clipguard-4-evidence-';
export function recoveryRuleNumber(value){const m=/^clipguard-4-evidence-([1-9]\d*)-three-all-mean60$/.exec(value||'');return m?Number(m[1]):null;}
export function executionFailure(report){return !!report&&(!report.version||report.version==='clipguard-4')&&!report.evidence&&Array.isArray(report.errors)&&report.errors.length>0&&(!report.comparisons||report.comparisons.length===0);}
export function recoveryEligible(report,policy,{fresh=true}={}){
 if(report?.version!==policy.version&&!executionFailure(report))return false;
 const old=recoveryRuleNumber(report.algorithm),current=recoveryRuleNumber(policy.ruleVersion);
 if(old===null||current===null||old<6||old>current)return false;
 if(old<current)return true;
 return fresh&&(executionFailure(report)||report.automaticReview?.source==='cached-evidence'||report.analysisRevision!==policy.analysisRevision);
}
export function recoverySelection(policy,{fresh=true}={}){
 const current=recoveryRuleNumber(policy.ruleVersion);if(current===null)throw Error('Unsupported recovery rule version');
 const algorithm="json_extract(report,'$.algorithm')",number="CAST(substr("+algorithm+","+(PREFIX.length+1)+") AS INTEGER)",canonical=algorithm+" = '"+PREFIX+"' || CAST("+number+" AS TEXT) || '-three-all-mean60'";
 return{sql:"team=? AND kind='video' AND state='complete' AND status='review' AND (json_extract(report,'$.version')=? OR (json_extract(report,'$.version') IS NULL AND json_extract(report,'$.evidence') IS NULL AND json_array_length(json_extract(report,'$.errors'))>0 AND COALESCE(json_array_length(json_extract(report,'$.comparisons')),0)=0)) AND (("+canonical+' AND '+number+'>=6 AND '+number+'<?)'+(fresh?" OR ("+algorithm+"=? AND (json_extract(report,'$.automaticReview.source')='cached-evidence' OR COALESCE(json_extract(report,'$.analysisRevision'),'')<>? OR (json_extract(report,'$.evidence') IS NULL AND json_array_length(json_extract(report,'$.errors'))>0 AND COALESCE(json_array_length(json_extract(report,'$.comparisons')),0)=0)))":'')+')',args:[policy.version,current,...fresh?[policy.ruleVersion,policy.analysisRevision]:[]]};
}
