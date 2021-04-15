(function(){var subContentIdToLibraryMap={};function findSubContentLibrary(id,params){for(var prop in params){if(!params.hasOwnProperty(prop)){continue;}
if(prop==='subContentId'&&params[prop]===id){return params.library;}
else if(typeof params[prop]==='object'){var result=findSubContentLibrary(id,params[prop]);if(result){return result;}}}}
if(window.H5P){H5P.jQuery(window).on('ready',function(){H5P.externalDispatcher.on('xAPI',function(event){try{if(!window.parent.ga){return;}
var category;var contentId=event.data.statement.object.definition.extensions['http://h5p.org/x-api/h5p-local-content-id'];var subContentId=event.data.statement.object.definition.extensions['http://h5p.org/x-api/h5p-subContentId'];if(subContentId){if(subContentIdToLibraryMap[subContentId]){category=subContentIdToLibraryMap[subContentId];}
else{category=findSubContentLibrary(subContentId,JSON.parse(H5PIntegration.contents['cid-'+contentId].jsonContent));if(!category){return;}
subContentIdToLibraryMap[subContentId]=category;}}
else{category=H5PIntegration.contents['cid-'+contentId].library;}
category=category.split(' ',2)[0];var action=event.data.statement.verb.id;action=action.substring(action.lastIndexOf('/')+1);action=action.split('-');for(var i=0;i<action.length;i++){action[i]=action[i].charAt(0).toUpperCase()+action[i].slice(1);}
action=action.join(' ');var objectDefinition=event.data.statement.object.definition;var label=objectDefinition.name?objectDefinition.name['en-US']:objectDefinition.description['en-US'];if(label.length>384){label=label.substring(0,384);}
label+=' ('+contentId;if(subContentId){label+=' '+subContentId;}
label+=')';var value;var result=event.data.statement.result;if(result){if(result.response){if(isNaN(Number(result.response))){value=result.response.length;}
else{value=result.response;}}
else if(result.score){value=result.score.raw/((result.score.max-result.score.min)/100);}}
if(action==='Progressed'){var progress=event.data.statement.object.definition.extensions['http://id.tincanapi.com/extension/ending-point'];if(progress){value=progress;}}
value=Number(value);if(isNaN(value)){value=undefined;}
window.parent.ga('send','event',category,action,label,value);}
catch(err){}});});}})();