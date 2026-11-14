/** Photon 2.0 — fix origin-spanning legacy annotations during map render.
 * This is a strictly visual correction: one feature remains one feature,
 * and clicks continue to use the legacy selected-feature handler.
 */
import {featureMapSegments,arcSectorPath} from '../core/feature-map.mjs';
const ns='http://www.w3.org/2000/svg';
function svg(tag,attrs={},title){
 const el=document.createElementNS(ns,tag);
 Object.entries(attrs).forEach(([name,value])=>el.setAttribute(name,String(value)));
 if(title){const t=document.createElementNS(ns,'title');t.textContent=title;el.append(t);}
 return el;
}
export function renderWrappedFeatures(){
 const map=document.getElementById('mapView');
 const host=globalThis.PhotonEditorBridgeHost;
 if(!map||!host)return;
 map.querySelector('#photonWrappedFeatures')?.remove();
 const w=host.working(),length=w.seq.length;
 if(w.topology!=='circular'||length===0)return;
 const view=map.closest('.mapwrap')?.querySelector('.maptab.active')?.dataset.v==='linear'?'linear':'circular';
 const group=svg('g',{id:'photonWrappedFeatures'});
 w.features.forEach((feature,index)=>{
   if(feature.start<=feature.end)return;
   const original=map.querySelector('.arc[data-f="'+index+'"]');
   if(!original)return;
   try{
     const segments=featureMapSegments(feature,length,{view});
     original.setAttribute('visibility','hidden');
     const fill=original.getAttribute('fill')||'#64748b';
     const strand=feature.strand===-1?-1:1;
     for(const segment of segments){
       const shape=view==='linear'
         ?svg('rect',{x:segment.x,y:strand===-1?196:168,
             width:segment.width,height:16,rx:3,fill,'fill-opacity':0.86,
             class:'arc', 'data-wrapped-feature':index},feature.name)
         :svg('path',{d:arcSectorPath(segment,{
             inner:strand===-1?117:151,outer:strand===-1?132:166}),
             fill,'fill-opacity':0.86,class:'arc',
             'data-wrapped-feature':index},feature.name);
       shape.style.cursor='pointer';
       shape.onclick=()=>original.dispatchEvent(new MouseEvent('click',{bubbles:true}));
       group.append(shape);
     }
   }catch(error){
     original.removeAttribute('visibility');
     console.warn('Photon wrap-feature render skipped:',error.message);
   }
 });
 map.append(group);
}
globalThis.PhotonWrappedFeatures={render:renderWrappedFeatures};
renderWrappedFeatures();
