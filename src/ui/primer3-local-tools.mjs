/** Photon 3.4 — browser handoff to real local primer3-py.
 * Static Photon never silently uploads DNA and never mislabels heuristic
 * candidates as Primer3. Results must match the currently selected template.
 */
import {preparePrimer3Request,parsePrimer3Result} from '../core/primer3-exchange.mjs';
function downloadJSON(data,filename){
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=filename;
 a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function renderPrimer3Local(){
 const root=document.getElementById('tb'),host=globalThis.PhotonEditorBridgeHost;
 if(!host||!root||!document.querySelector('.tab.active[data-tool="primers"]')||
 document.getElementById('photonPrimer3V34'))return;
 const panel=document.createElement('section');panel.id='photonPrimer3V34';
 panel.style.cssText='border-top:1px solid var(--line);margin-top:18px;padding-top:14px';
 const heading=document.createElement('h3');heading.textContent='Real Primer3 engine · Photon 3.4';
 const help=document.createElement('div');help.className='mini';
 help.textContent='Local/offline engine handoff: export a design request, run it with primer3-py on your computer, then import the result. No DNA is sent to a server. The older candidate finder above remains heuristic, not Primer3.';
 const controls=document.createElement('div');
 controls.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:9px 0';
 const label=document.createElement('label');label.textContent='Product size (bp) min / max';
 const min=document.createElement('input');min.id='photonPrimer3MinV34';min.type='number';
 min.value='80';min.min='30';min.style.maxWidth='85px';
 const max=document.createElement('input');max.id='photonPrimer3MaxV34';max.type='number';
 max.value='300';max.min='30';max.style.maxWidth='85px';
 const exportRequest=document.createElement('button');exportRequest.type='button';exportRequest.className='btn sm';
 exportRequest.textContent='Export Primer3 request';
 controls.append(label,min,max,exportRequest);
 const importLabel=document.createElement('label');importLabel.className='btn sm';
 importLabel.textContent='Import Primer3 results JSON';
 const importFile=document.createElement('input');importFile.type='file';
 importFile.accept='.json,application/json';importFile.style.display='none';
 importFile.id='photonPrimer3ResultFileV34';importLabel.append(importFile);
 const result=document.createElement('div');result.id='photonPrimer3ResultsV34';
 result.style.cssText='margin-top:10px;white-space:pre-wrap';
 const command=document.createElement('pre');command.style.cssText='font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere;margin-top:8px';
 command.textContent='Run locally (Python 3.9+):\npython -m pip install primer3-py==2.4.0\npython scripts/primer3_runner.py primer3-request.json primer3-results.json';
 let lastRequest=null;
 function state(){
   return {seq:host.working().seq,topology:host.working().topology,identity:host.identity()};
 }
 function request(){
   const a=Number(min.value),b=Number(max.value);
   if(!min.value.trim()||!max.value.trim())throw new RangeError('Enter both product bounds');
   return preparePrimer3Request(host.working(),{
     minProduct:a,maxProduct:b
   });
 }
 exportRequest.onclick=()=>{
   result.replaceChildren();
   try{
     const requestData=request();
     lastRequest={data:requestData,state:state()};
     downloadJSON(requestData,'primer3-request.json');
     result.textContent='Exported validated Primer3 request for '+requestData.sequence.length+
       ' bp template. Run it locally; then import the JSON result. The request contains your DNA sequence.';
   }catch(error){lastRequest=null;result.textContent='Request rejected: '+error.message;}
 };
 importFile.onchange=async()=>{
   const file=importFile.files?.[0];if(!file)return;
   result.replaceChildren();
   try{
     if(!lastRequest)throw new RangeError('Export a Primer3 request for this construct first');
     const before=state();
     if(before.identity!==lastRequest.state.identity||
       before.seq!==lastRequest.state.seq||before.topology!==lastRequest.state.topology)
       throw new RangeError('Working construct changed since request export; export again');
     const parsed=parsePrimer3Result(await file.text(),host.working());
     const after=state();
     if(JSON.stringify(before)!==JSON.stringify(after))
       throw new RangeError('Working construct changed while importing results');
     const summary=document.createElement('div');
     summary.textContent='Primer3-py '+parsed.engineVersion+' · '+parsed.pairs.length+
       ' validated pair(s). '+(parsed.explain||'');
     result.append(summary);
     for(const [i,p] of parsed.pairs.entries()){
       const card=document.createElement('div');card.className='li';
       card.style.marginTop='8px';
       const info=document.createElement('div');info.style.whiteSpace='pre-wrap';
       info.textContent=(i+1)+'. Product '+p.productSize+' bp · Primer3 pair penalty '+p.pairPenalty.toFixed(3)+
         '\nF 5′ '+p.forward.sequence+' 3′ · Tm '+p.forward.tm.toFixed(2)+' °C · '+(p.forward.start+1)+'..'+p.forward.end+
         '\nR 5′ '+p.reverse.sequence+' 3′ · Tm '+p.reverse.tm.toFixed(2)+' °C · '+(p.reverse.start+1)+'..'+p.reverse.end;
       const show=document.createElement('button');show.className='btn sm';show.type='button';
       show.textContent='Show Primer3 binding sites';
       show.onclick=()=>globalThis.PhotonPrimerMap?.show?.({
         forward:p.forward,reverse:p.reverse,templateLength:before.seq.length
       });
       card.append(info,show);result.append(card);
     }
     if(!parsed.pairs.length)result.append(document.createTextNode('No Primer3 pairs met the constraints.'));
   }catch(error){result.textContent='Primer3 import rejected: '+error.message;}
   importFile.value='';
 };
 panel.append(heading,help,controls,importLabel,command,result);root.append(panel);
}
globalThis.PhotonPrimer3Local={render:renderPrimer3Local};
renderPrimer3Local();
