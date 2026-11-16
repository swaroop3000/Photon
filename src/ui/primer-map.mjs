/** Photon 1.8 — optional selected primer pair SVG markers.
 * Drawing only: construct and feature data are never altered.
 */
const ns='http://www.w3.org/2000/svg';
let selected=null;
function node(tag,attrs={},label){
 const el=document.createElementNS(ns,tag);
 Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));
 if(label!==undefined)el.textContent=label;
 return el;
}
function render(){
 const svg=document.getElementById('mapView');
 if(!svg)return;
 svg.querySelector('#photonPrimerLayer')?.remove();
 if(!selected)return;
 const w=globalThis.PhotonEditorBridgeHost?.working?.();
 if(!w||w.seq.length!==selected.templateLength)return;
 const circular=document.querySelector('.maptab.active')?.dataset.v!=='linear';
 const layer=node('g',{id:'photonPrimerLayer'});
 for(const [name,pos,color] of [['F',selected.forward.start,'#16a34a'],['R',selected.reverse.start,'#ec4899']]){
   const fraction=pos/w.seq.length;
   if(circular){
     const angle=2*Math.PI*fraction-Math.PI/2;
     const x1=310+145*Math.cos(angle),y1=225+145*Math.sin(angle);
     const x2=310+190*Math.cos(angle),y2=225+190*Math.sin(angle);
     layer.append(node('line',{x1,y1,x2,y2,stroke:color,'stroke-width':3,'pointer-events':'none'}));
     layer.append(node('text',{x:x2,y:y2,'text-anchor':'middle','font-size':12,fill:color,'font-weight':'bold','pointer-events':'none'},name));
   }else{
     const x=40+540*fraction,y=name==='F'?154:229;
     layer.append(node('line',{x1:x,y1:165,x2:x,y2:216,stroke:color,'stroke-width':3,'pointer-events':'none'}));
     layer.append(node('text',{x,y,'text-anchor':'middle','font-size':12,fill:color,'font-weight':'bold','pointer-events':'none'},name));
   }
 }
 svg.append(layer);
}
globalThis.PhotonPrimerMap={render,show(pair){selected=pair;render();}};
render();
