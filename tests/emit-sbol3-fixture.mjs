import {serializeSbol3NTriples} from '../src/core/sbol3-nt.mjs';
const sample={name:'ReferenceConstruct',seq:'AACCGGTTAACC',topology:'circular',features:[
 {name:'wrapped-cds',type:'CDS',start:10,end:3,strand:-1,qualifiers:{gene:'ref1'}},
 {name:'promoter',type:'promoter',start:4,end:7,strand:1}
]};
process.stdout.write(serializeSbol3NTriples(sample));
