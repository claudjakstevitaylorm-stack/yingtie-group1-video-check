// One compatibility contract shared by browser, SQL selection and lease claims.
// New rule revisions automatically recover older three-dimension reports once.
const PREFIX='clipguard-4-evidence-';
export function recoveryRuleNumber(value){const m=/^clipguard-4-evidence-([1-9]\d*)-three-all-mean60$/.exec(value||'');return m?Number(m[1]):null;}
export function recoveryEligible(report,policy,{fresh=true}={}){
 if(report?.version!==policy.version)return false;
 const old=recoveryRuleNumber(report.algorithm),current=recoveryRuleNumber(policy.ruleVersion);
 if(old===null||current===null||old<6||old>current)return false;
 if(old<current)return true;
 return fresh&&(report.automaticReview?.source==='cached-evidence'||report.analysisRevision!==policy.analysisRevision);
}
export function recoverySelection(policy,{fresh=true}={}){
 const current=recoveryRuleNumber(policy.ruleVersion);if(current===null)throw Error('Unsupported recovery rule version');
 const algorithm="json_extract(report,'$.algorithm')",number="CAST(substr("+algorithm+","+(PREFIX.length+1)+") AS INTEGER)",canonical=algorithm+" = '"+PREFIX+"' || CAST("+number+" AS TEXT) || '-three-all-mean60'";
 return{sql:"team=? AND kind='video' AND state='complete' AND status='review' AND json_extract(report,'$.version')=? AND (("+canonical+' AND '+number+'>=6 AND '+number+'<?)'+(fresh?" OR ("+algorithm+"=? AND (json_extract(report,'$.automaticReview.source')='cached-evidence' OR COALESCE(json_extract(report,'$.analysisRevision'),'')<>?))":'')+')',args:[policy.version,current,...fresh?[policy.ruleVersion,policy.analysisRevision]:[]]};
}
