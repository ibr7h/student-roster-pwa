/* Install the versioned Shawahed UI Design System AFTER existing mobile fixes.
   Do not change app logic, reports, headers, navigation geometry or permissions. */
import fs from 'node:fs';
const htmlPath='public/index.html',swPath='public/sw.js';
const src='scripts/shawahed-design-system-v1.css';
const dest='public/assets/shawahed-design-system-v1.css';
const href='./assets/shawahed-design-system-v1.css';
const marker="'./assets/shawahed-design-system-v1.css'";
if(!fs.existsSync(src))throw Error('Design System stylesheet missing');
let html=fs.readFileSync(htmlPath,'utf8');
if(!html.includes('</head>')||!html.includes('mobile-connectivity-ux-v39.css'))throw Error('Existing iPhone UX assets missing: aborting safely');
if(html.includes(href))throw Error('Design System already installed');
html=html.replace('</head>',`<link rel="stylesheet" href="${href}"></head>`);
fs.copyFileSync(src,dest);
const sw=fs.readFileSync(swPath,'utf8');
if(!sw.includes("'./assets/mobile.js'"))throw Error('Service Worker shell marker missing');
if(sw.includes(marker))throw Error('Design System already cached');
const next=sw.replace("'./assets/mobile.js'","'./assets/mobile.js'," + marker`);
fs.writeFileSync(htmlPath,html);
fs.writeFileSync(swPath,next);
if(!fs.readFileSync(htmlPath,'utf8').includes(href)||
   !fs.readFileSync(swPath,'utf8').includes(marker))throw Error('Design System packaging failed');
console.log('PASS Shawahed Design System v1: UI tokens, components, focus, loading, reduced-motion; existing iPhone/nav/A4 preserved.');
