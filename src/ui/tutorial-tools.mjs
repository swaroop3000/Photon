/** Read-only product tutorial: never navigates, renders or saves the workspace. */
const lessons=[
 {title:'Create or import a project',summary:'Start with your DNA or explore a synthetic example.',items:[
  ['New project','Choose a name and topology. Paste DNA, leave the sequence empty, or choose Use example sequence, then Create project. Existing projects stay available in the project menu.'],
  ['Import','Choose Import or drop one supported GenBank, FASTA or Photon file into the workspace. Review the import before applying it or opening a new project. GenBank can carry annotations; FASTA carries sequence only.'],
  ['Try it','Close this tutorial and choose New project → Use example sequence. The example is synthetic and its biological activity is not validated.'] ]},
 {title:'Explore the map and annotations',summary:'See how features relate to the DNA sequence.',items:[
  ['Circular / Linear','These controls change the map view. Toggle topology changes the construct itself; use it only when the molecule topology should change.'],
  ['Features','Click an annotation on the map or in the Features list to inspect its coordinates and strand. Add or edit annotations from Features. Auto-annotate suggests known motifs; review the results.'],
  ['Map export','Use SVG or PNG beside the map to download a figure. Use the main Export menu when you need a sequence file.'] ]},
 {title:'Edit, apply and undo',summary:'Text changes become working DNA only after Apply.',items:[
  ['Apply','Scroll to the sequence editor, change the bases, then select Apply. The status distinguishes unapplied text, uncommitted changes and storage failures.'],
  ['Review annotations','Edits can change feature coordinates or meaning. Review affected annotations. Photon rejects changes it cannot safely interpret; it does not establish biological correctness.'],
  ['Undo / Redo','Use the buttons below the sequence editor to restore complete construct snapshots. Undo history resets at commit or branch boundaries; recorded commits provide longer-term history.'] ]},
 {title:'Record and compare revisions',summary:'Keep a local history of design decisions.',items:[
  ['Commit','After applying an edit, select Commit and enter a useful message. A commit records the current construct, including annotations. Saving an applied edit and recording a commit are separate operations.'],
  ['Commits / Compare','Open Commits to inspect recorded revisions. Compare shows differences between selected revisions or branches.'],
  ['Branches and reviews','Create a branch for an alternative design. Pull Requests and review comments are local project records; this build does not synchronize a team or push to GitHub.'] ]},
 {title:'Use the design tools',summary:'Open these tabs beside or below the workspace.',items:[
  ['Analyze and Primers','Inspect ORFs, supported restriction cuts and translation. Primers provides design and PCR tools; each panel documents its assumptions and required inputs.'],
  ['Cloning and Builder','Cloning offers supported restriction ligation, prepared-overlap and Type IIS workflows. Builder assembles reusable parts and circuits. Review the result before applying it to working DNA.'],
  ['Align and Console','Align compares sequences within its documented bounds. Console runs JavaScript commands over the project; use it carefully because commands can change data. Computational predictions do not establish laboratory outcomes.'] ]},
 {title:'Export and protect your work',summary:'Browser storage and external backups serve different purposes.',items:[
  ['Export','Choose GenBank for supported sequence annotations or FASTA for sequence only. Read the export report. Not every format carries history or every annotation type.'],
  ['Backup projects / Recovery','Backup projects downloads local projects and history. Recovery provides reviewed restore and archives including libraries. Keep backups outside this browser, especially before clearing site data or switching URLs.'],
  ['Download app','Downloads the complete application ZIP, without your projects. Extract it and follow START.txt to run a local HTTP server. Open Tutorial any time, or press ? outside a text field.'] ]},
];
let returnFocus=null;
function close(){globalThis.closeModal();returnFocus?.isConnected&&returnFocus.focus();}
function show(index){
 const lesson=lessons[index];
 globalThis.modal(`<section id="photonTutorial" role="dialog" aria-modal="true" aria-labelledby="tutorialTitle"><div class="tutorial-header"><span class="tutorial-eyebrow">PHOTON TUTORIAL</span><button class="btn sm" id="tutorialClose" aria-label="Close tutorial">Close</button><button class="btn sm" id="tutorialSearchHelp">Search help</button></div><div id="tutorialProgress" role="status">Step ${index+1} of ${lessons.length}</div><h2 id="tutorialTitle" tabindex="-1">${lesson.title}</h2><p class="tutorial-summary">${lesson.summary}</p><ol class="tutorial-lessons">${lesson.items.map(([title,body])=>`<li><b>${title}</b><p>${body}</p></li>`).join('')}</ol><nav class="tutorial-topics" aria-label="Tutorial topics">${lessons.map((_,i)=>`<button class="btn sm" data-lesson="${i}" aria-label="Tutorial step ${i+1}" ${i===index?'aria-current="step"':''}>${i+1}</button>`).join('')}</nav><div class="tutorial-footer"><button class="btn" id="tutorialBack" ${index===0?'disabled':''}>Back</button><button class="btn primary" id="tutorialNext">${index===lessons.length-1?'Finish tutorial':'Next →'}</button></div></section>`);
 const panel=document.getElementById('photonTutorial');
 document.getElementById('tutorialClose').onclick=close;
 document.getElementById('tutorialSearchHelp').onclick=()=>openHelp('');
 document.getElementById('tutorialBack').onclick=()=>show(index-1);
 document.getElementById('tutorialNext').onclick=()=>index===lessons.length-1?close():show(index+1);
 panel.querySelectorAll('[data-lesson]').forEach(button=>button.onclick=()=>show(Number(button.dataset.lesson)));
 panel.onkeydown=event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
  if(event.key==='Tab'){
   const controls=[...panel.querySelectorAll('button:not(:disabled)')],first=controls[0],last=controls.at(-1),active=document.activeElement;
   if(event.shiftKey&&(active===first||active.id==='tutorialTitle')){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&active===last){event.preventDefault();first.focus();}
  }
 };
 document.getElementById('tutorialTitle').focus();
 document.getElementById('modal').scrollTop=0;
}
const tools=[
 {title:'Features',text:'Inputs: current DNA and 1-based inclusive annotation ranges; circular origin features require circular topology. Add/Edit controls change annotations. Output: annotated map and feature list. Auto-annotate detects known motifs; review suggested function and coordinates. Edit warnings identify annotations intersected by edits; acknowledgement is not biological validation.'},
 {title:'Analyze',text:'Inputs: working DNA, selected features and supported enzymes. Output: ORFs, translations, restriction sites and virtual gel. Genetic-code and CDS options follow the documented subset. Ambiguous sites, methylation, chemistry and expression are not inferred. Approximate protein statistics are advisory.'},
 {title:'Primers and PCR',text:'Inputs: template DNA and forward/reverse primers, or a target region. Output: candidate primers, predicted melting/composition metrics and supported PCR products. Primer3 integration accepts local engine results; it does not automatically run a remote service. Check orientation, specificity and reaction conditions. No laboratory yield or genome-wide specificity guarantee.'},
 {title:'Cloning',text:'Inputs: supported restriction enzymes and prepared DNA fragments with explicit ends or overlaps. Output: reviewed assembly candidates and junctions. Use restriction ligation, prepared overlaps or Type IIS panels according to their input instructions. Reject incompatible or ambiguous ends. Sequence compatibility is not a chemistry/yield prediction; Gateway is not included.'},
 {title:'Builder',text:'Inputs: reusable part definitions, orientations and circuit composition, optionally a circular backbone. Output: construct previews, supported SBOL3 exports and reviewed application to working DNA. Review junctions and feature mapping; application changes working DNA and supports full-snapshot Undo. Library saves are separate from project commits.'},
 {title:'Align',text:'Inputs: current DNA and comparison sequences. Output: pairwise or approximate multiple alignment. The legacy pairwise panel limits sequences to its first 1,200 bases; do not use it as a chromosome-scale alignment or variant-calling tool. Inspect sequence lengths before interpreting identity.'},
 {title:'Console',text:'Inputs: trusted JavaScript using the displayed dna API. Output: text results; mutation commands can change projects. Do not paste untrusted code: the console has access to this browser origin and its local data. Use the editor and reviewed tools for ordinary sequence edits.'}
];
function openHelp(query=''){
 const opener=document.activeElement;
 globalThis.modal('<section id="photonHelp" role="dialog" aria-modal="true" aria-labelledby="helpTitle"><div class="tutorial-header"><h2 id="helpTitle" class="ph">Help</h2><button class="btn sm" id="helpClose">Close</button></div><label for="helpSearch">Search tools and workflows</label><input type="search" id="helpSearch" placeholder="Try PCR, backups or GenBank"><div id="helpResults" style="margin-top:16px" aria-live="polite"></div></section>');
 const search=document.getElementById('helpSearch'),results=document.getElementById('helpResults');
 const articles=[...tools,...lessons.map(l=>({title:l.title,text:l.summary+' '+l.items.map(i=>i.join(': ')).join(' ')}))];
 function draw(){const q=search.value.trim().toLowerCase(),found=articles.filter(a=>(a.title+' '+a.text).toLowerCase().includes(q));results.replaceChildren();for(const a of found){const section=document.createElement('article'),title=document.createElement('h3'),body=document.createElement('p');section.className='help-article';title.textContent=a.title;body.textContent=a.text;section.append(title,body);results.append(section);}if(!found.length)results.textContent='No help topics match. Try another term.';}
 const close=()=>{globalThis.closeModal();if(opener?.isConnected)opener.focus();else document.getElementById('helpBtn').focus();};
 search.value=query;search.oninput=draw;draw();document.getElementById('helpClose').onclick=close;
 document.getElementById('photonHelp').onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Tab'){const closeButton=document.getElementById('helpClose');if(!e.shiftKey&&document.activeElement===search){e.preventDefault();closeButton.focus();}else if(e.shiftKey&&document.activeElement===closeButton){e.preventDefault();search.focus();}}};search.focus();
}
globalThis.PhotonTutorial={open(){returnFocus=document.activeElement;show(0);},openTool:openHelp};
