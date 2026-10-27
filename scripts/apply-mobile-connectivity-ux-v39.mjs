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
const statusBar=/<meta\s+name=["']apple-mobile-web-app-status-bar-style["'][^>]*>/i;
// Apple's black-translucent mode overlays the page and creates the unwanted
// fading/light status region on installed iPhone PWAs. Black is opaque and
// places web content below the native status bar.
const status='<meta name="apple-mobile-web-app-status-bar-style" content="black">';
html=statusBar.test(html)?html.replace(statusBar,status):html.replace('</head>',status+'</head>');
// Ensure Apple actually applies the status style in standalone mode.
const standalone=/<meta\s+name=["']apple-mobile-web-app-capable["'][^>]*>/i;
const standaloneTag='<meta name="apple-mobile-web-app-capable" content="yes">';
html=standalone.test(html)?html.replace(standalone,standaloneTag):html.replace('</head>',standaloneTag+'</head>');
html=html.replace('</head>','<link rel="stylesheet" href="./assets/mobile-connectivity-ux-v39.css"></head>');
// iOS 27 overlays an OS-rendered blur on Home Screen PWAs. A real, visible,
// fixed opaque strip at the top is sampled by WebKit's native status renderer.
// Unlike the old pseudo-element with negative safe-area coordinates, this DOM
// surface lives inside the viewport and is in the document before first paint.
const bodyOpen=/<body\b[^>]*>/i;
if(!bodyOpen.test(html))throw Error('PWA body element missing for iOS status surface');
if(html.includes('schoolIosStatusBarSurface'))throw Error('iOS status surface already injected');
html=html.replace(bodyOpen,match=>match+'<div id="schoolIosStatusBarSurface" aria-hidden="true"></div>');
html=html.replace('</body>','<script src="./assets/mobile-connectivity-ux-v39.js"></script></body>');
fs.writeFileSync(path,html);
for(const [src,dest] of [
 ['scripts/mobile-connectivity-ux-v39.js',root+'assets/mobile-connectivity-ux-v39.js'],
 ['scripts/mobile-connectivity-ux-v39.css',root+'assets/mobile-connectivity-ux-v39.css']
])fs.copyFileSync(src,dest);
const swPath=root+'sw.js',sw=fs.readFileSync(swPath,'utf8');
const asset="'./assets/mobile.js'";
if(!sw.includes(asset))throw Error('Cannot extend PWA offline shell');
fs.writeFileSync(swPath,sw.replace(asset,asset+",'./assets/mobile-connectivity-ux-v39.js','./assets/mobile-connectivity-ux-v39.css'"));
console.log('PASS iOS 27 fixed opaque status strip, banners moved to settings, connectivity UX installed, no fake write queue.');
