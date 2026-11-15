export async function start(api,esc){
 const root=document.querySelector('#admin-app')||document.querySelector('#bot-app'),$=sel=>root.querySelector(sel),vals=f=>Object.fromEntries(new FormData(f));
 const field=(name,title,value,type='text',extra='')=>'<label>'+title+'<input required type="'+type+'" name="'+name+'" value="'+esc(value)+'" '+extra+'></label>';
 const error='<div class="error" role="alert"></div>',button=t=>'<button class="primary">'+t+'</button>';
 if(root.id==='bot-app'){
  root.innerHTML='<section><div class="log" aria-live="polite"><p>Тестовый бот готов.</p></div><div class="chips"><button>/start</button><button>/services</button></div><form class="formrow">'+field('command','Команда','/start')+button('Отправить в симулятор')+'</form>'+error+'</section>';
  const run=async cmd=>{try{const r=await api('bot',{command:cmd});$('.log').insertAdjacentHTML('beforeend','<div class="record"><strong>'+esc(cmd)+'</strong><pre>'+esc(r.text)+'</pre></div>');$('.log').scrollTop=$('.log').scrollHeight;$('.error').textContent=''}catch(e){$('.error').textContent=e.message}};
  $('form').onsubmit=e=>{e.preventDefault();run(vals(e.target).command)};$('.chips').onclick=e=>{if(e.target.tagName==='BUTTON')run(e.target.textContent)};return;
 }
 const titles=['Календарь','Клиенты','Услуги','Расписание','Статистика','Telegram'];
 let tab=0,day='',s,initial=await api('catalog');day=initial.tomorrow;
 function login(message=''){root.innerHTML='<p>Ваш личный демостенд в этом браузере. Код для просмотра панели — ДЕМО.</p><form class="fields">'+field('password','Пароль демопанели','','password','autocomplete="current-password"')+error+button('Войти')+'</form>';$('.error').textContent=message;$('form').onsubmit=async e=>{e.preventDefault();try{await api('login',vals(e.target));await reload()}catch(err){$('.error').textContent=err.message}}}
 async function reload(){try{s=await api('admin');render()}catch(e){login(e.message==='Требуется вход.'?'':e.message)}}
 const form=(action,fields,label)=>'<form data-action="'+action+'" class="formrow">'+fields+button(label)+'</form>';
 const statuses={cancelled:'Отменена',pending:'Ожидает',confirmed:'Подтверждена'};
 const svc=id=>s.services.find(x=>x.id===id)?.name||id;
 function render(){
  let panel='';const records=s.bookings.filter(b=>b.date===day).sort((a,b)=>a.time.localeCompare(b.time));
  if(tab===0)panel='<label class="field">Дата<input type="date" id="day" value="'+esc(day)+'"></label>'+ (records.map(b=>'<div class="record"><h3>'+b.time+' · '+esc(svc(b.service))+'</h3><p>'+esc(b.name)+' · '+esc(b.id)+' · '+statuses[b.status]+'</p><div class="row">'+(b.status==='pending'?'<button class="outline" data-op="confirm" data-id="'+esc(b.id)+'">Подтвердить</button>':'')+(b.status!=='cancelled'?'<button class="outline" data-op="cancel" data-id="'+esc(b.id)+'">Отменить</button>':'')+'</div></div>').join('')||'<p>В этот день записей нет.</p>');
  if(tab===1){const clients=new Map();for(const b of s.bookings){const key=b.name+' '+b.phone;clients.set(key,(clients.get(key)||0)+1)}panel=[...clients].map(([k,n])=>'<div class="record"><strong>'+esc(k)+'</strong><p>Записей: '+n+'</p></div>').join('')}
  if(tab===2)panel=s.services.map(x=>'<div class="record"><h3>'+esc(x.name)+'</h3>'+form('service','<input type="hidden" name="id" value="'+x.id+'">'+field('duration','Длительность, мин',x.duration,'number','min="30" max="600"')+'<label>Доступность<select name="active"><option value="true">Доступна</option><option value="false" '+(!x.active?'selected':'')+'>Скрыта</option></select></label>','Сохранить')+'</div>').join('');
  if(tab===3)panel='<h3>Рабочие часы · Тюмень</h3>'+form('hours',field('open','Начало',s.hours.open,'time')+field('close','Окончание',s.hours.close,'time'),'Сохранить часы')+'<h3>Закрыть интервал</h3>'+form('block',field('date','Дата',day,'date')+field('time','Начало','13:00','time')+field('duration','Длительность, мин',60,'number','min="30" max="600"'),'Заблокировать')+s.blocks.map(b=>'<div class="record">'+esc(b.date)+' · '+b.time+' · '+b.duration+' мин <button class="text-btn" data-op="unblock" data-id="'+b.id+'">Открыть интервал</button></div>').join('');
  if(tab===4)panel='<h3>За весь демонстрационный период</h3>'+Object.entries(statuses).map(([k,v])=>'<p>'+v+' · <strong>'+s.bookings.filter(b=>b.status===k).length+'</strong></p>').join('')+'<h3>По услугам</h3>'+s.services.map(x=>'<p>'+esc(x.name)+' · '+s.bookings.filter(b=>b.service===x.id&&b.status!=='cancelled').length+'</p>').join('');
  if(tab===5)panel='<h3>Тестовые уведомления</h3><p>Сообщения сохраняются в журнале демобота.</p>'+form('settings',field('lead','Отчёт за минут до открытия',s.settings.lead,'number','min="0" max="480"')+field('reminder','Напоминание за минут',s.settings.reminder,'number','min="0" max="1440"')+'<label>Журнал<select name="enabled"><option value="true">Включён</option><option value="false" '+(!s.settings.enabled?'selected':'')+'>Выключен</option></select></label>','Сохранить')+'<h3>Предпросмотр отчёта</h3><pre>'+esc(s.report)+'</pre><h3>Журнал</h3>'+ (s.log.map(x=>'<div class="record"><small>'+esc(x.at)+'</small><pre>'+esc(x.text)+'</pre></div>').join('')||'<p>Сообщений пока нет.</p>')+'<a class="text-btn" href="./bot.html">Открыть симулятор →</a>';
  root.innerHTML='<div class="tool-head"><p>Тестовые данные · один пост</p><button class="outline" id="out">Выйти</button></div><div class="tabs">'+titles.map((x,i)=>'<button aria-pressed="'+(tab===i)+'" data-tab="'+i+'">'+x+'</button>').join('')+'</div>'+error+'<section>'+panel+'</section>';
  $('#out').onclick=async()=>{try{await api('logout',{});login()}catch(e){$('.error').textContent=e.message}};
  $('.tabs').onclick=e=>{if(e.target.hasAttribute('data-tab')){tab=+e.target.dataset.tab;render()}};
  if($('#day'))$('#day').onchange=e=>{day=e.target.value;render()};
  root.querySelectorAll('[data-action]').forEach(f=>f.onsubmit=async e=>{e.preventDefault();const p=vals(f);for(const k of ['duration','lead','reminder'])if(k in p)p[k]=Number(p[k]);for(const k of ['enabled','active'])if(k in p)p[k]=p[k]==='true';await mutate(f.dataset.action,p)});
  root.querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>{if(b.dataset.op!=='cancel'||confirm('Отменить эту демозапись?'))mutate(b.dataset.op,{id:b.dataset.id})});
 }
 async function mutate(action,p){try{await api(action,p);await reload()}catch(e){$('.error').textContent=e.message}}
 await reload();
}
