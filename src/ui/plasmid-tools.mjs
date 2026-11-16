/** Photon 1.2: additive analysis panel for restriction site mapping.
 * Uses the already-connected legacy working construct. No design changes.
 */
import { TYPE_II_ENZYMES, virtualDigest } from '../core/restriction.mjs';

export function renderRestrictionPanel() {
  const host=globalThis.PhotonEditorBridgeHost;
  const parent=document.getElementById('tb');
  if(!host||!parent||!document.querySelector('.tab.active[data-tool="analyze"]'))return;
  if(document.getElementById('photonRestrictionV12'))return;
  const panel=document.createElement('section');
  panel.id='photonRestrictionV12';
  panel.style.cssText='border-top:1px solid var(--line);margin-top:20px;padding-top:16px';
  const title=document.createElement('h3');
  title.textContent='Restriction mapping · Photon 1.2';
  const note=document.createElement('div');
  note.className='mini';
  note.textContent='Curated palindromic Type II enzymes. Coordinates are 0-based interbase positions; simulation only.';
  const chooser=document.createElement('select');
  chooser.id='photonRestrictionEnzyme';
  chooser.style.margin='10px 0';
  for(const name of Object.keys(TYPE_II_ENZYMES)){
    const opt=document.createElement('option');opt.value=name;opt.textContent=name;chooser.append(opt);
  }
  const button=document.createElement('button');
  button.className='btn sm primary';button.textContent='Map and digest';
  const output=document.createElement('pre');
  output.id='photonRestrictionResults';
  output.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;margin-top:10px';
  button.addEventListener('click',()=>{
    try{
      const w=host.working();
      const r=virtualDigest(w.seq,[chooser.value],{circular:w.topology==='circular'});
      const rows=r.sites.map(s=>s.enzyme+' @ '+(s.start+1)+' bp'+
        (s.wrapsOrigin?' (origin-spanning)':'')+
        ' | top cut '+s.topCut+' | bottom cut '+s.bottomCut+' | '+s.overhangType).join('\n');
      output.textContent='Length: '+r.length+' bp\nTopology: '+r.topology+
        '\nSites: '+r.sites.length+'\nFragments: '+(r.fragments.join(', ')||'none')+' bp'+
        '\n\n'+(rows||'No sites found.');
    }catch(error){output.textContent='Analysis failed: '+error.message;}
  });
  panel.append(title,note,chooser,button,output);
  parent.append(panel);
}
globalThis.PhotonPlasmidTools={render:renderRestrictionPanel};
renderRestrictionPanel();
