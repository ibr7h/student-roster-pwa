// Regression: manager creates an account, persists scoped permissions, and views A4 on a phone.
// Uses synthetic data and intercepted API requests; never touches the live database.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {webkit,chromium} from 'playwright-core';
const root=path.resolve('public');
const api='https://school-evidence-v39-api-preview.onrender.com';
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 let url=new URL(req.url,'http://127.0.0.1');
 let file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const uuid='4abc0123-1234-4567-8abc-012345678999';
const school={name:'مدرسة اختبار معزولة',teamGroups:['لجنة التقويم والاعتماد المدرسي','فريق الإدارة المدرسية والتخطيط'],stage:'ابتدائي',schoolType:'boys'};
const user={id:'manager-ci',name:'مدير اختبار',isAdmin:true,allowedSections:[],activationRequired:false,license:{status:'active',canWrite:true}};
const requests=[];
let team=[];
let browser;
try{
 browser=process.env.TEST_BROWSER==='chromium' ? await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']}) : await webkit.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ar-SA',serviceWorkers:'block'});
 await context.route(api+'/api/**',async route=>{
  const rq=route.request(),p=new URL(rq.url()).pathname,method=rq.method();
  let body={};if(['POST','PUT','PATCH'].includes(method))try{body=JSON.parse(rq.postData()||'{}')}catch{}
  requests.push({p,method,body});
  const res=(status,payload)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(payload)});
  if(method==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization,Content-Type'}});
  if(p==='/api/health')return res(200,{ok:true});
  if(p==='/api/me')return res(200,{user});
  if(p==='/api/data')return res(200,{school,team,evidences:{},user,license:user.license});
  if(p==='/api/members'&&method==='POST'){
   const saved={id:uuid,idNum:body.username,name:body.name,teamGroup:body.teamGroup,role:body.role,isAdmin:body.isAdmin,allowedSections:body.allowedSections,signatureSvg:body.signatureSvg};
   team=[...team.filter(m=>m.id!==uuid),saved];return res(200,{id:uuid});
  }
  if(p==='/api/permissions'&&method==='POST'){
   team=team.map(m=>m.isAdmin?m:({...m,allowedSections:body.memberIds.includes(m.id)?Array.from(new Set([...m.allowedSections,body.sectionId])):m.allowedSections.filter(s=>s!==body.sectionId)}));
   return res(200,{ok:true});
  }
  return res(404,{error:'Fixture route missing: '+p});
 });
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.locator('#auth39-login').waitFor({state:'hidden',timeout:15000});
 // Test through the original manager panel, including real UI click and backend payload.
 const launch=page.locator('button[onclick="openTeamModal()"]').first();
 await launch.evaluate(el=>el.click());
 await page.locator('#teamModal').waitFor({state:'visible',timeout:5000});
 assert.equal(await page.locator('#memberPinCodeInput').getAttribute('type'),'password','Member secret must not be shown as text');
 await page.locator('#memberNameInput').fill('عضو تجربة');
 await page.locator('#memberIdNumInput').fill('test.member');
 await page.locator('#memberPinCodeInput').fill('StrongMockPassword#26');
 const options=await page.locator('input[name="memberAllowedSec"]').evaluateAll(a=>a.map(x=>x.value));
 assert.ok(options.length>=2,'Expected multiple section permissions');
 await page.locator('input[name="memberAllowedSec"]').evaluateAll((a)=>a.forEach((e,i)=>e.checked=i===0));
 await page.locator('#teamModal button[onclick="saveMemberEntry()"]').click();
 await page.waitForFunction(()=>document.getElementById('modalTeamList')?.textContent?.includes('عضو تجربة'),null,{timeout:10000});
 let submitted=requests.filter(r=>r.p==='/api/members'&&r.method==='POST');
 assert.equal(submitted.length,1,'Only one account creation call');
 assert.equal(submitted[0].body.username,'test.member');
 assert.equal(submitted[0].body.password,'StrongMockPassword#26');
 assert.deepEqual(submitted[0].body.allowedSections,[options[0]]);
 assert.equal(submitted[0].body.isAdmin,false);
 // Test section permission assignment through its real UI.
 await page.evaluate(id=>{document.getElementById('teamModal').classList.add('hidden');openSectionMembersModal(id)},options[1]);
 await page.locator('#sectionMembersModal').waitFor({state:'visible'});
 await page.locator('input[name="secAssignMemberCb"]').first().check();
 await page.locator('#sectionMembersModal button[onclick="saveSectionMembersAssignment()"]').click();
 await page.waitForFunction(()=>document.getElementById('sectionMembersModal').classList.contains('hidden'),null,{timeout:10000});
 const permission=requests.find(r=>r.p==='/api/permissions'&&r.method==='POST');
 assert.ok(permission);assert.equal(permission.body.sectionId,options[1]);
 assert.ok(permission.body.memberIds.includes(uuid));
 assert.ok(team[0].allowedSections.includes(options[1]));
 // Preview A4 on 390 and 320. Printed A4 remains separate via @media print.
 for(const width of [390,320]){
  await page.setViewportSize({width,height:744});
  await page.locator('button[onclick="openOfficialReportModal()"]').evaluate(el=>el.click());
  await page.locator('#officialReportModal').waitFor({state:'visible',timeout:6000});
  await page.locator('#formalPrintableDocument .a4-page').first().waitFor({state:'visible',timeout:15000});
  const m=await page.evaluate(()=>{
   const modal=document.getElementById('officialReportModal'),area=modal.querySelector('.report-scroll-region'),page=modal.querySelector('.a4-page');
   const b=page.getBoundingClientRect();
   return {vw:innerWidth,pageWidth:b.width,pageLeft:b.left,pageRight:b.right,
    scrollerWidth:area.clientWidth,scrollerScrollWidth:area.scrollWidth,
    reportHeight:modal.getBoundingClientRect().height, pageCount:modal.querySelectorAll('.a4-page').length,
    topButtons:[...modal.querySelectorAll('button')].slice(0,5).map(x=>({width:x.getBoundingClientRect().width,right:x.getBoundingClientRect().right}))};
  });
  console.log('REPORT_LAYOUT',JSON.stringify(m));
  assert.ok(m.pageCount>0,'A4 content must exist');
  assert.ok(m.pageWidth<=m.vw+2&&m.pageLeft>=-2&&m.pageRight<=m.vw+2,'A4 content clipped at '+width+'px');
  assert.ok(m.scrollerScrollWidth<=m.scrollerWidth+3,'Horizontal A4 scroll at '+width+'px');
  await page.locator('#officialReportModal .school-native-back').click();
  await page.locator('#officialReportModal').waitFor({state:'hidden'});
 }
 assert.deepEqual(errors,[],'No uncaught browser JavaScript exceptions');
 console.log('PASS member create, scoped permission save, WebKit A4 preview at 390px and 320px');
}finally{await browser?.close();server.close();}
