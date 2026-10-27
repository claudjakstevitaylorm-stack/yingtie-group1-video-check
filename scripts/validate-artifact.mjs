import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
for(const file of ['app.js','engine.js','bgm.js','recognizer.js','shared-config.js','categories.js','screen-text.js','template-name.js']){const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(check.status,0,check.stderr);}
const config=JSON.parse(await readFile('.openai/hosting.json','utf8'));
assert.equal(config.d1,'DB');assert.equal(config.r2,'BUCKET');assert.equal(config.static,undefined);
const source=await readFile('dist/server/index.js','utf8');
const worker=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.equal(typeof worker.default.fetch,'function');
const home=await worker.default.fetch(new Request('https://example.test/'),{});
assert.equal(home.status,200);assert.match(await home.text(),/英铁1组批量查重网站/);
console.log('Shared Worker artifact and bindings validated.');
