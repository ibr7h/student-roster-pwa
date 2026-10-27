/* Standalone iPhone PWA fixed viewport, following Dhahabk's structure. */
(()=>{'use strict';const mobile=/iPhone|iPod/i.test(navigator.userAgent);const standalone=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;if(!mobile||!standalone)return;document.documentElement.classList.add('school-iphone-page-lock');
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
