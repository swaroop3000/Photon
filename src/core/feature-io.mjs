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
 const direct=inner.match(/^(\d+)\.\.(\d+)$/);
 const joined=inner.match(/^join\((\d+)\.\.(\d+),1\.\.(\d+)\)$/);
 if(direct){start=Number(direct[1]);end=Number(direct[2]);}
 else if(joined&&circular&&Number(joined[2])===length){
   start=Number(joined[1]);end=Number(joined[3]);
   if(start<=end)throw new RangeError('Circular join must cross origin');
 }else throw new RangeError('Unsupported GenBank feature location: '+value);
 return validateFeature({start,end,strand:reverse?-1:1},length,{circular});
}
function safeLabel(value){return String(value??'').replace(/[\r\n"]/g,' ').slice(0,160);}
export function serializeGenbank(working){
 const seq=normalizeDNA(working.seq),length=seq.length,circular=working.topology==='circular';
 if(!length)throw new RangeError('Cannot export empty GenBank sequence');
 const name=String(working.name||'Photon').replace(/\s+/g,'_').replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,16);
 const lines=['LOCUS       '+name.padEnd(16)+' '+length+' bp    DNA     '+(circular?'circular':'linear'),
   'DEFINITION  Exported from Photon (limited GenBank subset).',
   'FEATURES             Location/Qualifiers'];
 for(const f of working.features||[]){
   const loc=genbankFeatureLocation(f,length,{circular});
   const type=String(f.type||'misc_feature').replace(/[^A-Za-z0-9_]/g,'_').slice(0,15);
   lines.push('     '+type.padEnd(15)+' '+loc,'                     /label="'+safeLabel(f.name||type)+'"');
 }
 lines.push('ORIGIN');
 for(let i=0;i<length;i+=60)
   lines.push(String(i+1).padStart(9)+' '+(seq.slice(i,i+60).toLowerCase().match(/.{1,10}/g)||[]).join(' '));
 return lines.join('\n')+'\n//\n';
}
/** Parses the explicit GenBank subset above. Unsupported location grammar is
 * rejected rather than silently losing feature relationships.
 */
export function parseGenbank(text){
 if(typeof text!=='string')throw new TypeError('GenBank must be text');
 const locus=text.match(/^LOCUS\s+(\S+).*?(?:\b(circular|linear)\b)/im);
 const name=locus?.[1]||'Imported';
 const topology=locus?.[2]?.toLowerCase()==='circular'?'circular':'linear';
 const origin=text.search(/^ORIGIN\s*$/mi);
 if(origin<0)throw new RangeError('Missing GenBank ORIGIN section');
 const raw=text.slice(origin).replace(/^ORIGIN\s*$/mi,'').split(/^\/\//m)[0];
 const seq=normalizeDNA(raw.replace(/[\s\d]/g,''));
 if(!seq.length)throw new RangeError('Empty GenBank sequence');
 const features=[];
 const section=text.match(/^FEATURES[^\n]*\n([\s\S]*?)(?=^ORIGIN\s*$)/mi)?.[1]||'';
 let active=null;
 for(const line of section.split(/\r?\n/)){
   const header=line.match(/^ {5}(\S+)\s+(.+)\s*$/);
   if(header){
     if(active)features.push(active);
     const loc=parseGenbankFeatureLocation(header[2],seq.length,{circular:topology==='circular'});
     active={name:header[1],type:header[1],...loc};
   }else if(active){
     const label=line.match(/^\s+\/label="([^"]*)"/);
     if(label)active.name=label[1];
     else if(/^\s+\/(gene|product)="([^"]*)"/.test(line)&&active.name===active.type)
       active.name=line.match(/="([^"]*)"/)[1];
   }
 }
 if(active)features.push(active);
 return {name,seq,topology,features};
}
