// Real offline-capable PDF export for school v3.9. Runs after report, auth and manager patches.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const htmlPath='public/index.html',swPath='public/sw.js';
let html=fs.readFileSync(htmlPath,'utf8');
if(html.includes('school-report-export-v39.js'))throw Error('Report export installed twice');
const reportStart=html.indexOf('id="officialReportModal"');
const saveOld='<button onclick="printOfficialReportDirectly()"';
const buttonAt=html.indexOf(saveOld,reportStart);
const buttonEnd=html.indexOf('</button>',buttonAt);
if(reportStart<0||buttonAt<0||buttonEnd<0||buttonEnd-buttonAt>900)throw Error('Expected A4 report save control missing');
const old=html.slice(buttonAt,buttonEnd+9);
if(!old.includes('طباعة / حفظ PDF'))throw Error('Unrecognized report save button');
const print=old.replace(saveOld,'<button type="button" id="schoolReportPrint" onclick="printOfficialReportDirectly()"').replace('طباعة / حفظ PDF','طباعة');
const additional=[
 '<button type="button" id="schoolReportSavePdf" class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black flex items-center gap-1.5 transition shadow"><i class="fa-solid fa-file-pdf"></i><span>إنشاء PDF</span></button>',
 '<div id="schoolReportFileActions" hidden>',
 '<a id="schoolReportDownloadPdf" rel="noopener">تنزيل PDF</a>',
 '<button id="schoolReportSharePdf" type="button" hidden>مشاركة / حفظ في الملفات</button>',
 '</div>',
 '<span id="schoolReportPdfStatus" role="status" aria-live="polite"></span>'
].join('\n');
html=html.slice(0,buttonAt)+print+additional+html.slice(buttonEnd+9);
const marker='id="formalPrintableDocument"';
if(!html.includes(marker))throw Error('Report document marker absent');
html=html.replace(marker,marker+' dir="rtl" lang="ar"');
const modalTag='id="officialReportModal"';
html=html.replace(modalTag,modalTag+' dir="rtl" lang="ar"');
if(!html.includes('</head>')||!html.includes('</body>'))throw Error('PWA HTML boundaries missing');
html=html.replace('</head>','<link rel="stylesheet" href="./assets/school-report-rtl-v39.css"></head>');
html=html.replace('</body>',
 '<script src="./assets/html2canvas-pro-v2.4.5.min.js"></script>'+
 '<script src="./assets/pdf-lib-v1.17.1.min.js"></script>'+
 '<script src="./assets/school-report-export-v39.js"></script></body>');
fs.writeFileSync(htmlPath,html);
for(const [src,dst] of [
 ['scripts/report-save-v39.js','public/assets/school-report-export-v39.js'],
 ['scripts/report-rtl-v39.css','public/assets/school-report-rtl-v39.css']
])fs.copyFileSync(src,dst);
const deps=[
 {file:'html2canvas-pro-v2.4.5.min.js',urls:[
  'https://cdn.jsdelivr.net/npm/html2canvas-pro@2.4.5/dist/html2canvas-pro.min.js',
  'https://unpkg.com/html2canvas-pro@2.4.5/dist/html2canvas-pro.min.js'],min:120000,max:800000,sha256:'83de413ad498bdedb4cbc6ede80f8d349b52ce728131db16e134dbe1ced95c97'},
 {file:'pdf-lib-v1.17.1.min.js',urls:[
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'],min:200000,max:900000,sha256:'0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f'}
];
for(const dep of deps){
 let bytes,issue;
 for(const url of dep.urls){
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(25000)});
   if(!r.ok)throw Error('dependency source status '+r.status);
   bytes=Buffer.from(await r.arrayBuffer());
   if(bytes.length<dep.min||bytes.length>dep.max)throw Error('Unexpected dependency asset size');
   if(!bytes.toString('utf8',0,200).includes('!')&&!bytes.toString('utf8',0,200).includes('function'))throw Error('Unexpected JavaScript dependency header');
   break;
  }catch(error){issue=error;bytes=null}
 }
 if(!bytes)throw new Error('Cannot package '+dep.file+': '+String(issue));
 const sha256=createHash('sha256').update(bytes).digest('hex');
 if(sha256!==dep.sha256)throw new Error('Integrity check failed for '+dep.file);
 fs.writeFileSync('public/assets/'+dep.file,bytes);
 console.log('Vendor asset',dep.file,bytes.length,'sha256='+createHash('sha256').update(bytes).digest('hex'));
}
let sw=fs.readFileSync(swPath,'utf8');
const token="'./assets/mobile.js'";
if(!sw.includes(token))throw Error('Offline shell asset marker missing');
sw=sw.replace(token,token+",'./assets/school-report-rtl-v39.css','./assets/school-report-export-v39.js','./assets/html2canvas-pro-v2.4.5.min.js','./assets/pdf-lib-v1.17.1.min.js'");
fs.writeFileSync(swPath,sw);
if(!html.includes('id="schoolReportSavePdf"')||!html.includes('dir="rtl" lang="ar"')||!sw.includes('school-report-export-v39.js'))throw Error('Incomplete report saving/RTL integration');
console.log('Ready: local PDF generation, standalone download and iOS Files sharing, Arabic RTL A4');
