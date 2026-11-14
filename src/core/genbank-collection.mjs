/** Loss-averse handling of GenBank flat-file collections.
 * Each record is parsed using Photon's deliberately limited single-record
 * parser. Unsupported INSDC syntax throws rather than losing information.
 */
import { parseGenbank, serializeGenbank } from './feature-io.mjs';

export function splitGenbankRecords(text,{maxRecords=1000}={}) {
 if(typeof text!=='string')throw new TypeError('GenBank collection must be text');
 if(!Number.isSafeInteger(maxRecords)||maxRecords<1)throw new RangeError('Invalid record limit');
 const normalized=text.replace(/\r\n?/g,'\n');
 const records=[];
 let current=[];
 let inside=false;
 for(const line of normalized.split('\n')){
   if(/^LOCUS\s/.test(line)){
     if(inside)throw new RangeError('New LOCUS before prior record terminator');
     inside=true;
   }
   if(!inside){
     if(line.trim())throw new RangeError('Unexpected text outside GenBank records');
     continue;
   }
   current.push(line);
   if(/^\/\/\s*$/.test(line)){
     records.push(current.join('\n')+'\n');
     if(records.length>maxRecords)throw new RangeError('GenBank record limit exceeded');
     current=[];inside=false;
   }
 }
 if(inside||current.length)throw new RangeError('Unterminated GenBank record');
 if(!records.length)throw new RangeError('No GenBank records');
 return records;
}
export function parseGenbankCollection(text,options={}){
 const chunks=splitGenbankRecords(text,options);
 // Abort atomically when one record has unsupported feature grammar.
 return chunks.map(parseGenbank);
}
export function serializeGenbankCollection(records){
 if(!Array.isArray(records)||!records.length)throw new RangeError('At least one record required');
 return records.map(serializeGenbank).join('');
}
