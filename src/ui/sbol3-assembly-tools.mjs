/** Photon 2.6 — additive multi-component SBOL 3 design preview.
 * Each line is ID | 5'->3' DNA | + or -. Does not mutate working DNA.
 */
import {assembleSbol3Parts,serializeSbol3Assembly} from '../core/sbol3-assembly.mjs';
export function renderSbol3AssemblyBuilder(){
 const root=document.getElementById('tb');
 if(!root||!document.querySelector('.tab.active[data-tool="builder"]')||document.getElementById('photonSbol3BuilderV26'))return;
 const pane=document.createElement('section');pane.id='photonSbol3BuilderV26';
 pane.style.cssText='border-top:1px solid var(--line);margin-top:18px;padding-top:14px';
 const h=document.createElement('h3');h.textContent='SBOL 3 multi-component assembly · Photon 2.6';
 const note=document.createElement('div');note.className='mini';
 note.textContent='Design an ordered, linear DNA construct. One line per part: ID | DNA sequence | + or −. Strand − reverse-complements the part in the assembly. Preview/export only.';
 const name=document.createElement('input');name.value='PhotonAssembly';name.setAttribute('aria-label','Assembly name');name.placeholder='Assembly name';
 const lines=document.createElement('textarea');lines.rows=5;
 lines.value='promoter | ATGCCGTAA | +\nreporter | AAGTCCGTA | -\nterminator | TTAACG | +';
 lines.setAttribute('aria-label','Ordered component definitions');lines.style.marginTop='7px';
 const button=document.createElement('button');button.type='button';button.className='btn sm primary';
 button.textContent='Preview SBOL 3 assembly';button.style.marginTop='8px';
 const output=document.createElement('pre');output.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:270px;overflow:auto;font-size:12px;margin-top:9px';
 const download=document.createElement('button');download.type='button';download.className='btn sm';download.textContent='Export SBOL 3 N-Triples';download.hidden=true;
 let graph='';
 button.onclick=()=>{
   download.hidden=true;graph='';
   try{
     const rows=lines.value.split(/\r?\n/).filter(x=>x.trim());
     const parts=rows.map((line,index)=>{
       const fields=line.split('|').map(x=>x.trim());
       if(fields.length!==3||!fields[0]||!fields[1]||!['+','-'].includes(fields[2]))
         throw new RangeError('Invalid component line '+(index+1));
       return {id:fields[0],name:fields[0],sequence:fields[1],strand:fields[2]==='-'?-1:1};
     });
     const design=assembleSbol3Parts(parts,{name:name.value});
     graph=serializeSbol3Assembly(parts,{name:name.value});
     output.textContent='Design: '+design.name+' · '+design.length+' bp\n'+
       design.parts.map(p=>p.id+' '+p.start+'..'+p.end+(p.strand===-1?' reverse':' forward')).join('\n')+
       '\n\nSequence: '+design.sequence.slice(0,600)+(design.sequence.length>600?'…':'')+
       '\n\nIn-silico concatenation only; no assembly chemistry simulated.';
     download.hidden=false;
   }catch(error){output.textContent='Assembly rejected: '+error.message;}
 };
 download.onclick=()=>{
   if(!graph)return;
   const blob=new Blob([graph],{type:'application/n-triples'});
   const url=URL.createObjectURL(blob),anchor=document.createElement('a');
   anchor.href=url;anchor.download=(name.value.replace(/[^a-z0-9_-]/gi,'_')||'assembly')+'.sbol3.nt';
   anchor.click();URL.revokeObjectURL(url);
 };
 pane.append(h,note,name,lines,button,output,download);root.append(pane);
}
globalThis.PhotonSbol3AssemblyBuilder={render:renderSbol3AssemblyBuilder};
renderSbol3AssemblyBuilder();
