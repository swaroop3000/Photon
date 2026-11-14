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
 return {...feature};
}
export function circularFeatureSequence(sequence,feature,{circular=false}={}){
 const seq=normalizeDNA(sequence),f=validateFeature(feature,seq.length,{circular});
 const forward=f.start<=f.end?seq.slice(f.start-1,f.end)
   :seq.slice(f.start-1)+seq.slice(0,f.end);
 return f.strand===-1?reverseComplement(forward):forward;
}
export function genbankFeatureLocation(feature,length,{circular=false}={}){
 const f=validateFeature(feature,length,{circular});
 const loc=f.start>f.end?'join('+f.start+'..'+length+',1..'+f.end+')':f.start+'..'+f.end;
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
 }else throw new RangeError('Unsupported GenBank feature location: '+value);
 return validateFeature({start,end,strand:reverse?-1:1},length,{circular});
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
     if(!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)||typeof value!=='string'||key==='label')
       throw new RangeError('Unsupported GenBank qualifier: '+key);
     lines.push('                     /'+key+'='+quoteQualifier(value));
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
 * origin-spanning two-part joins, complement, and single-line quoted qualifiers.
 * Remote, fuzzy, order, multi-exon joins, valueless/repeated
 * qualifiers are rejected because the current feature model cannot retain them.
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
 function qualifier(key,raw){
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
   if(key==='label'){
     if(pending.label!==null)throw new RangeError('Duplicate label qualifier');
     pending.label=value;
   }else{
     if(Object.hasOwn(pending.qualifiers,key))throw new RangeError('Repeated GenBank qualifier not representable: '+key);
     // Define as own data property, including unusual keys such as __proto__.
     Object.defineProperty(pending.qualifiers,key,{value,enumerable:true,writable:true,configurable:true});
   }
   pending.openQualifier=null;
 }
 function finalize(){
   if(!pending)return;
   if(pending.openQualifier)throw new RangeError('Unterminated multiline GenBank qualifier');
   const coords=parseGenbankFeatureLocation(pending.location,seq.length,{circular:topology==='circular'});
   if(pending.key!=='source'){
     const qualifiers=pending.qualifiers;
     const label=pending.label??qualifiers.gene??qualifiers.product??pending.key;
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
     const m=tail.match(/^\/([A-Za-z][A-Za-z0-9_]*)=(".*)$/);
     if(!m)throw new RangeError('Unsupported GenBank qualifier syntax: '+tail.slice(0,50));
     qualifier(m[1],m[2]);
   }else if(!pending.qualifierMode){
     pending.location+=tail;
   }else throw new RangeError('Unexpected GenBank qualifier continuation');
 }
 finalize();
 return {name,seq,topology,features};
}
