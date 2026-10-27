import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {webkit,chromium} from 'playwright-core';
const root=path.resolve('public');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(err,data)=>err?res.writeHead(404).end():res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const url='http://127.0.0.1:'+server.address().port;
const api='https://school-evidence-v39-api-preview.onrender.com/api/**';
const browser=process.env.TEST_BROWSER==='chromium'?
 await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']}):
 await webkit.launch({headless:true});
try{
 for(const width of [390,320,430]){
  let calls=[],errors=[];
  const context=await browser.newContext({viewport:{width,height:844},locale:'ar-SA',isMobile:true,hasTouch:true,serviceWorkers:'block',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 Version/27.0 Mobile/15E148 Safari/604.1'});
  await context.addInitScript(()=>{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});});
  await context.addInitScript(()=>sessionStorage.setItem('school_evidence_session_v37','X'.repeat(43)));
  const current={id:'manager-ci',name:'مدير اختبار',isAdmin:true,allowedSections:[],activationRequired:false,license:{status:'active',canWrite:true,until:'2027-10-26',daysRemaining:365}};
  await context.route(api,async route=>{
   const req=route.request(),p=new URL(req.url()).pathname,method=req.method();calls.push({p,method});
   const payload=p==='/api/health'?{ok:true}:p==='/api/me'?{user:current}:p==='/api/data'?
    {school:{name:'مدرسة اختبار',stage:'ابتدائي',year:'1448',code:'123456'},team:[],evidences:{},user:current,license:current.license}:
    p==='/api/setup/status'?{setupRequired:false}:{error:'Unknown endpoint'};
   await route.fulfill({status:payload.error?404:200,contentType:'application/json',
    headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization,Content-Type'},
    body:JSON.stringify(payload)});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.SchoolConnectivityUX&&document.querySelector('#loginScreenOverlay')?.classList.contains('hidden'),null,{timeout:20000});
  // Main page is visually quiet; license details remain discoverable in settings.
  assert.equal(await page.locator('#storageNotice').count(),0,'Remove redundant server success banner from main');
  assert.equal(await page.locator('#licenseBanner').evaluate(el=>el.closest('#schoolConnectLicenseHost')!==null),true,'License should move to settings');
  const head=await page.locator('#appHeader').evaluate(el=>{
   const css=getComputedStyle(el);
   return {background:css.backgroundColor,filter:css.backdropFilter,image:css.backgroundImage};
  });
  const ios=await page.evaluate(()=>{
   const meta=name=>[...document.querySelectorAll('meta[name="'+name+'"]')].map(el=>el.content);
   const top=getComputedStyle(document.getElementById('appHeader'),'::before');
   const root=getComputedStyle(document.documentElement);
   return {status:meta('apple-mobile-web-app-status-bar-style'),standalone:meta('apple-mobile-web-app-capable'),
    theme:meta('theme-color'),rootColor:root.backgroundColor,topPseudo:top.content,topDisplay:top.display};
  });
  assert.deepEqual(ios.status,[],'Match Dhahabk: do not force native status-bar styling');
  assert.deepEqual(ios.standalone,['yes'],'Apple PWA standalone is required for status meta');
  assert.deepEqual(ios.theme,['#0d4153'],'Use a solid theme behind the native status bar');
  assert.equal(ios.topDisplay,'none','Remove legacy negative safe-area overlay');
  assert.equal(ios.rootColor,'rgb(13, 65, 83)','Root must remain same solid shade as header');
  const pageLock=await page.evaluate(()=>{
    const root=document.documentElement,body=document.body,main=document.querySelector('body>main');
    const bs=getComputedStyle(body),ms=getComputedStyle(main);
    return {active:root.classList.contains('school-iphone-page-lock'),
      bodyPosition:bs.position,bodyOverflow:bs.overflowY,bodyHeight:body.getBoundingClientRect().height,
      viewportHeight:innerHeight,mainOverflow:ms.overflowY,mainClientHeight:main.clientHeight,
      hasScrim:!!document.getElementById('schoolIosStatusBarSurface'),
      hasScript:!!document.querySelector('script[src$="school-iphone-viewport-lock-v39.js"]')};
  });
  assert.equal(pageLock.active,true,'Match installed Dhahabk iPhone: document viewport is locked');
  assert.equal(pageLock.bodyPosition,'fixed','iPhone document should not scroll underneath native status bar');
  assert.equal(pageLock.bodyOverflow,'hidden','Document scrolling should be disabled');
  assert.equal(pageLock.mainOverflow,'auto','Inner school main must remain scrollable');
  assert.ok(Math.abs(pageLock.bodyHeight-pageLock.viewportHeight)<5,'Fixed body must match visual screen height');
  assert.equal(pageLock.hasScrim,false,'Remove 10px fake status overlay from previous r19 attempt');
  assert.equal(pageLock.hasScript,true,'Dhahabk-like viewport JS must load');
  await page.waitForFunction(()=>{
    const h=document.getElementById('appHeader'),m=document.querySelector('body>main'),s=getComputedStyle(h);
    return s.position==='fixed'&&Math.abs(h.getBoundingClientRect().bottom-m.getBoundingClientRect().top)<5;
  },null,{timeout:10000});
  const inner=await page.evaluate(()=>{
    const h=document.getElementById('appHeader'),m=document.querySelector('body>main');
    const hs=getComputedStyle(h),hr=h.getBoundingClientRect(),mr=m.getBoundingClientRect();
    const login=document.getElementById('loginScreenOverlay'),ls=getComputedStyle(login);
    return {headTop:hr.top,headBottom:hr.bottom,headHeight:hr.height,
      headPosition:hs.position,headColor:hs.backgroundColor,headImage:hs.backgroundImage,
      headFilter:hs.backdropFilter,mainTop:mr.top,mainHeight:mr.height,
      mainMargin:getComputedStyle(m).marginTop,loginHidden:login.classList.contains('hidden'),
      loginIsFixed:ls.position==='fixed',topBarAbsent:!document.getElementById('schoolIosStatusBarSurface')};
  });
  assert.equal(inner.headPosition,'fixed','Dashboard header must actually be fixed at top after login');
  assert.ok(Math.abs(inner.headTop)<2,'Dashboard header begins at viewport top for iOS compositor');
  assert.ok(inner.headHeight>6&&inner.headHeight<300,'Fixed header is a real painted surface, not the previous tiny 10px strip');
  assert.equal(inner.headColor,'rgb(13, 65, 83)','Internal header must have solid opaque navy');
  assert.equal(inner.headImage,'none','No gradient in dashboard header');
  assert.equal(inner.headFilter,'none','No backdrop blur in dashboard header');
  assert.ok(inner.mainTop>=inner.headBottom-2,'School content must start below the actual fixed header');
  assert.equal(inner.loginHidden,true,'Do not alter the existing login overlay layout');
  assert.equal(inner.loginIsFixed,true,'Login screen remains full-screen and fixed');
  assert.equal(inner.topBarAbsent,true,'No intrusive fake status bar from older revisions');
  console.log('DASHBOARD_OPAQUE_FIXED_HEADER',JSON.stringify({width,inner}));

  const scrolling=await page.evaluate(()=>{
    const main=document.querySelector('body>main');
    const tall=document.createElement('div');tall.style.height='1500px';tall.id='viewport-scroll-proof';main.append(tall);
    main.scrollTop=main.scrollHeight;
    const result={windowY:window.scrollY,contentY:main.scrollTop,documentY:document.documentElement.scrollTop};
    tall.remove();main.scrollTop=0;
    return result;
  });
  assert.equal(scrolling.windowY,0,'Page itself cannot scroll');
  assert.ok(scrolling.contentY>0,'School content continues to scroll internally on phone');
  assert.equal(scrolling.documentY,0,'Keep Safari page at top');
  const headerDuringScroll=await page.evaluate(()=>{
    const h=document.getElementById('appHeader'),m=document.querySelector('body>main');
    const before=h.getBoundingClientRect().top;
    const spacer=document.createElement('div');spacer.style.height='1100px';m.appendChild(spacer);
    m.scrollTop=600;
    const after=h.getBoundingClientRect().top,mainTop=m.getBoundingClientRect().top;
    spacer.remove();m.scrollTop=0;
    return {before,after,mainTop};
  });
  assert.ok(Math.abs(headerDuringScroll.after-headerDuringScroll.before)<2,
    'Scrolling school content must never scroll the fixed iPhone header');

  const navMetrics=await page.evaluate(()=>{
    const nav=document.getElementById('mobileBottomNav'),body=document.body,main=body.querySelector('main');
    const n=nav.getBoundingClientRect(),v=window.visualViewport;
    const c=getComputedStyle(nav),b=getComputedStyle(body),m=getComputedStyle(main);
    const tabs=[...nav.querySelectorAll('button')].map(x=>{
      const r=x.getBoundingClientRect(),st=getComputedStyle(x);
      return {text:x.innerText,rect:{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom},
        display:st.display,font:st.fontSize,padding:st.padding,
      icon:x.querySelector('i')?.getBoundingClientRect().toJSON(),
      label:x.querySelector('span')?.getBoundingClientRect().toJSON(),
      labelFont:getComputedStyle(x.querySelector('span')).fontSize}
    });
    return {innerHeight,viewport:v?{height:v.height,offsetTop:v.offsetTop}:null,
      navRect:{x:n.x,y:n.y,width:n.width,height:n.height,bottom:n.bottom},
      navStyle:{position:c.position,bottom:c.bottom,margin:c.margin,padding:c.padding,
        background:c.backgroundColor,flex:c.flex,display:c.display,minHeight:c.minHeight,maxHeight:c.maxHeight},
      bodyRect:body.getBoundingClientRect().toJSON(),bodyStyle:{display:b.display,padding:b.padding,height:b.height},
      mainRect:main.getBoundingClientRect().toJSON(),mainStyle:{flex:m.flex,margin:m.margin,padding:m.padding},
      tabs};
  });
  console.log('IPHONE_BOTTOM_NAV_GEOMETRY',JSON.stringify({width,navMetrics}));

  assert.ok(Math.abs(navMetrics.navRect.bottom-navMetrics.innerHeight)<2,
    'Navigation must end at bottom of screen with no empty area below: '+JSON.stringify(navMetrics.navRect));
  assert.equal(navMetrics.bodyStyle.padding,'0px',
    'The old 73px body bottom reserve must be completely removed');
  assert.ok(navMetrics.navRect.height>=60&&navMetrics.navRect.height<=95,
    'Preserve compact content-sized tab bar and safe-area padding');
  assert.equal(navMetrics.navStyle.position,'relative',
    'The flex-child tab bar should not overlay scrolling content');
  assert.equal(navMetrics.tabs.length,4);
  for(let i=0;i<navMetrics.tabs.length;i++){
    const tab=navMetrics.tabs[i];
    assert.ok(tab.rect.height>=48&&tab.rect.height<=60,'Native tab touch target at least 48px');
    assert.ok(Math.abs(tab.icon.width-24)<1 && Math.abs(tab.icon.height-24)<1,
      'iPhone tab icons remain 24px');
    assert.equal(tab.labelFont,'10px','Shawahed iPhone tab labels remain 10px');
    assert.ok(tab.label?.height>=10&&navMetrics.navRect.bottom-tab.label.bottom>=8,
      'Caption must remain completely visible above Home Indicator safe-area');
    assert.ok(tab.rect.y>=navMetrics.navRect.y&&tab.rect.bottom<=navMetrics.navRect.bottom,
      'All tabs must fit within the safe-area background');
    assert.ok(Math.abs(tab.rect.width-navMetrics.tabs[0].rect.width)<2,
      'All four navigation tabs must have equal width');
  }
  const footerStyle=await page.locator('#mobileBottomNav').evaluate(nav=>{
    const btns=[...nav.querySelectorAll('button')];
    return {background:getComputedStyle(nav).backgroundColor,
      colors:btns.map(b=>getComputedStyle(b).color),
      markup:btns.map(b=>b.outerHTML.slice(0,500)),
      active:btns.map(b=>({label:b.textContent.trim(),selected:b.classList.contains('selected')||
        b.getAttribute('aria-current')==='page',background:getComputedStyle(b).backgroundColor,
        color:getComputedStyle(b).color})),
      innerWidth:document.documentElement.clientWidth,
      bodyScrollWidth:document.body.scrollWidth};
  });
  assert.equal(footerStyle.background,head.background,'Footer background must match Shawahed app header');
  assert.equal(footerStyle.background,'rgb(13, 65, 83)','Shawahed navy-teal, not Dhahabk navy');
  assert.ok(footerStyle.colors.every((c,i)=>footerStyle.active[i].selected||c==='rgb(197, 217, 224)'),
   'Inactive tab labels and icons must use the Shawahed palette');
  assert.ok(footerStyle.bodyScrollWidth<=footerStyle.innerWidth+2,'No horizontal overflow from footer');
  console.log('IPHONE_NAV_CLASSES',JSON.stringify({width,footerStyle}));
  assert.ok(footerStyle.active.some(x=>x.selected&&x.color==='rgb(122, 219, 210)'&&x.background==='rgba(0, 0, 0, 0)'),
   'Shawahed active tab must be turquoise without a pill background');
  assert.ok(footerStyle.active.every(x=>x.selected||x.background==='rgba(0, 0, 0, 0)'),
   'Inactive navigation must be transparent over navy');

  // Simulate the real device defect: 100dvh/innerHeight is taller than
  // the visible PWA canvas, so the lower tab captions previously got clipped.
  const viewportMismatch=await page.evaluate(async()=>{
    const vv=window.visualViewport, before=vv.height;
    if(!vv)return {supported:false};
    const own=Object.getOwnPropertyDescriptor(vv,'height');
    Object.defineProperty(vv,'height',{configurable:true,get:()=>before-64});
    vv.dispatchEvent(new Event('resize'));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const nav=document.getElementById('mobileBottomNav');
    const labels=[...nav.querySelectorAll('button>span')].map(el=>el.getBoundingClientRect().bottom);
    const result={supported:true,inner:innerHeight,visible:before-64,
      body:document.body.getBoundingClientRect().bottom,
      nav:nav.getBoundingClientRect().bottom,
      labels,measured:getComputedStyle(document.documentElement).getPropertyValue('--school-iphone-visible-height')};
    if(own)Object.defineProperty(vv,'height',own);else delete vv.height;
    vv.dispatchEvent(new Event('resize'));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    return result;
  });
  console.log('VISUAL_VIEWPORT_DIAG',JSON.stringify({width,viewportMismatch}));
  assert.ok(viewportMismatch.supported,'visualViewport must be testable in iPhone emulation');
  assert.ok(Math.abs(viewportMismatch.body-viewportMismatch.visible)<3,
    'Fixed body must follow truly visible PWA canvas, not 100dvh');
  assert.ok(Math.abs(viewportMismatch.nav-viewportMismatch.visible)<3,
    'Bottom bar must be inside screen under iOS height mismatch');
  assert.ok(viewportMismatch.labels.every(v=>v<=viewportMismatch.visible-16),
    'All bottom labels must remain visible with internal Home Indicator padding');
  console.log('IPHONE_VISUAL_VIEWPORT_MISMATCH_PASS',JSON.stringify({width,viewportMismatch}));
  assert.equal(head.filter,'none','No iOS top blur');
  assert.equal(head.image,'none','Opaque header must not use gradients');
  assert.equal(await page.locator('#schoolConnectivityOpen').count(),1);
  assert.equal(await page.locator('#headerTools .school-connect-menu-entry').count(),1,'More menu must also expose connectivity');
  await page.locator('#schoolConnectivityOpen').click();
  const panel=page.locator('#schoolConnectivityPanel');
  await panel.waitFor({state:'visible'});
  assert.equal(await panel.getAttribute('dir'),'rtl');
  assert.equal(await panel.locator('#schoolConnectModes button').count(),3);
  await page.waitForFunction(()=>!document.getElementById('schoolConnectSync').disabled,null,{timeout:10000});
  assert.equal(await panel.locator('#schoolConnectSync').isEnabled(),true);
  const dataBefore=calls.filter(x=>x.p==='/api/data').length;
  await panel.locator('#schoolConnectSync').click();
  await page.waitForFunction(()=>document.getElementById('schoolConnectFeedback').textContent.includes('تم تحديث بيانات المدرسة'),null,{timeout:17000});
  assert.ok(calls.filter(x=>x.p==='/api/data').length>dataBefore,'Actual /data refresh required');
  await panel.locator('button[data-mode=offline]').click();
  assert.equal(await panel.locator('#schoolConnectSync').isDisabled(),true);
  const beforeWrites=calls.filter(x=>x.method==='POST').length;
  const offline=await page.evaluate(async()=>{
   try{await cloudRequest('/evidences',{method:'POST',body:'{}'});return 'sent'}
   catch(e){return String(e.message)}
  });
  assert.ok(offline.includes('لم تُحفظ'),'Must not falsely claim offline changes were saved');
  assert.equal(calls.filter(x=>x.method==='POST').length,beforeWrites,'Never send writes in explicit offline mode');
  const text=await panel.locator('.school-connect-security').innerText();
  assert.ok(text.includes('الجلسة الحالية')&&text.includes('لا تُحفظ تعديلات'),'Honest limits must be disclosed');
  // Check route from More menu without mutating the user account.
  await panel.locator('#schoolConnectBack').click();
  assert.equal(await panel.isHidden(),true);
  await page.evaluate(()=>window.mobileNavigate('more'));
  await page.waitForFunction(()=>document.body.classList.contains('mobile-menu-open'),null,{timeout:7000});
  await page.locator('#headerTools .school-connect-menu-entry').click();
  await panel.waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>document.body.classList.contains('mobile-menu-open')),false);
    // Session logout must work even while explicitly offline.
  await page.evaluate(()=>window.SchoolConnectivityUX.request('/logout',{method:'POST',body:'{}'}));
  assert.equal(await page.evaluate(()=>window.SchoolBridge.token()),'');
  assert.deepEqual(errors,[],'No browser exceptions: '+errors.join('; '));
  console.log('PASS_MOBILE_CONNECTIVITY_UX',JSON.stringify({width,opaqueHeader:head.background,licenseRelocated:true,networkSync:true,offlineWritesBlocked:true,logoutClearsToken:true}));
  await context.close();
 }

 // In normal Safari/Chrome, the installed-only class must never activate;
 // browser UI stays controlled by the existing responsive CSS.
 const browserContext=await browser.newContext({
   viewport:{width:390,height:844},locale:'ar-SA',isMobile:true,hasTouch:true,
   serviceWorkers:'block',
   userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 Version/27.0 Mobile/15E148 Safari/604.1'
 });
 const browserPage=await browserContext.newPage();
 await browserPage.goto(url+'/',{waitUntil:'domcontentloaded'});
 const browserMode=await browserPage.evaluate(()=>{
   const n=document.querySelector('#mobileBottomNav button'),
         s=getComputedStyle(n),icon=getComputedStyle(n.querySelector('i')),
         label=getComputedStyle(n.querySelector('span'));
   return {installed:document.documentElement.classList.contains('school-iphone-page-lock'),
     height:s.height,icon:icon.width,label:label.fontSize};
 });
 assert.equal(browserMode.installed,false,'Normal iPhone browser must not inherit app-only layout');
 assert.ok(browserMode.label!=='14px'||browserMode.icon!=='32px'||browserMode.height!=='74px',
   'Normal browser must retain its own non-PWA tab design');
 console.log('NORMAL_BROWSER_UNCHANGED',JSON.stringify(browserMode));
 await browserContext.close();
}finally{await browser.close();await new Promise(r=>server.close(r))}
