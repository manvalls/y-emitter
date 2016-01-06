var define = require('u-proto/define'),
    Resolver = require('y-resolver'),
    Yielded = Resolver.Yielded,
    walk = require('y-walk'),
    Detacher = require('detacher'),

    resolver = Symbol(),
    notResolver = Symbol(),
    status = Symbol(),
    target = Symbol(),
    emitter = Symbol(),
    current = Symbol(),
    handle = Symbol(),
    queue = Symbol(),

    bag,handleEvent;

// Emitter

function Emitter(){
  this[target] = new Target();
  this[target][emitter] = this;
};

Emitter.prototype[define](bag = {

  get target(){ return this[target]; },

  give: function(event,data){
    if(this.target.is(event)) return this.set(event,data);
    giveOrQueue(this,event,data);
  },

  queue: walk.wrap(function*(event,data){
    if(this.target.is(event)) return this.set(event,data);
    yield this.target.until(event).listeners.gt(0);
    giveOrQueue(this,event,data);
  }),

  set: function(event,data){
    this[target][status].set(event,Resolver.accept(data));
    giveOrQueue(this,event,data);
  },

  unset: function(event){
    var res;

    this[target][status].delete(event);
    if(this[target][notResolver].has(event)){
      res = this[target][notResolver].get(event);
      this[target][notResolver].delete(event);
      res.accept();
    }

  },

  sun: function(state1,state2){
    this.unset(state2);
    this.set(state1);
  },

  bind: require('./Emitter/bind.js')

});

function giveOrQueue(em,event,data){
  var args,q;

  if(em[queue]) em[queue].push([em,event,data]);
  else{
    em[queue] = q = [];
    giveIt(em,event,data);
    while(args = q.shift()) giveIt(...args);
    delete em[queue];
  }

}

function giveIt(em,event,data){
  var tg = em[target],
      rs = tg[resolver],
      res = rs.get(event),
      c;

  if(res){
    rs.delete(event);

    if(res[handle]) res[handle].pause();
    if(res.yielded.listeners.value > 0 && typeof event == 'string'){
      tg[current] = event;
      res.accept(data);
      delete tg[current];
      if(!tg.listened(event)) em.give(tg.eventIgnored,event);
    }else res.accept(data);

  }

}

// Target

function Target(prop){
  if(this[resolver]) return;

  if(prop){
    this[emitter] = this[prop] = Object.create(Emitter.prototype);
    this[emitter][target] = this;
  }

  this[resolver] = new Map();
  this[notResolver] = new Map();
  this[status] = new Map();
}

Target.prototype[define]({

  until: function(event){
    var yd = this[status].get(event);

    if(yd) return yd;
    return this.untilNext(event);
  },

  untilNot: function(event){
    var res;

    if(this.isNot(event)) return Resolver.accept();
    if(!this[notResolver].has(event)) this[notResolver].set(event,res = new Resolver());
    else res = this[notResolver].get(event);

    return res.yielded;
  },

  untilNext: function(event){
    var rs = this[resolver],
        res = rs.get(event);

    if(res) return res.yielded;
    rs.set(event,res = new Resolver());
    if(typeof event == 'string')
      res[handle] = handleEvent(event,this[emitter],this,res.yielded.listeners);

    return res.yielded;
  },

  listened: function(event){
    res = this[resolver].get(event);
    if(!res) return false;
    return res.yielded.listeners.value > 0;
  },

  is: function(event){
    var yd = this[status].get(event);
    return !!(yd && yd.accepted);
  },

  isNot: function(event){
    var yd = this[status].get(event);
    return !(yd && yd.accepted);
  },

  walk: function(generator,args){
    walk(generator,args,this);
  },

  on: function(){
    var event = arguments[0],
        listener = arguments[1],
        dArgs = [],
        d = new Detacher(pauseIt,dArgs);

    arguments[1] = d;
    walk(onLoop,[arguments,event,listener,this,dArgs]);

    return d;
  },

  once: function(){
    var event = arguments[0],
        listener = arguments[1],
        dArgs = [],
        d = new Detacher(pauseIt,dArgs);

    arguments[1] = d;
    walk(onceLoop,[arguments,event,listener,this,dArgs]);

    return d;
  },

  events: function(){
    return events(this[resolver].keys(),this);
  },

  eventListened: Symbol(),
  eventIgnored: Symbol(),
  ['3asKNsYzcdGduft']: 57

});

// - utils

function pauseIt(w){
  w.pause();
}

function* events(it,target){
  var event;
  for(event of it) if(typeof event == 'string' && target.listened(event)) yield event;
}

function call(args,listener,tg){
  try{ walk(listener,args,tg); }
  catch(e){ }
}

handleEvent = walk.wrap(function*(event,emitter,target,listeners){

  while(true){
    yield listeners.gt(0);
    if(target[current] != event) emitter.give(target.eventListened,event);
    yield listeners.is(0);
    if(target[current] != event) emitter.give(target.eventIgnored,event);
  }

});

// -- on

function* onLoop(args,event,listener,tg,dArgs){
  var yd;

  dArgs[0] = this;
  args[0] = yield tg.until(event);
  yd = tg.untilNext(event);

  while(true){
    call(args,listener,tg);
    args[0] = yield yd;
    yd = tg.untilNext(event);
  }

}

// -- once

function* onceLoop(args,event,listener,tg,dArgs){
  dArgs[0] = this;
  args[0] = yield tg.until(event);
  call(args,listener,tg);
}

// HybridTarget

function HybridTarget(){
  this[target] = this;
  this[emitter] = this;
  Target.call(this);
}

HybridTarget.prototype = Object.create(Target.prototype);
HybridTarget.prototype[define]('constructor',HybridTarget);
HybridTarget.prototype[define](bag);

/*/ exports /*/

module.exports = Emitter;
Emitter.Target = Target;
Emitter.Hybrid = HybridTarget;
