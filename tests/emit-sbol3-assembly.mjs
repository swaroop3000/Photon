import {serializeSbol3Assembly} from '../src/core/sbol3-assembly.mjs';
const parts=[
 {id:'Promoter',sequence:'ATGCCGTAA'},
 {id:'Reporter',sequence:'AAGTCCGTA',strand:-1},
 {id:'Terminator',sequence:'TTAACG'}
];
process.stdout.write(serializeSbol3Assembly(parts,{name:'MultiPartCircuit'}));
