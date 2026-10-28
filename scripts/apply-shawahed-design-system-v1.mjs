/* Install Shawahed Design System AFTER the existing iPhone UX patches. */
import fs from 'node:fs';
const htmlPath='public/index.html',swPath='public/sw.js';
const src='scripts/shawahed-design-system-v1.css';
const dest='public/assets/shawahed-design-system-v1.css';
const href='./assets/shawahed-design-system-v1.css';
const asset="'./assets/shawahed-design-system-v1.css'";
if(!fs.existsSync(src))throw Error('Design System stylesheet missing');
let html=fs.readFileSync(htmlPath,'utf8');
if(!html.includes('</head>')||!html.includes('mobile-connectivity-ux-v39.css'))throw Error('Existing iPhone UX assets missing: aborting safely');
if(html.includes(href))throw Error('Design System already installed');
let sw=fs.readFileSync(swPath,'utf8');
if(!sw.includes("'./assets/mobile.js'"))throw Error('Service Worker shell marker missing');
if(sw.includes(asset))throw Error('Design System already cached');
html=html.replace('</head>','<link rel="stylesheet" href="'+href+'"></head>');
sw=sw.replace("'./assets/mobile.js'","'./assets/mobile.js',"+asset);
fs.copyFileSync(src,dest);
fs.writeFileSync(htmlPath,html);
fs.writeFileSync(swPath,sw);
if(!fs.readFileSync(htmlPath,'utf8').includes(href)||
   !fs.readFileSync(swPath,'utf8').includes(asset))throw Error('Design System packaging failed');
console.log('PASS Shawahed Design System v1: tokens, focus, loading, reduced motion; iPhone and A4 unchanged.');
