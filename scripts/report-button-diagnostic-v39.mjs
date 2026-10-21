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
