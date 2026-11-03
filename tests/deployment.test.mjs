import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../api/worker.mjs';
const read = (path) => readFileSync(new URL(path, import.meta.url),'utf8');

test('Cloudflare health kertoo valmiustilan näyttämättä salaisuuksia',async()=>{
  const response=await worker.fetch(new Request('https://api.example.test/health',{headers:{Origin:'https://jdowcon.github.io'}}),{CORS_ORIGIN:'https://jdowcon.github.io'});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('access-control-allow-origin'),'https://jdowcon.github.io');
  assert.equal((await response.json()).ready,false);
});
test('Palvelimen jo vastaanottamaa erää ei lähetetä uudelleen virheen yhteydessä',()=>{
  const app=read('../src/app.mjs');
  assert.match(app,/job\.errorSource!=='remote'/);
  assert.match(app,/j\.errorSource==='remote'/);
});
test('Julkinen metadata ei sisällä keskeneräistä ottelustatusta',()=>{
  const worker=read('../api/worker.mjs');
  assert.match(worker,/const \{status,revision,\.\.\.metadata\}=payload\.match/);
});
test('Manuaalisen API-julkaisun pitää ilmoittaa puuttuvista salaisuuksista',()=>{
  const workflow=read('../.github/workflows/deploy-api.yml');
  assert.match(workflow,/workflow_dispatch/);
  assert.match(workflow,/::error::Cloudflare Secrets puuttuu/);
});
