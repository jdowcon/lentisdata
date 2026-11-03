export const SCHEMA_VERSION = 1;
export const CATEGORIES = [
  { code:'S1', title:'Syöttövirhe', detail:'Vastustajan suora piste', points:'opponent', group:'own' },
  { code:'S2', title:'Passarin ruutuun', detail:'Vastustajan hyvä vastaanotto', points:null, group:'own' },
  { code:'S3', title:'Pelattavaksi', detail:'Vastustajan muu vastaanotto', points:null, group:'own' },
  { code:'S4', title:'Ässä', detail:'Oma suora piste', points:'own', group:'own' },
  { code:'V1', title:'Syöttövirhe', detail:'Vastustajan syöttövirhe – oma piste', points:'own', group:'opponent' },
  { code:'V2', title:'Passarin ruutuun', detail:'Oman joukkueen hyvä vastaanotto', points:null, group:'opponent' },
  { code:'V3', title:'Pelattavaksi', detail:'Oman joukkueen muu vastaanotto', points:null, group:'opponent' },
  { code:'V4', title:'Vastaanottovirhe', detail:'Vastustajan suora piste', points:'opponent', group:'opponent' }
];
export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c=>[c.code,c]));
export const id = () => globalThis.crypto.randomUUID();
export function dateLocal(d = new Date()) { const local = new Date(d.getTime()-d.getTimezoneOffset()*60000); return local.toISOString().slice(0,10); }
export function normalName(s) { return String(s||'').trim().replace(/\s+/g,' '); }
export function safeMatchFields(f) {
  const date=String(f.date||''); const tournament=normalName(f.tournament), statistician=normalName(f.statistician), home=normalName(f.home), away=normalName(f.away), own=normalName(f.own);
  const count=Number(f.setsPlanned);
  if (!statistician || !tournament || !home || !away || !own) throw Error('Täytä kaikki perustiedot.');
  if ([statistician,tournament,home,away,own].some(s=>s.length>100)) throw Error('Nimi on liian pitkä (enintään 100 merkkiä).');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date+'T12:00:00')) || new Date(date+'T12:00:00').toISOString().slice(0,10)!==date) throw Error('Tarkista päivämäärä.');
  if (home.toLocaleLowerCase('fi')===away.toLocaleLowerCase('fi')) throw Error('Koti- ja vierasjoukkue eivät saa olla samat.');
  if (![home.toLocaleLowerCase('fi'),away.toLocaleLowerCase('fi')].includes(own.toLocaleLowerCase('fi'))) throw Error('Oman joukkueen on oltava koti- tai vierasjoukkue.');
  if (![2,3].includes(count)) throw Error('Valitse 2 tai 3 erää.');
  return {date,tournament,statistician,home,away,own,setsPlanned:count};
}
export function createMatch(fields, makeId=id, now=()=>new Date().toISOString()) {
  const x=safeMatchFields(fields), mid=makeId();
  return {id:mid,...x,status:'active',revision:0,createdAt:now(),updatedAt:now(),sets:Array.from({length:x.setsPlanned},(_,i)=>({id:makeId(),index:i+1,status:i===0?'active':'pending',ownScore:null,opponentScore:null,revision:0,events:[],createdAt:now(),closedAt:null}))};
}
export function currentSet(match) { return match.sets.find(s=>s.status==='active'); }
export function countEvents(set) { const c=Object.fromEntries(CATEGORIES.map(x=>[x.code,0])); for (const e of set.events) if(!e.deleted && Object.hasOwn(c,e.category)) c[e.category]++; return c; }
export function totalCounts(sets) { const c=Object.fromEntries(CATEGORIES.map(x=>[x.code,0])); for(const s of sets) { const x=countEvents(s);for(const k of Object.keys(c))c[k]+=x[k]; }return c; }
export const countsMetrics=(c)=>{ const S=c.S1+c.S2+c.S3+c.S4, V=c.V1+c.V2+c.V3+c.V4, R=c.V2+c.V3+c.V4; const pct=(x,y)=> y>0?Math.round((x/y)*1000)/10:null; return {S,V,R,serveError:pct(c.S1,S),ace:pct(c.S4,S),opponentGood:pct(c.S2,S),opponentPlayable:pct(c.S3,S),opponentServeError:pct(c.V1,V),goodReception:pct(c.V2,R),playableReception:pct(c.V3,R),receptionError:pct(c.V4,R),net:c.S4-c.S1}; };
export function validateSetScore(own,opp,index) {
  const target=index===3?15:25;
  if(!/^(0|[1-9]\d*)$/.test(String(own))||!/^(0|[1-9]\d*)$/.test(String(opp))) return {ok:false,message:'Kirjaa ei-negatiiviset kokonaisluvut.'};
  const a=Number(own), b=Number(opp), high=Math.max(a,b), low=Math.min(a,b);
  if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||high>999) return {ok:false,message:'Tarkista pistemäärät (enintään 999).'};
  const ok=(high===target&&low<=target-2)||(high>target&&high===low+2);
  return ok?{ok:true,target,winner:a>b?'own':'opponent'}:{ok:false,target,message:`Erä ${index}: tavoite ${target} pistettä, vähintään 2 pisteen ero. Esim. ${target}–${target-2} tai ${target+1}–${target-1}.`};
}
export function setWins(match) {let own=0,opp=0;for(const s of match.sets){if(s.status!=='closed')continue;if(s.ownScore>s.opponentScore)own++;else opp++;}return {own,opponent:opp};}
export function addEvent(match,setId,code,makeId=id,now=()=>new Date().toISOString()) {
 const s=match.sets.find(x=>x.id===setId); if(!s||s.status!=='active')throw Error('Erä ei ole käynnissä.');if(!CATEGORY_MAP[code])throw Error('Virheellinen tapahtuma.');
 s.events.push({id:makeId(),category:code,createdAt:now(),deleted:false,revision:1});match.updatedAt=now();return s.events.at(-1);
}
export function undoLast(match,setId,now=()=>new Date().toISOString()){
 const s=match.sets.find(x=>x.id===setId);if(!s||s.status!=='active')throw Error('Erä ei ole käynnissä.');const e=[...s.events].reverse().find(x=>!x.deleted);if(!e)throw Error('Ei peruttavaa tapahtumaa.');e.deleted=true;e.revision++;e.changedAt=now();match.updatedAt=now();return e;
}
export function changeEvent(match,setId,eventId,nextCode,now=()=>new Date().toISOString()){
 const s=match.sets.find(x=>x.id===setId);if(!s)throw Error('Erää ei löydy.');const e=s.events.find(x=>x.id===eventId);if(!e||e.deleted)throw Error('Tapahtumaa ei löydy.');if(!CATEGORY_MAP[nextCode])throw Error('Virheellinen luokitus.');if(e.category===nextCode)return false;e.previousCategories??=[];e.previousCategories.push({category:e.category,at:now()});e.category=nextCode;e.revision++;e.changedAt=now();if(s.status==='closed')s.revision++;match.revision++;match.updatedAt=now();return true;
}
export function closeSet(match,setId,own,opp,now=()=>new Date().toISOString()){
 const s=match.sets.find(x=>x.id===setId);if(!s||s.status!=='active')throw Error('Erä ei ole käynnissä.');const v=validateSetScore(own,opp,s.index);if(!v.ok)throw Error(v.message);s.status='closed';s.ownScore=Number(own);s.opponentScore=Number(opp);s.closedAt=now();s.revision++;match.revision++;match.updatedAt=now();const next=match.sets.find(x=>x.index===s.index+1);if(next)next.status='active';else match.status='ready';return s;
}
export function changeSetScore(match,setId,own,opp,now=()=>new Date().toISOString()) {
 const s=match.sets.find(x=>x.id===setId);if(!s||s.status!=='closed')throw Error('Erä ei ole päättynyt.');const v=validateSetScore(own,opp,s.index);if(!v.ok)throw Error(v.message);s.ownScore=Number(own);s.opponentScore=Number(opp);s.revision++;match.revision++;match.updatedAt=now();return s;
}
export function completeMatch(match,now=()=>new Date().toISOString()){if(match.sets.some(x=>x.status!=='closed'))throw Error('Kaikki erät eivät ole päättyneet.');match.status='completed';match.revision++;match.completedAt=now();match.updatedAt=now();return match;}
export function publicMatch(match){ const {statistician,...rest}=match;return {id:rest.id,date:rest.date,tournament:rest.tournament,home:rest.home,away:rest.away,own:rest.own,setsPlanned:rest.setsPlanned,status:rest.status,revision:rest.revision}; }
export function setSnapshot(match,set){return {schemaVersion:SCHEMA_VERSION,kind:'set',match:publicMatch(match),set:{id:set.id,index:set.index,revision:set.revision,ownScore:set.ownScore,opponentScore:set.opponentScore,events:set.events.map(e=>({id:e.id,category:e.category,createdAt:e.createdAt,deleted:e.deleted,revision:e.revision,changedAt:e.changedAt||null})),counts:countEvents(set),closedAt:set.closedAt},generatedAt:new Date().toISOString()};}
export function matchSnapshot(match){return {schemaVersion:SCHEMA_VERSION,kind:'match',match:publicMatch(match),sets:match.sets.map(s=>({id:s.id,index:s.index,revision:s.revision,ownScore:s.ownScore,opponentScore:s.opponentScore,counts:countEvents(s)})),wins:setWins(match),totals:totalCounts(match.sets),generatedAt:new Date().toISOString()};}
export function csvRows(matches){const rows=[['Päivä','Turnaus','Oma joukkue','Koti','Vieras','Ottelu ID','Erä','Omat pisteet','Vastustajan pisteet','S1','S2','S3','S4','V1','V2','V3','V4']];for(const m of matches)for(const s of m.sets)if(s.status==='closed'){const c=countEvents(s);rows.push([m.date,m.tournament,m.own,m.home,m.away,m.id,s.index,s.ownScore,s.opponentScore,...CATEGORIES.map(x=>c[x.code])]);}return '\ufeff'+rows.map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(';')).join('\r\n');}
