import {seed,change,slots,tick,report,publicBooking,today,tomorrow} from './domain.js';
import {dispatch} from './bot.js';

// Each visitor owns one standalone demo. IndexedDB serializes read/write transactions across tabs.
const database = new Promise((resolve,reject)=>{
  const request=indexedDB.open('tut-detailing-pages-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('demo');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(new Error('Разрешите локальное хранилище сайта в браузере.'));
});
const sessionKey='tut-pages-demo-admin';
function route(state,url,p){
  const command=url.pathname.split('/').pop();
  const admin=sessionStorage.getItem(sessionKey)==='open';
  tick(state);
  switch(command){
    case 'catalog': return {services:state.services.filter(s=>s.active),hours:state.hours,today:today(),tomorrow:tomorrow()};
    case 'slots': return slots(state,url.searchParams.get('service'),url.searchParams.get('date'));
    case 'login':
      if(p.password!=='ДЕМО')throw Error('Введите демонстрационный код ДЕМО.');
      sessionStorage.setItem(sessionKey,'open');return {ok:true};
    case 'logout': sessionStorage.removeItem(sessionKey);return {ok:true};
    case 'admin':
      if(!admin)throw Error('Требуется вход.');
      return {services:state.services,hours:state.hours,settings:state.settings,blocks:state.blocks,log:state.log,bookings:state.bookings.map(publicBooking),report:report(state)};
    case 'bot': return {text:dispatch(state,p.command,admin)};
    case 'moveSlots':{
      const b=change(state,'lookup',p,admin);
      const snapshot={...state,services:state.services.map(s=>s.id===b.service?{...s,duration:b.duration}:s)};
      return slots(snapshot,b.service,p.date,b.id);
    }
    default:return change(state,command,p,admin);
  }
}
export async function api(action,p={}){
  const db=await database,url=new URL(action,'https://demo.invalid/api/');
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('demo','readwrite'),store=tx.objectStore('demo');
    const request=store.get('schedule');let result,failure;
    request.onsuccess=()=>{
      try{const state=request.result??seed();result=route(state,url,p);store.put(state,'schedule')}
      catch(e){failure=e;tx.abort()}
    };
    tx.oncomplete=()=>resolve(result);
    tx.onabort=()=>reject(failure||new Error('Не удалось сохранить демозапись в этом браузере.'));
  });
}
