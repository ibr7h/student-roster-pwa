import fs from 'node:fs';
const h=fs.readFileSync('public/index.html','utf8');
const list=['<body','id="appHeader"','</header>','<main','id="mainContent"','id="appMain"','id="schoolApp"','id="authV39Shell"','id="loginScreenOverlay"','id="mainApp"','id="appLayout"','class="mobile-bottom-nav','id="schoolContainer"'];
for(const token of list){const p=h.indexOf(token);console.log('SCHOOL_DOM',token,p,JSON.stringify(p<0?'NOT FOUND':h.slice(Math.max(0,p-750),p+2200)));}
console.log('END_BODY',JSON.stringify(h.slice(h.lastIndexOf('</body>')-900,h.lastIndexOf('</body>')+7)));
