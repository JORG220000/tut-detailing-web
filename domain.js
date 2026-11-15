export const services = [
  ['wash','Детейлинг-мойка','Бережная очистка кузова, дисков и труднодоступных деталей.',90,'wash'],
  ['complex','Комплексная мойка','Уход за кузовом и уборка салона за один визит.',60,'exterior'],
  ['cabin','Химчистка салона','Глубокая очистка обивки, ковров и потолка.',240,'cabin'],
  ['polish','Полировка кузова','Коррекция мелких рисок и восстановление глубины блеска.',300,'polish'],
  ['coat','Защитные покрытия','Подготовка поверхности и нанесение защитного состава.',360,'coating'],
  ['interior','Уход за интерьером','Деликатная работа с кожей, пластиком и декоративными вставками.',120,'leather']
].map(([id,name,description,duration,image])=>({id,name,description,duration,image,active:true}));
const minutes = t => Number(t.slice(0,2))*60+Number(t.slice(3));
export const clock = m => String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
export const local = (t=Date.now()) => new Date(t+5*3600000).toISOString().slice(0,16);
export const today = () => local().slice(0,10);
export const tomorrow = () => local(Date.now()+86400000).slice(0,10);
function reject(message, status=400){throw Object.assign(new Error(message),{status})}
const validTime=t=>typeof t==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const validDay=d=>typeof d==='string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d)) && new Date(d).toISOString().startsWith(d) && d>=today() && d<=local(Date.now()+90*86400000).slice(0,10);
const bounded=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const overlaps=(a,b,c,d)=>a<d&&c<b;
export function seed(){
  return {services:structuredClone(services),hours:{open:'09:00',close:'19:00'},settings:{lead:60,reminder:90,enabled:true},blocks:[],log:[],jobs:{},bookings:[{id:'TUT-DEMO01',secret:crypto.randomUUID(),service:'complex',name:'Демо-клиент А',phone:'00000000000',date:tomorrow(),time:'10:00',duration:60,status:'confirmed',created:Date.now()}]};
}
export function slots(s,id,date,ignore){
  const svc=s.services.find(x=>x.id===id&&x.active);
  if(!svc||!validDay(date))return [];
  const busy=[...s.blocks,...s.bookings.filter(b=>b.status!=='cancelled' && b.id!==ignore)].filter(b=>b.date===date);
  const out=[];
  for(let t=minutes(s.hours.open);t+svc.duration<=minutes(s.hours.close);t+=30){
    if(date+'T'+clock(t)<=local() || busy.some(b=>overlaps(t,t+svc.duration,minutes(b.time),minutes(b.time)+b.duration)))continue;
    out.push(clock(t));
  }
  return out;
}
export function publicBooking(b){const {secret,...rest}=b; return rest}
function event(s,text){if(s.settings.enabled)s.log=[{at:local(),text},...s.log].slice(0,100)}
export function change(s,a,p,admin=false){
  if(a==='book'){
    if(typeof p.name!=='string'||p.name.trim().length<2||p.name.length>70||typeof p.phone!=='string'||!/^\+?[\d ()-]{9,22}$/.test(p.phone)||p.phone.replace(/\D/g,'').length<9)reject('Проверьте имя и тестовый номер телефона.');
    if(!slots(s,p.service,p.date).includes(p.time))reject('Это время уже недоступно. Выберите другое окно.',409);
    const b={id:'TUT-'+crypto.randomUUID().slice(0,8).toUpperCase(),secret:crypto.randomUUID(),service:p.service,name:p.name.trim(),phone:p.phone,date:p.date,time:p.time,duration:s.services.find(x=>x.id===p.service).duration,status:'pending',created:Date.now()};
    s.bookings.push(b);event(s,'Новая демозапись '+b.id+' · '+b.date+' '+b.time);return b;
  }
  if(['lookup','cancel','move','confirm'].includes(a)){
    const b=s.bookings.find(x=>x.id===p.id);
    if(!b||(!admin&&b.secret!==p.secret))reject('Запись не найдена или неверный ключ.',404);
    if(a==='lookup')return publicBooking(b);
    if(b.status==='cancelled'||b.date+'T'+b.time<=local())reject('Изменение этой записи недоступно.');
    if(a==='cancel')b.status='cancelled';
    if(a==='confirm'){if(!admin)reject('Нужен вход.',403);b.status='confirmed'}
    if(a==='move'){
      const snapshot={...s,services:s.services.map(x=>x.id===b.service?{...x,duration:b.duration}:x)};
      if(!slots(snapshot,b.service,p.date,b.id).includes(p.time))reject('Выбранное время занято.',409);
      b.date=p.date;b.time=p.time;
    }
    event(s,'Изменение демозаписи '+b.id+' · '+a);return publicBooking(b);
  }
  if(!admin)reject('Требуется вход администратора.',403);
  if(a==='hours'){
    if(!validTime(p.open)||!validTime(p.close)||minutes(p.close)-minutes(p.open)<30)reject('Проверьте рабочие часы.');
    if(s.bookings.some(b=>b.status!=='cancelled'&&b.date+'T'+b.time>local()&&(b.time<p.open||minutes(b.time)+b.duration>minutes(p.close))))reject('Новые часы пересекаются с существующей записью.');
    s.hours={open:p.open,close:p.close};
  }else if(a==='service'){
    const svc=s.services.find(x=>x.id===p.id);if(!svc||!bounded(p.duration,30,600)||typeof p.active!=='boolean')reject('Проверьте длительность услуги.');
    Object.assign(svc,{duration:p.duration,active:p.active});
  }else if(a==='block'){
    if(!validDay(p.date)||!validTime(p.time)||!bounded(p.duration,30,600)||p.date+'T'+p.time<=local()||p.time<s.hours.open||minutes(p.time)+p.duration>minutes(s.hours.close))reject('Проверьте интервал.');
    if([...s.blocks,...s.bookings.filter(b=>b.status!=='cancelled')].some(b=>b.date===p.date&&overlaps(minutes(p.time),minutes(p.time)+p.duration,minutes(b.time),minutes(b.time)+b.duration)))reject('Интервал занят.',409);
    s.blocks.push({id:crypto.randomUUID(),date:p.date,time:p.time,duration:p.duration});
  }else if(a==='unblock'){s.blocks=s.blocks.filter(b=>b.id!==p.id)}
  else if(a==='settings'){
    if(!bounded(p.lead,0,480)||!bounded(p.reminder,0,1440)||typeof p.enabled!=='boolean')reject('Проверьте настройки.');
    s.settings={lead:p.lead,reminder:p.reminder,enabled:p.enabled};
  }else reject('Неизвестная команда.');
  return {ok:true};
}
export function report(s,date=today()){
  const bookings=s.bookings.filter(b=>b.date===date&&b.status!=='cancelled').sort((a,b)=>a.time.localeCompare(b.time));
  const prior=new Date(Date.parse(date+'T00:00:00Z')-86400000).toISOString().slice(0,10);
  const night=s.bookings.filter(b=>local(b.created)>=prior+'T'+s.hours.close && local(b.created)<date+'T'+s.hours.open).length;
  const shortest=s.services.filter(x=>x.active).sort((a,b)=>a.duration-b.duration)[0];
  const starts=slots(s,shortest?.id,date);
  const windows=starts.filter((v,i)=>i===0||minutes(v)-minutes(starts[i-1])>30).length;
  return ['Доброе утро!','Записей на '+date+': '+bookings.length,...bookings.map(b=>b.time+' — '+s.services.find(x=>x.id===b.service).name),'Новых ночных записей: '+night,'Свободных окон: '+windows].join('\n');
}
export function tick(s,now=Date.now()){
  if(!s.settings.enabled)return;
  const stamp=local(now), date=stamp.slice(0,10), time=minutes(stamp.slice(11));
  const reportDate=local(now+s.settings.lead*60000).slice(0,10);
  if(local(now+s.settings.lead*60000)>=reportDate+'T'+s.hours.open && stamp<reportDate+'T'+s.hours.close && !s.jobs[reportDate]){
    event(s,report(s,reportDate));s.jobs[reportDate]=true;
  }
  for(const b of s.bookings){
    const distance=(Date.parse(b.date+'T'+b.time+':00+05:00')-now)/60000;
    const key=[b.id,b.date,b.time].join('/');
    if(b.status!=='cancelled'&&distance>0&&distance<=s.settings.reminder&&!s.jobs[key]){event(s,'Напоминание · '+b.id+' · '+b.time);s.jobs[key]=true}
  }
}
