/** Build a normal project working copy; preserve template annotation meaning. */
import {normalizeDNA} from './dna.mjs';
import {validateFeature} from './feature-io.mjs';
export function newProjectWorking({name,sequence='',topology='linear',template=null}={}){
 if(typeof name!=='string'||!name.trim()||name.trim().length>120)throw new RangeError('Project name must contain 1–120 characters');
 if(!['linear','circular'].includes(topology))throw new RangeError('Choose linear or circular DNA');
 const seq=normalizeDNA(sequence),features=template&&seq===template.seq&&topology===template.topology?structuredClone(template.features):[];
 for(const feature of features)validateFeature(feature,seq.length,{circular:topology==='circular'});
 return {name:name.trim(),seq,topology,features};
}
