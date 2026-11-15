const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
import {api} from './browser-api.js';
const dialog=$('#dialog'),box=$('#modal-content');
function show(html,wide=false){dialog.classList.toggle('lightbox',wide);box.innerHTML=html;if(!dialog.open)dialog.showModal();dialog.scrollTop=0}
$('#close').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
const menu=$('.menu');menu.onclick=()=>{const open=$('#links').classList.toggle('open');menu.setAttribute('aria-expanded',open);menu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню')};$('#links').onclick=()=>{if($('#links').classList.contains('open'))menu.click()};
const gallery=[['hero','Кузов','Porsche 911 GT3 у бокса'],['cabin','Интерьер','Приборная панель Porsche'],['wash','Процесс','Очистка кузова пеной'],['exterior','Кузов','Фара Porsche 930'],['leather','Интерьер','Фактура кожаного сиденья'],['polish','Процесс','Обработка кузова в студии']];
let subset=gallery;
function light(i){const [f,,title]=subset[i];show('<img src="./media/'+f+'.webp" alt="'+title+'"><div class="row"><button class="outline" id="previous" aria-label="Предыдущее фото">←</button><span>'+title+' · '+(i+1)+' / '+subset.length+'</span><button class="outline" id="following" aria-label="Следующее фото">→</button></div>',true);$('#previous').onclick=()=>light((i+subset.length-1)%subset.length);$('#following').onclick=()=>light((i+1)%subset.length)}
dialog.addEventListener('keydown',e=>{if(dialog.classList.contains('lightbox')){if(e.key==='ArrowLeft')$('#previous').click();if(e.key==='ArrowRight')$('#following').click()}});
if($('#filters')){
 function filter(key){subset=gallery.filter(x=>key==='Все'||x[1]===key);$('#filters').innerHTML=['Все','Кузов','Интерьер','Процесс'].map(k=>'<button aria-pressed="'+(k===key)+'">'+k+'</button>').join('');$('#gallery-grid').innerHTML=subset.map(([f,,d],i)=>'<button data-photo="'+i+'" class="gallery-tile" aria-label="Увеличить: '+d+'"><img loading="lazy" src="./media/'+f+'.webp" alt="'+d+'"><span aria-hidden="true">↗</span></button>').join('')}
 filter('Все');$('#filters').onclick=e=>{if(e.target.tagName==='BUTTON')filter(e.target.textContent)};$('#gallery-grid').onclick=e=>{const b=e.target.closest('[data-photo]');if(b)light(+b.dataset.photo)};
 let i=0;const files=[['night','Чёрный Porsche в ночном боксе'],['hero','Porsche 911 GT3 в профиль'],['exterior','Передняя часть Porsche 930']];
 function frame(n){i=(n+3)%3;$('#hero-photo').src='./media/'+files[i][0]+'.webp';$('#hero-photo').alt=files[i][1];$('#frame').textContent='0'+(i+1);$('.frames').style.setProperty('--progress',((i+1)/3*100)+'%')}
 $('#next').onclick=()=>frame(i+1);$('#prev').onclick=()=>frame(i-1);
 if(matchMedia('(min-width: 701px) and (prefers-reduced-motion: no-preference)').matches){let pending=false;addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(()=>{$('#hero-photo').style.transform='translateY('+Math.min(scrollY*.06,28)+'px) scale(1.055)';pending=false})}},{passive:true})}
}
if(document.querySelector('.service-card')){
 api('catalog').then(c=>{
  for(const card of document.querySelectorAll('.service-card')){
   const service=c.services.find(s=>s.id===card.querySelector('[data-book]').dataset.book);
   if(!service){card.hidden=true;continue}
   card.querySelector('small').textContent='≈ '+service.duration+' мин';
  }
 }).catch(()=>{ /* The server-rendered catalog remains readable while offline. */ });
}
const notice='<p class="hint">Данные сохраняются только в этом браузере · Тюмень (UTC+5). Используйте вымышленные данные. Студия не получит заявку.</p>';
const errors='<div class="error" role="alert"></div>';
const status={pending:'Ожидает подтверждения',confirmed:'Подтверждена',cancelled:'Отменена'};
let token=0;dialog.addEventListener('close',()=>token++);
async function schedule(service='',ref=null){
 const generation=++token;show('<h2>Загружаем расписание…</h2>');
 try{const c=await api('catalog');if(generation!==token)return;
 if(!c.services.length||(service&&!c.services.some(s=>s.id===service))){show('<h2>Запись недоступна</h2><p>Услуга временно закрыта в деморасписании.</p>');return}
 show('<h2>'+(ref?'Перенос демозаписи':'Онлайн-запись')+'</h2>'+notice+'<form class="fields" id="choose"><label>Услуга<select name="service" '+(ref?'disabled':'')+'>'+c.services.map(s=>'<option value="'+s.id+'" '+(service===s.id?'selected':'')+'>'+s.name+' · '+s.duration+' мин</option>').join('')+'</select></label><label>Дата визита<input type="date" name="date" min="'+c.today+'" value="'+c.tomorrow+'" required></label><div><strong>Свободное время</strong><div class="slots" aria-live="polite"></div></div>'+errors+'<button class="primary" disabled>'+(ref?'Подтвердить перенос':'Продолжить →')+'</button></form>');
 const f=$('#choose'),day=f.elements.date,svc=f.elements.service,slotBox=$('.slots',f),submit=$('.primary',f);
 day.max=new Date(Date.parse(c.today)+90*86400000).toISOString().slice(0,10);
 let time='',serial=0;
 async function refresh(){const seq=++serial;time='';submit.disabled=true;slotBox.textContent='Загрузка…';$('.error',f).textContent='';
 try{const times=ref?await api('moveSlots',{...ref,date:day.value}):await api('slots?service='+encodeURIComponent(svc.value)+'&date='+encodeURIComponent(day.value));
 if(seq!==serial)return;slotBox.innerHTML=times.length?times.map(t=>'<button type="button" aria-pressed="false">'+t+'</button>').join(''):'На эту дату свободных окон нет. Выберите другую дату.';
 }catch(e){if(seq===serial)slotBox.textContent=e.message}}
 f.onchange=refresh;slotBox.onclick=e=>{if(e.target.tagName!=='BUTTON')return;time=e.target.textContent;slotBox.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b===e.target));submit.disabled=false};
 f.onsubmit=async e=>{e.preventDefault();if(!time)return;const p={service:svc.value,date:day.value,time};if(ref){submit.disabled=true;try{await api('move',{...ref,...p});await manage(ref)}catch(err){await refresh();$('.error',f).textContent=err.message}}else contacts(p,c.services.find(x=>x.id===svc.value))};refresh()
 }catch(err){if(generation===token)show('<h2>Расписание недоступно</h2><p>'+esc(err.message)+'</p><button class="outline" data-book>Повторить</button>')}
}
function contacts(p,s){
 show('<h2>Подтвердите демозапись</h2>'+notice+'<p class="result">'+esc(s.name)+' · '+p.date+' · '+p.time+'<br>≈ '+s.duration+' мин · стоимость уточняется</p><form class="fields" id="client"><label>Тестовое имя<input name="name" required minlength="2" maxlength="70" placeholder="Например, Демо Алексей" autocomplete="off"></label><label>Тестовый телефон<input type="tel" name="phone" required minlength="9" maxlength="22" inputmode="tel" placeholder="00000000000" autocomplete="off"></label>'+errors+'<button class="primary">Подтвердить демозапись</button><button type="button" class="outline" data-book="'+p.service+'">Изменить время</button></form>');
 const f=$('#client');f.onsubmit=async e=>{e.preventDefault();const btn=$('.primary',f);btn.disabled=true;try{const b=await api('book',{...p,...Object.fromEntries(new FormData(f))});const ref={id:b.id,secret:b.secret};try{localStorage.setItem('tut-pages-last',JSON.stringify(ref))}catch{};bookingView(b,ref,true)}catch(err){$('.error',f).textContent=err.message;btn.disabled=false}};
}
function bookingView(b,ref,newly=false){
 show('<h2>'+(newly?'Демозапись создана':'Моя демозапись')+'</h2><p>Только в тестовом расписании. '+esc(status[b.status])+'</p><div class="result"><strong>'+esc(b.id)+'</strong><p>'+esc(b.date)+' · '+esc(b.time)+' · '+b.duration+' мин</p><small>Личный ключ для управления<br>'+esc(ref.secret)+'</small></div>'+errors+'<div class="row">'+(b.status!=='cancelled'?'<button class="outline" id="move">Перенести</button><button class="outline" id="cancel">Отменить запись</button>':'')+'<button class="text-btn" id="another">Найти другую запись</button></div>');
 const move=$('#move');if(move){move.onclick=()=>schedule(b.service,ref);$('#cancel').onclick=()=>{show('<h2>Отменить демозапись?</h2><p>'+esc(b.id)+' · '+esc(b.date)+' · '+esc(b.time)+'</p>'+errors+'<div class="row"><button class="primary" id="yes">Да, отменить</button><button class="outline" id="no">Сохранить запись</button></div>');$('#no').onclick=()=>bookingView(b,ref);$('#yes').onclick=async()=>{try{bookingView(await api('cancel',ref),ref)}catch(e){$('.error',box).textContent=e.message}}}}$('#another').onclick=()=>manage(null)
}
async function manage(ref){if(ref){try{bookingView(await api('lookup',ref),ref);return}catch{}}
 show('<h2>Найти демозапись</h2><p>Введите номер и личный ключ из подтверждения.</p><form class="fields" id="find"><label>Номер<input name="id" required></label><label>Личный ключ<input name="secret" required></label>'+errors+'<button class="primary">Проверить запись</button></form>');$('#find').onsubmit=async e=>{e.preventDefault();const r=Object.fromEntries(new FormData(e.target));try{bookingView(await api('lookup',r),r)}catch(err){$('.error',box).textContent=err.message}}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-book]');if(b)schedule(b.dataset.book)});
if($('#manage'))$('#manage').onclick=()=>{let ref;try{ref=JSON.parse(localStorage.getItem('tut-pages-last'))}catch{}manage(ref)};
if($('#admin-app')||$('#bot-app'))import('./tools.js').then(m=>m.start(api,esc));

