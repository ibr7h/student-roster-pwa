import fs from 'node:fs';
const name='public/owner.html';
let html=fs.readFileSync(name,'utf8');
if(!html.includes("window.SchoolBridge.request(path,opts)"))throw Error('Owner static API bridge is missing');
if(html.includes('owner-google-ui-v39.js')){console.log('Owner Google UI already patched');process.exit(0)}
const broken="catch(e){notice('تعذر الاتصال بالخادم: '+e.message,true);}}";
if(!html.includes(broken))throw Error('Owner initial network failure handler not found');
html=html.replace(broken,"catch(e){notice('تعذر الاتصال بالخادم: '+e.message,true);$('login').classList.remove('hidden');$('setup').classList.add('hidden');$('dashboard').classList.add('hidden');}}");
if(!html.includes('</head>')||!html.includes('</body>'))throw Error('Owner document head/body boundaries missing');
html=html.replace('</head>','<link rel="stylesheet" href="./assets/owner-google-ui-v39.css"></head>');
html=html.replace('</body>','<script src="./assets/owner-google-ui-v39.js"></script></body>');
fs.mkdirSync('public/assets',{recursive:true});
fs.copyFileSync('scripts/owner-google-ui-v39.js','public/assets/owner-google-ui-v39.js');
fs.copyFileSync('scripts/owner-google-ui-v39.css','public/assets/owner-google-ui-v39.css');
fs.writeFileSync(name,html);
console.log('PASS owner preview: Google JSON import, retry button, login fallback on API outage');
