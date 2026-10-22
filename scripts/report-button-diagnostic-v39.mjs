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
