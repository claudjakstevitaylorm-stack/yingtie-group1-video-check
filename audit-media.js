import {compressVideo} from './video-compression.js';
// Stored video bytes are the common input for first audit, retries and recovery.
export async function prepareAuditUpload(file,{retry=false,progress=()=>{},compress=compressVideo}={}){
 if(retry)return{file,compressed:false,originalBytes:file.size,bytes:file.size,reason:'stored-copy'};
 return compress(file,progress);
}
export async function auditMedia(item,url,fetchVideo=fetch){
 if(item.auditFile instanceof Blob)return item.auditFile;
 if(item.uploadFile instanceof Blob){item.auditFile=item.uploadFile;return item.auditFile;}
 const response=await fetchVideo(url,{cache:'no-store'});if(!response.ok)throw new Error('无法读取已上传的审核视频，网络恢复后可继续');
 const blob=await response.blob();if(!blob.size)throw new Error('已上传的审核视频为空');
 item.auditFile=new File([blob],item.file?.name||'video.mp4',{type:blob.type||item.file?.type||'video/mp4'});return item.auditFile;
}
