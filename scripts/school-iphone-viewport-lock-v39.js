/* Standalone iPhone PWA fixed viewport, following Dhahabk's structure. */
(()=>{'use strict';const mobile=/iPhone|iPod/i.test(navigator.userAgent);const standalone=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;if(!mobile||!standalone)return;document.documentElement.classList.add('school-iphone-page-lock');})();
