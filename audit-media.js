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

export function unavailableLocalFile(error){return error?.name==='NotFoundError'||error?.name==='NotReadableError'||/requested file or directory could not be found|could not be read|本地文件.*(?:失效|不可读)/i.test(error?.message||'');}
// If a source File disappears after a long upload, use the acknowledged stored
// bytes once. Do not repeat OCR, bypass hashes or turn an I/O error into a score.
export async function withStoredMediaFallback(item,url,work,fetchVideo=fetch){
 let file;try{file=await auditMedia(item,url,fetchVideo);return await work(file);}catch(error){if(!unavailableLocalFile(error))throw error;delete item.auditFile;delete item.uploadFile;file=await auditMedia(item,url,fetchVideo);return work(file);}
}
