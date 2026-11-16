/** Photon 2.7 — SBOL 3 RDF hierarchy exporter for reusable part libraries.
 * Emits one Component per unique part/assembly, SubComponent placements for
 * each assembly's direct children, and linked Sequence objects. The RDF graph
 * remains a strict Photon-supported subset, not a generic SBOL editor.
 */
import {normalizeDNA} from './dna.mjs';
import {resolveLibraryAssembly} from './part-library.mjs';
const S='http://sbols.org/v3#',R='http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const X='http://www.w3.org/2001/XMLSchema#',BASE='https://photon.app/sbol3/';
const SO='https://identifiers.org/SO:',DNA='https://identifiers.org/SBO:0000251';
const ENC='https://identifiers.org/edam:format_1207';
const u=x=>'<'+x+'>',q=x=>JSON.stringify(String(x));
const int=n=>q(n)+'^^'+u(X+'integer');
export function serializeHierarchicalSbol3(library,rootID){
 const resolved=resolveLibraryAssembly(library,rootID);
 if(!Object.hasOwn(library.assemblies,rootID))throw new RangeError('Root must be an assembly');
 const lines=[],defined=new Set(),walking=new Set();
 const add=(sub,pred,obj)=>lines.push(u(sub)+' '+u(pred)+' '+obj+' .');
 const s=(sub,pred,obj)=>add(sub,S+pred,obj);
 function component(id,name,sequence){
   const node=BASE+id,seq=node+'/sequence';
   add(node,R+'type',u(S+'Component'));
   s(node,'displayId',q(id));
   s(node,'name',q(name));
   s(node,'hasNamespace',u(BASE));
   s(node,'type',u(DNA));
   s(node,'role',u(SO+'0000987'));
   s(node,'hasSequence',u(seq));
   add(seq,R+'type',u(S+'Sequence'));
   s(seq,'displayId',q('sequence'));
   s(seq,'hasNamespace',u(node+'/'));
   s(seq,'elements',q(sequence.toLowerCase()));
   s(seq,'encoding',u(ENC));
 }
 function visit(id){
   if(defined.has(id))return;
   if(walking.has(id))throw new RangeError('Circular assembly reference: '+id);
   walking.add(id);
   const part=library.parts[id],assembly=library.assemblies[id];
   if(part){
     component(id,part.name,normalizeDNA(part.sequence,{allowAmbiguous:false}));
   }else if(assembly){
     const parent=resolveLibraryAssembly(library,id);
     component(id,assembly.name,parent.sequence);
     let cursor=1;
     for(const [index,placement] of assembly.placements.entries()){
       visit(placement.ref);
       const childSequence=library.parts[placement.ref]?.sequence??
         resolveLibraryAssembly(library,placement.ref).sequence;
       const length=childSequence.length;
       const instance=BASE+id+'/sub'+(index+1),range=instance+'/range1';
       s(BASE+id,'hasFeature',u(instance));
       add(instance,R+'type',u(S+'SubComponent'));
       s(instance,'displayId',q('sub'+(index+1)));
       s(instance,'instanceOf',u(BASE+placement.ref));
       s(instance,'hasLocation',u(range));
       add(range,R+'type',u(S+'Range'));
       s(range,'start',int(cursor));
       s(range,'end',int(cursor+length-1));
       s(range,'hasSequence',u(BASE+id+'/sequence'));
       s(range,'orientation',u(SO+(placement.strand===-1?'0001031':'0001030')));
       cursor+=length;
     }
   }else throw new RangeError('Unknown library reference: '+id);
   walking.delete(id);
   defined.add(id);
 }
 visit(rootID);
 return lines.sort().join('\n')+'\n';
}
