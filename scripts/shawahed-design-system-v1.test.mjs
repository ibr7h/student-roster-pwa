import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
test('design tokens are defined and reuse institutional teal',()=>{
 const css=read('scripts/shawahed-design-system-v1.css');
 for(const token of ['--shd-ui-brand:#0d4153','--shd-ui-primary:#0e6875','--shd-ui-2:8px','--shd-ui-4:16px','--shd-ui-6:24px','--shd-ui-focus','--shd-ui-motion-fast'])
   assert.ok(css.includes(token),token);
 for(const component of ['.shd-ui-card','.shd-ui-button','.shd-ui-field','.shd-ui-skeleton','@media(prefers-reduced-motion:reduce)'])
   assert.ok(css.includes(component),component);
 assert.ok(!css.includes('.shd-page'), 'printed A4 selectors must not be touched');
 assert.ok(!css.includes('backdrop-filter:blur'), 'never reintroduce translucent top bar');
});
test('build preserves preceding iPhone changes and installs one cached stylesheet',()=>{
 const html=read('public/index.html'),sw=read('public/sw.js');
 const name='shawahed-design-system-v1.css';
 assert.equal(html.split(name).length-1,1,'single stylesheet reference');
 assert.equal(sw.split(name).length-1,1,'single offline cache reference');
 assert.ok(html.includes('mobile-connectivity-ux-v39.css'),'existing iPhone CSS retained');
 assert.ok(html.indexOf(name)>html.indexOf('mobile-connectivity-ux-v39.css'),'design layer loaded last');
 assert.ok(sw.includes('mobile-native-v38.css'),'mobile pages cached');
 assert.ok(sw.includes('school-mobile-menu-ux-v39.css'),'existing tools cached');
 assert.ok(fs.existsSync('public/assets/'+name),'stylesheet emitted');
});
test('bottom sheet swipe-down only dismisses, never confirms destructive operations',()=>{
 const source=read('scripts/mobile-native-v38.js');
 assert.ok(source.includes("handle.addEventListener('touchstart'"));
 assert.ok(source.includes("handle.addEventListener('touchend'"));
 assert.ok(source.includes("dy>=72&&dy>dx*1.5)finish(input?null:false)"));
});
test('real sync exposes busy state and no fake offline save queue',()=>{
 const js=read('public/assets/mobile-connectivity-ux-v39.js');
 assert.ok(js.includes("button.setAttribute('aria-busy',String(waiting))"));
 assert.ok(js.includes('لا توجد تعديلات محلية جاهزة للنشر'));
 assert.ok(js.includes('effectiveOffline()'));
});
