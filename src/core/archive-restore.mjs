/** Review a bounded browser archive without applying or normalizing its bytes. */
import {parseBrowserArchive,PRIMARY_PROJECT_KEY,sha256} from './project-archive.mjs';
import {parseEditor} from './part-library-text.mjs';
import {parseBackboneLibrary} from './backbone-library.mjs';
export async function reviewArchiveRestore(text,current,legacyEntries){
 if(!current||!Number.isSafeInteger(current.revision)||current.revision<1||!Array.isArray(current.libraries))
  throw new RangeError('Verified active project snapshot required for archive restore');
 const archive=await parseBrowserArchive(text),data=JSON.parse(archive.entries.find(e=>e.key===PRIMARY_PROJECT_KEY).raw);
 const libraries=archive.entries.filter(e=>e.key!==PRIMARY_PROJECT_KEY);
 for(const entry of libraries){
  if(entry.key.startsWith('photon.parts.2.7:'))parseEditor(entry.raw);
  else parseBackboneLibrary(entry.raw);
 }
 const keys=new Set(libraries.map(e=>e.key));
 const removals=current.libraries.filter(e=>!keys.has(e.key)).map(e=>({key:e.key,raw:null}));
 return {data,libraries:[...libraries,...removals],reviewedRevision:current.revision,
  reviewedLegacyHash:await sha256(JSON.stringify(legacyEntries)),archiveHash:archive.sha256,
  projectCount:Object.keys(data.repos).length,libraryCount:libraries.length,removedLibraryCount:removals.length};
}
