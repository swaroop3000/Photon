/** Photon 2.8 — pure immutable operations for the visual circuit editor.
 * Operations change only selected assembly placements; validate the complete
 * reference graph before returning a new library. No working DNA mutation.
 */
import {parsePartLibrary,serializePartLibrary,resolveLibraryAssembly} from './part-library.mjs';
function clone(library){return parsePartLibrary(serializePartLibrary(library));}
function integer(i){return Number.isSafeInteger(i);}
function validatePlacement(p){
 if(!p||typeof p.ref!=='string'||!p.ref||
    !Number.isSafeInteger(p.strand)||![1,-1].includes(p.strand))
   throw new RangeError('Invalid component placement');
 return {ref:p.ref,strand:p.strand};
}
export function editCircuitPlacements(library,assemblyID,operation){
 const draft=clone(library);
 const assembly=draft.assemblies[assemblyID];
 if(!assembly)throw new RangeError('Unknown assembly: '+assemblyID);
 if(!operation||typeof operation.type!=='string')throw new TypeError('Operation required');
 const placements=assembly.placements.map(p=>({...p}));
 const i=operation.index;
 switch(operation.type){
  case 'insert':{
   if(!integer(i)||i<0||i>placements.length)throw new RangeError('Invalid insertion position');
   if(placements.length>=100)throw new RangeError('Maximum of 100 placements');
   placements.splice(i,0,validatePlacement(operation.placement));break;
  }
  case 'move':{
   const to=operation.to;
   if(!integer(i)||i<0||i>=placements.length||!integer(to)||to<0||to>=placements.length)
     throw new RangeError('Invalid move position');
   const [moved]=placements.splice(i,1);placements.splice(to,0,moved);break;
  }
  case 'reverse':{
   if(!integer(i)||i<0||i>=placements.length)throw new RangeError('Invalid reverse position');
   placements[i].strand*=-1;break;
  }
  case 'remove':{
   if(!integer(i)||i<0||i>=placements.length)throw new RangeError('Invalid removal position');
   if(placements.length<=1)throw new RangeError('Assembly requires at least one placement');
   placements.splice(i,1);break;
  }
  default:throw new RangeError('Unknown circuit edit operation');
 }
 draft.assemblies[assemblyID]={...assembly,placements};
 // Graph validation ensures this action cannot introduce cycles or broken links.
 for(const id of Object.keys(draft.assemblies))resolveLibraryAssembly(draft,id);
 return draft;
}
