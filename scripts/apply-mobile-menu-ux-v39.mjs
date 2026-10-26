/* Replace the six-item 2-column mobile toolbar with an Arabic UX-first navigation panel.
 * Desktop is unchanged; all original event handlers and permissions are preserved. */
import fs from 'node:fs';
const htmlPath='public/index.html',swPath='public/sw.js';
let html=fs.readFileSync(htmlPath,'utf8');
if(!html.includes('id="headerTools"')||!html.includes('id="mobileMenuToggle"'))throw Error('Mobile tools markers absent');
if(html.includes('school-mobile-menu-ux-v39.js'))throw Error('Menu UX applied more than once');
if(!html.includes('</head>')||!html.includes('</body>'))throw Error('Invalid HTML shell');
html=html.replace('</head>','<link rel="stylesheet" href="./assets/school-mobile-menu-ux-v39.css"></head>');
html=html.replace('</body>','<script src="./assets/school-mobile-menu-ux-v39.js"></script></body>');
fs.copyFileSync('scripts/school-mobile-menu-ux-v39.css','public/assets/school-mobile-menu-ux-v39.css');
fs.copyFileSync('scripts/school-mobile-menu-ux-v39.js','public/assets/school-mobile-menu-ux-v39.js');
fs.writeFileSync(htmlPath,html);
let sw=fs.readFileSync(swPath,'utf8');
if(!sw.includes("'./assets/mobile.js'"))throw Error('PWA cache entry not found');
sw=sw.replace("'./assets/mobile.js'","'./assets/mobile.js','./assets/school-mobile-menu-ux-v39.js','./assets/school-mobile-menu-ux-v39.css'");
fs.writeFileSync(swPath,sw);
if(!html.includes('school-mobile-menu-ux-v39.css')||!sw.includes('school-mobile-menu-ux-v39.js'))throw Error('Menu assets not packaged');
console.log('PASS school v3.9 RTL mobile menu UX assets integrated without changing toolbar actions');
