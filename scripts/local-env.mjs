import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
export function createLocalEnv(){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const prepare=sql=>{let values=[];const api={bind(...args){values=args;return api;},async first(){return sqlite.prepare(sql).get(...values)||null;},async all(){return{results:sqlite.prepare(sql).all(...values)};},async run(){const r=sqlite.prepare(sql).run(...values);return{success:true,meta:{changes:Number(r.changes)}};}};return api;};
 const storage=new Map();
 const DB={prepare,async batch(items){sqlite.exec('BEGIN');try{const result=[];for(const item of items)result.push(await item.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 const BUCKET={async put(key,value,options={}){const bytes=new Uint8Array(await new Response(value).arrayBuffer());if(options.sha256){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');if(hash!==options.sha256)throw new Error('checksum mismatch');}const item={bytes,size:bytes.byteLength,httpMetadata:options.httpMetadata||{},customMetadata:options.customMetadata||{},httpEtag:'"'+crypto.randomUUID()+'"'};storage.set(key,item);return item;},async head(key){const item=storage.get(key);return item?{...item,bytes:undefined}:null;},async get(key,options){const item=storage.get(key);if(!item)return null;const bytes=options?.range?item.bytes.slice(options.range.offset,options.range.offset+options.range.length):item.bytes;return{...item,body:new Blob([bytes]).stream()};},async delete(key){storage.delete(key);}};
 return{DB,BUCKET,sqlite,storage};
}
