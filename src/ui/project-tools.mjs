/** Normal project creation. Existing projects and retained storage stay untouched. */
import {createExampleConstruct} from '../core/example-construct.mjs';
import {newProjectWorking} from '../core/new-project.mjs';
const host=globalThis.PhotonWorkspaceHost;
if(!host)throw new Error('Project workspace unavailable');
const button=document.getElementById('photonNewProject');
button.onclick=()=>{
 let template=null;
 globalThis.modal('<h2 class="ph">New project</h2><div class="sub">Create a separate DNA design. Your existing projects stay in place.</div><div class="field"><label for="projectName">Project name</label><input id="projectName" value="Untitled construct" maxlength="120"></div><div class="field"><label for="projectTopology">Topology</label><select id="projectTopology"><option value="linear">Linear</option><option value="circular">Circular</option></select></div><div class="field"><label for="projectSequence">DNA sequence (optional)</label><textarea id="projectSequence" placeholder="Paste DNA or start with an empty sequence"></textarea></div><button class="btn sm" id="photonUseExample">Use example sequence</button><div class="mini" id="projectTemplateNote" style="margin:8px 0"></div><div id="projectCreateStatus" role="status" class="mini" style="margin:10px 0"></div><div style="display:flex;gap:8px;margin-top:16px"><button class="btn primary" id="photonCreateProject">Create project</button><button class="btn" onclick="closeModal()">Cancel</button></div>');
 const name=document.getElementById('projectName'),seq=document.getElementById('projectSequence'),topology=document.getElementById('projectTopology'),status=document.getElementById('projectCreateStatus'),create=document.getElementById('photonCreateProject');
 document.getElementById('photonUseExample').onclick=()=>{
  template=createExampleConstruct();if(name.value==='Untitled construct')name.value=template.name;
  seq.value=template.seq;topology.value=template.topology;
  document.getElementById('projectTemplateNote').textContent='Example uses synthetic DNA and illustrative annotations. Biological activity is not validated.';
 };
 seq.oninput=()=>{if(template&&seq.value.replace(/\s/g,'').toUpperCase()!==template.seq)document.getElementById('projectTemplateNote').textContent='The edited sequence will be created without template annotations. You can annotate it in the editor.';};
 create.onclick=async()=>{
  create.disabled=true;
  try{const working=newProjectWorking({name:name.value,sequence:seq.value,topology:topology.value,template});await host.createProject(working);globalThis.closeModal();globalThis.flash('Project created and saved.');}
  catch(error){status.textContent='Project could not be created: '+error.message;}
  finally{create.disabled=false;}
 };
 name.focus();
};
