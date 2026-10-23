import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
import worker from '../dist/server/index.js';
import {createLocalEnv} from './local-env.mjs';
const env=createLocalEnv();
http.createServer(async(req,res)=>{try{if(req.method==='GET'&&req.url==='/tests/browser-qa.html'){res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});return res.end(await readFile(new URL('../tests/browser-qa.html',import.meta.url)));}const init={method:req.method,headers:req.headers};if(!['GET','HEAD'].includes(req.method)){init.body=Readable.toWeb(req);init.duplex='half';}const request=new Request('http://127.0.0.1:4173'+req.url,init);const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();}catch(e){res.writeHead(500);res.end(e.message);}}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173 (temporary in-memory shared database)'));
