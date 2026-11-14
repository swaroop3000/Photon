/** Single-key localStorage persistence. No writes on unreadable/corrupt startup.
 * Compare-before-write detects observed cross-tab changes; localStorage has no
 * atomic compare-and-swap and this does not promise concurrent write isolation.
 */
import {validateProjectDatabase} from './project-backup.mjs';

export class ProjectStorageError extends Error {
  constructor(message, cause) { super(message, {cause}); this.name='ProjectStorageError'; }
}

export function createProjectStorage(storage, key='locusPro_v1') {
  let expectedRaw, checkpoint, blocked=false, issue=null;
  let recoveryRaw=null, recoveryKind=null;
  function validate(db) { return validateProjectDatabase(db,{maxProjects:Infinity}); }
  function reject(error, attempted) {
    if(attempted!==undefined){recoveryRaw=attempted;recoveryKind='unsaved';}
    issue=new ProjectStorageError('Project was not saved: '+error.message,error);
    throw issue;
  }
  return {
    open({create,migrate=()=>{}}) {
      if(checkpoint!==undefined)throw new Error('Project storage already opened');
      let data;
      try {
        expectedRaw=storage.getItem(key);
        data=expectedRaw===null?create():JSON.parse(expectedRaw);
        migrate(data);validate(data);
        checkpoint=JSON.stringify(data);
      } catch(error) {
        blocked=true;
        recoveryRaw=typeof expectedRaw==='string'?expectedRaw:null;
        recoveryKind='original';
        data=create();checkpoint=JSON.stringify(data);
        issue=new ProjectStorageError('Stored projects could not be loaded. Original storage was left untouched. '+error.message,error);
        return {data,issue};
      }
      if(expectedRaw===null){
        try { this.save(data); } catch(error) { /* Show the usable in-memory demo with a persistent warning. */ }
      }
      return {data,issue};
    },
    save(data,{restore=false}={}) {
      let attempted;
      try {
        attempted=JSON.stringify(data);
        if(checkpoint===undefined)throw new Error('Storage has not been initialized');
        if(blocked&&!restore)throw new Error('Saving is blocked until a validated backup is restored');
        if(expectedRaw===undefined)throw new Error('Cannot verify existing storage; reload after storage access is restored');
        validate(data);
        if(storage.getItem(key)!==expectedRaw)
          throw new Error('Projects changed in another tab. Download unsaved recovery and reload before editing');
        // localStorage setItem is atomic for one key: failure leaves its old value.
        storage.setItem(key,attempted);
        expectedRaw=attempted;checkpoint=attempted;blocked=false;issue=null;
        return true;
      } catch(error) { return reject(error,blocked?undefined:attempted); }
    },
    rollback() { return JSON.parse(checkpoint); },
    get status() { return {blocked,issue,recoveryRaw,recoveryKind}; }
  };
}
