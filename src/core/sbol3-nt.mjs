/** Photon 2.5 — SBOL 3 RDF N-Triples, a minimal, explicitly supported subset.
 * Uses standard SBOL 3 Component, Sequence, SequenceFeature and Range nodes.
 * Origin-spanning features use two ordered, non-overlapping Range nodes.
 * Photon-specific qualifiers and legacy feature types use extension predicates.
 * N-Triples import is intentionally restricted; no general RDF graph handling.
 */
import {normalizeDNA} from './dna.mjs';
import {validateFeature} from './feature-io.mjs';
const SBOL='http://sbols.org/v3#';
const RDF='http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const XSD='http://www.w3.org/2001/XMLSchema#';
const PHOTON='https://photon.app/ns/1#';
const SO='https://identifiers.org/SO:';
const DNA='https://identifiers.org/SBO:0000251';
const IUPAC='https://identifiers.org/edam:format_1207';
const BASE='https://photon.app/sbol3/';
const ROLE={CDS:'0000316',promoter:'0000167',terminator:'0000141',origin:'0000296',primer:'0000112',gene:'0000704'};
const I=u=>'<'+u+'>';
const L=s=>JSON.stringify(String(s));
const triple=(s,p,o)=>I(s)+' '+I(p)+' '+o+' .';
const pred=k=>SBOL+k;
const ext=k=>PHOTON+k;
const uris={rdfType:RDF+'type',component:pred('Component'),sequence:pred('Sequence'),
 feature:pred('SequenceFeature'),range:pred('Range')};
const integer=n=>L(n)+'^^'+I(XSD+'integer');
function simpleID(name){
 const id=String(name||'construct').replace(/[^A-Za-z0-9_-]/g,'_').replace(/^[^A-Za-z_]+/,'c_').slice(0,70);
 return id||'construct';
}
export function serializeSbol3NTriples(w){
 if(!w||!['linear','circular'].includes(w.topology))throw new RangeError('Invalid topology');
 const seq=normalizeDNA(w.seq,{allowAmbiguous:false}),n=seq.length;
 if(!n)throw new RangeError('Cannot export an empty sequence');
 const id=simpleID(w.name),component=BASE+id,sequence=component+'/sequence';
 const t=[];
 const add=(s,p,o)=>t.push(triple(s,p,o));
 add(component,uris.rdfType,I(uris.component));
 add(component,pred('displayId'),L(id));
 add(component,pred('name'),L(w.name||id));
 add(component,pred('type'),I(DNA));
 add(component,pred('role'),I(SO+(w.topology==='circular'?'0000988':'0000987')));
 add(component,pred('hasSequence'),I(sequence));
 add(sequence,uris.rdfType,I(uris.sequence));
 add(sequence,pred('displayId'),L(id+'_sequence'));
 add(sequence,pred('elements'),L(seq.toLowerCase()));
 add(sequence,pred('encoding'),I(IUPAC));
 for(const [index,f] of (w.features||[]).entries()){
   validateFeature(f,n,{circular:w.topology==='circular'});
   const node=component+'/feature'+(index+1);
   add(component,pred('hasFeature'),I(node));
   add(node,uris.rdfType,I(uris.feature));
   add(node,pred('name'),L(f.name??''));
   add(node,pred('displayId'),L('feature'+(index+1)));
   if(ROLE[f.type])add(node,pred('role'),I(SO+ROLE[f.type]));
   add(node,ext('legacyType'),L(f.type??'misc'));
   const spans=f.start>f.end?[[f.start,n],[1,f.end]]:[[f.start,f.end]];
   spans.forEach(([start,end],j)=>{
     const loc=node+'/range'+(j+1);
     add(node,pred('hasLocation'),I(loc));
     add(loc,uris.rdfType,I(uris.range));
     add(loc,pred('start'),integer(start));
     add(loc,pred('end'),integer(end));
     add(loc,pred('hasSequence'),I(sequence));
     add(loc,pred('orientation'),I(SO+(f.strand===-1?'0001031':'0001030')));
     if(spans.length===2)add(loc,pred('order'),integer(j+1));
   });
   const q=f.qualifiers??{};
   if(!q||typeof q!=='object'||Array.isArray(q))throw new RangeError('Invalid feature qualifiers');
   for(const [key,val] of Object.entries(q)){
     if(!/^[A-Za-z][\w-]{0,63}$/.test(key)||typeof val!=='string')
       throw new RangeError('Unsupported qualifier key or value');
     add(node,ext('qualifier_'+key),L(val));
   }
 }
 return t.sort().join('\n')+'\n';
}
function decodeLiteral(raw){
 // Strict RDF N-Triples subset: JSON-compatible escaped literals, optional xsd:integer.
 const m=raw.match(/^("(?:\\.|[^"\\])*")(?:\^\^<([^>]+)>)?$/);
 if(!m)throw new RangeError('Unsupported RDF literal');
 let value;
 try{value=JSON.parse(m[1]);}catch{throw new RangeError('Malformed RDF literal');}
 if(m[2]&&m[2]!==XSD+'integer')throw new RangeError('Unsupported RDF literal datatype');
 if(m[2]&&!/^-?\d+$/.test(value))throw new RangeError('Invalid integer literal');
 return {value,datatype:m[2]??null};
}
export function parseSbol3NTriples(input){
 if(typeof input!=='string')throw new TypeError('Expected RDF N-Triples text');
 const graph=new Map();
 const regex=/^<([^<>]+)> <([^<>]+)> (<[^<>]+>|"(?:\\.|[^"\\])*"(?:\^\^<[^<>]+>)?) \.$/;
 let seen=0;
 for(const line of input.split(/\r?\n/)){
   if(!line.trim()||line.startsWith('#'))continue;
   const m=line.match(regex);
   if(!m)throw new RangeError('Unsupported N-Triples syntax');
   seen++;
   if(seen>200000)throw new RangeError('RDF graph size limit exceeded');
   const [,subject,predicate,raw]=m;
   const value=raw.startsWith('<')?{uri:raw.slice(1,-1)}:decodeLiteral(raw);
   if(!graph.has(subject))graph.set(subject,new Map());
   const properties=graph.get(subject);
   if(!properties.has(predicate))properties.set(predicate,[]);
   properties.get(predicate).push(value);
 }
 const vals=(subject,p)=>graph.get(subject)?.get(p)??[];
 const one=(subject,p,optional=false)=>{
   const v=vals(subject,p);
   if((optional&&v.length===0))return null;
   if(v.length!==1)throw new RangeError('Expected one '+p+' on '+subject);
   return v[0];
 };
 const uri=(subject,p)=>{const v=one(subject,p);if(!v.uri)throw new RangeError('Expected URI for '+p);return v.uri;};
 const lit=(subject,p)=>{const v=one(subject,p);if(typeof v.value!=='string')throw new RangeError('Expected literal for '+p);return v.value;};
 const comps=[...graph.keys()].filter(s=>vals(s,uris.rdfType).some(v=>v.uri===uris.component));
 if(comps.length!==1)throw new RangeError('Expected one SBOL 3 Component');
 const component=comps[0];
 const sequence=uri(component,pred('hasSequence'));
 if(!vals(sequence,uris.rdfType).some(v=>v.uri===uris.sequence))throw new RangeError('Referenced Sequence is missing');
 if(uri(sequence,pred('encoding'))!==IUPAC)throw new RangeError('Unsupported sequence encoding');
 const seq=normalizeDNA(lit(sequence,pred('elements')),{allowAmbiguous:false});
 const role=vals(component,pred('role')).map(v=>v.uri);
 const circular=role.includes(SO+'0000988'),linear=role.includes(SO+'0000987');
 if(circular===linear)throw new RangeError('Missing or conflicting topology');
 if(!vals(component,pred('type')).some(v=>v.uri===DNA))throw new RangeError('Not an SBOL DNA component');
 const features=[];
 const featureNodes=vals(component,pred('hasFeature')).map(v=>v.uri);
 // Photon feature identifiers encode their insertion order. RDF triples are
 // unordered, and lexical sorting otherwise places feature10 before feature2.
 featureNodes.sort((a,b)=>{
   const na=Number(a?.match(/\/feature(\d+)$/)?.[1]),nb=Number(b?.match(/\/feature(\d+)$/)?.[1]);
   if(!Number.isSafeInteger(na)||!Number.isSafeInteger(nb))
     throw new RangeError('Unsupported feature identifier ordering');
   return na-nb;
 });
 for(const node of featureNodes){
   if(!node||!vals(node,uris.rdfType).some(v=>v.uri===uris.feature))
     throw new RangeError('Unsupported feature type');
   const locs=vals(node,pred('hasLocation')).map(v=>v.uri);
   if(locs.length<1||locs.length>2||locs.some(x=>!x))throw new RangeError('Unsupported feature locations');
   const segments=locs.map(loc=>{
     if(!vals(loc,uris.rdfType).some(v=>v.uri===uris.range)||uri(loc,pred('hasSequence'))!==sequence)
       throw new RangeError('Invalid Range reference');
     const start=Number(lit(loc,pred('start'))),end=Number(lit(loc,pred('end')));
     const orient=uri(loc,pred('orientation'));
     if(![SO+'0001030',SO+'0001031'].includes(orient))throw new RangeError('Unsupported orientation');
     const order=one(loc,pred('order'),true);
     return {start,end,orient,order:order?Number(order.value):null};
   });
   if(segments.length===2){
     segments.sort((a,b)=>a.order-b.order);
     if(segments[0].order!==1||segments[1].order!==2||
        segments[0].end!==seq.length||segments[1].start!==1||
        segments[0].start<=segments[1].end)
       throw new RangeError('Two-range feature is not an origin-spanning join');
   }
   if(segments.some(s=>s.orient!==segments[0].orient))
     throw new RangeError('Mixed feature orientations are not supported');
   const f={name:lit(node,pred('name')),type:lit(node,ext('legacyType')),
     start:segments[0].start,end:segments.at(-1).end,
     strand:segments[0].orient===SO+'0001031'?-1:1};
   validateFeature(f,seq.length,{circular});
   const quals={};
   for(const [p,v] of graph.get(node)??[]){
     if(p.startsWith(ext('qualifier_'))){
       const key=p.slice(ext('qualifier_').length);
       if(!/^[A-Za-z][\w-]{0,63}$/.test(key)||v.length!==1||typeof v[0].value!=='string')
         throw new RangeError('Invalid extension qualifier');
       quals[key]=v[0].value;
     }
   }
   if(Object.keys(quals).length)f.qualifiers=quals;
   features.push(f);
 }
 return {name:lit(component,pred('name')),seq,topology:circular?'circular':'linear',features};
}
