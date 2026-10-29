export const GROUPS=['1','2'];
export const GROUP_MANAGERS=['唐光楠','李慧敏','徐雅琴'];
export const validGroup=value=>GROUPS.includes(value);
export const isGroupManager=name=>GROUP_MANAGERS.includes(String(name||'').trim());
export const groupLabel=value=>validGroup(value)?'英铁'+value+'组':'请选择组别';
export const workspaceDatabaseName=group=>{if(!validGroup(group))throw new Error('请选择组别');return group==='1'?'yingtie-local-workspace':'yingtie-local-workspace-group2';};
