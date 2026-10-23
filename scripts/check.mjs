import {spawnSync} from 'node:child_process';
for (const name of ['app.js','engine.js','recognizer.js']) {
 const r=spawnSync(process.execPath,['--check',name],{stdio:'inherit'});
 if(r.status!==0)process.exit(r.status||1);
}
console.log('JavaScript syntax checks passed.');
