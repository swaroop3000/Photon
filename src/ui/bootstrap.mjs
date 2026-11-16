/** Validate/open projects before the existing UI modules inspect the working construct. */
import {createIndexedProjectStorage} from '../core/indexed-project-storage.mjs';
import {createProjectCommands} from '../core/project-commands.mjs';
import {hasCompoundAnnotations} from '../core/feature-capabilities.mjs';
import {projectBackupFormat} from '../core/project-backup.mjs';
globalThis.PhotonFeatureCapabilities={hasCompoundAnnotations,projectBackupFormat};
import {interpretCDS} from '../core/cds-semantics.mjs';
import {sequenceWindow} from '../core/sequence-window.mjs';
import {curatedDigest,curatedRestrictionSites} from '../core/curated-digest.mjs';
globalThis.PhotonCuratedDigest={digest:curatedDigest,sites:curatedRestrictionSites};
globalThis.PhotonSequenceWindow=sequenceWindow;
globalThis.PhotonCDS={interpret:interpretCDS};
const legacyStorage={get length(){return localStorage.length;},key:i=>localStorage.key(i),getItem:key=>localStorage.getItem(key)};
const fenceStorage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
await globalThis.PhotonInitializeStorage(createIndexedProjectStorage({legacyStorage,fenceStorage}),createProjectCommands);
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
  'investor-demo-tools.mjs',
];
for(const module of modules){
 try{await import('./'+module);}
 catch(error){console.error('Photon module unavailable: '+module,error);}
}
