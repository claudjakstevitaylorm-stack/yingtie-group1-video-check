// A retry is a separate upload/audit item. The source record is never modified.
export function retryReviewItem(record,template,{member='',localItem=null,id=crypto.randomUUID()}={}){
 if(!record.videoUrl||!record.selectedTemplateId)throw new Error('原视频或对应模板信息缺失，暂时无法重新审核');
 if(!template||template.id!==record.selectedTemplateId||template.enabled===false)throw new Error('对应模板已停用或不存在，请重新选择模板');
 const name=('重审 · '+record.name.replace(/^重审 · /,'')).slice(0,300);
 return{id,file:{name,size:record.size,type:record.mime},member:record.member||member,requestedBy:member,state:'等待读取原视频',done:false,bgmMode:localItem?.bgmFile?'file':record.bgm?.status==='none'?'none':'review',...(localItem?.bgmFile?{bgmFile:localItem.bgmFile}:{}),noSubtitle:record.subtitleStatus==='none'||!!localItem?.noSubtitle,noOverlay:record.overlayStatus==='none'||!!localItem?.noOverlay,category:template.category,templateId:template.id,templateName:template.name,retrySourceId:record.id,mediaTimeout:60000};
}
export async function loadRetryVideo(item,url,fetchVideo=fetch){
 if(!item.retrySourceId||item.retryDownloaded)return;
 const response=await fetchVideo(url,{cache:'no-store'});if(!response.ok)throw new Error('无法读取已上传原视频，请检查视频是否已删除或网络连接');
 const blob=await response.blob();if(!blob.size)throw new Error('已上传原视频为空，无法重新审核');
 item.file=new File([blob],item.file.name,{type:item.file.type||blob.type||'video/mp4'});item.retryDownloaded=true;
}
