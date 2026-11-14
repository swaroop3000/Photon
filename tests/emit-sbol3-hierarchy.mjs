import {createPartLibrary,addLibraryPart,addLibraryAssembly} from '../src/core/part-library.mjs';
import {serializeHierarchicalSbol3} from '../src/core/sbol3-hierarchy.mjs';
let lib=createPartLibrary();
for(const [id,sequence] of [['promoter','ATGC'],['gene','AAGT'],['terminator','CCAA']])
 lib=addLibraryPart(lib,{id,sequence});
lib=addLibraryAssembly(lib,{id:'cassette',placements:[
 {ref:'promoter',strand:1},{ref:'gene',strand:1}]});
lib=addLibraryAssembly(lib,{id:'circuit',placements:[
 {ref:'cassette',strand:1},{ref:'terminator',strand:-1},
 {ref:'cassette',strand:-1}]});
process.stdout.write(serializeHierarchicalSbol3(lib,'circuit'));
