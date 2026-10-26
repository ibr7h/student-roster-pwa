import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {webkit,chromium} from 'playwright-core';
const root=path.resolve('public');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const p=new URL(req.url,'http://127.0.0.1').pathname;
 const name=path.resolve(root,'.'+(p==='/'?'/index.html':p));
 if(!name.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(name,(e,data)=>e?res.writeHead(404).end():res.writeHead(200,{'Content-Type':types[path.extname(name)]||'application/octet-stream'}).end(data));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const api='https://school-evidence-v39-api-preview.onrender.com/api/**';
let browser;
try{
 browser=process.env.TEST_BROWSER==='chromium'?
  await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}):
  await webkit.launch({headless:true});
 for(const width of [390,320]){
  const context=await browser.newContext({viewport:{width,height:844},locale:'ar-SA',isMobile:true,hasTouch:true,acceptDownloads:true,serviceWorkers:'block'});
  const user={id:'ci-admin',name:'مدير تجريبي',isAdmin:true,allowedSections:[],license:{status:'active',canWrite:true},activationRequired:false};
  await context.route(api,async route=>{
   const p=new URL(route.request().url()).pathname;
   const body=p.endsWith('/health')?{ok:true}:p.endsWith('/data')?{school:{name:'مدرسة اختبار التقارير',year:'1448',stage:'ابتدائي',teamGroups:[]},team:[],evidences:{},user,license:user.license}:p.endsWith('/me')?{user}:{error:'not used'};
   await route.fulfill({status:p.endsWith('/me')||p.endsWith('/health')||p.endsWith('/data')?200:404,body:JSON.stringify(body),contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'}});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!!window.SchoolReportPDF,null,{timeout:15000});
  await page.evaluate(()=>document.getElementById('loginScreenOverlay')?.classList.add('hidden'));
  await page.locator('button[onclick="openOfficialReportModal()"]').evaluate(el=>el.click());
  await page.locator('#formalPrintableDocument .a4-page').first().waitFor({state:'visible',timeout:15000});
  let actual=await page.evaluate(()=>{
   const m=document.getElementById('officialReportModal'),a=m.querySelector('.a4-page'),table=m.querySelector('table'),save=m.querySelector('#schoolReportSavePdf');
   return {modal:getComputedStyle(m).direction,page:getComputedStyle(a).direction,align:getComputedStyle(a).textAlign,dir:a.getAttribute('dir')||a.parentElement.dir,table:table?getComputedStyle(table).direction:null,save:save?.textContent,print:m.querySelector('#schoolReportPrint')?.textContent};
  });
  assert.equal(actual.modal,'rtl',JSON.stringify(actual));assert.equal(actual.page,'rtl');assert.equal(actual.align,'right');
  assert.ok(actual.save.includes('PDF')&&actual.print.includes('طباعة'),'PDF save must be separate from print');
  // Real renderer generates many pages; verify save engine on two original A4 pages.
  await page.evaluate(()=>{
   const root=document.getElementById('formalPrintableDocument');
   [...root.querySelectorAll('.a4-page')].slice(2).forEach(el=>el.remove());
  });
  await page.locator('#schoolReportSavePdf').click();
  await page.waitForFunction(()=>window.SchoolReportPDF.getFile()!==null||document.getElementById('schoolReportPdfStatus')?.classList.contains('school-report-error'),null,{timeout:50000});
  const exportError=await page.locator('#schoolReportPdfStatus').evaluate(el=>el.classList.contains('school-report-error')?el.textContent:'');
  assert.equal(exportError,'','PDF export failed: '+exportError);
  const pdf=await page.evaluate(async()=>{
   const file=window.SchoolReportPDF.getFile();
   const bytes=new Uint8Array(await file.arrayBuffer());
   const doc=await window.PDFLib.PDFDocument.load(bytes);
   const pages=doc.getPages(),p=pages[0].getSize(),link=document.getElementById('schoolReportDownloadPdf');
   return {bytes:file.size,mime:file.type,name:file.name,first:[...bytes.slice(0,4)],pageCount:pages.length,
    dimensions:p,link:link.getAttribute('href')?.startsWith('blob:'),rtl:document.getElementById('formalPrintableDocument').getAttribute('dir'),status:document.getElementById('schoolReportPdfStatus').textContent};
  });
  console.log('PDF_TEST_RESULT',JSON.stringify({width,pdf}));
  assert.deepEqual(pdf.first,[37,80,68,70],'%PDF actual file not created');
  assert.equal(pdf.mime,'application/pdf');assert.equal(pdf.pageCount,2);
  assert.ok(pdf.bytes>2000);assert.ok(pdf.link&&pdf.name.endsWith('.pdf'));
  assert.ok(Math.abs(pdf.dimensions.width-595.28)<1&&Math.abs(pdf.dimensions.height-841.89)<1);
  assert.equal(pdf.rtl,'rtl');
  assert.ok(pdf.status.includes('مطابق للمعاينة'));
  const parity=await page.evaluate(()=>{
   const elements=[...document.querySelectorAll('#formalPrintableDocument .a4-page')];
   return {source:elements.map(p=>({w:p.scrollWidth,h:p.scrollHeight})),exported:window.SchoolReportPDF.getPageMetrics()};
  });
  assert.equal(parity.exported.length,2,'Capture every displayed page');
  for(let i=0;i<2;i++){
   const original=parity.source[i],exported=parity.exported[i];
   assert.equal(exported.screenWidth,Math.ceil(original.w),'PDF must capture the displayed responsive page width');
   assert.equal(exported.screenHeight,Math.ceil(original.h),'PDF must capture the displayed responsive page height');
   assert.ok(Math.abs(exported.bitmapWidth/exported.bitmapHeight-original.w/original.h)<0.015,'No stretched screenshots');
   assert.ok(Math.abs(exported.pdfWidth/exported.pdfHeight-original.w/original.h)<0.015,'PDF must preserve visible page aspect ratio');
  }
  console.log('REPORT_VISUAL_PARITY',JSON.stringify({width,parity}));
  const downloaded=page.waitForEvent('download',{timeout:16000});
  await page.locator('#schoolReportDownloadPdf').click();
  const download=await downloaded;
  assert.ok(download.suggestedFilename().endsWith('.pdf'));
  assert.deepEqual(errors,[],errors.join('; '));
  console.log('PASS real PDF save, RTL alignment, file download on '+width+'px '+(process.env.TEST_BROWSER||'webkit'));
  await context.close();
 }
}finally{await browser?.close();await new Promise(r=>server.close(r))}
