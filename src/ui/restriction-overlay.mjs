/** Photon 1.3 SVG overlay — restriction markers follow live plasmid edits.
 * No changes to existing map layout, export, or persistent construct data.
 */
import {mapRestrictionMarkers} from '../core/plasmid-map.mjs';
import {TYPE_II_ENZYMES} from '../core/restriction.mjs';
const SVG_NS='http://www.w3.org/2000/svg';
let visible=false, selected='EcoRI';

function svgEl(tag,attrs={},value=null) {
 const el=document.createElementNS(SVG_NS,tag);
 for(const [name,v] of Object.entries(attrs))el.setAttribute(name,String(v));
 if(value!==null)el.textContent=String(value);
 return el;
}
function render() {
 const svg=document.getElementById('mapView'),wrapper=document.querySelector('.mapwrap');
 const host=globalThis.PhotonEditorBridgeHost;
 if(!svg||!wrapper||!host)return;
 let toolbar=document.getElementById('photonMapCutTools');
 if(!toolbar) {
   toolbar=document.createElement('div');
   toolbar.id='photonMapCutTools';
   toolbar.style.cssText='display:flex;gap:6px;align-items:center;padding:7px 0;flex-wrap:wrap';
   const toggle=document.createElement('button');
   toggle.id='photonShowCuts';toggle.className='btn sm';toggle.type='button';
   toggle.onclick=()=>{visible=!visible;render();};
   const select=document.createElement('select');
   select.id='photonMapEnzyme';select.style.cssText='width:auto;max-width:140px;padding:5px';
   for(const name of Object.keys(TYPE_II_ENZYMES)){
     const o=document.createElement('option');o.value=name;o.textContent=name;select.append(o);
   }
   select.value=selected;select.onchange=()=>{selected=select.value;render();};
   const help=document.createElement('span');
   help.className='mini';help.textContent='Map top-strand restriction cuts (simulation)';
   toolbar.append(toggle,select,help);
   wrapper.append(toolbar);
 }
 document.getElementById('photonShowCuts').textContent=visible?'Hide cut sites':'Show cut sites';
 document.getElementById('photonMapEnzyme').value=selected;
 svg.querySelector('#photonMapCutLayer')?.remove();
 if(!visible)return;
 const w=host.working();
 // Current view follows the legacy map-tab selection. Topology follows the construct.
 const view=wrapper.querySelector('.maptab.active')?.dataset.v==='linear'?'linear':'circular';
 const layer=svgEl('g',{id:'photonMapCutLayer'});
 try {
   const marks=mapRestrictionMarkers(w.seq,[selected],{circular:w.topology==='circular',view});
   for(const site of marks) {
     const line=view==='circular'
       ? svgEl('line',{x1:site.x1,y1:site.y1,x2:site.x2,y2:site.y2})
       : svgEl('line',{x1:site.x,y1:site.y1,x2:site.x,y2:site.y2});
     line.setAttribute('stroke','var(--terminator)');
     line.setAttribute('stroke-width','2');
     line.setAttribute('pointer-events','none');
     const label=svgEl('text',{x:site.labelX,y:site.labelY,
       'text-anchor':'middle','font-size':'9','pointer-events':'none'},site.enzyme);
     label.setAttribute('fill','var(--terminator)');
     layer.append(line,label);
   }
   svg.append(layer);
 }catch(e) {
   // Invalid sequences are not silently interpreted as reliable cut maps.
   const note=svgEl('text',{x:310,y:38,'text-anchor':'middle','font-size':11},'Cut map unavailable: '+e.message);
   layer.append(note);svg.append(layer);
 }
}
globalThis.PhotonRestrictionOverlay={render};
render();
