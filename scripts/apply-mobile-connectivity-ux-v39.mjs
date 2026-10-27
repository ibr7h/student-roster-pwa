/* Build-time integration; keeps the school profile, evidence and permission UI unchanged. */
import fs from 'node:fs';
const root='public/',path=root+'index.html';
let html=fs.readFileSync(path,'utf8');
if(html.includes('mobile-connectivity-ux-v39.js'))throw Error('Mobile connectivity UX is already installed');
const bridge='async function cloudRequest(path, options={}) { return window.SchoolBridge.request(path,options); }';
if(!html.includes(bridge))throw Error('Safe SchoolBridge API wrapper missing');
html=html.replace(bridge,
 "async function cloudRequest(path, options={}) { const ux=window.SchoolConnectivityUX; return ux ? ux.request(path,options) : window.SchoolBridge.request(path,options); }");
const themeSetter=String.raw`document.querySelector('meta[name="theme-color"]')?.setAttribute('content',({girls:'#701a75',early:'#0e7490',classic:'#0f172a'})[selected]);`;
if(!html.includes(themeSetter))throw Error('School theme meta update changed; review iOS theme rather than patching blindly');
// Keep school visual theme choices but never let them retint the native status region,
// which must remain a single opaque colour matching the PWA header.
html=html.replace(themeSetter,String.raw`document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#0d4153');`);

if(!html.includes('id="appHeader"')||!html.includes('id="licenseBanner"')||!html.includes('id="storageNotice"'))throw Error('Original header/banner structure changed');
const metaColor=/<meta\s+name=["']theme-color["'][^>]*>/i;
const theme='<meta name="theme-color" content="#0d4153">';
html=metaColor.test(html)?html.replace(metaColor,theme):html.replace('</head>',theme+'</head>');
// Match Dhahabk's deployed iPhone page: no explicit status-bar-style meta.
const statusBar=/<meta\s+name=["']apple-mobile-web-app-status-bar-style["'][^>]*>/gi;
html=html.replace(statusBar,'');
// Ensure Apple actually applies the status style in standalone mode.
const standalone=/<meta\s+name=["']apple-mobile-web-app-capable["'][^>]*>/i;
const standaloneTag='<meta name="apple-mobile-web-app-capable" content="yes">';
html=standalone.test(html)?html.replace(standalone,standaloneTag):html.replace('</head>',standaloneTag+'</head>');
html=html.replace('</head>','<link rel="stylesheet" href="./assets/mobile-connectivity-ux-v39.css"><script defer src="./assets/school-iphone-viewport-lock-v39.js"></script></head>');
// Dhahabk pins the whole iPhone document; Shawahed adopts that layout,
// without adding a small fake status-bar cover.
html=html.replace('</body>','<script src="./assets/mobile-connectivity-ux-v39.js"></script></body>');
fs.writeFileSync(path,html);
for(const [src,dest] of [
 ['scripts/mobile-connectivity-ux-v39.js',root+'assets/mobile-connectivity-ux-v39.js'],
 ['scripts/mobile-connectivity-ux-v39.css',root+'assets/mobile-connectivity-ux-v39.css'],
 ['scripts/school-iphone-viewport-lock-v39.js',root+'assets/school-iphone-viewport-lock-v39.js']
])fs.copyFileSync(src,dest);
const swPath=root+'sw.js',sw=fs.readFileSync(swPath,'utf8');
const asset="'./assets/mobile.js'";
if(!sw.includes(asset))throw Error('Cannot extend PWA offline shell');
fs.writeFileSync(swPath,sw.replace(asset,asset+",'./assets/mobile-connectivity-ux-v39.js','./assets/mobile-connectivity-ux-v39.css','./assets/school-iphone-viewport-lock-v39.js'"));
console.log('PASS Dhahabk-matched iPhone fixed viewport and no status-bar scrim, banners moved to settings, connectivity UX installed, no fake write queue.');
