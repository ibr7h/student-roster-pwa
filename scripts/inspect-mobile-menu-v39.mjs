import fs from 'node:fs';
const html=fs.readFileSync('public/index.html','utf8');
const start=html.indexOf('id="headerTools"'),toggle=html.indexOf('id="mobileMenuToggle"');
for(const [tag,pos,size] of [['HEADER_TOOLS',start,10500],['HAMBURGER_TOGGLE',toggle,2500]]){
 console.log('DIAG_'+tag,JSON.stringify(html.slice(Math.max(0,pos-1100),pos+size)));
}
for (const file of ['public/assets/mobile.css','public/assets/styles.css','public/assets/mobile.js','public/assets/icon-vectors.js']){
 if(!fs.existsSync(file))continue;
 const src=fs.readFileSync(file,'utf8');
 const terms=[/mobile-menu-open/g,/mobileMenuToggle/g,/headerTools/g,/app-toolbar/g,/mobile-bottom-nav/g];
 console.log('DIAG_ASSET',file,src.length);
 for(const t of terms){
  let matches=[],m;
  while((m=t.exec(src))&&matches.length<18)matches.push(src.slice(Math.max(0,m.index-200),m.index+420));
  console.log('DIAG_MATCH',file,t.source,JSON.stringify(matches));
 }
}
