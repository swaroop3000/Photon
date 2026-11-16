/** Photon 2.6 — ordered SBOL 3 SubComponent assembly subset.
 * Linear sequence-only assembly of existing oriented parts; no reaction model.
 * Uses standard Component/SubComponent/instanceOf/Range relationships.
 */
import {normalizeDNA,reverseComplement} from './dna.mjs';
const S='http://sbols.org/v3#',R='http://www.w3.org/1999/02/22-rdf-syntax-ns#',X='http://www.w3.org/2001/XMLSchema#';
const BASE='https://photon.app/sbol3/',SO='https://identifiers.org/SO:',DNA='https://identifiers.org/SBO:0000251',ENC='https://identifiers.org/edam:format_1207';
const uri=s=>'<'+s+'>',lit=s=>JSON.stringify(String(s)),line=(s,p,v)=>uri(s)+' '+uri(p)+' '+v+' .';
const int=n=>lit(n)+'^^'+uri(X+'integer');
const id=s=>String(s??'').replace(/[^a-zA-Z0-9_-]/g,'_').replace(/^[^a-zA-Z_]+/,'c_').slice(0,60)||'part';
export function assembleSbol3Parts(parts,{name='PhotonAssembly'}={}){
 if(!Array.isArray(parts)||parts.length<2||parts.length>100)throw new RangeError('Requires 2–100 ordered components');
 const rawId=id(name),seen=new Set([rawId]);
 const normalized=parts.map((part,index)=>{
   if(!part||typeof part!=='object')throw new TypeError('Invalid component');
   const sequence=normalizeDNA(part.sequence,{allowAmbiguous:false});
   if(!sequence.length)throw new RangeError('Empty part sequence');
   if(![-1,1].includes(part.strand??1))throw new RangeError('Part strand must be +1 or -1');
   const partId=id(part.id??part.name??('part'+(index+1)));
   if(seen.has(partId))throw new RangeError('Duplicate or conflicting component identifiers');
   seen.add(partId);
   return {id:partId,name:String(part.name??part.id??partId),sequence,strand:part.strand??1};
 });
 let sequence='',position=1;
 const placements=normalized.map(part=>{
   const oriented=part.strand===-1?reverseComplement(part.sequence):part.sequence;
   const placement={...part,start:position,end:position+oriented.length-1};
   sequence+=oriented;position+=oriented.length;return placement;
 });
 return {name:String(name),id:rawId,sequence,length:sequence.length,topology:'linear',parts:placements};
}
export function serializeSbol3Assembly(parts,options={}){
 const design=assembleSbol3Parts(parts,options),root=BASE+design.id,seq=root+'/sequence',triples=[];
 const add=(s,p,o)=>triples.push(line(s,S+p,o));
 const typ=(s,t)=>triples.push(line(s,R+'type',uri(S+t)));
 function component(node,display,name,sequenceString,namespace){
   typ(node,'Component');
   add(node,'displayId',lit(display));add(node,'name',lit(name));
   add(node,'hasNamespace',uri(namespace));add(node,'type',uri(DNA));
   add(node,'role',uri(SO+'0000987'));
   const sequenceURI=node+'/sequence';
   add(node,'hasSequence',uri(sequenceURI));
   typ(sequenceURI,'Sequence');
   add(sequenceURI,'displayId',lit('sequence'));add(sequenceURI,'hasNamespace',uri(node+'/'));
   add(sequenceURI,'elements',lit(sequenceString.toLowerCase()));
   add(sequenceURI,'encoding',uri(ENC));
 }
 component(root,design.id,design.name,design.sequence,BASE);
 for(const [index,part] of design.parts.entries()){
   const child=BASE+part.id,instance=root+'/sub'+(index+1),range=instance+'/range1';
   component(child,part.id,part.name,part.sequence,BASE);
   add(root,'hasFeature',uri(instance));
   typ(instance,'SubComponent');
   add(instance,'instanceOf',uri(child));
   add(instance,'name',lit(part.name));
   add(instance,'displayId',lit('sub'+(index+1)));
   add(instance,'hasLocation',uri(range));
   typ(range,'Range');
   add(range,'start',int(part.start));
   add(range,'end',int(part.end));
   add(range,'hasSequence',uri(seq));
   add(range,'orientation',uri(SO+(part.strand===-1?'0001031':'0001030')));
 }
 return triples.sort().join('\n')+'\n';
}
/** Strict Photon subset reader, not a general RDF or SBOL 3 graph parser.
 * Reconstructs only complete ordered, explicit-range SubComponent chains.
 */
export function parseSbol3Assembly(text){
 if(typeof text!=='string')throw new TypeError('Expected N-Triples');
 const graph=new Map();
 const re=/^<([^<>]+)> <([^<>]+)> (<[^<>]+>|"(?:\\.|[^"\\])*"(?:\^\^<[^<>]+>)?) \.$/;
 for(const row of text.split(/\r?\n/)){
   if(!row.trim())continue;
   const m=row.match(re);
   if(!m)throw new RangeError('Unsupported N-Triples statement');
   const [,subject,predicate,object]=m;
   let v;
   if(object.startsWith('<'))v={uri:object.slice(1,-1)};
   else {const typed=object.match(/^("(?:\\.|[^"\\])*")(?:\^\^<([^<>]+)>)?$/);if(!typed)throw new RangeError('Malformed RDF literal');v={literal:JSON.parse(typed[1]),datatype:typed[2]??null};}
   if(!graph.has(subject))graph.set(subject,new Map());
   const props=graph.get(subject);if(!props.has(predicate))props.set(predicate,[]);props.get(predicate).push(v);
 }
 const all=(subject,key)=>graph.get(subject)?.get(key)??[];
 const one=(subject,key)=>{
   const values=all(subject,key);
   if(values.length!==1)throw new RangeError('Missing or repeated '+key);
   return values[0];
 };
 const asURI=(s,k)=>{const v=one(s,k);if(!v.uri)throw new RangeError('Expected URI');return v.uri;};
 const asText=(s,k)=>{const v=one(s,k);if(typeof v.literal!=='string')throw new RangeError('Expected literal');return v.literal;};
 const nodes=[...graph.keys()].filter(x=>all(x,R+'type').some(v=>v.uri===S+'Component'));
 const parents=nodes.filter(x=>all(x,S+'hasFeature').length);
 if(parents.length!==1)throw new RangeError('Expected one assembly parent');
 const parent=parents[0],links=all(parent,S+'hasFeature').map(v=>v.uri);
 if(links.length<2||links.length>100||links.some(x=>!x))throw new RangeError('Invalid assembly members');
 const seqOf=node=>{
   const seq=asURI(node,S+'hasSequence');
   if(!all(seq,R+'type').some(v=>v.uri===S+'Sequence'))throw new RangeError('Missing Sequence');
   if(asURI(seq,S+'encoding')!==ENC)throw new RangeError('Unsupported sequence encoding');
   return normalizeDNA(asText(seq,S+'elements'),{allowAmbiguous:false});
 };
 const assemblySequence=seqOf(parent);
 const placed=links.map(instance=>{
   if(!all(instance,R+'type').some(v=>v.uri===S+'SubComponent'))throw new RangeError('Not a SubComponent');
   const child=asURI(instance,S+'instanceOf'),range=asURI(instance,S+'hasLocation');
   if(!nodes.includes(child)||!all(range,R+'type').some(v=>v.uri===S+'Range'))
     throw new RangeError('Missing component or range');
   const start=Number(asText(range,S+'start')),end=Number(asText(range,S+'end'));
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end<start||start<1)
     throw new RangeError('Invalid part range');
   const orientation=asURI(range,S+'orientation');
   if(![SO+'0001030',SO+'0001031'].includes(orientation))throw new RangeError('Unsupported part orientation');
   const strand=orientation===SO+'0001031'?-1:1,sequence=seqOf(child);
   if(end-start+1!==sequence.length||assemblySequence.slice(start-1,end)!==
     (strand===-1?reverseComplement(sequence):sequence))
     throw new RangeError('Part sequence disagrees with parent sequence');
   return {id:asText(child,S+'displayId'),name:asText(child,S+'name'),
     sequence,strand,start,end};
 });
 placed.sort((a,b)=>a.start-b.start);
 let expected=1;
 for(const part of placed){if(part.start!==expected)throw new RangeError('Assembly has gaps or overlaps');expected=part.end+1;}
 if(expected!==assemblySequence.length+1)throw new RangeError('Incomplete assembly');
 return {name:asText(parent,S+'name'),id:asText(parent,S+'displayId'),
   sequence:assemblySequence,length:assemblySequence.length,topology:'linear',parts:placed};
}
