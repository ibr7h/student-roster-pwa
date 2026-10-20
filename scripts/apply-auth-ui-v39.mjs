import fs from 'node:fs';
const page='public/index.html';
let html=fs.readFileSync(page,'utf8');
if(html.includes('auth-ui-v39.js')){console.log('v3.9 identity UI already installed');process.exit(0)}
if(!html.includes('</head>')||!html.includes('</body>'))throw Error('Cannot find PWA html boundaries');
if(!html.includes('static-api-v37.js')||!html.includes('mobile-native-v38.js'))throw Error('v3.9 must extend tested v3.8 PWA');
fs.mkdirSync('public/assets',{recursive:true});
fs.copyFileSync('scripts/auth-ui-v39.js','public/assets/auth-ui-v39.js');
fs.copyFileSync('scripts/auth-ui-v39.css','public/assets/auth-ui-v39.css');
html=html.replace('</head>','<link rel="stylesheet" href="./assets/auth-ui-v39.css"></head>');
html=html.replace('</body>','<script src="./assets/auth-ui-v39.js"></script></body>');
fs.writeFileSync(page,html);
let sw=fs.readFileSync('public/sw.js','utf8');
if(!sw.includes('mobile-native-v38.js'))throw Error('PWA v3.8 marker missing');
sw=sw.replace(/school-evidence-pwa-cloud-v3\.\d+\.\d+/g,'school-evidence-pwa-cloud-v3.9.0');
sw=sw.replace("'./assets/mobile.js'","'./assets/mobile.js','./assets/auth-ui-v39.js','./assets/auth-ui-v39.css'");
fs.writeFileSync('public/sw.js',sw);
const checks=[
 fs.readFileSync(page,'utf8').includes('auth-ui-v39.js'),
 fs.readFileSync('public/sw.js','utf8').includes('v3.9.0'),
 fs.readFileSync('public/assets/auth-ui-v39.js','utf8').includes('/register/verify'),
 fs.readFileSync('public/assets/auth-ui-v39.js','utf8').includes('/school/activate')
];
if(checks.some(x=>!x))throw Error('v3.9 PWA authentication integration incomplete');
console.log('v3.9 registration, login, OTP and in-app activation integrated into static PWA');
