import worker from '../server/index.js';
export async function register(env,token='a'.repeat(64),member='测试组员',group='1'){
 const response=await worker.fetch(new Request('https://test/api/session',{method:'POST',headers:{'X-Owner-Token':token,'Content-Type':'application/json'},body:JSON.stringify({member,group})}),env);
 if(response.status!==200)throw new Error('Test registration failed: '+await response.text());return response.json();
}
export async function registeredRequest(env,request,token='a'.repeat(64)){
 const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
 if(!env.sqlite.prepare('SELECT 1 FROM group_memberships WHERE owner_hash=?').get(hash))await register(env,token);
 const headers=new Headers(request.headers);headers.set('X-Owner-Token',token);return worker.fetch(new Request(request,{headers}),env);
}
