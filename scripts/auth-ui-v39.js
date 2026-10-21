(()=>{'use strict';
const overlay=document.getElementById('loginScreenOverlay');
if(!overlay)return;
const shell=document.createElement('section');shell.id='authV39Shell';shell.dir='rtl';
shell.innerHTML=[
'<div class="auth39-head"><div class="auth39-emblem" aria-hidden="true">▣</div><div class="auth39-wordmark">شواهد التقويم المدرسي</div><p>إدارة التوثيق والاعتماد المدرسي</p></div>',
'<div class="auth39-body">',
'<section id="auth39-login" class="auth39-page"><h1>تسجيل الدخول</h1><p class="auth39-intro">أدخل بيانات حسابك للوصول إلى مساحتك وفق صلاحياتك.</p>',
'<form id="auth39-loginForm"><label for="auth39-identity">البريد الإلكتروني أو اسم المستخدم</label><input id="auth39-identity" name="username" autocomplete="username" spellcheck="false" autocapitalize="none" required placeholder="البريد أو اسم المستخدم">',
'<label for="auth39-password">كلمة المرور</label><input id="auth39-password" name="password" type="password" autocomplete="current-password" required placeholder="كلمة المرور">',
'<button class="auth39-primary" type="submit" id="auth39-loginSubmit">دخول المنصة</button></form>',
'<div class="auth39-links"><button type="button" data-auth-page="register">إنشاء حساب مدرسة</button><button type="button" data-auth-page="reset">نسيت كلمة المرور؟</button></div><div class="auth39-links"><a href="./owner.html">إدارة المنصة</a></div></section>',
'<section id="auth39-register" class="auth39-page" hidden><button class="auth39-back" type="button" data-auth-page="login">‹ العودة للدخول</button><h1>تسجيل مدرسة جديدة</h1><p class="auth39-intro">سيتم إرسال رمز تحقق إلى بريد مدير المدرسة قبل إنشاء الحساب.</p>',
'<form id="auth39-registerForm">',
'<label for="auth39-schoolName">اسم المدرسة</label><input id="auth39-schoolName" name="schoolName" maxlength="130" required>',
'<label for="auth39-schoolType">نوع المدرسة</label><select id="auth39-schoolType" name="schoolType" required><option value="boys">بنين</option><option value="girls">بنات</option><option value="early">طفولة مبكرة</option></select>',
'<label for="auth39-ministryCode">الرقم الوزاري</label><input id="auth39-ministryCode" name="ministryCode" inputmode="numeric" pattern="[0-9]{5,12}" maxlength="12" required>',
'<label for="auth39-name">اسم مدير المدرسة</label><input id="auth39-name" name="name" maxlength="130" required>',
'<label for="auth39-email">البريد الإلكتروني</label><input id="auth39-email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" required>',
'<label for="auth39-phone">رقم الجوال</label><input id="auth39-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+9665XXXXXXXX" required>',
'<label for="auth39-username">اسم المستخدم</label><input id="auth39-username" name="username" autocomplete="username" pattern="[a-zA-Z0-9._-]{3,64}" minlength="3" maxlength="64" autocapitalize="none" spellcheck="false" required>',
'<label for="auth39-newPassword">كلمة مرور قوية (12 حرفًا على الأقل)</label><input id="auth39-newPassword" name="password" type="password" minlength="12" maxlength="256" autocomplete="new-password" required>',
'<label for="auth39-confirmPassword">تأكيد كلمة المرور</label><input id="auth39-confirmPassword" name="confirmPassword" type="password" minlength="12" maxlength="256" autocomplete="new-password" required>',
'<button id="auth39-registerSubmit" class="auth39-primary" type="submit">متابعة والتحقق من البريد</button>',
'</form></section>',
'<section id="auth39-verify" class="auth39-page" hidden><button class="auth39-back" type="button" data-auth-page="register">‹ تعديل بيانات التسجيل</button><div class="auth39-step-icon">✉</div><h1>تأكيد البريد الإلكتروني</h1><p class="auth39-intro">أدخل الرمز المكوّن من 6 أرقام المرسل إلى بريدك. تنتهي صلاحيته بعد 10 دقائق.</p>',
'<form id="auth39-verifyForm"><label for="auth39-code">رمز التحقق</label><input id="auth39-code" name="code" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="one-time-code" dir="ltr" required>',
'<button class="auth39-primary" type="submit">تأكيد البريد وإنشاء الحساب</button></form>',
'<button id="auth39-resend" class="auth39-secondary" type="button" disabled>إعادة إرسال الرمز</button><span id="auth39-countdown" class="auth39-muted"></span></section>',
'<section id="auth39-activation" class="auth39-page" hidden><div class="auth39-step-icon">✓</div><h1>تفعيل المدرسة</h1><p class="auth39-intro">حسابك مؤكد. أدخل الرقم التسلسلي السنوي الذي أصدرته إدارة المنصة لتفعيل المدرسة بعد تسجيل الدخول.</p>',
'<form id="auth39-activationForm"><label for="auth39-serial">الرقم التسلسلي السنوي</label><input id="auth39-serial" autocomplete="off" placeholder="EDU-XXXXX-XXXXX-XXXXX-XXXXX" dir="ltr" required>',
'<button class="auth39-primary" type="submit">تفعيل المدرسة وفتح لوحة التحكم</button></form><button type="button" id="auth39-logout" class="auth39-secondary">تسجيل الخروج</button></section>',
'<section id="auth39-reset" class="auth39-page" hidden><button class="auth39-back" type="button" data-auth-page="login">‹ الرجوع</button><h1 id="auth39-resetTitle">استعادة كلمة المرور</h1><p class="auth39-intro">أدخل بريدك المؤكد لإرسال رمز استعادة من 6 أرقام.</p><form id="auth39-resetStartForm"><label for="auth39-resetEmail">البريد الإلكتروني</label><input id="auth39-resetEmail" type="email" inputmode="email" autocomplete="email" required><button class="auth39-primary" type="submit">إرسال رمز الاستعادة</button></form><button type="button" class="auth39-secondary" id="auth39-resetCancel">إلغاء</button></section>',
'<section id="auth39-resetVerify" class="auth39-page" hidden><button class="auth39-back" type="button" data-auth-page="login">‹ العودة للدخول</button><h1>تعيين كلمة مرور جديدة</h1><p class="auth39-intro">إذا كان البريد مرتبطًا بحساب مؤكد فستصلك رسالة بالرمز. لا تشاركه.</p><form id="auth39-resetVerifyForm"><label for="auth39-resetCode">رمز الاستعادة</label><input id="auth39-resetCode" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required><label for="auth39-resetPassword">كلمة المرور الجديدة (12 حرفًا فأكثر)</label><input id="auth39-resetPassword" type="password" minlength="12" autocomplete="new-password" required><label for="auth39-resetConfirm">تأكيد كلمة المرور</label><input id="auth39-resetConfirm" type="password" minlength="12" autocomplete="new-password" required><button class="auth39-primary" type="submit">تغيير كلمة المرور</button></form><button type="button" class="auth39-secondary" id="auth39-resetVerifyCancel">إلغاء</button></section>',
'<section id="auth39-emailLink" class="auth39-page" hidden><button class="auth39-back" type="button" id="auth39-emailBack">‹ الرجوع للمنصة</button><h1>توثيق بريد حساب المدير</h1><p class="auth39-intro">للحسابات القديمة فقط: أكّد هويتك بكلمة المرور الحالية، ثم أكّد ملكية البريد برمز يُرسل إليه. لا يتغير الترخيص أو بيانات المدرسة.</p><form id="auth39-emailLinkForm"><label for="auth39-emailToLink">البريد الإلكتروني للمدير</label><input id="auth39-emailToLink" type="email" inputmode="email" autocomplete="email" required><label for="auth39-emailPassword">كلمة المرور الحالية</label><input id="auth39-emailPassword" type="password" autocomplete="current-password" required><button type="submit" class="auth39-primary">إرسال رمز التحقق للبريد</button></form><button type="button" class="auth39-secondary" id="auth39-emailCancel">إلغاء والرجوع للمنصة</button></section>',
'<section id="auth39-emailVerify" class="auth39-page" hidden><button class="auth39-back" type="button" id="auth39-emailVerifyBack">‹ الرجوع</button><h1>تأكيد البريد</h1><p class="auth39-intro">أدخل الرمز المكوّن من ستة أرقام الذي وصلك. بعد التأكيد يمكنك استخدام بريدك لاستعادة كلمة المرور.</p><form id="auth39-emailVerifyForm"><label for="auth39-emailCode">رمز التحقق</label><input id="auth39-emailCode" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" autocomplete="one-time-code" required><button class="auth39-primary" type="submit">توثيق البريد</button></form><button type="button" class="auth39-secondary" id="auth39-emailVerifyCancel">إلغاء والرجوع للمنصة</button></section>',
'<p id="auth39-message" role="status" aria-live="polite" class="auth39-message" hidden></p>',
'</div>'
].join('');
overlay.appendChild(shell);
const el=id=>document.getElementById('auth39-'+id);
let emailLinkId='',challengeId='',resetChallenge='',resendUntil=0,countdown=null,busy=false,changingPassword=false;
function closeAuthenticatedFlow(){
 if(!state?.currentUser){show('login');return}
 overlay.classList.add('hidden');
 el('emailPassword').value='';el('emailCode').value='';
 el('resetEmail').readOnly=false;el('resetEmail').value='';
 el('resetTitle').textContent='استعادة كلمة المرور';
 changingPassword=false;resetChallenge='';
 message('');
}
function message(text='',error=false){
 const p=el('message');p.textContent=text;p.hidden=!text;p.classList.toggle('auth39-error',!!error);
}
function show(page){
 for(const name of ['login','register','verify','activation','reset','resetVerify','emailLink','emailVerify'])el(name).hidden=name!==page;
 message('');
 overlay.classList.remove('hidden');
 overlay.scrollTop=0;
 const first=el(page).querySelector('input:not([type=hidden])');
 if(first&&page!=='login')requestAnimationFrame(()=>{if(!matchMedia('(max-width:767px)').matches)first.focus({preventScroll:true})});
}
function waitSeconds(seconds){
 resendUntil=Date.now()+seconds*1000;clearInterval(countdown);
 const tick=()=>{const n=Math.max(0,Math.ceil((resendUntil-Date.now())/1000));el('resend').disabled=busy||n>0;el('countdown').textContent=n?'يمكن إعادة الإرسال بعد '+n+' ثانية':'';if(!n)clearInterval(countdown)};
 countdown=setInterval(tick,1000);tick();
}
function block(state){busy=state;for(const b of shell.querySelectorAll('button[type=submit]'))b.disabled=state;}
async function safe(task){if(busy)return;block(true);message('جارٍ المعالجة...');try{await task()}catch(e){message(e.message||'تعذر تنفيذ العملية؛ حاول مرة أخرى.',true)}finally{block(false)}}
async function loggedIn(user){
 state.currentUser=user;
 refreshEmailLinkAction();refreshPasswordAction();
 if(user.activationRequired){show('activation');return}
 await cloudReload();
 state.showAllSectionsReadOnly=false;state.activeCategory='all';
 applyLoggedInUserUI();
 overlay.classList.add('hidden');
 el('password').value='';message('');
}
window.handleLoginSubmit=()=>safe(async()=>{
 const username=el('identity').value.trim(),password=el('password').value;
 if(!username||!password)throw Error('أدخل اسم المستخدم أو البريد وكلمة المرور.');
 const data=await cloudRequest('/login',{method:'POST',body:JSON.stringify({username,password})});
 await loggedIn(data.user);
});
window.cloudStart=async()=>{
 try{
  await cloudRequest('/health');
  const me=await cloudRequest('/me').catch(e=>/401|تسجيل|غير مصرح/.test(e.message)?null:Promise.reject(e));
  if(me?.user){await loggedIn(me.user);return}
  state.currentUser=null;state.team=[];state.evidences={};show('login');
 }catch(e){show('login');message('خادم المنصة يستيقظ أو لا يستجيب حاليًا؛ حاول بعد لحظات.',true)}
};
el('loginForm').addEventListener('submit',e=>{e.preventDefault();window.handleLoginSubmit()});
shell.querySelectorAll('[data-auth-page]').forEach(b=>b.addEventListener('click',()=>{
 if(b.dataset.authPage==='login'&&state?.currentUser){closeAuthenticatedFlow();return}
 changingPassword=false;
 if(b.dataset.authPage==='reset'){
  el('resetTitle').textContent='استعادة كلمة المرور';
  el('resetEmail').readOnly=false;el('resetEmail').value='';
 }
 show(b.dataset.authPage);
}));
el('registerForm').addEventListener('submit',e=>{e.preventDefault();safe(async()=>{
 const data=Object.fromEntries(new FormData(e.currentTarget).entries());
 if(data.password!==data.confirmPassword)throw Error('كلمتا المرور غير متطابقتين.');
 const result=await cloudRequest('/register/start',{method:'POST',body:JSON.stringify(data)});
 challengeId=result.challengeId;show('verify');waitSeconds(result.resendAfterSeconds||60);
})});
el('verifyForm').addEventListener('submit',e=>{e.preventDefault();safe(async()=>{
 const code=el('code').value.trim();
 if(!/^\d{6}$/.test(code))throw Error('أدخل رمز التحقق المكوّن من 6 أرقام.');
 await cloudRequest('/register/verify',{method:'POST',body:JSON.stringify({challengeId,code})});
 const id=el('username').value;
 el('identity').value=id;show('login');message('تم تأكيد البريد وإنشاء الحساب. سجل دخولك للانتقال إلى التفعيل.');
})});
el('resend').addEventListener('click',()=>safe(async()=>{
 const result=await cloudRequest('/register/resend',{method:'POST',body:JSON.stringify({challengeId})});
 waitSeconds(result.resendAfterSeconds||60);message('أُرسل رمز جديد إلى بريدك.');
}));
el('activationForm').addEventListener('submit',e=>{e.preventDefault();safe(async()=>{
 const serial=el('serial').value.trim();
 await cloudRequest('/school/activate',{method:'POST',body:JSON.stringify({serial})});
 const me=await cloudRequest('/me');await loggedIn(me.user);
})});

el('resetStartForm').addEventListener('submit',e=>{e.preventDefault();safe(async()=>{
 const email=el('resetEmail').value.trim();
 if(changingPassword && state?.currentUser?.email && email.toLowerCase()!==state.currentUser.email.toLowerCase())throw Error('استخدم البريد المرتبط بحسابك فقط.');
 const result=await cloudRequest('/password/reset/start',{method:'POST',body:JSON.stringify({email})});
 resetChallenge=result.challengeId;
 show('resetVerify');message('إذا كان البريد مؤكدًا، فقد أُرسل إليه رمز الاستعادة.');
})});
el('resetVerifyForm').addEventListener('submit',e=>{e.preventDefault();safe(async()=>{
 const password=el('resetPassword').value,confirm=el('resetConfirm').value;
 if(password!==confirm)throw Error('كلمتا المرور غير متطابقتين.');
 await cloudRequest('/password/reset/verify',{method:'POST',body:JSON.stringify({challengeId:resetChallenge,code:el('resetCode').value.trim(),password})});
 window.SchoolBridge?.clear?.();
 state.currentUser=null;refreshEmailLinkAction();refreshPasswordAction();changingPassword=false;
 el('resetVerifyForm').reset();
 show('login');message('تم تغيير كلمة المرور. سجّل الدخول من جديد.');
})});

const emailButton=document.createElement('button');emailButton.type='button';emailButton.hidden=true;
emailButton.id='auth39-link-email-action';emailButton.className='px-3 py-2 rounded-xl bg-indigo-800/80 text-white text-xs font-bold border border-indigo-500/40';
emailButton.textContent='توثيق بريد المدير';
document.getElementById('headerTools')?.append(emailButton);
function refreshEmailLinkAction(){emailButton.hidden=!(state?.currentUser?.isAdmin&&!state?.currentUser?.emailVerified)}
const passwordButton=document.createElement('button');passwordButton.type='button';passwordButton.hidden=true;
passwordButton.id='auth39-change-password-action';passwordButton.className=emailButton.className;
passwordButton.textContent='تغيير كلمة المرور';
document.getElementById('headerTools')?.append(passwordButton);
function refreshPasswordAction(){passwordButton.hidden=!state?.currentUser}
passwordButton.addEventListener('click',()=>{
 if(!state?.currentUser)return;
 if(!state.currentUser.emailVerified && state.currentUser.isAdmin){
  show('emailLink');message('يلزم توثيق بريد المدير أولًا لتغيير كلمة المرور.');return
 }
 changingPassword=true;
 el('resetTitle').textContent='تغيير كلمة المرور';
 el('resetEmail').value=state.currentUser.email||'';
 el('resetEmail').readOnly=!!state.currentUser.email;
 show('reset');
 message('سيُرسل رمز تحقق إلى بريدك المؤكد. لن تتغير كلمة المرور قبل تأكيد الرمز.');
});
emailButton.addEventListener('click',()=>{if(!state?.currentUser?.isAdmin||state?.currentUser?.emailVerified)return;show('emailLink')});
el('resetCancel').addEventListener('click',()=>state?.currentUser?closeAuthenticatedFlow():show('login'));
el('resetVerifyCancel').addEventListener('click',()=>state?.currentUser?closeAuthenticatedFlow():show('login'));
el('emailBack').addEventListener('click',closeAuthenticatedFlow);
el('emailCancel').addEventListener('click',closeAuthenticatedFlow);
el('emailVerifyCancel').addEventListener('click',closeAuthenticatedFlow);
el('emailVerifyBack').addEventListener('click',()=>show('emailLink'));
el('emailLinkForm').addEventListener('submit',e=>{e.preventDefault();safe(async()=>{
 if(!state?.currentUser?.isAdmin)throw Error('لا تملك صلاحية مدير المدرسة.');
 const result=await cloudRequest('/profile/email/start',{method:'POST',body:JSON.stringify({email:el('emailToLink').value.trim(),password:el('emailPassword').value})});
 emailLinkId=result.challengeId;el('emailPassword').value='';show('emailVerify');message('أُرسل رمز التحقق؛ صالح لمدة 10 دقائق.');
})});
el('emailVerifyForm').addEventListener('submit',e=>{e.preventDefault();safe(async()=>{
 await cloudRequest('/profile/email/verify',{method:'POST',body:JSON.stringify({challengeId:emailLinkId,code:el('emailCode').value.trim()})});
 state.currentUser.emailVerified=true;state.currentUser.email=el('emailToLink').value.trim();
 refreshEmailLinkAction();refreshPasswordAction();closeAuthenticatedFlow();
})});

window.addEventListener('keydown',event=>{
 if(event.key!=='Escape'||overlay.classList.contains('hidden')||!state?.currentUser)return;
 const securityPage=['emailLink','emailVerify','reset','resetVerify'].find(name=>!el(name).hidden);
 if(securityPage){event.preventDefault();closeAuthenticatedFlow()}
});
el('logout').addEventListener('click',()=>logoutSession());
})();
