import fs from 'node:fs';
const html=fs.readFileSync('public/index.html','utf8');
function brief(tag,str,max=5000){console.log('INSPECT',tag,JSON.stringify(str.slice(0,max)))}
for(const term of ['id="officialReportModal"','function openOfficialReportModal()','function printOfficialReportDirectly()','function renderFormalReportPreview()','id="formalPrintableDocument"']){
 const i=html.indexOf(term);brief(term,i>=0?html.slice(i, i+(term.includes('ReportModal')?1300:term.includes('printOfficial')?1800:term.includes('officialReportModal')?4100:2500)):'NOT FOUND');
}
brief('html_print_css',html.slice(html.indexOf('/* A4 Printable Layout */'),html.indexOf('</style>')+8),8000);
brief('html_scripts',[...html.matchAll(/<script[^>]+src=["']([^"']+)/g)].map(x=>x[1]).join('\n'),6000);
const needle=/save(?:As)?Pdf|saveReport|exportReport|downloadReport|printOfficialReportDirectly|printReport|downloadPDF|html2pdf|html2canvas|jspdf|pdfMake|pdf-lib|window\.print|navigator\.share|حفظ.*PDF|تحميل.*PDF|حفظ التقرير|تصدير التقرير/ig;
let matches=[],m;while((m=needle.exec(html))&&matches.length<35)matches.push({term:m[0],at:m.index,ctx:html.slice(Math.max(0,m.index-230),m.index+500)});brief('save_references',JSON.stringify(matches),20000);
for(const file of ['public/sw.js','public/assets/mobile-report-fix-v39.css']){
 if(fs.existsSync(file))brief(file,fs.readFileSync(file,'utf8'),file.endsWith('.css')?4000:2500);
}
