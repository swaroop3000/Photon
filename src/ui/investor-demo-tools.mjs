/** Optional presentation mode over the real editor; never resets existing data. */
import {createInvestorSample,investorEditPlan} from '../core/investor-demo.mjs';
import {parseGenbank,serializeGenbank} from '../core/feature-io.mjs';
const host=globalThis.PhotonPresentationHost;
if(!host)throw new Error('Presentation host unavailable');
const style=document.createElement('style');
style.textContent=`
 body.photon-investor .navt:not([data-t="code"]):not([data-t="commits"]):not([data-t="compare"]),
 body.photon-investor .tab:not([data-tool="features"]):not([data-tool="analyze"]),
 body.photon-investor #btnReset,body.photon-investor #globalSearch,body.photon-investor #palBtn,
 body.photon-investor #helpBtn,body.photon-investor #cpBtn,body.photon-investor #dlBtn,body.photon-investor #themeBtn,body.photon-investor #walkBtn{display:none!important}
 body.photon-investor #mapView{height:360px;width:100%}
 #photonInvestorPanel{margin:14px 18px;padding:18px 22px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
 #photonInvestorPanel h1{font-size:25px;line-height:1.2;margin:4px 0 8px}
 #photonInvestorPanel p{margin:5px 0;color:var(--muted);font-size:13px;line-height:1.6}
 #photonInvestorPanel .demo-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
 #photonInvestorPanel .demo-scope{font-size:11px;margin-top:10px}
 `;document.head.append(style);
const entry=document.createElement('button');entry.id='photonInvestorMode';entry.className='btn sm';
entry.textContent='Investor demo';document.getElementById('btnCommit').before(entry);
const panel=document.createElement('section');panel.id='photonInvestorPanel';panel.hidden=true;
panel.innerHTML='<div class="mini">PHOTON · INVESTOR MVP</div><h1>Version control for DNA design</h1><p>Understand a construct, make a change, and keep a traceable design history.</p><p id="photonInvestorStatus" role="status">Start a synthetic sample to explore the core workflow. Your existing projects stay in place.</p><div class="demo-actions"><button class="btn primary" id="photonInvestorStart">Start new sample</button><button class="btn sm" id="photonInvestorSampleFile">Download sample GenBank</button><button class="btn sm" id="photonInvestorEdit">1 · Apply example change</button><button class="btn sm" id="photonInvestorUndo">2 · Undo</button><button class="btn sm" id="photonInvestorCommit">3 · Commit change</button><button class="btn sm" id="photonInvestorExport">4 · Export GenBank</button></div><p class="demo-scope">Focused core workflow · synthetic data · local browser alpha. Experimental tools are outside this demo; exit presentation mode to explore them. No laboratory outcomes are implied.</p>';
document.getElementById('nav').after(panel);
const status=panel.querySelector('#photonInvestorStatus'),start=panel.querySelector('#photonInvestorStart'),edit=panel.querySelector('#photonInvestorEdit');
let active=false;
function refresh(){
 const sample=host.isSample();
 for(const id of ['photonInvestorUndo','photonInvestorCommit','photonInvestorExport'])panel.querySelector('#'+id).disabled=!sample;
 try{const plan=investorEditPlan(globalThis.PhotonEditorBridgeHost.working());edit.disabled=!sample;edit.title='Change spacer base '+plan.position+' from '+plan.before+' to '+plan.insert;}
 catch{edit.disabled=true;edit.title='Start a fresh sample or Undo the example change to apply it again.';}
 start.disabled=!!globalThis.PhotonProjects.status.blocked||!!globalThis.PhotonProjects.status.temporary;
}
function setMode(enabled){
 active=enabled;document.body.classList.toggle('photon-investor',enabled);panel.hidden=!enabled;
 entry.textContent=enabled?'Exit presentation':'Investor demo';entry.setAttribute('aria-pressed',String(enabled));
 const url=new URL(location.href);if(enabled)url.searchParams.set('demo','investor');else url.searchParams.delete('demo');history.replaceState(null,'',url);
 if(enabled)host.showCore();refresh();
}
entry.onclick=()=>setMode(!active);
start.onclick=async()=>{
 start.disabled=true;
 try{
  const working=parseGenbank(serializeGenbank(createInvestorSample()));
  await host.createSample(working);status.textContent='Sample imported and saved as a separate project. Apply the example spacer change, Undo it, then reapply and commit.';
 }catch(error){status.textContent='Sample could not be saved: '+error.message;}
 finally{refresh();}
};
panel.querySelector('#photonInvestorSampleFile').onclick=()=>globalThis.PhotonRecoveryHost.download('Photon_demo.gb',serializeGenbank(createInvestorSample()));
edit.onclick=async()=>{
 try{const plan=investorEditPlan(globalThis.PhotonEditorBridgeHost.working());await globalThis.PhotonEditorHistory.applyEdits([plan]);status.textContent='Saved a real sequence change at base '+plan.position+' ('+plan.before+' → '+plan.insert+'). Use Undo to recover the original, then reapply and commit.';}
 catch(error){status.textContent='Example edit rejected: '+error.message;}
 refresh();
};
panel.querySelector('#photonInvestorUndo').onclick=()=>{host.showCore();const undo=document.getElementById('ub');if(!undo||undo.disabled){status.textContent='Undo applies to uncommitted edits. Saved commits remain in history.';return;}undo.click();};
panel.querySelector('#photonInvestorCommit').onclick=()=>document.getElementById('btnCommit').click();
panel.querySelector('#photonInvestorExport').onclick=()=>{
 try{globalThis.PhotonRecoveryHost.download('Photon_demo.gb',serializeGenbank(globalThis.PhotonEditorBridgeHost.working()));status.textContent='Exported the current sequence and supported annotations as GenBank.';}
 catch(error){status.textContent='Export rejected: '+error.message;}
};
new MutationObserver(refresh).observe(document.getElementById('view'),{childList:true});
setMode(new URLSearchParams(location.search).get('demo')==='investor');
