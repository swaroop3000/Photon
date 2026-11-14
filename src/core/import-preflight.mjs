/** Conservative local-browser import limits (not a storage quota guarantee).
 * Repositories are persisted as JSON in localStorage, which has browser-specific limits.
 * Pure preflight: no DOM, storage or state mutation.
 */
export function preflightGenbankCollection(records, {
 maxRecords=100,maxTotalBases=1_000_000,maxRecordBases=500_000,maxFeatures=20_000
}={}){
 for(const [key,value] of Object.entries({maxRecords,maxTotalBases,maxRecordBases,maxFeatures}))
   if(!Number.isSafeInteger(value)||value<1)throw new RangeError('Invalid import limit: '+key);
 if(!Array.isArray(records)||!records.length||records.length>maxRecords)
   throw new RangeError('Collection record count exceeds local import limit');
 let bases=0,features=0;
 const names=new Map(),details=[];
 for(const record of records){
   if(!record||typeof record.name!=='string'||!record.name.trim()||
      typeof record.seq!=='string'||!record.seq.length||
      !Array.isArray(record.features)||!['linear','circular'].includes(record.topology))
     throw new RangeError('Invalid GenBank construct in collection');
   if(record.seq.length>maxRecordBases)
     throw new RangeError('Record '+record.name+' exceeds local sequence size limit');
   bases+=record.seq.length;
   features+=record.features.length;
   if(bases>maxTotalBases||features>maxFeatures)
     throw new RangeError('Collection exceeds local sequence or annotation limit');
   const count=(names.get(record.name)||0)+1;
   names.set(record.name,count);
   details.push({name:record.name,bases:record.seq.length,features:record.features.length,duplicateName:count>1});
 }
 return {recordCount:records.length,totalBases:bases,totalFeatures:features,details,
  duplicateNames:[...names].filter(([,n])=>n>1).map(([name])=>name)};
}
