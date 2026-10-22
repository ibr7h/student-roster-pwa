import fs from 'node:fs';
const html=fs.readFileSync('public/index.html','utf8');
const words=['التقرير','تقرير','officialReport','openReport','generateReport','reportBtn','reportButton','reportModal','printOfficial','printReport'];
for(const word of words){
 let at=-1,count=0;
 while((at=html.indexOf(word,at+1))>=0){
  ++count;
  if(count>22)continue;
  const before=html.slice(Math.max(0,at-420),at);
  const after=html.slice(at,Math.min(html.length,at+550));
  console.log('REPORT_MATCH',JSON.stringify({word,count,pos:at,context:(before+after).replace(/\s+/g,' ').slice(0,970)}));
 }
 console.log('REPORT_MATCH_TOTAL',word,count);
}
const fun=html.match(/(?:function\s+\w*(?:Report|ReportModal)[\w]*\s*\([^)]*\)|(?:window\.)?\w*(?:Report|ReportModal)\s*=\s*(?:async\s*)?(?:function\s*)?\([^)]*\))/gi)||[];
console.log('REPORT_FUNCTIONS',JSON.stringify([...new Set(fun)].slice(0,90)));
const buttonAt=html.indexOf('onclick="openOfficialReportModal()"');
console.log('REPORT_HEADER_CONTEXT',html.slice(Math.max(0,buttonAt-2700),buttonAt+430).replace(/\\s+/g,' '));

const fnStart=html.indexOf('function openOfficialReportModal()');
const fnEnd=html.indexOf('function renderFormalReportPreview()',fnStart);
if(fnStart<0||fnEnd<0)throw Error('Official report functions not found');
console.log('REPORT_OPEN_FUNCTION',html.slice(fnStart,fnEnd).replace(/\s+/g,' '));
const nextFunction=html.indexOf('\n    function ',fnEnd+32);
console.log('REPORT_RENDER_PREVIEW',html.slice(fnEnd,nextFunction>fnEnd?Math.min(nextFunction,fnEnd+18000):fnEnd+18000));
console.log('REPORT_HTML_BASICS',JSON.stringify({
 reportTag:html.slice(html.indexOf('id="officialReportModal"'),html.indexOf('id="officialReportModal"')+350),
 duplicateIds:(html.match(/id="officialReportModal"/g)||[]).length,
 scripts:[...html.matchAll(/<script[^>]*src=["']([^"']+)/g)].map(x=>x[1]).slice(-20)
}));

const sw=fs.readFileSync('public/sw.js','utf8');console.log('PWA_SW_SOURCE',sw.slice(0,10500));

for(const asset of ['public/assets/icon-vectors.js','public/assets/styles.css','public/assets/mobile.css','public/assets/school-themes.css']){
 const src=fs.readFileSync(asset,'utf8');
 console.log('ICON_ASSET',asset,'length',src.length,'head',src.slice(0,asset.endsWith('icon-vectors.js')?16000:1000));
 const matches=[...src.matchAll(/(?:font-awesome|fa-solid|@font-face|font-family:|fa-icon|data-icon|fa-regular|fa-\w+|svg)/gi)];
 console.log('ICON_ASSET_MATCH_COUNT',asset,matches.length,'firstMatches',matches.slice(0,70).map(x=>x[0]));
}
const icons=[...html.matchAll(/class=["']([^"']*\bfa-(?:solid|regular|brands)\b[^"']*)["']/g)].map(x=>x[1]);
const faNames=[...new Set(icons.flatMap(x=>x.split(/\s+/)).filter(x=>x.startsWith('fa-')&&!['fa-solid','fa-regular','fa-brands'].includes(x)))];
console.log('ICON_CLASSES',JSON.stringify({iconTags:icons.length,unique:faNames.length,all:faNames.sort()}));

const vector=fs.readFileSync('public/assets/icon-vectors.js','utf8');console.log('ICON_RENDER_IMPLEMENTATION',vector.slice(-9200));

const vectorSource=fs.readFileSync('public/assets/icon-vectors.js','utf8');
const mapStart=vectorSource.indexOf('const PATHS=')+'const PATHS='.length,mapEnd=vectorSource.indexOf(';',mapStart);
if(mapStart<12||mapEnd<mapStart)throw Error('Vector glyph map not found');
const available=JSON.parse(vectorSource.slice(mapStart,mapEnd));
console.log('ICON_DIFFERENCE',JSON.stringify({available:Object.keys(available).length,missingMarkup:faNames.filter(n=>!Object.hasOwn(available,n)),iconKeys:Object.keys(available)}));
const dynamic=[...html.matchAll(/fa-[a-z0-9-]+/g)].map(m=>m[0]);
console.log('ICON_DYNAMIC_MISSING',JSON.stringify([...new Set(dynamic.filter(n=>n.startsWith('fa-')&&!Object.hasOwn(available,n) && !['fa-solid','fa-regular','fa-brands','fa-spin','fa-xs','fa-sm','fa-lg','fa-xl','fa-2x','fa-fw','fa-3x'].includes(n)))].slice(0,100)));
