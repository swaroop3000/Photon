/** Photon 2.7 — reusable DNA part library and nested assembly resolver.
 * Pure, deterministic data model: no database or chemical assembly claim.
 * Each assembly placement references a reusable part or another assembly.
 * Negative-strand nested placements reverse both order and orientation.
 */
import {normalizeDNA,reverseComplement} from './dna.mjs';
const ID=/^[A-Za-z][A-Za-z0-9_-]{0,59}$/;
const OWN=x=>Object.hasOwn(x,'id');
const limit=1000000;
function checkedId(value){
 if(typeof value!=='string'||!ID.test(value))throw new RangeError('IDs must start with a letter and contain only letters, numbers, underscore or hyphen (max 60)');
 return value;
}
function checkedStrand(value){
 const strand=value??1;
 if(strand!==1&&strand!==-1)throw new RangeError('Placement strand must be +1 or -1');
 return strand;
}
export function createPartLibrary(){return {format:'photon/part-library/1',parts:{},assemblies:{}};}
function validLibrary(library){
 if(!library||library.format!=='photon/part-library/1'||!library.parts||!library.assemblies||
 Array.isArray(library.parts)||Array.isArray(library.assemblies)||
 typeof library.parts!=='object'||typeof library.assemblies!=='object')
   throw new RangeError('Invalid Photon part library');
 return library;
}
export function addLibraryPart(library,{id,name,sequence}={}){
 validLibrary(library);checkedId(id);
 if(Object.hasOwn(library.parts,id)||Object.hasOwn(library.assemblies,id))throw new RangeError('Duplicate library ID: '+id);
 const dna=normalizeDNA(sequence,{allowAmbiguous:false});
 if(!dna||dna.length>limit)throw new RangeError('Part length outside 1–1,000,000 bases');
 return {...library,parts:{...library.parts,[id]:{id,name:String(name??id),sequence:dna}}};
}
export function addLibraryAssembly(library,{id,name,placements}={}){
 validLibrary(library);checkedId(id);
 if(Object.hasOwn(library.parts,id)||Object.hasOwn(library.assemblies,id))throw new RangeError('Duplicate library ID: '+id);
 if(!Array.isArray(placements)||!placements.length||placements.length>100)
   throw new RangeError('Assemblies require 1–100 ordered placements');
 const normalized=placements.map(p=>{
   if(!p||typeof p!=='object')throw new TypeError('Invalid placement');
   checkedId(p.ref);
   return {ref:p.ref,strand:checkedStrand(p.strand)};
 });
 // Deferred references are permitted for constructing graphs, but resolution
 // is always strict and fails on missing references and cycles.
 return {...library,assemblies:{...library.assemblies,[id]:{id,name:String(name??id),placements:normalized}}};
}
export function resolveLibraryAssembly(library,id,{maxDepth=20,maxLength=limit}={}){
 validLibrary(library);checkedId(id);
 if(!Number.isInteger(maxDepth)||maxDepth<1||maxDepth>100)throw new RangeError('Invalid maximum depth');
 if(!Number.isInteger(maxLength)||maxLength<1||maxLength>limit)throw new RangeError('Invalid maximum length');
 const active=new Set(),found=[];
 function descend(ref,orientation,path,depth){
   if(depth>maxDepth)throw new RangeError('Assembly nesting depth exceeded');
   if(active.has(ref))throw new RangeError('Circular assembly reference: '+[...active,ref].join(' → '));
   if(Object.hasOwn(library.parts,ref)){
     const part=library.parts[ref];
     const sequence=normalizeDNA(part.sequence,{allowAmbiguous:false});
     if(!sequence)throw new RangeError('Empty referenced part: '+ref);
     const oriented=orientation===-1?reverseComplement(sequence):sequence;
     const length=found.reduce((n,p)=>n+p.sequence.length,0)+oriented.length;
     if(length>maxLength)throw new RangeError('Assembly exceeds sequence length limit');
     found.push({id:part.id,name:part.name,sourceSequence:sequence,
       sequence:oriented,strand:orientation,path:[...path,ref]});
     return;
   }
   const assembly=library.assemblies[ref];
   if(!assembly)throw new RangeError('Unknown library reference: '+ref);
   active.add(ref);
   const ordered=orientation===1?assembly.placements:[...assembly.placements].reverse();
   for(const placement of ordered)
     descend(placement.ref,orientation*placement.strand,[...path,ref],depth+1);
   active.delete(ref);
 }
 descend(id,1,[],0);
 if(!found.length)throw new RangeError('Assembly contains no parts');
 let cursor=1;
 const parts=found.map(x=>{
   const start=cursor;cursor+=x.sequence.length;
   return {...x,start,end:cursor-1};
 });
 return {id,name:library.assemblies[id]?.name??library.parts[id]?.name??id,
   sequence:parts.map(p=>p.sequence).join(''),length:cursor-1,
   topology:'linear',parts};
}
export function serializePartLibrary(library){
 validLibrary(library);
 for(const [id,p] of Object.entries(library.parts)){
   checkedId(id);if(p.id!==id)throw new RangeError('Part ID mismatch');
   normalizeDNA(p.sequence,{allowAmbiguous:false});
 }
 for(const [id,a] of Object.entries(library.assemblies)){
   checkedId(id);if(a.id!==id)throw new RangeError('Assembly ID mismatch');
   if(!Array.isArray(a.placements)||!a.placements.length)throw new RangeError('Invalid assembly placements');
   for(const p of a.placements){checkedId(p.ref);checkedStrand(p.strand);}
 }
 return JSON.stringify(library,null,2);
}
export function parsePartLibrary(text){
 if(typeof text!=='string'||text.length>10000000)throw new RangeError('Invalid part library JSON size');
 let value;
 try{value=JSON.parse(text);}catch{throw new RangeError('Invalid part library JSON');}
 validLibrary(value);
 const library=createPartLibrary();
 for(const [id,p] of Object.entries(value.parts)){
   if(id!==p?.id)throw new RangeError('Part ID mismatch');
   const next=addLibraryPart(library,p);library.parts=next.parts;
 }
 for(const [id,a] of Object.entries(value.assemblies)){
   if(id!==a?.id)throw new RangeError('Assembly ID mismatch');
   const next=addLibraryAssembly(library,a);library.assemblies=next.assemblies;
 }
 // Validate all graph roots, including disconnected cycles and missing refs.
 for(const id of Object.keys(library.assemblies))resolveLibraryAssembly(library,id);
 return library;
}
