/** Synthetic example construct; no biological function or lab result implied. */
export function createExampleConstruct(){
 let seq='';const features=[];
 const add=(dna,name,type)=>{const start=seq.length+1;seq+=dna;if(name)features.push({name,type,start,end:seq.length,strand:1,qualifiers:{note:'Synthetic example; biological activity not validated.'}});};
 add('TAATACGACTCACTATAGGG','T7 promoter motif','promoter');
 add('AACCGGTT'.repeat(8));
 add('AGGAGG','RBS motif','RBS');add('AACCGG');
 add('ATG'+'GCTGAA'.repeat(30)+'TAA','Illustrative coding region','CDS');
 add('ACGT'.repeat(16));add('GAATTCGGATCC','Cloning-site motifs','misc_feature');
 add('ATCGGCTA'.repeat(50),'Synthetic scaffold','misc_feature');
 return {name:'Example_DNA',seq,topology:'circular',features};
}
