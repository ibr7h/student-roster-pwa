/* Standalone iPhone PWA fixed viewport, following Dhahabk's structure. */
(()=>{'use strict';const mobile=/iPhone|iPod/i.test(navigator.userAgent);const standalone=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;if(!mobile||!standalone)return;document.documentElement.classList.add('school-iphone-page-lock');

// Keep four bottom-tab icons aligned and expose the current screen accessibly.
// The original mobileNavigate handlers remain authoritative for navigation.
const nav=document.getElementById('mobileBottomNav');
if(nav){
 const buttons=[...nav.querySelectorAll('button[onclick*="mobileNavigate("]')];
 const pageFor=b=>(b.getAttribute('onclick')||'').match(/mobileNavigate\('([a-z]+)'\)/)?.[1]||null;
 function activeTab(page){
  if(!buttons.some(b=>pageFor(b)===page))return;
  buttons.forEach(b=>{
   const selected=pageFor(b)===page;
   b.classList.toggle('selected',selected);
   if(selected)b.setAttribute('aria-current','page');
   else b.removeAttribute('aria-current');
  });
 }
 buttons.forEach(b=>b.addEventListener('click',()=>activeTab(pageFor(b)),{passive:true}));
 activeTab('home');
}

// The login overlay has its own full-screen opaque layout. The school dashboard
// instead needs a *fixed* opaque header at the actual viewport top on iOS 27.
const header=document.getElementById('appHeader');
function positionMainBelowHeader(){
 if(!header)return;
 const pixels=Math.ceil(header.getBoundingClientRect().height);
 if(pixels>10&&pixels<window.innerHeight*.5){
  const value=pixels+'px';
  if(document.body.style.getPropertyValue('--school-iphone-header-height')!==value)
   document.body.style.setProperty('--school-iphone-header-height',value);
 }
}
if(header){
 positionMainBelowHeader();
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(positionMainBelowHeader).observe(header);
 window.addEventListener('resize',positionMainBelowHeader,{passive:true});
 window.addEventListener('orientationchange',positionMainBelowHeader,{passive:true});
 requestAnimationFrame(positionMainBelowHeader);
}
const vv=window.visualViewport;
let scheduled=false;
function revealInput(){
 scheduled=false;
 const input=document.activeElement;
 if(!input?.matches('input,textarea,select,[contenteditable="true"]'))return;
 const panel=input.closest('#authV39Shell,#loginScreenOverlay,.school-connect-scroll,main,.school-native-screen,.custom-scrollbar');
 if(!panel)return;
 const r=input.getBoundingClientRect();
 const top=vv?vv.offsetTop:0,bottom=top+(vv?vv.height:innerHeight);
 const delta=r.bottom>bottom-24?r.bottom-bottom+24:r.top<top+16?r.top-top-16:0;
 if(Math.abs(delta)>3)panel.scrollTop+=delta;
}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(revealInput)}}
document.addEventListener('focusin',()=>{schedule();setTimeout(schedule,180);setTimeout(schedule,380)},true);
vv?.addEventListener('resize',schedule,{passive:true});
vv?.addEventListener('scroll',schedule,{passive:true});})();
