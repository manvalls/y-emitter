var walk = require('y-walk');

function call(args,listener,tg){
  try{ walk(listener,args,tg); }
  catch(e){ setTimeout(throwError,0,e); }
}

function throwError(e){
  throw e;
}

/*/ exports /*/

module.exports = call;
