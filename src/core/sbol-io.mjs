/** Photon 2.3 — loss-aware, versioned Photon SBOL-like XML interchange subset.
 * Not a general SBOL 2 parser, nor an SBOL-conformant serialization.
 * Explicit photon namespace carries topology and annotation type so roundtrips
 * do not silently flatten origin-spanning features or lose feature identities.
 * Unsupported external documents are rejected rather than guessed.
 */
import {normalizeDNA} from './dna.mjs';
import {validateFeature} from './feature-io.mjs';
const SBOL='http://sbols.org/v2#',PHOTON='https://photon.app/ns/1';
const esc=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const unesc=x=>String(x).replace(/&(amp|lt|gt|quot|apos);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[key]));
function textElement(block,tag,required=true){
 const matches=[...block.matchAll(new RegExp('<'+tag+'>([\\s\\S]*?)<\\/'+tag+'>','g'))];
 if(matches.length!==1){if(!required&&matches.length===0)return null;throw new RangeError('Expected one '+tag+' element');}
 if(/<[^>]+>/.test(matches[0][1])||/&(?!(amp|lt|gt|quot|apos);)/.test(matches[0][1]))throw new RangeError('Unsupported XML content in '+tag);
 return unesc(matches[0][1]);
}
function stringOrEmpty(s){return String(s??'');}
export function serializePhotonSbol(working){
 if(!working||!['linear','circular'].includes(working.topology))throw new RangeError('Invalid construct topology');
 const seq=normalizeDNA(working.seq,{allowAmbiguous:false});
 if(!seq.length)throw new RangeError('Cannot export empty DNA');
 const name=stringOrEmpty(working.name||'Photon');
 const entries=[];
 for(const f of working.features||[]){
   validateFeature(f,seq.length,{circular:working.topology==='circular'});
   const metadata=f.qualifiers??{};
   if(!metadata||typeof metadata!=='object'||Array.isArray(metadata))throw new RangeError('Invalid feature qualifiers');
   const quals=Object.entries(metadata).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>{
     if(!/^[a-zA-Z][\w-]{0,63}$/.test(key)||typeof value!=='string')throw new RangeError('Unsupported qualifier key or value');
     return '        <photon:qualifier name="'+esc(key)+'">'+esc(value)+'</photon:qualifier>';
   });
   entries.push('    <sbol:SequenceAnnotation>\n'+
     '      <sbol:displayId>feature</sbol:displayId>\n'+
     '      <sbol:name>'+esc(stringOrEmpty(f.name))+'</sbol:name>\n'+
     '      <photon:featureType>'+esc(stringOrEmpty(f.type||'misc'))+'</photon:featureType>\n'+
     '      <sbol:location><sbol:Range>\n'+
     '        <sbol:start>'+f.start+'</sbol:start>\n'+
     '        <sbol:end>'+f.end+'</sbol:end>\n'+
     '        <sbol:orientation>'+(f.strand===-1?'reverseComplement':'inline')+'</sbol:orientation>\n'+
     '      </sbol:Range></sbol:location>\n'+quals.join('\n')+(quals.length?'\n':'')+
     '    </sbol:SequenceAnnotation>');
 }
 return '<?xml version="1.0" encoding="UTF-8"?>\n'+
   '<sbol:SBOL xmlns:sbol="'+SBOL+'" xmlns:photon="'+PHOTON+'" photon:format="Photon-2.3">\n'+
   '  <sbol:ComponentDefinition>\n'+
   '    <sbol:displayId>'+esc(name)+'</sbol:displayId>\n'+
   '    <photon:topology>'+working.topology+'</photon:topology>\n'+
   '    <sbol:sequence>'+seq+'</sbol:sequence>\n'+
   entries.join('\n')+(entries.length?'\n':'')+
   '  </sbol:ComponentDefinition>\n</sbol:SBOL>\n';
}
export function parsePhotonSbol(xml){
 if(typeof xml!=='string')throw new TypeError('XML input must be text');
 if(!xml.includes('photon:format="Photon-2.3"')||
    !xml.includes('xmlns:sbol="'+SBOL+'"')||
    !xml.includes('xmlns:photon="'+PHOTON+'"'))
   throw new RangeError('Unsupported SBOL document: Photon 2.3 interchange format required');
 if(/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(xml))throw new RangeError('Unsupported XML directives');
 const match=xml.match(/<sbol:ComponentDefinition>([\s\S]*?)<\/sbol:ComponentDefinition>/g);
 if(!match||match.length!==1)throw new RangeError('Exactly one ComponentDefinition required');
 const block=match[0];
 const first=block.indexOf('<sbol:SequenceAnnotation>');
 const head=first>=0?block.slice(0,first):block;
 const name=textElement(head,'sbol:displayId');
 const topology=textElement(head,'photon:topology');
 if(!['linear','circular'].includes(topology))throw new RangeError('Unsupported topology');
 const seq=normalizeDNA(textElement(head,'sbol:sequence'),{allowAmbiguous:false});
 if(!seq.length)throw new RangeError('Empty DNA sequence');
 const annotations=[...block.matchAll(/<sbol:SequenceAnnotation>([\s\S]*?)<\/sbol:SequenceAnnotation>/g)];
 const features=[];
 for(const [,part] of annotations){
   const start=Number(textElement(part,'sbol:start')),end=Number(textElement(part,'sbol:end'));
   const orientation=textElement(part,'sbol:orientation');
   if(!['inline','reverseComplement'].includes(orientation))throw new RangeError('Unsupported strand orientation');
   const feature={name:textElement(part,'sbol:name'),type:textElement(part,'photon:featureType'),
     start,end,strand:orientation==='reverseComplement'?-1:1};
   validateFeature(feature,seq.length,{circular:topology==='circular'});
   const qualifiers={};
   for(const [,key,value] of part.matchAll(/<photon:qualifier name="([^"]+)">([^<]*)<\/photon:qualifier>/g)){
     const decodedKey=unesc(key);
     if(!/^[a-zA-Z][\w-]{0,63}$/.test(decodedKey)||Object.hasOwn(qualifiers,decodedKey))throw new RangeError('Duplicate or invalid qualifier');
     qualifiers[decodedKey]=unesc(value);
   }
   if(Object.keys(qualifiers).length)feature.qualifiers=qualifiers;
   features.push(feature);
 }
 return {name,seq,topology,features};
}
