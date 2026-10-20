import fs from 'node:fs';
const root='public/';
function edit(name,fn){
 const p=root+name;if(!fs.existsSync(p))return;
 const old=fs.readFileSync(p,'utf8'),next=fn(old);
 if(next===old)throw Error('Static integration marker missing: '+name);
 fs.writeFileSync(p,next);
}
fs.mkdirSync(root+'assets',{recursive:true});
fs.copyFileSync('scripts/static-api-v37.js',root+'assets/static-api-v37.js');
function attachBridge(s){
 if(!s.includes('</head>'))throw Error('head marker missing');
 return s.replace('</head>','<script src="./assets/static-api-v37.js"></script></head>');
}
edit('index.html',old=>{
 let s=attachBridge(old);
 const start=s.indexOf('async function cloudRequest(path, options={}) {');
 const end=s.indexOf('    function cloudError(error)',start);
 if(start<0||end<0)throw Error('cloudRequest function not found');
 s=s.slice(0,start)+"async function cloudRequest(path, options={}) { return window.SchoolBridge.request(path,options); }\n    "+s.slice(end);
 const shareNeedle='new URL(r.url,location.origin).href';
 if(!s.includes(shareNeedle))throw Error('Share URL origin marker missing');
 s=s.replaceAll(shareNeedle,'new URL(r.url,window.SCHOOL_API_ORIGIN).href');
 return s;
});
edit('owner.html',old=>{
 let s=attachBridge(old);
 const first=s.indexOf('async function api(path,opts={}){');
 const last=s.indexOf('\nasync function init()',first);
 if(first<0||last<0)throw Error('Owner API marker missing');
 return s.slice(0,first)+"async function api(path,opts={}){return window.SchoolBridge.request(path,opts)};"+s.slice(last);
});
edit('activate.html',old=>{
 let s=attachBridge(old);
 if(!s.includes("fetch('/api/activate'"))throw Error('Activation endpoint marker missing');
 s=s.replace("fetch('/api/activate'","fetch(window.SCHOOL_API_ORIGIN+'/api/activate'");
 s=s.replace("credentials:'same-origin'","credentials:'omit'");
 return s;
});
edit('view.html',attachBridge);
if(fs.existsSync(root+'owner-recover.html')){
 edit('owner-recover.html',old=>{
  let s=attachBridge(old);
  if(s.includes("fetch('/api/platform/recover'"))s=s.replace("fetch('/api/platform/recover'","fetch(window.SCHOOL_API_ORIGIN+'/api/platform/recover'");
  return s.replaceAll("credentials:'same-origin'","credentials:'omit'");
 });
}
fs.copyFileSync('scripts/static-view-v37.js',root+'view.js');
let sw=fs.readFileSync(root+'sw.js','utf8');
sw=sw.replace(/school-evidence-pwa-cloud-v3\.\d+\.\d+/g,'school-evidence-pwa-cloud-v3.7.0');
if(!sw.includes("'./assets/mobile.js'"))throw Error('Service worker asset list missing');
sw=sw.replace("'./assets/mobile.js'","'./assets/mobile.js','./assets/static-api-v37.js'");
fs.writeFileSync(root+'sw.js',sw);
const checks=['index.html','owner.html','activate.html','view.html'].map(x=>fs.readFileSync(root+x,'utf8'));
if(checks.some(s=>!s.includes('static-api-v37.js')) || !checks[0].includes('window.SchoolBridge.request'))throw Error('Missing static API integration');
console.log('Static PWA v3.7 ready; all interfaces use direct authenticated API requests.');

// Mobile v3.8: full-screen in-app pages and bottom sheets; no browser prompts.
await import('./apply-mobile-v38.mjs');
