var Detacher = require('detacher');

module.exports = function bind(target){
  var detachers = new Map(),
      link = {active: true},
      d1,d2,d3,event;

  d1 = this.target.on(this.target.eventListened,onEL,detachers,target,this,link);
  d2 = this.target.on(this.target.eventIgnored,onEI,detachers);
  d3 = target.on(target.unsetCall,onEU,this);

  for(event of this.target.events()) onEL(event,null,detachers,target,this,link);

  return new Detacher(detach,[d1,d2,d3,detachers,link]);
};

function onEL(event,d,detachers,target,emitter,link){
  detachers.set(event,
    target.on(event,listener,event,emitter,link)
  );
}

function onEI(event,d,detachers){
  detachers.get(event).detach();
  detachers.delete(event);
}

function onEU([state],d,em){
  em.unset(state);
}

function* listener(ev,d,en,em,link){
  var state;

  if(this.is(en)){
    state = yield this.until(en);
    if(state === ev) em.set(en,ev);
    else em.give(en,ev);
  }else em.give(en,ev);
}

function detach(d1,d2,d3,detachers,link){
  var d;

  d1.detach();
  d2.detach();
  d3.detach();

  for(d of detachers.values()) d.detach();
  detachers.clear();
  link.active = false;
}
