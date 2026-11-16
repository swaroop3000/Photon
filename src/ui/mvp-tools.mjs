import {createDesignReport,reportHtml} from '../core/design-report.mjs';
const host=globalThis.PhotonMVPHost,esc=globalThis.esc;
function reportDialog(){
 const context=host.context();
 createDesignReport(context).then(report=>{
  globalThis.modal(`<h2 class="ph">Design report</h2><p>A shareable snapshot of ${esc(report.name)}: map, annotations, revision details and sequence fingerprint. Unapplied text is excluded.</p><p>${report.length} bp · ${report.annotations.length} annotations · ${report.uncommitted?'uncommitted changes':'recorded revision'}</p><p class="mini">HTML opens in a browser and can be printed or saved as PDF. The JSON report carries the same snapshot. Neither is a full project backup.</p><div class="mvp-actions"><button class="btn primary" id="reportHtml">Download HTML</button><button class="btn" id="reportJson">Download JSON</button><button class="btn" onclick="closeModal()">Close</button></div>`);
  document.getElementById('reportHtml').onclick=()=>globalThis.download('photon-design-report.html',reportHtml(report));
  document.getElementById('reportJson').onclick=()=>globalThis.download('photon-design-report.json',JSON.stringify(report,null,2));
 }).catch(e=>flash('Report unavailable: '+e.message));
}
const reportButton=document.createElement('button');reportButton.id='photonDesignReport';reportButton.textContent='Design report (HTML / JSON)';reportButton.onclick=reportDialog;document.getElementById('expDD').append(reportButton);
function reviewFeature(index){
 const context=host.context(),f=context.working.features[index];if(!f)return;
 const signature=JSON.stringify(context.working);
 globalThis.modal(`<h2 class="ph">Review annotation</h2><p><b>${esc(f.name)}</b> · ${esc(f.type)}</p><p>Current range: ${esc(f.segments?f.segments.map(s=>s.start+'..'+s.end).join(', '):f.start+'..'+f.end)} · ${f.strand===-1?'reverse':'forward'} strand</p><p>An edit intersected this annotation or another tool flagged it. Inspect its sequence, coordinates and meaning. Edit the annotation if needed before acknowledging.</p><p class="mini">Acknowledging removes the edit warning only. It does not validate biological function or laboratory suitability.</p><label><input type="checkbox" id="annotationReviewed"> I reviewed this annotation in the current construct</label><p id="annotationReviewStatus" role="status"></p><div class="mvp-actions"><button class="btn primary" id="acknowledgeAnnotation" disabled>Acknowledge review</button><button class="btn" id="inspectAnnotation">Show in workspace</button><button class="btn" onclick="closeModal()">Cancel</button></div>`);
 const acknowledge=document.getElementById('acknowledgeAnnotation');document.getElementById('annotationReviewed').onchange=e=>acknowledge.disabled=!e.target.checked;
 document.getElementById('inspectAnnotation').onclick=()=>{closeModal();host.selectFeature(index);};
 acknowledge.onclick=async()=>{acknowledge.disabled=true;try{await host.reviewFeature(index,signature);closeModal();flash('Annotation review acknowledged; commit separately.');}catch(e){document.getElementById('annotationReviewStatus').textContent=e.message;acknowledge.disabled=false;}};
}
globalThis.PhotonAnnotationReview={open:reviewFeature};
function decorate(){
 const page=document.querySelector('#cl')?.closest('.page');
 if(page&&!document.getElementById('photonNameVersion')){
  const context=host.context(),box=document.createElement('section');box.className='named-versions';box.id='photonNamedVersions';
  box.innerHTML=`<h3>Named versions</h3><p class="mini">Label the current recorded revision, for example Candidate A. ${context.dirty?'Commit your working changes first.':''}</p><label for="versionName">Version name</label><div class="mvp-actions"><input id="versionName" maxlength="80" placeholder="Candidate A"><button class="btn" id="photonNameVersion" ${context.dirty?'disabled':''}>Name this version</button></div><p id="versionStatus" role="status"></p><div>${context.tags.map(t=>`<span class="pill">${esc(t.name)} · ${esc(t.commitId)}</span>`).join(' ')||'<span class="mini">No named versions yet.</span>'}</div>`;
  page.prepend(box);document.getElementById('photonNameVersion').onclick=async()=>{const value=document.getElementById('versionName').value;try{await host.nameVersion(value);flash('Named version saved.');}catch(e){document.getElementById('versionStatus').textContent=e.message;}};
 }
 const tool=host.currentTool(),tabs=document.querySelector('.cr .tabs')??document.querySelector('.tab[data-tool]')?.parentElement;
 if(tabs&&!document.getElementById('photonToolHelp')){const help=document.createElement('button');help.id='photonToolHelp';help.className='btn sm';help.textContent='Tool help';help.onclick=()=>globalThis.PhotonTutorial.openTool(host.currentTool());tabs.after(help);}
}
new MutationObserver(decorate).observe(document.getElementById('view'),{childList:true});decorate();
