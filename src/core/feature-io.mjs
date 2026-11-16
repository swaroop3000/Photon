/** Photon 2.1 — validated feature coordinates and GenBank location subset. */
import {normalizeDNA,reverseComplement} from './dna.mjs';
export function validateFeature(feature,length,{circular=false}={}){
 if(!Number.isSafeInteger(length)||length<1)throw new RangeError('Sequence must have positive length');
 if(!feature||!Number.isSafeInteger(feature.start)||!Number.isSafeInteger(feature.end)||
 feature.start<1||feature.end<1||feature.start>length||feature.end>length)
   throw new RangeError('Feature coordinates must be 1-based integers within sequence length');
 if(feature.start>feature.end&&!circular)throw new RangeError('Origin-spanning features require circular DNA');
 if(feature.strand!==undefined&&![-1,1].includes(feature.strand))
   throw new RangeError('Strand must be +1 or -1');
 if(Object.hasOwn(feature,'segments')){
   const segments=feature.segments;
   if(!Array.isArray(segments)||segments.length<2||segments.length>1000)
     throw new RangeError('Compound features require 2..1000 exact local segments');
   let previous=0;
   for(const part of segments){
     if(!part||Object.keys(part).some(k=>!['start','end'].includes(k))||!Object.hasOwn(part,'start')||!Object.hasOwn(part,'end')||!Number.isSafeInteger(part.start)||!Number.isSafeInteger(part.end)||
        part.start<1||part.end<part.start||part.end>length||part.start<=previous)
       throw new RangeError('Compound segments must be ascending, disjoint exact intervals');
     previous=part.end;
   }
   if(feature.start!==segments[0].start||feature.end!==segments.at(-1).end)
     throw new RangeError('Compound feature envelope differs from its segments');
 }
 return {...feature};
}
/** Genomic display order. Extraction reverses the complete concatenation for -1. */
export function featureIntervals(feature,length,{circular=false}={}){
 const f=validateFeature(feature,length,{circular});
 return f.segments?f.segments.map(p=>({start:p.start,end:p.end})):
   f.start<=f.end?[{start:f.start,end:f.end}]:[{start:f.start,end:length},{start:1,end:f.end}];
}
export function circularFeatureSequence(sequence,feature,{circular=false}={}){
 const seq=normalizeDNA(sequence),f=validateFeature(feature,seq.length,{circular});
 const forward=featureIntervals(f,seq.length,{circular}).map(p=>seq.slice(p.start-1,p.end)).join('');
 return f.strand===-1?reverseComplement(forward):forward;
}
export function genbankFeatureLocation(feature,length,{circular=false}={}){
 const f=validateFeature(feature,length,{circular});
 const parts=featureIntervals(f,length,{circular}).map(p=>p.start+'..'+p.end);
 const loc=parts.length>1?'join('+parts.join(',')+')':parts[0];
 return f.strand===-1?'complement('+loc+')':loc;
}
export function parseGenbankFeatureLocation(value,length,{circular=false}={}){
 const input=String(value).replace(/\s+/g,'');
 const reverse=input.startsWith('complement(')&&input.endsWith(')');
 const inner=reverse?input.slice(11,-1):input;
 let start,end;
 const direct=inner.match(/^(\d+)(?:\.\.(\d+))?$/);
 const joined=inner.match(/^join\((\d+)\.\.(\d+),1\.\.(\d+)\)$/);
 if(direct){start=Number(direct[1]);end=Number(direct[2]??direct[1]);}
 else if(joined&&circular&&Number(joined[2])===length){
   start=Number(joined[1]);end=Number(joined[3]);
   if(start<=end)throw new RangeError('Circular join must cross origin');
 }else if(inner.startsWith('join(')&&inner.endsWith(')')){
   const pieces=inner.slice(5,-1).split(',');
   if(pieces.length<2||pieces.length>1000)throw new RangeError('Unsupported GenBank compound segment count');
   const segments=pieces.map(piece=>{
     const m=piece.match(/^(\d+)(?:\.\.(\d+))?$/);
     if(!m)throw new RangeError('Unsupported GenBank compound location: '+value);
     return {start:Number(m[1]),end:Number(m[2]??m[1])};
   });
   try{return validateFeature({start:segments[0].start,end:segments.at(-1).end,strand:reverse?-1:1,segments},length,{circular});}
   catch(error){throw new RangeError('Unsupported GenBank compound location: '+error.message);}
 }else throw new RangeError('Unsupported GenBank feature location: '+value);
 return validateFeature({start,end,strand:reverse?-1:1},length,{circular});
}
// Unquoted INSDC forms whose lexical syntax is retained without guessing.
const unquotedQualifiers={
 number:/^\d+$/,codon_start:/^[123]$/,transl_table:/^[1-9]\d*$/,citation:/^\[[1-9]\d*\]$/,
 rpt_type:/^(tandem|inverted|flanking|terminal|direct|dispersed|other)$/,
 direction:/^(left|right|both)$/
};
const flagQualifiers=new Set(['pseudo','partial','ribosomal_slippage','trans_splicing',
 'environmental_sample','metagenome_source','focus','germline','rearranged','transgenic','proviral','virion']);
function qualifierText(key,value){
 if(value===true&&flagQualifiers.has(key))return '/'+key;
 if(typeof value!=='string')throw new RangeError('Unsupported GenBank qualifier value: '+key);
 if(key==='number'&&!unquotedQualifiers.number.test(value))return '/'+key+'='+quoteQualifier(value);
 if(Object.hasOwn(unquotedQualifiers,key)){
   if(!unquotedQualifiers[key].test(value))throw new RangeError('Invalid GenBank qualifier value: '+key);
   return '/'+key+'='+value;
 }
 return '/'+key+'='+quoteQualifier(value);
}
function quoteQualifier(value){
 if(typeof value!=='string'||/[\r\n]/.test(value))
   throw new RangeError('Unsupported newline or non-string in GenBank qualifier');
 return '"'+value.replace(/"/g,'""')+'"';
}
export function serializeGenbank(working){
 const seq=normalizeDNA(working.seq),length=seq.length,circular=working.topology==='circular';
 if(!length)throw new RangeError('Cannot export empty GenBank sequence');
 const name=String(working.name||'Photon').replace(/\s+/g,'_').replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,16);
 const lines=['LOCUS       '+name.padEnd(16)+' '+String(length).padStart(11)+' bp    DNA     '+
   (circular?'circular':'linear').padEnd(8)+' UNK 01-JAN-1980',
   'DEFINITION  Exported from Photon (limited GenBank subset).',
   'FEATURES             Location/Qualifiers'];
 for(const f of working.features||[]){
   const loc=genbankFeatureLocation(f,length,{circular});
   const type=String(f.type||'misc_feature').replace(/[^A-Za-z0-9_]/g,'_').slice(0,15);
   lines.push('     '+type.padEnd(15)+' '+loc,'                     /label='+quoteQualifier(f.name||type));
   const qualifiers=f.qualifiers??{};
   if(!qualifiers||typeof qualifiers!=='object'||Array.isArray(qualifiers))
     throw new RangeError('Invalid feature qualifiers');
   for(const [key,value] of Object.entries(qualifiers).sort(([a],[b])=>a.localeCompare(b))){
     if(!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)||key==='label')
       throw new RangeError('Unsupported GenBank qualifier: '+key);
     const values=Array.isArray(value)?value:[value];
     if(Array.isArray(value)&&(value.length<2||value.some(item=>typeof item!=='string')))
       throw new RangeError('Repeated GenBank qualifiers require at least two strings: '+key);
     for(const item of values)lines.push('                     '+qualifierText(key,item));
   }
 }
 lines.push('ORIGIN');
 for(let i=0;i<length;i+=60)
   lines.push(String(i+1).padStart(9)+' '+(seq.slice(i,i+60).toLowerCase().match(/.{1,10}/g)||[]).join(' '));
 return lines.join('\n')+'\n//\n';
}
/** Parses the explicit GenBank subset above. Unsupported location grammar is
 * rejected rather than silently losing feature relationships.
 */
/** Photon 2.4: conservative external GenBank flat-file parser.
 * Supported: one LOCUS/ORIGIN record, single positions, simple ranges,
 * origin-spanning two-part joins, complement, quoted/repeated qualifiers, known
 * valueless flags and selected unquoted tokens. Remote, fuzzy, order and
 * mixed-strand or non-monotonic joins are rejected; exact local exon joins retain segments.
 */
export function parseGenbank(text){
 if(typeof text!=='string')throw new TypeError('GenBank must be text');
 const locus=text.match(/^LOCUS\s+(\S+)\s+(\d+)\s+bp\b([^\r\n]*)/mi);
 if(!locus)throw new RangeError('GenBank LOCUS with sequence length required');
 if(text.slice(0,locus.index).trim()||[...text.matchAll(/^LOCUS\s/gmi)].length!==1)
   throw new RangeError('Expected exactly one GenBank LOCUS record');
 const name=locus[1],declared=Number(locus[2]);
 const topology=/\bcircular\b/i.test(locus[3])?'circular':'linear';
 const origin=text.search(/^ORIGIN(?:\s.*)?$/mi);
 if(origin<0)throw new RangeError('Missing GenBank ORIGIN section');
 // The current importer models one construct. Refuse concatenated records or
 // unterminated records instead of silently dropping sequences and features.
 const recordEnds=[...text.matchAll(/^\/\/\s*$/gm)];
 if(recordEnds.length!==1 || text.slice(recordEnds[0].index+recordEnds[0][0].length).trim())
   throw new RangeError('Expected exactly one terminated GenBank record');
 const originBody=text.slice(origin,recordEnds[0].index)
   .replace(/^ORIGIN[^\r\n]*(?:\r?\n)?/i,'');
 const seqLines=originBody.split(/\r?\n/).filter(l=>l.trim());
 const seq=normalizeDNA(seqLines.map(l=>{
   const match=l.match(/^\s*\d+\s+([A-Za-z\s]+)$/);
   if(!match)throw new RangeError('Invalid GenBank ORIGIN line');
   return match[1].replace(/\s+/g,'');
 }).join(''),{allowAmbiguous:false});
 if(seq.length!==declared)throw new RangeError('LOCUS length differs from ORIGIN sequence');
 if(!seq.length)throw new RangeError('Empty GenBank sequence');
 const features=[];
 const section=text.slice(0,origin).match(/^FEATURES[^\r\n]*\r?\n([\s\S]*)$/mi)?.[1]??'';
 let pending=null;
 function storeQualifier(key,value){
   if(key==='label'){
     if(pending.label!==null)throw new RangeError('Duplicate label qualifier');
     pending.label=value;
   }else if(Object.hasOwn(pending.qualifiers,key)){
     const old=pending.qualifiers[key];
     if((typeof old!=='string'&&!Array.isArray(old))||typeof value!=='string')throw new RangeError('Repeated GenBank flag qualifier: '+key);
     pending.qualifiers[key]=[...(Array.isArray(old)?old:[old]),value];
   }else{
     Object.defineProperty(pending.qualifiers,key,{value,enumerable:true,writable:true,configurable:true});
   }
   pending.openQualifier=null;
 }
 function qualifier(key,raw){
   if(raw===undefined){
     if(!flagQualifiers.has(key))throw new RangeError('Unsupported GenBank flag qualifier: '+key);
     storeQualifier(key,true);return;
   }
   if(!raw.startsWith('"')){
     if(!Object.hasOwn(unquotedQualifiers,key)||!unquotedQualifiers[key].test(raw))
       throw new RangeError('Unsupported GenBank unquoted qualifier: '+key);
     storeQualifier(key,raw);return;
   }
   // INSDC quoted values escape literal quotes by doubling them. Wrapped prose
   // joins with spaces; translation is the whitespace-free amino acid string.
   const match=raw.match(/^"((?:[^"]|"")*)"$/);
   if(!match){
     if(!raw.startsWith('"')||/"(?!")/.test(raw.slice(1).replace(/""/g,'')))
       throw new RangeError('Unsupported GenBank qualifier syntax');
     pending.openQualifier={key,raw};return;
   }
   let value=match[1].replace(/""/g,'"');
   if(key==='translation')value=value.replace(/\s/g,'');
   storeQualifier(key,value);
 }
 function finalize(){
   if(!pending)return;
   if(pending.openQualifier)throw new RangeError('Unterminated multiline GenBank qualifier');
   const coords=parseGenbankFeatureLocation(pending.location,seq.length,{circular:topology==='circular'});
   if(pending.key!=='source'){
     const qualifiers=pending.qualifiers;
     const first=value=>Array.isArray(value)?value[0]:value;
     const label=pending.label??first(qualifiers.gene)??first(qualifiers.product)??pending.key;
     const feature={name:label,type:pending.key,...coords};
     if(Object.keys(qualifiers).length)feature.qualifiers=qualifiers;
     features.push(feature);
   }
   pending=null;
 }
 for(const line of section.split(/\r?\n/)){
   if(!line.trim())continue;
   const header=line.match(/^ {5}(\S+)\s+(.+?)\s*$/);
   if(header){
     finalize();
     pending={key:header[1],location:header[2],qualifiers:{},label:null,qualifierMode:false};
     continue;
   }
   if(!pending)throw new RangeError('Unexpected feature-table line');
   if(!/^ {21}/.test(line))throw new RangeError('Unsupported GenBank feature-table indentation');
   const tail=line.slice(21).trim();
   if(!tail)continue;
   if(pending.openQualifier){
     if(tail.startsWith('/'))throw new RangeError('Unterminated multiline GenBank qualifier');
     const {key,raw}=pending.openQualifier;
     qualifier(key,raw+(key==='translation'?'':' ')+tail);continue;
   }
   if(tail.startsWith('/')){
     pending.qualifierMode=true;
     const m=tail.match(/^\/([A-Za-z][A-Za-z0-9_]*)(?:=(.*))?$/);
     if(!m)throw new RangeError('Unsupported GenBank qualifier syntax: '+tail.slice(0,50));
     qualifier(m[1],m[2]);
   }else if(!pending.qualifierMode){
     pending.location+=tail;
   }else throw new RangeError('Unexpected GenBank qualifier continuation');
 }
 finalize();
 return {name,seq,topology,features};
}
