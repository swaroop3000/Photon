/** Presentation-only enhancements. No data writes or replacement editor handlers. */
const NS='http://www.w3.org/2000/svg';
const paths={
 code:'M8 3H4v18h4M16 3h4v18h-4M9 7l6 10M15 7L9 17',
 commits:'M12 8v4l3 2M3 12a9 9 0 1 0 3-6M3 4v5h5',
 compare:'M5 3v18M19 3v18M5 8h9l-3-3M19 16h-9l3 3',
 branches:'M6 3v12a5 5 0 0 0 5 5h6M6 8h7a5 5 0 0 0 5-5M3 3h6M15 3h6M14 20h6',
 pulls:'M6 8v13M18 16V8a4 4 0 0 0-4-4h-2M3 3h6v5H3zM15 16h6v5h-6zM12 1v6',
 issues:'M12 8v5M12 17h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
 wiki:'M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1zM12 5v15',
 insights:'M4 20h17M7 16v-5M12 16V5M17 16V9',
 settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
 actions:'M13 2L5 13h6l-1 9 9-12h-6z',
 labs:'M9 3h6M10 3v7L4 20c-.3.6.1 1 1 1h14c.9 0 1.3-.4 1-1l-6-10V3M7 16h10',
 remote:'M7 18h11a4 4 0 0 0 .3-8A6 6 0 0 0 7 8a5 5 0 0 0 0 10',
 download:'M12 3v12M7 10l5 5 5-5M4 17v4h16v-4',
 upload:'M12 16V4M7 9l5-5 5 5M4 17v4h16v-4',
 copy:'M8 8h12v13H8zM16 8V3H3v13h5',
 undo:'M4 9h10a6 6 0 0 1 0 12M4 9l5-5M4 9l5 5',
 help:'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
};
function icon(name,className){
 const svg=document.createElementNS(NS,'svg');
 for(const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.5','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(key,value);
 if(className)svg.setAttribute('class',className);
 const path=document.createElementNS(NS,'path');path.setAttribute('d',paths[name]??paths.code);svg.append(path);return svg;
}
function decorateNav(){
 const nav=document.getElementById('nav');if(!nav)return;
 if(!nav.querySelector('.photon-workspace-brand')){
  const brand=document.createElement('div');brand.className='photon-workspace-brand';brand.append(icon('code'),document.createTextNode('Photon'));
  const alpha=document.createElement('small');alpha.textContent='Alpha';brand.append(alpha);
  const heading=document.createElement('div');heading.className='photon-nav-heading';heading.textContent='DESIGN WORKSPACE';nav.prepend(brand,heading);
  const footer=document.createElement('div');footer.className='photon-workspace-footer';footer.textContent='Your designs, versioned.';
  const note=document.createElement('span');note.textContent='Local browser workspace';footer.append(note);nav.append(footer);
 }
 for(const button of nav.querySelectorAll('.navt')){
  if(!button.querySelector('.photon-nav-icon'))button.prepend(icon(button.dataset.t,'photon-nav-icon'));
  if(button.classList.contains('active'))button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 }
}
function iconAction(node,name){
 if(!node||node.querySelector('.photon-action-icon'))return;
 const label=node.textContent.trim();node.setAttribute('aria-label',label);if(!node.title)node.title=label;
 for(const child of [...node.childNodes])if(child.nodeType===Node.TEXT_NODE&&child.textContent.trim()){
  const span=document.createElement('span');span.className='photon-action-label';child.replaceWith(span);span.append(child);
 }
 node.classList.add('photon-icon-action');node.prepend(icon(name,'photon-action-icon'));
}
function decorateToolbar(){
 for(const [id,name] of [['cpBtn','copy'],['helpBtn','help'],['photonBackup','download'],['photonRecoveryCenter','commits']])iconAction(document.getElementById(id),name);
 iconAction(document.getElementById('photonRestoreInput')?.closest('label'),'upload');
 for(const label of document.querySelectorAll('.topbar label.btn'))if(!label.dataset.photonFileButton){
  const input=label.querySelector('input[type=file]')??document.getElementById(label.htmlFor);
  if(!input)continue;
  label.dataset.photonFileButton='true';label.tabIndex=0;label.setAttribute('role','button');
  if(!label.getAttribute('aria-label'))label.setAttribute('aria-label',label.textContent.trim());
  label.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&!input.disabled){event.preventDefault();input.click();}});
 }
}
const state=document.createElement('span');state.id='photonWorkspaceStatus';state.setAttribute('role','status');state.setAttribute('aria-live','polite');
const branch=document.getElementById('branchBtn');branch?.closest('.dd')?.after(state);
function refreshStatus(){
 const status=globalThis.PhotonProjects?.status;
 if(!status)return;
 let text='Saved locally',tone='saved';
 const editor=document.getElementById('se');
 if(status.issue||status.blocked||status.temporary){text='Storage needs attention';tone='error';}
 else if(status.busy){text='Saving…';tone='saving';}
 else if(editor&&editor.value!==globalThis.PhotonEditorBridgeHost?.working().seq){text='Unapplied text';tone='draft';}
 else if(document.getElementById('dirty')?.textContent.trim()){text='Uncommitted changes';tone='draft';}
 if(state.textContent!==text)state.textContent=text;
 if(state.dataset.tone!==tone)state.dataset.tone=tone;
}
function decorateView(){
 for(const wrap of document.querySelectorAll('.mapwrap'))if(!wrap.querySelector('.photon-map-caption')){
  const caption=document.createElement('span');caption.className='photon-map-caption';caption.textContent='CONSTRUCT MAP';wrap.prepend(caption);
 }
 for(const name of document.querySelectorAll('.frow .fname'))if(!name.title)name.title=name.textContent;
 refreshStatus();
}
document.body.classList.add('photon-modern');
decorateNav();decorateToolbar();decorateView();
new MutationObserver(decorateNav).observe(document.getElementById('nav'),{childList:true});
new MutationObserver(()=>{decorateToolbar();refreshStatus();}).observe(document.querySelector('.topbar'),{childList:true,subtree:true,characterData:true});
new MutationObserver(decorateView).observe(document.getElementById('view'),{childList:true});
new MutationObserver(refreshStatus).observe(document.body,{attributes:true,attributeFilter:['inert']});
document.addEventListener('input',event=>{if(event.target.id==='se')refreshStatus();});

const toolbar=document.querySelector('.topbar');
function sizeToolbar(){document.documentElement.style.setProperty('--photon-toolbar-height',Math.ceil(toolbar.getBoundingClientRect().height)+'px');}
sizeToolbar();
if(globalThis.ResizeObserver)new ResizeObserver(sizeToolbar).observe(toolbar);
else window.addEventListener('resize',sizeToolbar);
