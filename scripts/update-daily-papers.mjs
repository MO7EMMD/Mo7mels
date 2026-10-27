import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=path.join(root,'src/daily-papers.json');
const MAX_NEW=10,MAX_TOTAL=5000,MAX_POSTS=12,MAX_HTML=2*1024*1024,MAX_VERIFICATIONS=18;
const deadline=Date.now()+240000;
const paperPattern=/امتحان|امتحانية|اختبار|اختبارية|اختبارات|اختبارية|exam|quiz|test\b/i;
const gradePattern=/(?:الصف\s*)?(?:الثاني\s*عشر|ثاني\s*عشر)|صف\s*12(?=\s|$|[،,:·-])|(?:ال)?دبلوم\s*(?:التعليم\s*العام|العام)/i;
const subjects=[['physics',/فيزياء/],['math',/رياضيات/],['chemistry',/كيمياء/],['biology',/أحياء|احياء/],['islamic',/اسلام|إسلام/],['geography',/جغرافيا/],['ict',/تقنية المعلومات/],['art',/فنون/],['environmental',/بيئية/],['history',/تاريخ/],['social',/اجتماع/],['homeland',/وطني/],['sports',/رياضة/],['english',/اللغة\s*(?:الإنجليزية|الانجليزية)|إنجليزي|انجليزي|انجليز|إنجليز/],['arabic',/اللغة\s*العربية|عربي|عربية/]];
const allowedHosts=new Set(['afidni.com','www.afidni.com','almanahj.com','www.almanahj.com','kwedufiles.com','www.kwedufiles.com','home.moe.gov.om','fileae.com','www.fileae.com','drive.google.com','docs.google.com']);
const decode=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,h,n)=>String.fromCodePoint(parseInt(h||n,h?16:10))).replace(/&amp;|&quot;|&apos;|&lt;|&gt;|&nbsp;/g,x=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' '})[x]);
const text=s=>decode(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
function absolute(value,base){try{const u=new URL(decode(value),base);if(u.protocol!=='https:'||!allowedHosts.has(u.hostname))return null;for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_'))u.searchParams.delete(k);u.hash='';return u.href;}catch{return null;}}
function anchors(html,base){return [...html.matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi)].map(m=>({url:absolute(m[1]||m[2]||m[3],base),title:text(m[4])})).filter(a=>a.url);}
async function response(url,{range=false,retry=false}={}){
 if(Date.now()>deadline)throw Error('Run time budget exhausted');
 const target=absolute(url,url);if(!target)throw Error('Unsupported public host');
 for(let attempt=0;attempt<=(retry?1:0);attempt++){
  try{const r=await fetch(target,{headers:{...(!/^(?:docs|drive)\.google\.com$/.test(new URL(target).hostname)?{'User-Agent':'mo7mels-grade12-paper-collector/1.0 (+https://mo7mels.com)'}:{}),...(range?{Range:'bytes=0-1023'}:{})},signal:AbortSignal.timeout(20000),redirect:'follow'});if(!r.ok){await r.body?.cancel();throw Error('HTTP '+r.status);}if(!absolute(r.url,r.url)){await r.body?.cancel();throw Error('Unsupported redirect');}return r;}catch(e){if(attempt===(retry?1:0))throw e;}
 }
}
async function readText(url,checkHeaders){const r=await response(url);if(checkHeaders)checkHeaders(r);const reader=r.body.getReader();const chunks=[];let length=0;try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>MAX_HTML)throw Error('HTML size limit');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}return new TextDecoder().decode(Buffer.concat(chunks));}
function canonical(value){try{let u=new URL(value);if((u.hostname==='docs.google.com'&&u.pathname==='/gview')||(u.hostname==='drive.google.com'&&u.pathname==='/viewerng/viewer'))u=new URL(u.searchParams.get('url'));const id=u.pathname.match(/\/file\/d\/([-\w]+)/)?.[1];u.hash='';return id?'drive:'+id:u.href;}catch{return value;}}
function resourceLinks(html,base){
 const links=anchors(html,base).map(x=>x.url);
 for(const m of html.matchAll(/https?:\/\/[^\s"'<>]+\.pdf(?:\?[^\s"'<>]*)?/gi)){const url=absolute(m[0],base);if(url)links.push(url);}
 return [...new Set(links)].filter(url=>/\.pdf(?:\?|$)/i.test(url)||/drive\.google\.com\/file\/d\/[-\w]+\/(?:view|preview)/.test(url));
}
function pageFacts(html,fallback){
 const titleMatch=html.match(/<h1[^>]*class=["'][^"']*fxzw-article-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)||html.match(/<meta\b[^>]*(?:property|name)=["']og:title["'][^>]*content=["']([^"']*)/i)||html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
 const title=text(titleMatch?.[1]||fallback).replace(/\s*[-–|]\s*(?:منصة أفدني|ملفات عُمان التعليمية|المناهج).*$/,'');
 const crumb=text((html.match(/class=["'][^"']*fxzw-hero-crumbs[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i)||[])[1]||'');
 const scope=title+' '+crumb;
 const subjectScope=(crumb||title).replace(/منهج\s*(?:عربي|انجليزي|إنجليزي)|باللغة\s*(?:العربية|الانجليزية|الإنجليزية)/g,'');
 const semester=/(?:الفصل|فصل)(?:\s*الدراسي)?\s*(?:الثاني|ثاني|ثان)(?=\s|$|[،,:·-])|(?:^|\s|[،,:·(])ف\s*2(?=\s|$|[،,:·)\-])/.test(scope)?2:/(?:الفصل|فصل)(?:\s*الدراسي)?\s*(?:الأول|أول|الاول|اول)(?=\s|$|[،,:·-])|(?:^|\s|[،,:·(])ف\s*1(?=\s|$|[،,:·)\-])/.test(scope)?1:null;
 const subjectId=subjects.find(([,pattern])=>pattern.test(subjectScope))?.[0];
 const track=subjectId==='math'?(/متقدم|advanced/i.test(subjectScope)?'advanced':/أساسي|اساسي|basic/i.test(subjectScope)?'basic':null):null;
 return {title,scope,subjectId,semester,track};
}
function embeddingAllowed(r){const ancestors=(r.headers.get('content-security-policy')||'').match(/frame-ancestors\s+([^;]+)/i)?.[1];return !/SAMEORIGIN|DENY/i.test(r.headers.get('x-frame-options')||'')&&(!ancestors||/\*|https:\/\/mo7mels\.com/.test(ancestors));}
async function googleViewer(pdfUrl){
 let lastError;
 for(const endpoint of ['https://docs.google.com/gview?embedded=true&url=','https://drive.google.com/viewerng/viewer?embedded=true&url=']){
 try{
 const viewerUrl=endpoint+encodeURIComponent(pdfUrl);
 const html=await readText(viewerUrl,r=>{if(!embeddingAllowed(r))throw Error('Google viewer blocks embedding');});
 if(!/<title[^>]*>[^<]*\.pdf<\/title>/i.test(html)||!/application\/pdf/.test(html))throw Error('Google PDF viewer unavailable');
 const thumb=html.match(/src=["']([^"']*\/viewerng\/thumb\?[^"']+)["']/i)?.[1];
 if(!thumb)throw Error('Google first page unavailable');
 const r=await response(absolute(thumb,viewerUrl),{range:true});const reader=r.body.getReader();let prefix=Buffer.alloc(0);try{while(prefix.length<32){const part=await reader.read();if(part.done)break;prefix=Buffer.concat([prefix,Buffer.from(part.value.subarray(0,32-prefix.length))]);}}finally{await reader.cancel().catch(()=>{});}
 if(!/image\/png/i.test(r.headers.get('content-type')||'')||prefix.length<24||prefix.readUInt32BE(16)<500)throw Error('Google has not rendered a PDF page');
 return {viewerUrl,pdfUrl};
 }catch(error){lastError=error;}
 }
 throw lastError;
}
let verifications=0;
async function verifyFile(url){
 if(verifications++>=MAX_VERIFICATIONS)throw Error('Verification budget exhausted');
 const driveId=url.match(/drive\.google\.com\/file\/d\/([-\w]+)\//)?.[1];
 if(driveId){const viewerUrl=`https://drive.google.com/file/d/${driveId}/preview`;const html=await readText(viewerUrl);if(!/application\/pdf/.test(html)||!/<title[^>]*>[^<]*\.pdf\s*[-–]\s*Google Drive<\/title>/i.test(html)||/You need access|Request access|ليس لديك إذن/.test(html))throw Error('Public PDF preview unavailable');return {viewerUrl};}
 const r=await response(url,{range:true});const reader=r.body.getReader();let bytes=Buffer.alloc(0);try{while(bytes.length<1024){const item=await reader.read();if(item.done)break;bytes=Buffer.concat([bytes,Buffer.from(item.value.subarray(0,1024-bytes.length))]);}}finally{await reader.cancel().catch(()=>{});}if(!bytes.toString('latin1').startsWith('%PDF-'))throw Error('Not a PDF');if(!/application\/pdf/i.test(r.headers.get('content-type')||'')||/attachment/i.test(r.headers.get('content-disposition')||''))return googleViewer(r.url);return {viewerUrl:r.url,pdfUrl:r.url};
}
const sourceSpecs=[
 {id:'afidni',index:'https://afidni.com/category/oman/12/feed/',posts(html){return [...html.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m=>({title:text(m[1].match(/<title>([\s\S]*?)<\/title>/)?.[1]||''),url:absolute(m[1].match(/<link>([\s\S]*?)<\/link>/)?.[1]||'',this.index)})).filter(x=>x.url&&paperPattern.test(x.title)&&gradePattern.test(x.title));}},
 {id:'almanahj',index:'https://almanahj.com/om/12physics1',fallback:'https://kwedufiles.com/om/12physics',posts(html,url){return anchors(html,url).filter(a=>/\/om\/id=\d+/.test(a.url)&&paperPattern.test(a.title));}},
 {id:'ministry',index:'https://home.moe.gov.om/ar/zawity/26',posts(html,url){return anchors(html,url).filter(a=>/\/ar\/zawity\/\d+\/show\/\d+/.test(a.url)&&paperPattern.test(a.title));}},
];
async function updateCatalog(){
let existing;try{existing=JSON.parse(await fs.readFile(catalogPath,'utf8'));if(!Array.isArray(existing))throw Error('Catalog must be array');}catch(e){if(e.code!=='ENOENT')throw e;existing=[];}
const dubaiDate=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dubai'}).format(new Date(date));
const today=dubaiDate(Date.now());
const dailyRemaining=Math.max(0,MAX_NEW-existing.filter(item=>item.addedAt&&dubaiDate(item.addedAt)===today).length);
const manual=await fs.readFile(path.join(root,'src/worksheets.js'),'utf8').catch(()=>''),known=new Set(existing.map(x=>canonical(x.pdfUrl||x.viewerUrl||''))),knownIds=new Set(existing.map(x=>x.id));
for(const m of manual.matchAll(/https?:[^\s"'`]+/g))known.add(canonical(m[0]));
const additions=[],health=[];
async function collect(source){
 const sourceCap=Math.min(dailyRemaining,additions.length+4);
 const state={source:source.id,indexStatus:'unavailable',postsChecked:0,verified:0,added:0,rejected:0};health.push(state);
 try{
  let index=source.index,html;
  try{html=await readText(index);}catch(e){if(!source.fallback)throw e;index=source.fallback;html=await readText(index);state.mirror=true;}
  state.indexStatus='ok';const seenPosts=new Set();const queue=source.posts(html,index).slice(0,MAX_POSTS);
  while(queue.length&&state.postsChecked<MAX_POSTS&&additions.length<sourceCap&&existing.length+additions.length<MAX_TOTAL&&Date.now()<deadline){
   const post=queue.shift();if(seenPosts.has(post.url))continue;seenPosts.add(post.url);state.postsChecked++;
   try{const page=await readText(post.url),facts=pageFacts(page,post.title);if(!gradePattern.test(facts.scope)||!paperPattern.test(facts.title)||!facts.subjectId||!facts.semester){state.rejected++;continue;}
    const files=resourceLinks(page,post.url);
    if(!files.length&&source.id==='afidni')queue.push(...anchors(page,post.url).filter(a=>new URL(a.url).hostname==='afidni.com'&&paperPattern.test(a.title)&&gradePattern.test(a.title)).slice(0,3));
    for(const file of files.slice(0,3)){
     const key=canonical(file);if(known.has(key)||additions.length>=sourceCap||existing.length+additions.length>=MAX_TOTAL)continue;
     try{const verified=await verifyFile(file);state.verified++;const finalKey=canonical(verified.pdfUrl||verified.viewerUrl),id='daily-'+createHash('sha256').update(finalKey).digest('hex').slice(0,16);if(known.has(finalKey)||knownIds.has(id)){known.add(key);continue;}known.add(key);known.add(finalKey);knownIds.add(id);additions.push({id,subjectId:facts.subjectId,semester:facts.semester,...(facts.track?{track:facts.track}:{}),titleAr:facts.title,titleEn:facts.title,...verified,sourceUrl:post.url,addedAt:new Date().toISOString()});state.added++;}catch{state.rejected++;}
    }
   }catch{state.rejected++;}
  }
 }catch(e){state.error=e.message;}
}
// Round-robin source quotas prevent a busy publisher from taking all ten daily slots.
for(const source of sourceSpecs){if(additions.length>=dailyRemaining)break;await collect(source);}
if(additions.length){await fs.mkdir(path.dirname(catalogPath),{recursive:true});const next=JSON.stringify([...additions,...existing],null,2)+'\n';const temp=catalogPath+'.tmp';await fs.writeFile(temp,next);await fs.rename(temp,catalogPath);}
console.log(JSON.stringify({added:additions.length,total:existing.length+additions.length,dailyRemaining:Math.max(0,dailyRemaining-additions.length),capacityReached:existing.length>=MAX_TOTAL,sources:health}));
if(health.length&&health.every(source=>source.indexStatus!=='ok'))throw Error('All configured paper sources are unavailable; existing catalog was preserved.');
}
export {canonical,pageFacts,gradePattern,googleViewer,embeddingAllowed};
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await updateCatalog();
