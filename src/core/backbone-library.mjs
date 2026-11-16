/** Photon 3.1 — standalone validated circular backbone collection.
 * Stores independent snapshots, never mutates Photon repository working state.
 */
import {normalizeDNA} from './dna.mjs';
import {validateFeature} from './feature-io.mjs';
import {hasCompoundAnnotations} from './feature-capabilities.mjs';
export const COMPOUND_BACKBONE_FORMAT='photon/backbones/2';
export const BACKBONE_FORMAT='photon/backbones/1';
export function createBackboneLibrary(){return {format:BACKBONE_FORMAT,entries:{}};}
export function validateBackbone(source){
 if(!source||source.topology!=='circular'||!Array.isArray(source.features))
   throw new RangeError('Backbone must be circular with annotations');
 const seq=normalizeDNA(source.seq,{allowAmbiguous:false});
 if(!seq||seq.length>1000000)throw new RangeError('Backbone length outside 1–1,000,000 bases');
 if(typeof source.name!=='string'||!source.name.trim()||source.name.length>120)
   throw new RangeError('Invalid backbone name');
 const features=source.features.map(f=>{
   validateFeature(f,seq.length,{circular:true});
   return structuredClone(f);
 });
 return {name:source.name,seq,topology:'circular',features};
}
export function addBackbone(library,id,working){
 if(!library||![BACKBONE_FORMAT,COMPOUND_BACKBONE_FORMAT].includes(library.format)||!library.entries||
   typeof library.entries!=='object'||Array.isArray(library.entries))
   throw new RangeError('Invalid backbone library');
 if(typeof id!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,59}$/.test(id))
   throw new RangeError('Invalid backbone ID');
 if(Object.hasOwn(library.entries,id))throw new RangeError('Duplicate backbone ID');
 const next=validateBackbone(working);
 const entries={...library.entries,[id]:next};
 return {format:hasCompoundAnnotations(entries)?COMPOUND_BACKBONE_FORMAT:BACKBONE_FORMAT,entries};
}
export function getBackbone(library,id){
 if(!library||![BACKBONE_FORMAT,COMPOUND_BACKBONE_FORMAT].includes(library.format)||!library.entries||!Object.hasOwn(library.entries,id))
   throw new RangeError('Unknown backbone ID');
 return validateBackbone(library.entries[id]);
}
export function serializeBackboneLibrary(library){
 if(!library||![BACKBONE_FORMAT,COMPOUND_BACKBONE_FORMAT].includes(library.format)||!library.entries||
 typeof library.entries!=='object'||Array.isArray(library.entries))
   throw new RangeError('Invalid backbone library');
 const normalized=createBackboneLibrary();
 for(const [id,value] of Object.entries(library.entries)){
   const updated=addBackbone(normalized,id,value);
   normalized.entries=updated.entries;
 }
 if(hasCompoundAnnotations(normalized))normalized.format=COMPOUND_BACKBONE_FORMAT;
 return JSON.stringify(normalized,null,2);
}
export function parseBackboneLibrary(text){
 if(typeof text!=='string'||text.length>10000000)throw new RangeError('Invalid backbone file size');
 let parsed;
 try{parsed=JSON.parse(text);}catch{throw new RangeError('Invalid backbone JSON');}
 return JSON.parse(serializeBackboneLibrary(parsed));
}
