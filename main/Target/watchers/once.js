var Detacher = require('detacher'),
    walk = require('y-walk'),
    call = require('./call'),
    pause = require('./pause');

function once(){
  var event = arguments[0],
      listener = arguments[1],
      dArgs = [],
      d = new Detacher(pause,dArgs);

  arguments[1] = d;
  walk(onceLoop,[arguments,event,listener,this,dArgs]);

  return d;
}

function* onceLoop(args,event,listener,tg,dArgs){
  dArgs[0] = this;
  args[0] = yield tg.until(event);
  call(args,listener,tg);
}

/*/ exports /*/

module.exports = once;
