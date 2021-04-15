var H5P=window.H5P=window.H5P||{};H5P.Event=function(type,data,extras){this.type=type;this.data=data;var bubbles=false;var external=false;var scheduledForExternal=false;if(extras===undefined){extras={};}
if(extras.bubbles===true){bubbles=true;}
if(extras.external===true){external=true;}
this.preventBubbling=function(){bubbles=false;};this.getBubbles=function(){return bubbles;};this.scheduleForExternal=function(){if(external&&!scheduledForExternal){scheduledForExternal=true;return true;}
return false;};};H5P.EventDispatcher=(function(){function EventDispatcher(){var self=this;var triggers={};this.on=function(type,listener,thisArg){if(typeof listener!=='function'){throw TypeError('listener must be a function');}
self.trigger('newListener',{'type':type,'listener':listener});var trigger={'listener':listener,'thisArg':thisArg};if(!triggers[type]){triggers[type]=[trigger];}
else{triggers[type].push(trigger);}};this.once=function(type,listener,thisArg){if(!(listener instanceof Function)){throw TypeError('listener must be a function');}
var once=function(event){self.off(event.type,once);listener.call(this,event);};self.on(type,once,thisArg);};this.off=function(type,listener){if(listener!==undefined&&!(listener instanceof Function)){throw TypeError('listener must be a function');}
if(triggers[type]===undefined){return;}
if(listener===undefined){delete triggers[type];self.trigger('removeListener',type);return;}
for(var i=0;i<triggers[type].length;i++){if(triggers[type][i].listener===listener){triggers[type].splice(i,1);self.trigger('removeListener',type,{'listener':listener});break;}}
if(!triggers[type].length){delete triggers[type];}};var call=function(type,event){if(triggers[type]===undefined){return;}
var handlers=triggers[type].slice();for(var i=0;i<handlers.length;i++){var trigger=handlers[i];var thisArg=(trigger.thisArg?trigger.thisArg:this);trigger.listener.call(thisArg,event);}};this.trigger=function(event,eventData,extras){if(event===undefined){return;}
if(event instanceof String||typeof event==='string'){event=new H5P.Event(event,eventData,extras);}
else if(eventData!==undefined){event.data=eventData;}
var scheduledForExternal=event.scheduleForExternal();call.call(this,event.type,event);call.call(this,'*',event);if(event.getBubbles()&&self.parent instanceof H5P.EventDispatcher&&(self.parent.trigger instanceof Function||typeof self.parent.trigger==='function')){self.parent.trigger(event);}
if(scheduledForExternal){H5P.externalDispatcher.trigger.call(this,event);}};}
return EventDispatcher;})();