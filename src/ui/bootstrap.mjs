/** Validate/open projects before the existing UI modules inspect the working construct. */
import {createProjectStorage} from '../core/project-storage.mjs';
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
globalThis.PhotonInitializeStorage(createProjectStorage(storage));
const modules=[
  'recovery-tools.mjs',
  'editor-bridge.mjs',
  'plasmid-tools.mjs',
  'restriction-overlay.mjs',
  'cloning-tools.mjs',
  'gibson-tools.mjs',
  'golden-gate-tools.mjs',
  'primer-tools.mjs',
  'primer-design-tools.mjs',
  'primer3-local-tools.mjs',
  'primer-map.mjs',
  'primer-mismatch-tools.mjs',
  'wrapped-features.mjs',
  'feature-io-tools.mjs',
  'sbol3-tools.mjs',
  'sbol3-assembly-tools.mjs',
  'part-library-tools.mjs',
  'visual-circuit-tools.mjs',
  'circuit-apply-tools.mjs',
  'circular-backbone-tools.mjs',
  'backbone-library-tools.mjs',
  'construct-qc-tools.mjs',
  'translation-explorer-tools.mjs',
];
for(const module of modules){
 try{await import('./'+module);}
 catch(error){console.error('Photon module unavailable: '+module,error);}
}
