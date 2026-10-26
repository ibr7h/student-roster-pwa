import fs from 'node:fs';
const page='public/index.html';
let html=fs.readFileSync(page,'utf8');
if(html.includes('auth-ui-v39.js')){console.log('v3.9 identity UI already installed');process.exit(0)}
if(!html.includes('</head>')||!html.includes('</body>'))throw Error('Cannot find PWA html boundaries');
if(!html.includes('static-api-v37.js')||!html.includes('mobile-native-v38.js'))throw Error('v3.9 must extend tested v3.8 PWA');
fs.mkdirSync('public/assets',{recursive:true});
fs.copyFileSync('scripts/auth-ui-v39.js','public/assets/auth-ui-v39.js');
fs.copyFileSync('scripts/auth-ui-v39.css','public/assets/auth-ui-v39.css');
fs.copyFileSync('scripts/release-ui-v39.js','public/assets/release-ui-v39.js');
fs.copyFileSync('scripts/release-ui-v39.css','public/assets/release-ui-v39.css');
fs.writeFileSync('public/release.json',JSON.stringify({version:'v3.9.0-r13',channel:'preview'})+'\n');
const bridge='public/assets/static-api-v37.js';
let bridgeSource=fs.readFileSync(bridge,'utf8');
const oldApi='https://school-evidence-v33-cloud-preview.onrender.com';
const nextApi=process.env.SCHOOL_V39_API_ORIGIN||'https://school-evidence-v39-api-preview.onrender.com';
if(!/^https:\/\/[a-z0-9.-]+\.onrender\.com$/.test(nextApi)||!bridgeSource.includes(oldApi))throw Error('Invalid or missing API origin in v3.9 PWA');
bridgeSource=bridgeSource.replace(oldApi,nextApi);
fs.writeFileSync(bridge,bridgeSource);

html=html.replace('</head>','<link rel="stylesheet" href="./assets/auth-ui-v39.css"><link rel="stylesheet" href="./assets/release-ui-v39.css"></head>');
html=html.replace('</body>','<script src="./assets/auth-ui-v39.js"></script><script src="./assets/release-ui-v39.js"></script></body>');
fs.writeFileSync(page,html);
fs.writeFileSync('public/activate.html','<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta http-equiv="refresh" content="0;url=./index.html"><title>تفعيل المدرسة بعد الدخول</title></head><body style="font:16px system-ui;background:#f4f7fc;color:#10253c;padding:30px"><p>أصبح تفعيل المدارس بعد تسجيل الدخول الموحد.</p><a href="./index.html">انتقل إلى المنصة</a></body></html>');
let sw=fs.readFileSync('public/sw.js','utf8');
if(!sw.includes('mobile-native-v38.js'))throw Error('PWA v3.8 marker missing');
sw=sw.replace(/school-evidence-pwa-cloud-v3\.\d+\.\d+/g,'school-evidence-pwa-cloud-v3.9.0-owner-drive-20261026-r13');
sw=sw.replace("'./assets/mobile.js'","'./assets/mobile.js','./assets/auth-ui-v39.js','./assets/auth-ui-v39.css','./assets/release-ui-v39.js','./assets/release-ui-v39.css'");
// Always read the latest release manifest from the network, never from the cache-first shell.
if(!sw.includes('const req=e.request;'))throw Error('PWA fetch handler marker missing');
sw=sw.replace('const req=e.request;',"const req=e.request;\n if(new URL(req.url).pathname==='/release.json')return;");
fs.writeFileSync('public/sw.js',sw);
const checks=[
 fs.readFileSync(page,'utf8').includes('auth-ui-v39.js'),
 fs.readFileSync('public/sw.js','utf8').includes('v3.9.0'),
 fs.readFileSync('public/assets/auth-ui-v39.js','utf8').includes('/register/verify'),
 fs.readFileSync('public/assets/auth-ui-v39.js','utf8').includes('/school/activate'),
 fs.readFileSync('public/index.html','utf8').includes('release-ui-v39.js'),
 fs.readFileSync('public/assets/release-ui-v39.js','utf8').includes("CURRENT='v3.9.0-r13'"),
 fs.readFileSync('public/release.json','utf8').includes('v3.9.0-r13'),
 fs.readFileSync('public/sw.js','utf8').includes("pathname==='/release.json'")
];
if(checks.some(x=>!x))throw Error('v3.9 PWA authentication integration incomplete');
console.log('v3.9 registration, login, OTP and in-app activation integrated into static PWA');
