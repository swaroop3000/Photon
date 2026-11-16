/** Synthetic presentation fixture; no biological function or lab result implied. */
export function createInvestorSample(){
 let seq='';const features=[];
 const add=(dna,name,type)=>{const start=seq.length+1;seq+=dna;if(name)features.push({name,type,start,end:seq.length,strand:1,qualifiers:{note:'Synthetic presentation example; biological activity not validated.'}});};
 add('TAATACGACTCACTATAGGG','T7 promoter motif','promoter');
 add('AACCGGTT'.repeat(8));
 add('AGGAGG','RBS motif','RBS');add('AACCGG');
 add('ATG'+'GCTGAA'.repeat(30)+'TAA','Illustrative coding region','CDS');
 add('ACGT'.repeat(16));add('GAATTCGGATCC','Cloning-site motifs','misc_feature');
 add('ATCGGCTA'.repeat(50),'Synthetic scaffold','misc_feature');
 return {name:'Photon_demo',seq,topology:'circular',features};
}
export function investorEditPlan(working){
 const baseline=createInvestorSample();
 if(working?.seq!==baseline.seq||working?.topology!==baseline.topology||
    JSON.stringify(working.features)!==JSON.stringify(baseline.features))
  throw new RangeError('Start a fresh investor sample to apply the example edit.');
 const start=33,before=working.seq[start],insert={A:'G',G:'A',C:'T',T:'C'}[before];
 return {start,end:start+1,insert,before,position:start+1};
}
