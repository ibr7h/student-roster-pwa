/* Test the actual generated PWA menu in WebKit and Chrome (not a markup mock). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {webkit,chromium} from 'playwright-core';
const root=path.resolve('public');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const p=new URL(req.url,'http://127.0.0.1').pathname;
 const file=path.resolve(root,'.'+(p==='/'?'/index.html':p));
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(e,data)=>e?res.writeHead(404).end():res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+server.address().port;
const api='https://school-evidence-v39-api-preview.onrender.com/api/**';
let browser;
try{
 browser=process.env.TEST_BROWSER==='chromium'
 ? await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']})
 : await webkit.launch({headless:true});
 for(const width of [320,390,430]){
  const context=await browser.newContext({viewport:{width,height:760},isMobile:true,hasTouch:true,locale:'ar-SA',serviceWorkers:'block'});
  await context.route(api,route=>{
   const p=new URL(route.request().url()).pathname;
   const user={id:'ci-manager',name:'مدير تجربة',isAdmin:true,allowedSections:[],activationRequired:false,license:{status:'active',canWrite:true}};
   const payload=p.endsWith('/health')?{ok:true}:p.endsWith('/me')?{user}:p.endsWith('/data')?{school:{name:'مدرسة تجربة',stage:'ابتدائي',year:'1448'},team:[],evidences:{},user,license:user.license}:{};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload),headers:{'Access-Control-Allow-Origin':'*'}});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(750);
  const initInfo=await page.evaluate(()=>({ready:!!window.SchoolToolsMenuUX,menu:document.querySelector('#headerTools')?.outerHTML.slice(0,3600),children:[...document.querySelector('#headerTools')?.children||[]].map(x=>({tag:x.tagName,action:x.getAttribute('onclick'),html:x.outerHTML.slice(0,260)})),script:[...document.querySelectorAll('script[src]')].map(x=>x.getAttribute('src')).filter(x=>x.includes('menu-ux'))}));
  console.log('MENU_INIT_DIAG',JSON.stringify(initInfo));
  await page.waitForFunction(()=>window.SchoolToolsMenuUX?.getItems(),null,{timeout:7000});
  await page.evaluate(()=>document.getElementById('loginScreenOverlay')?.classList.add('hidden'));
  // All six original action elements remain with their click handlers after re-parenting.
  const before=await page.evaluate(()=>{
   const menu=document.getElementById('headerTools');
   return {groups:[...menu.querySelectorAll('.school-menu-group')].map(x=>x.querySelector('h3')?.textContent),
    items:[...menu.querySelectorAll('.school-menu-action')].map(x=>x.getAttribute('onclick')||x.id||x.className.includes('school-release-tools')&&'updates'||'import'),
    account:!!menu.querySelector('#currentUserHeaderName')&&!!menu.querySelector('.school-menu-logout'),
    files:menu.querySelectorAll('#importJsonInput').length};
  });
  assert.deepEqual(before.groups,['الإدارة المدرسية','التقارير والأدوات','البيانات والنسخ','الاتصال والبيانات','الحساب والأمان']);
  assert.deepEqual(before.items,[
    'openSchoolProfileModal()','openTeamModal()','openOfficialReportModal()',
    'openBulkQrModal()','exportJSONBackup()','import','school-connect-menu-action',
    'auth39-link-email-action','auth39-change-password-action','updates'
  ]);
  assert.equal(before.account,true);assert.equal(before.files,1);
  await page.locator('#mobileMenuToggle').click();
  await page.waitForFunction(()=>document.body.classList.contains('mobile-menu-open'));
  const ui=await page.evaluate(()=>{
   const el=document.querySelector('#headerTools'),heading=el.querySelector('.school-menu-heading'),
    group=el.querySelector('.school-menu-group'),action=el.querySelector('.school-menu-action');
   const ic=action.querySelector('i').getBoundingClientRect(),label=action.querySelector('span').getBoundingClientRect();
   const rectangles=[...el.querySelectorAll('.school-menu-action')].map(x=>{
    const r=x.getBoundingClientRect();return {w:r.width,h:r.height,left:r.left,right:r.right}
   });
   return {width:innerWidth,bodyWidth:document.documentElement.scrollWidth,menuWidth:el.getBoundingClientRect().width,
    top:el.getBoundingClientRect().top,headerBottom:document.getElementById('appHeader').getBoundingClientRect().bottom,
    menuRect:el.getBoundingClientRect().toJSON(),scrollRect:el.querySelector('.school-menu-scroll').getBoundingClientRect().toJSON(),groupRect:group.getBoundingClientRect().toJSON(),accountRect:el.querySelector('.school-menu-account').getBoundingClientRect().toJSON(),
    menuDisplay:getComputedStyle(el).display,flexDirection:getComputedStyle(el).flexDirection,inlineDirection:el.style.getPropertyValue('flex-direction'),inlinePriority:el.style.getPropertyPriority('flex-direction'),rtl:getComputedStyle(el).direction,
    grid:getComputedStyle(group).display,
    headingHeight:heading.getBoundingClientRect().height,
    accountVisible:el.querySelector('.school-menu-current-user').getBoundingClientRect().height>44,
    logoutHeight:el.querySelector('.school-menu-logout').getBoundingClientRect().height,
    items:rectangles,iconToRight:ic.left>label.left,expanded:document.getElementById('mobileMenuToggle').getAttribute('aria-expanded'),
    focused:document.activeElement?.className};
  });
  console.log('TOOLS_MENU_LAYOUT',JSON.stringify(ui));
  assert.equal(ui.rtl,'rtl');assert.equal(ui.menuDisplay,'flex');assert.equal(ui.expanded,'true');
  assert.equal(ui.items.length,10);
  assert.ok(ui.bodyWidth<=width+2,'Mobile main document scrolls horizontally');
  assert.ok(Math.abs(ui.menuWidth-width)<3,'Mobile tools panel must fit viewport');
  assert.ok(Math.abs(ui.top-ui.headerBottom)<5,'Menu must start below live app header');
  assert.ok(ui.items.filter(r=>r.h>0).every(r=>r.h>=44&&r.w<=width&&r.left>=-2&&r.right<=width+2),'Touch targets clipped or too small');
  assert.ok(ui.iconToRight,'Arabic menu icons should precede their labels on the right');
  assert.ok(ui.accountVisible&&ui.logoutHeight>=44,'Account/log out not usable on phone');
  // Keyboard Escape returns focus and toggler state.
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.body.classList.contains('mobile-menu-open'));
  assert.equal(await page.locator('#mobileMenuToggle').getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('#headerTools').evaluate(e=>getComputedStyle(e).display),'none','Closed menu must never intercept other pages');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'mobileMenuToggle');
  // One-menu action opens a REAL report after closing the tools UI.
  await page.locator('#mobileMenuToggle').click();
  await page.waitForFunction(()=>document.body.classList.contains('mobile-menu-open'));
  const menuReopen=await page.evaluate(()=>{
   const el=document.querySelector('#headerTools button[onclick="openOfficialReportModal()"]'),r=el.getBoundingClientRect();
   return {target:r.toJSON(),top:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,200),menu:document.getElementById('headerTools').getBoundingClientRect().toJSON(),header:document.getElementById('appHeader').getBoundingClientRect().toJSON(),scroll:document.querySelector('.school-menu-scroll')?.scrollTop};
  });
  console.log('REOPEN_MENU_DIAG',JSON.stringify(menuReopen));
  const targetRect=await page.locator('#headerTools button[onclick="openOfficialReportModal()"]').boundingBox();
  assert.ok(targetRect && targetRect.y>125,'Report action must be visible below the native header');
  // Direct mobile tap at the visible action: Playwright's auto-scroll can incorrectly
  // reposition a fixed menu within a sticky header, then click the header instead.
  await page.mouse.click(targetRect.x+targetRect.width/2,targetRect.y+targetRect.height/2);
  await page.locator('#officialReportModal').waitFor({state:'visible',timeout:12000});
  assert.equal(await page.evaluate(()=>document.body.classList.contains('mobile-menu-open')),false);
  await page.locator('#officialReportModal .school-native-back').click();
  await page.locator('#officialReportModal').waitFor({state:'hidden'});
  // On a desktop breakpoint, original seven controls must be restored in order.
  await page.setViewportSize({width:1000,height:800});
  await page.waitForFunction(()=>document.querySelector('#headerTools')?.children.length===10);
  const desktop=await page.evaluate(()=>{
   const m=document.getElementById('headerTools');
   return {children:m.children.length,roles:[...m.children].map(x=>x.getAttribute('onclick')||x.tagName),
    file:m.querySelectorAll('#importJsonInput').length,logout:m.querySelectorAll('button[onclick*="logoutSession"]').length,mobileIcons:m.querySelectorAll('.school-menu-generated-icon').length};
  });
  assert.equal(desktop.children,10);assert.equal(desktop.file,1);assert.equal(desktop.logout,1);assert.equal(desktop.mobileIcons,0);
  await page.setViewportSize({width,height:760});
  await page.waitForFunction(()=>document.querySelectorAll('#headerTools .school-menu-group').length===4,null,{timeout:12000});
  assert.deepEqual(errors,[],errors.join('\n'));
  console.log('PASS structured Arabic hamburger, buttons, A4 action, escape, responsive restoration',width,process.env.TEST_BROWSER||'webkit');
  await context.close();
 }
}finally{await browser?.close();await new Promise(ok=>server.close(ok))}
