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
  const reportStructure=await page.evaluate(()=>{
   const doc=document.getElementById('formalPrintableDocument');
   const pages=[...doc.querySelectorAll('.a4-page')];
   const tablePages=pages.filter(x=>x.dataset.reportPage==='section-table');
   const separators=pages.filter(x=>x.dataset.reportPage==='section-divider');
   return {length:pages.length,order:pages.map(x=>x.dataset.reportPage||'signature'),
    index:[...doc.querySelectorAll('[data-toc-page]')].map(x=>({section:x.getAttribute('data-toc-page'),label:x.textContent})),
    cover:pages[0]?.innerText.includes('سجل توثيق شواهد'),
    tablePages:tablePages.length,separators:separators.length,signature:pages.at(-1)?.innerText.includes('محضر اعتماد'),
    overflow:pages.slice(0,2).map(p=>({client:p.clientHeight,scroll:p.scrollHeight}))};
  });
  assert.equal(reportStructure.length,19,'8 dividers + 8 original tables + signatures + cover/index');
  assert.deepEqual(reportStructure.order.slice(0,4),['cover','toc','section-divider','section-table']);
  assert.equal(reportStructure.tablePages,8,'Original eight evidence sections must survive');
  assert.equal(reportStructure.separators,8);
  assert.equal(reportStructure.signature,true,'Original approval and signatures must be preserved');
  assert.equal(reportStructure.cover,true);
  assert.deepEqual(reportStructure.index.map(x=>Number(x.label.replace(/[^0-9]/g,''))),[3,5,7,9,11,13,15,17]);
  assert.ok(reportStructure.overflow.every(x=>x.scroll<=x.client+5),'Cover and index must fit an A4 page');
  console.log('REPORT_19_PAGE_STRUCTURE',JSON.stringify({width,reportStructure}));
  await page.waitForFunction(()=>window.SchoolReportView?.getMode()==='a4'&&document.querySelector('#formalPrintableDocument .a4-page')?.parentElement?.classList.contains('school-a4-sheet'),null,{timeout:10000});
  const view=await page.evaluate(()=>{
   const p=document.querySelector('#formalPrintableDocument .a4-page'),shell=p.parentElement;
   return {pageWidth:p.getBoundingClientRect().width,pageHeight:p.getBoundingClientRect().height,shellWidth:shell.getBoundingClientRect().width,shellHeight:shell.getBoundingClientRect().height,sourceWidth:p.scrollWidth,mode:window.SchoolReportView.getMode()};
  });
  assert.ok(view.sourceWidth>750,'A4 preview must use real A4 layout dimensions');
  assert.ok(view.pageWidth<=width+2&&view.pageWidth>width*0.65,'A4 page should visually fit screen');
  assert.ok(Math.abs(view.pageWidth-view.shellWidth)<3,'Scaled A4 page must match its preview wrapper');
  assert.ok(Math.abs(view.pageHeight-view.shellHeight)<3,'A4 preview wrapper must preserve full page height');
  console.log('A4_VIEWPORT',JSON.stringify({width,view}));
  await page.locator('#schoolReportToggleView').click();
  await page.waitForFunction(()=>window.SchoolReportView.getMode()==='mobile');
  await page.locator('#schoolReportToggleView').click();
  await page.waitForFunction(()=>window.SchoolReportView.getMode()==='a4');
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
  assert.ok(pdf.status.includes('معاينة A4'));
  const p=await page.evaluate(()=>({
   source:[...document.querySelectorAll('#formalPrintableDocument .a4-page')].map(x=>({w:x.scrollWidth,h:x.scrollHeight})),
   exported:window.SchoolReportPDF.getPageMetrics()
  }));
  assert.equal(p.exported.length,2);
  for(let i=0;i<2;i++){
   assert.ok(Math.abs(p.exported[i].captureWidth-p.source[i].w)<=5);
   assert.ok(Math.abs(p.exported[i].captureHeight-p.source[i].h)<=80);
   assert.ok(p.exported[i].pdfWidth>430);
  }
  console.log('A4_PARITY',JSON.stringify({width,p}));
  const downloaded=page.waitForEvent('download',{timeout:16000});
  await page.locator('#schoolReportDownloadPdf').click();
  const download=await downloaded;
  assert.ok(download.suggestedFilename().endsWith('.pdf'));
  if(width===390&&process.env.TEST_BROWSER==='chromium'){
   // Check a full 19-sheet synthetic school report instead of only two pages.
   await page.evaluate(()=>window.renderFormalReportPreview());
   await page.waitForFunction(()=>document.querySelectorAll('#formalPrintableDocument .a4-page').length===19,null,{timeout:15000});
   await page.locator('#schoolReportSavePdf').click();
   await page.waitForFunction(()=>!document.getElementById('schoolReportSavePdf').disabled&&(
    window.SchoolReportPDF.getPageMetrics().length===19||
    document.getElementById('schoolReportPdfStatus').classList.contains('school-report-error')
   ),null,{timeout:160000});
   const full=await page.evaluate(async()=>{
    const file=window.SchoolReportPDF.getFile();
    const pdf=await window.PDFLib.PDFDocument.load(await file.arrayBuffer());
    const m=window.SchoolReportPDF.getPageMetrics();
    return {pages:pdf.getPageCount(),bytes:file.size,metrics:m.length,
      minWidth:Math.min(...m.map(x=>x.pdfWidth)),
      status:document.getElementById('schoolReportPdfStatus').textContent};
   });
   console.log('FULL_19_PAGE_PDF',JSON.stringify(full));
   assert.equal(full.pages,19);
   assert.equal(full.metrics,19);
   assert.ok(full.minWidth>400);
   assert.ok(full.bytes>150000);
  }
  assert.deepEqual(errors,[],errors.join('; '));
  console.log('PASS real PDF save, RTL alignment, file download on '+width+'px '+(process.env.TEST_BROWSER||'webkit'));
  await context.close();
 }
}finally{await browser?.close();await new Promise(r=>server.close(r))}
