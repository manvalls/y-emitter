var Detacher = require('detacher'),
    walk = require('y-walk'),
    call = require('./call'),
    pause = require('./pause');

function on(){
  var event = arguments[0],
      listener = arguments[1],
      dArgs = [],
      d = new Detacher(pause,dArgs);

  arguments[1] = d;
  walk(onLoop,[arguments,event,listener,this,dArgs]);

  return d;
}

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

/*/ exports /*/

module.exports = on;
