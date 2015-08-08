var define = require('u-proto/define'),
    Resolver = require('y-resolver'),
    walk = require('y-walk'),
    Detacher = require('detacher'),
    Setter = require('y-setter'),

    resolvers = Symbol(),
    status = Symbol(),
    target = Symbol(),
    counters = Symbol(),

    bag;

// Emitter

function Emitter(){
  this[target] = new Target();
};

Emitter.prototype[define](bag = {

  get target(){ return this[target]; },

  give: function(event,data,lock){
    var tg = this[target],
        rss = tg[resolvers],
        rs = rss.get(event),
        r;

    if(rs){
      if(lock) for(r of new Set(rs)) lock.take().listen(accept,[r,data,rs,rss,tg[counters],event]);
      else for(r of new Set(rs)) accept(r,data,rs,rss,tg[counters],event);
    }

  },

  throw: function(event,error,lock){
    var tg = this[target],
        rss = tg[resolvers],
        rs = rss.get(event),
        r;

    if(rs){
      if(lock) for(r of new Set(rs)) lock.take().listen(reject,[r,error,rs,rss,tg[counters],event]);
      else for(r of new Set(rs)) reject(r,error,rs,rss,tg[counters],event);
    }

  },

  set: function(event,data,lock){
    this[target][status].set(event,[true,data,lock]);
    this.give(event,data,lock);
  },

  hold: function(event,error,lock){
    this[target][status].set(event,[false,error,lock]);
    this.throw(event,data,lock);
  },

  unset: function(event){
    this[target][status].delete(event);
  },

  sun: function(state1,state2){
    this.unset(state2);
    this.set(state1);
  }

});

// - utils

function accept(r,data,rs,rss,cs,event){
  if(!rs.has(r)) return;

  r.accept(data);
  rs.delete(r);
  if(!rs.size){
    rss.delete(event);
    cs.delete(event);
  }

}

function reject(r,error,rs,rss,cs,event){
  if(!rs.has(r)) return;

  r.reject(error);
  rs.delete(r);
  if(!rs.size){
    rss.delete(event);
    cs.delete(event);
  }

}

// Target

function Target(prop){
  if(this[resolvers]) return;

  if(prop){
    this[prop] = Object.create(Emitter.prototype);
    this[prop][target] = this;
  }

  this[resolvers] = new Map();
  this[status] = new Map();
  this[counters] = new Map();
}

Target.prototype[define]({

  until: function(event){
    var st = this[status].get(event),
        rss = this[resolvers],
        r = getR(this,event);

    if(st){

      if(st[0]){

        if(st[2]){
          listen(rss,event,r);
          st[2].take().listen(accept,[r,data,rss.get(event),rss,this[counters],event]);
          return r.yielded;
        }

        r.accept(st[1]);
        return r.yielded;

      }


      if(st[2]){
        listen(rss,event,r);
        st[2].take().listen(reject,[r,data,rss.get(event),rss,this[counters],event]);
        return r.yielded;
      }

      r.reject(st[1]);
      return r.yielded;

    }

    listen(rss,event,r);
    return r.yielded;
  },

  untilNext: function(event){
    var rss = this[resolvers],
        r = getR(this,event);

    listen(rss,event,r);
    return r.yielded;
  },

  listened: function(event){
    var c = this[counters].get(event);
    return c && c.value > 0;
  },

  is: function(event){
    var st = this[status].get(event);
    return st && st[0];
  },

  isNot: function(event){
    var st = this[status].get(event);
    return !(st && st[0]);
  },

  hasFailed: function(event){
    var st = this[status].get(event);
    return st && !st[0];
  },

  hasNotFailed: function(event){
    var st = this[status].get(event);
    return !st || st[0];
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
    return this[resolvers].keys();
  }

});

// - utils

function listen(rss,event,r){
  var rs = rss.get(event);

  if(!rs) rss.set(event,rs = new Set());
  rs.add(r);
}

function getR(yd,event){
  var c = yd[counters].get(event);

  if(!c) yd[counters].set(event,c = new Setter());
  return new Resolver(c);
}

function pauseIt(w){
  w.pause();
}

// -- on

function* onLoop(args,event,listener,yd,dArgs){
  dArgs[0] = this;

  args[0] = yield yd.until(event);
  while(true){
    walk(listener,args,yd);
    args[0] = yield yd.untilNext(event);
  }

}

// -- once

function* onceLoop(args,event,listener,yd,dArgs){
  dArgs[0] = this;

  args[0] = yield yd.until(event);
  walk(listener,args,yd);
}

// HybridTarget

function HybridTarget(){
  this[target] = this;
  Target.call(this);
}

HybridTarget.prototype = Object.create(Target.prototype);
HybridTarget.prototype[define]('constructor',HybridTarget);
HybridTarget.prototype[define](bag);

// utils

function chain(){
  var last = arguments[arguments.length - 1][target],
      i;

  arguments[arguments.length - 1][target] = arguments[0][target];
  for(i = 0;i < arguments.length - 2;i++) arguments[i][target] = arguments[i + 1][target];
  arguments[arguments.length - 2][target] = last;
}

/*/ exports /*/

module.exports = Emitter;
Emitter.Target = Target;
Emitter.Hybrid = HybridTarget;
Emitter.chain = chain;
