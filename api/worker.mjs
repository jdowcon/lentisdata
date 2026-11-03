/** LentisData 0.1 API — Cloudflare Worker + SQLite Durable Object.
 * GitHub credentials remain on the server. No client-side write token.
 */
const json = (data, status=200) => new Response(JSON.stringify(data), {status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const fail = (message,status=400)=>json({error:message},status);
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const bytes = str => new TextEncoder().encode(str);
const digest = async s => b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(s))));
const b64 = str => { const a=bytes(str);let result='';for(let i=0;i<a.length;i+=8192)result+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(result); };

// GitHub App may supply RSA PKCS#1 PEM; WebCrypto requires PKCS#8.
const derLength=n=>n<128?[n]:(()=>{const a=[];while(n){a.unshift(n&255);n>>=8;}return [128+a.length,...a];})();
const tlv=(tag,data)=>new Uint8Array([tag,...derLength(data.length),...data]);
const wrapRsaPkcs1=key=>{
 const algorithm=new Uint8Array([0x30,0x0d,0x06,0x09,0x2a,0x86,0x48,0x86,0xf7,0x0d,0x01,0x01,0x01,0x05,0x00]);
 return tlv(0x30,new Uint8Array([0x02,0x01,0x00,...algorithm,...tlv(0x04,key)]));
};

const now = () => Date.now();
const uuid = () => crypto.randomUUID();
const codes = new Set(['S1','S2','S3','S4','V1','V2','V3','V4']);

export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    const allowed=new Set([env.CORS_ORIGIN, env.DEV_ORIGIN].filter(Boolean));
    const origin=request.headers.get('Origin');
    const cors=origin&&allowed.has(origin)?{'access-control-allow-origin':origin,'vary':'Origin','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'content-type,x-device-id,x-timestamp,x-nonce,x-signature,x-admin-token','access-control-max-age':'600'}:{};
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    const isAdmin=url.pathname.startsWith('/admin/');
    if(!isAdmin && !url.pathname.startsWith('/api/') && url.pathname!=='/health')return fail('Tuntematon osoite.',404);
    if(origin&&!allowed.has(origin))return fail('Origin ei ole sallittu.',403);
    if(url.pathname==='/health')return json({ok:true,service:'LentisData API',version:'0.1'});
    try {
      const stub=env.HUB.get(env.HUB.idFromName('lentisdata-0.1-global'));
      const response=await stub.fetch(request);
      const headers=new Headers(response.headers);
      for(const [name,val] of Object.entries(cors))headers.set(name,val);
      headers.set('x-content-type-options','nosniff');
      return new Response(response.body,{status:response.status,headers});
    } catch(e){return fail('Palveluvirhe. Yritä myöhemmin uudelleen.',503);}
  }
};

export class Hub {
  constructor(ctx,env){
    this.ctx=ctx;this.env=env;this.sql=ctx.storage.sql;this.cachedToken=null;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS invites (code_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, jwk TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS nonces (id TEXT PRIMARY KEY, created INTEGER NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS owners (match_id TEXT PRIMARY KEY, device_id TEXT NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS jobs (key TEXT PRIMARY KEY, match_id TEXT NOT NULL, kind TEXT NOT NULL, idx INTEGER, revision INTEGER NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, error TEXT, updated INTEGER NOT NULL)`);
  }
  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(request.method==='POST'&&path==='/api/activate')return this.activate(request);
    if(path.startsWith('/admin/')) {
      if(!this.env.ADMIN_TOKEN || request.headers.get('X-Admin-Token')!==this.env.ADMIN_TOKEN)return fail('Ei valtuuksia.',401);
      if(request.method==='POST'&&path==='/admin/invites')return this.createInvite(request);
      if(request.method==='POST'&&path==='/admin/transfer')return this.transfer(request);
      return fail('Tuntematon toiminto.',404);
    }
    if(path!=='/api/sync'&&path!=='/api/status')return fail('Tuntematon toiminto.',404);
    const raw=request.method==='POST'?await request.text():'';
    const actor=await this.authenticate(request,raw);
    if(!actor)return fail('Laitteen tunnistus epäonnistui.',401);
    if(path==='/api/sync' && request.method==='POST'){
      if(raw.length>500000)return fail('Liian suuri tilastotiedosto.',413);
      let data;try{data=JSON.parse(raw);}catch{return fail('Virheellinen JSON.');}
      return this.receiveJob(actor.id,data);
    }
    if(path==='/api/status' && request.method==='GET') {
      const matchId=url.searchParams.get('matchId');
      if(!matchId||matchId.length>100)return fail('Virheellinen ottelu.');
      const owner=this.sql.exec('SELECT device_id FROM owners WHERE match_id=?',matchId).toArray()[0];
      if(owner&&owner.device_id!==actor.id)return fail('Ei oikeutta tähän otteluun.',403);
      const jobs=this.sql.exec('SELECT key,revision,status,error FROM jobs WHERE match_id=?',matchId).toArray();
      return json({jobs});
    }
    return fail('Virheellinen menetelmä.',405);
  }
  async activate(request){
    let body;try{body=await request.json();}catch{return fail('Virheellinen pyyntö.');}
    if(typeof body.inviteCode!=='string'||body.inviteCode.length>256)return fail('Virheellinen kutsukoodi.');
    const jwk=body.publicJwk;
    if(!jwk||jwk.kty!=='EC'||jwk.crv!=='P-256'||!jwk.x||!jwk.y)return fail('Virheellinen laiteavain.');
    try{await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);}catch{return fail('Laitteen avainta ei voi vahvistaa.');}
    const hash=await digest(body.inviteCode);
    const invite=this.sql.exec('SELECT expires,used FROM invites WHERE code_hash=?',hash).toArray()[0];
    if(!invite||invite.used||invite.expires<now())return fail('Kutsukoodi ei kelpaa tai on vanhentunut.',401);
    const deviceId=uuid();
    this.sql.exec('UPDATE invites SET used=1 WHERE code_hash=? AND used=0',hash);
    this.sql.exec('INSERT INTO devices(id,jwk,revoked) VALUES(?,?,0)',deviceId,JSON.stringify(jwk));
    return json({deviceId});
  }
  async authenticate(req,body){
    const id=req.headers.get('X-Device-Id'),timestamp=req.headers.get('X-Timestamp'),nonce=req.headers.get('X-Nonce'),sig=req.headers.get('X-Signature');
    if(!id||!timestamp||!nonce||!sig||!/^\d+$/.test(timestamp)||Math.abs(now()-Number(timestamp))>300000||nonce.length>100||sig.length>200)return null;
    const device=this.sql.exec('SELECT jwk,revoked FROM devices WHERE id=?',id).toArray()[0];
    if(!device||device.revoked)return null;
    const url=new URL(req.url),path=url.pathname+url.search,hash=await digest(body);
    const message=`${req.method}\n${path}\n${timestamp}\n${nonce}\n${hash}`;
    try {
      const key=await crypto.subtle.importKey('jwk',JSON.parse(device.jwk),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
      const raw=atob(sig.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-sig.length%4)%4));
      const valid=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,Uint8Array.from(raw,c=>c.charCodeAt(0)),bytes(message));
      if(!valid)return null;
      this.sql.exec('DELETE FROM nonces WHERE created<?',now()-600000);
      if(this.sql.exec('SELECT id FROM nonces WHERE id=?',nonce).toArray().length)return null;
      this.sql.exec('INSERT INTO nonces(id,created) VALUES(?,?)',nonce,now());
      return {id};
    }catch{return null;}
  }
  async receiveJob(deviceId,data){
    const {key,kind,matchId,revision,index,payload}=data||{};
    if(typeof matchId!=='string'||!/^[-a-f0-9]{36}$/i.test(matchId)||typeof key!=='string'||key.length>200||!Number.isSafeInteger(revision)||revision<0||!['set','match'].includes(kind))return fail('Virheellinen synkronointitehtävä.');
    if(key!==(kind==='set'?`${matchId}:set:${index}`:`${matchId}:match`))return fail('Synkronointitunniste ei täsmää.');
    if(payload?.schemaVersion!==1||payload.kind!==kind||payload.match?.id!==matchId||payload.match?.statistician||!Array.isArray(payload.sets|| (kind==='set'?[payload.set]:[])))return fail('Tilastoaineiston rakenne ei kelpaa.');
    if(kind==='set'){
      const s=payload.set;
      if(!Number.isInteger(index)||![1,2,3].includes(index)||s?.index!==index||s.revision!==revision||!Array.isArray(s.events)||s.events.length>2500||!s.events.every(e=>codes.has(e.category)&&typeof e.id==='string')||!this.validScore(s.ownScore,s.opponentScore,index))return fail('Virheellinen eräaineisto.');
    } else {
      if(payload.match.revision!==revision||!Array.isArray(payload.sets)||payload.sets.length!==payload.match.setsPlanned||payload.sets.some(s=>!this.validScore(s.ownScore,s.opponentScore,s.index)))return fail('Virheellinen otteluyhteenveto.');
    }
    let owner=this.sql.exec('SELECT device_id FROM owners WHERE match_id=?',matchId).toArray()[0];
    if(owner&&owner.device_id!==deviceId)return fail('Ottelulla on toinen aktiivinen tilastoija.',409);
    if(!owner)this.sql.exec('INSERT INTO owners(match_id,device_id) VALUES(?,?)',matchId,deviceId);
    const existing=this.sql.exec('SELECT revision,status,payload FROM jobs WHERE key=?',key).toArray()[0];
    if(existing&&revision<existing.revision)return fail('Palvelimella on uudempi eräversio.',409);
    if(existing&&revision===existing.revision){
      if(existing.payload!==JSON.stringify(payload))return fail('Sama versionumero sisältää eri tiedot. Päivitä ja tarkista ottelu.',409);
      return json({accepted:true,status:existing.status});
    }
    this.sql.exec(`INSERT INTO jobs(key,match_id,kind,idx,revision,payload,status,error,updated) VALUES(?,?,?,?,?,?,'received','',?) ON CONFLICT(key) DO UPDATE SET revision=excluded.revision,payload=excluded.payload,status='received',error='',updated=excluded.updated`,key,matchId,kind,index??null,revision,JSON.stringify(payload),now());
    await this.ctx.storage.setAlarm(now()+1000);
    return json({accepted:true,status:'received'});
  }
  validScore(a,b,index){
    if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<0||b<0)return false;
    const target=index===3?15:25,h=Math.max(a,b),l=Math.min(a,b);
    return (h===target&&l<=target-2)||(h>target&&h===l+2);
  }
  async createInvite(req){
    let data={};try{data=await req.json();}catch{}
    const random=crypto.getRandomValues(new Uint8Array(24)),code=b64url(random),expires=now()+Math.min(Math.max(Number(data.validDays)||7,1),30)*86400000;
    this.sql.exec('INSERT INTO invites(code_hash,expires,used) VALUES(?,?,0)',await digest(code),expires);
    return json({inviteCode:code,expiresAt:new Date(expires).toISOString()});
  }
  async transfer(req){
    let data;try{data=await req.json();}catch{return fail('Virheellinen pyyntö.');}
    if(typeof data.matchId!=='string'||typeof data.deviceId!=='string')return fail('Virheellinen pyyntö.');
    if(!this.sql.exec('SELECT id FROM devices WHERE id=? AND revoked=0',data.deviceId).toArray().length)return fail('Laitetta ei löydy.',404);
    this.sql.exec('INSERT INTO owners(match_id,device_id) VALUES(?,?) ON CONFLICT(match_id) DO UPDATE SET device_id=excluded.device_id',data.matchId,data.deviceId);
    return json({transferred:true});
  }
  async alarm(){
    const pending=this.sql.exec("SELECT * FROM jobs WHERE status IN ('received','error') ORDER BY CASE WHEN kind='set' THEN 0 ELSE 1 END, updated LIMIT 12").toArray();
    for(const job of pending){
      try {
        const payload=JSON.parse(job.payload);
        if(job.kind==='match'){
          const dependencies=payload.sets.every(s=>this.sql.exec('SELECT status,revision FROM jobs WHERE key=?',`${job.match_id}:set:${s.index}`).toArray().some(x=>x.status==='synced'&&x.revision===s.revision));
          if(!dependencies)continue;
        }
        if(job.kind==='set'&&job.idx===1){
          await this.writeGitHub(`matches/${job.match_id}/metadata.json`,JSON.stringify(payload.match,null,2)+'\n');
        }
        const path=job.kind==='set'?`matches/${job.match_id}/set-${job.idx}.json`:`matches/${job.match_id}/summary.json`;
        await this.writeGitHub(path,JSON.stringify(payload,null,2)+'\n');
        this.sql.exec("UPDATE jobs SET status='synced',error='',updated=? WHERE key=? AND revision=?",now(),job.key,job.revision);
      }catch(e){
        this.sql.exec("UPDATE jobs SET status='error',error=?,updated=? WHERE key=? AND revision=?",String(e.message||e).slice(0,240),now(),job.key,job.revision);
      }
    }
    const open=this.sql.exec("SELECT key FROM jobs WHERE status IN ('received','error') LIMIT 1").toArray();
    if(open.length)await this.ctx.storage.setAlarm(now()+30000);
  }
  async githubToken(){
    if(this.cachedToken&&this.cachedToken.exp>now()+60000)return this.cachedToken.value;
    const privatePem=this.env.GITHUB_APP_PRIVATE_KEY;
    if(!privatePem||!this.env.GITHUB_APP_ID||!this.env.GITHUB_INSTALLATION_ID)throw Error('GitHub App -salaisuudet eivät ole määritetty.');
    const isPkcs1=privatePem.includes('BEGIN RSA PRIVATE KEY');
    const pem=privatePem.replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----|-----END (?:RSA )?PRIVATE KEY-----|\s/g,'');
    const raw=Uint8Array.from(atob(pem),c=>c.charCodeAt(0));
    const der=isPkcs1?wrapRsaPkcs1(raw):raw;
    const key=await crypto.subtle.importKey('pkcs8',der,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
    const issued=Math.floor(now()/1000)-30,head=b64url(bytes(JSON.stringify({alg:'RS256',typ:'JWT'}))),body=b64url(bytes(JSON.stringify({iat:issued,exp:issued+540,iss:String(this.env.GITHUB_APP_ID)})));
    const sig=b64url(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,bytes(`${head}.${body}`))));
    const resp=await fetch(`https://api.github.com/app/installations/${this.env.GITHUB_INSTALLATION_ID}/access_tokens`,{method:'POST',headers:{accept:'application/vnd.github+json',authorization:`Bearer ${head}.${body}.${sig}`,'x-github-api-version':'2022-11-28','user-agent':'LentisData-0.1'}});
    if(!resp.ok)throw Error(`GitHub-asennustunnuksen haku epäonnistui (${resp.status}).`);
    const token=await resp.json();this.cachedToken={value:token.token,exp:Date.parse(token.expires_at)};return token.token;
  }
  async writeGitHub(path,content){
    const token=await this.githubToken(),owner=this.env.GITHUB_OWNER||'jdowcon',repo=this.env.GITHUB_REPO||'lentisdata';
    const url=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`;
    const headers={accept:'application/vnd.github+json',authorization:`Bearer ${token}`,'x-github-api-version':'2022-11-28','user-agent':'LentisData-0.1'};
    const current=await fetch(url+'?ref=data',{headers});
    if(current.status!==200&&current.status!==404)throw Error(`GitHub-tiedoston haku: ${current.status}`);
    const old=current.ok?await current.json():null;
    const body={message:`data: ${path}`,content:b64(content),branch:'data',...(old?{sha:old.sha}:{})};
    const response=await fetch(url,{method:'PUT',headers:{...headers,'content-type':'application/json'},body:JSON.stringify(body)});
    if(!response.ok)throw Error(`GitHub-tallennus: ${response.status}`);
  }
}
