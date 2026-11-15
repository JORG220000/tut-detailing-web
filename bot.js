import {slots, change, report, today} from './domain.js';

// Transport-independent dispatcher. The demo transport returns text to the tester only.
export function dispatch(state, input, admin){
  const [command,...args]=String(input).trim().split(/\s+/);
  const [id,date,time,name,phone]=args;
  switch(command){
    case '/start': return '/services · /slots услуга дата · /book услуга дата время имя телефон · /check номер ключ · /cancel номер ключ · /move номер ключ дата время'+(admin?'\n/report [дата] · /confirm номер · /block дата время минуты · /hours начало конец':'');
    case '/services': return state.services.filter(s=>s.active).map(s=>s.id+' — '+s.name+' · '+s.duration+' мин · стоимость уточняется').join('\n');
    case '/slots': return slots(state,id,date).join(' · ')||'Свободных окон нет.';
    case '/book': {const b=change(state,'book',{service:id,date,time,name,phone});return 'Тестовая запись '+b.id+' · личный ключ '+b.secret}
    case '/check': case '/cancel': case '/move': case '/confirm': {
      const b=change(state,command==='/check'?'lookup':command.slice(1),{id,secret:args[1],date:args[2],time:args[3]},admin);
      return [b.id,b.date,b.time,{pending:'Ожидает',confirmed:'Подтверждена',cancelled:'Отменена'}[b.status]].join(' · ');
    }
    case '/report': if(admin)return report(state,id||today());break;
    case '/block': change(state,'block',{date:id,time:date,duration:Number(time)},admin);return 'Интервал закрыт.';
    case '/hours': change(state,'hours',{open:id,close:date},admin);return 'Часы обновлены.';
    default:return 'Введите /start для списка команд.';
  }
  throw Object.assign(new Error('Требуется вход администратора.'),{status:403});
}
