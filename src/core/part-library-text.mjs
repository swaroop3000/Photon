/** Shared, validated saved-library text grammar. */
import {createPartLibrary,addLibraryPart,addLibraryAssembly,resolveLibraryAssembly} from './part-library.mjs';
export function parseEditor(value){
 let library=createPartLibrary();
 const rows=value.split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
 for(const [i,line] of rows.entries()){
   const p=line.split(/\s+/);
   if(p[0]==='part'&&p.length===3)
     library=addLibraryPart(library,{id:p[1],sequence:p[2]});
   else if(p[0]==='assembly'&&p.length>=3){
     const placements=p.slice(2).map(ref=>{
       if(!/[+-]$/.test(ref))throw new RangeError('Placement must end with + or -');
       return {ref:ref.slice(0,-1),strand:ref.endsWith('-')?-1:1};
     });
     library=addLibraryAssembly(library,{id:p[1],placements});
   }else throw new RangeError('Invalid library definition at line '+(i+1));
 }
 // Resolve every assembly, not only the selected root, before storing.
 for(const id of Object.keys(library.assemblies))resolveLibraryAssembly(library,id);
 return library;
}
export function editorText(library){
 const lines=[];
 for(const p of Object.values(library.parts))lines.push('part '+p.id+' '+p.sequence);
 for(const a of Object.values(library.assemblies))
   lines.push('assembly '+a.id+' '+a.placements.map(p=>p.ref+(p.strand===-1?'-':'+')).join(' '));
 return lines.join('\n');
}
