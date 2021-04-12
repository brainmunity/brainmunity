class AuxinDemoToolsModal{constructor(element,options){this.options=Object.assign({modalWrapper:'.aux-demo-tools-modal',modalContent:'.aux-modal-content',closeButton:'.aux-modal-close',activeClass:'is-active',removeContentOnClose:false,content:null,},options);this.element=element;this.modal=document.querySelector(this.options.modalWrapper);this.content=this.modal.querySelector(this.options.modalContent);this.closeButton=this.content.querySelector(this.options.closeButton);this.isOpen=false;this.isContentAdded=false;this.init();}
init(){this.registerEvents();}
registerEvents(){this.element.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();this.showModal();}.bind(this));document.addEventListener('keydown',function(event){if(event.key==='Escape'){this.closeModal();}}.bind(this))
document.addEventListener('mousedown',function(event){if(this.content.contains(event.target)){return}
this.closeModal();}.bind(this));this.closeButton.addEventListener('click',function(event){event.preventDefault();this.closeModal();}.bind(this))
if(this.options.removeContentOnClose){this.modal.addEventListener('transitionend',function(event){if(event.propertyName!=='opacity'){return;}
if(event.target.classList.contains(this.options.activeClass)){return}
this.removeContent();}.bind(this));}}
showModal(){if(this.isOpen){return}
if(!this.isContentAdded){this.addContent();}
this.modal.classList.add(this.options.activeClass);this.isOpen=true;}
closeModal(){if(!this.isOpen){return}
this.modal.classList.remove(this.options.activeClass);this.isOpen=false;}
addContent(){this.content.appendChild(this.options.content);this.isContentAdded=true;}
removeContent(){this.content.removeChild(this.options.content);this.isContentAdded=false;}}