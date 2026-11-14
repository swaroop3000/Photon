/** Photon 2.9 — construct replacement from a validated reusable DNA circuit.
 * Output is a new linear working snapshot, not an automatic Git commit.
 * Every leaf placement becomes one 1-based inclusive, strand-aware annotation.
 */
import {normalizeDNA} from './dna.mjs';
import {resolveLibraryAssembly} from './part-library.mjs';
import {validateFeature} from './feature-io.mjs';
export function circuitToConstruct(library,id,current,{name}={}){
 if(!current||typeof current!=='object'||!Array.isArray(current.features))
   throw new TypeError('Working Photon construct required');
 const assembly=resolveLibraryAssembly(library,id);
 if(!Object.hasOwn(library.assemblies,id))
   throw new RangeError('Circuit root must be an assembly');
 const sequence=normalizeDNA(assembly.sequence,{allowAmbiguous:false});
 if(!sequence||sequence.length!==assembly.length)throw new RangeError('Invalid assembled DNA sequence');
 const targetName=name??assembly.name??id;
 if(typeof targetName!=='string'||!targetName.trim()||targetName.length>120)
   throw new RangeError('Invalid target construct name');
 const features=assembly.parts.map((part,index)=>{
   const feature={
     name:part.name||part.id,
     type:'misc_feature',
     start:part.start,end:part.end,strand:part.strand,
     qualifiers:{note:'Photon circuit '+id+'; placement '+(index+1)+
       '; source path '+part.path.join(' / ')}
   };
   validateFeature(feature,sequence.length,{circular:false});
   return feature;
 });
 // Ensure annotations tile the full assembled sequence, without gaps or overlaps.
 let next=1;
 for(const f of features){if(f.start!==next)throw new RangeError('Noncontiguous circuit placement');next=f.end+1;}
 if(next!==sequence.length+1)throw new RangeError('Incomplete circuit coverage');
 return {
   name:targetName.trim(),seq:sequence,topology:'linear',features
 };
}
