/* Build-time integration; keeps the school profile, evidence and permission UI unchanged. */
import fs from 'node:fs';
const root='public/',path=root+'index.html';
let html=fs.readFileSync(path,'utf8');
if(html.includes('mobile-connectivity-ux-v39.js'))throw Error('Mobile connectivity UX is already installed');
const bridge='async function cloudRequest(path, options={}) { return window.SchoolBridge.request(path,options); }';
if(!html.includes(bridge))throw Error('Safe SchoolBridge API wrapper missing');
html=html.replace(bridge,
 "async function cloudRequest(path, options={}) { const ux=window.SchoolConnectivityUX; return ux ? ux.request(path,options) : window.SchoolBridge.request(path,options); }");
if(!html.includes('id="appHeader"')||!html.includes('id="licenseBanner"')||!html.includes('id="storageNotice"'))throw Error('Original header/banner structure changed');
const metaColor=/<meta\s+name=["']theme-color["'][^>]*>/i;
const theme='<meta name="theme-color" content="#0d4153">';
html=metaColor.test(html)?html.replace(metaColor,theme):html.replace('</head>',theme+'</head>');
const statusBar=/<meta\s+name=["']apple-mobile-web-app-status-bar-style["'][^>]*>/i;
const status='<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">';
html=statusBar.test(html)?html.replace(statusBar,status):html.replace('</head>',status+'</head>');
html=html.replace('</head>','<link rel="stylesheet" href="./assets/mobile-connectivity-ux-v39.css"></head>');
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
console.log('PASS opaque status area, banners moved to settings, connectivity UX installed, no fake write queue.');
