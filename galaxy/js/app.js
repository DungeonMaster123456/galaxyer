/* Galaxy — app.js
   Main app shell: sidebar, project view, modals, settings, file-type routing.
*/
import * as Store from './store.js';
import { renderDocEditor, newDocDefaultContent } from './modules/docs.js';
import { renderSlidesEditor, newSlidesDefaultContent } from './modules/slides.js';
import { renderSheetEditor, newSheetDefaultContent } from './modules/sheets.js';
import { renderCodeEditor, newCodeDefaultContent } from './modules/code.js';
import { renderBlocksEditor, newBlocksDefaultContent } from './modules/blocks.js';

let view = 'repo'; // 'repo' | 'settings'
let editingFileId = null;
let selectedNewFileType = 'code';
let selectedNewFileLang = 'html';
let selectedRepoColor = Store.COLORS[0];
let liveEditorHandle = null;

const FILE_TYPES = [
  { kind:'code',   lang:'html',       ic:'💻', label:'HTML/Code' },
  { kind:'doc',    lang:null,         ic:'📝', label:'Document' },
  { kind:'slides', lang:null,         ic:'📊', label:'Slides' },
  { kind:'sheet',  lang:null,         ic:'📈', label:'Spreadsheet' },
  { kind:'blocks', lang:null,         ic:'🧩', label:'Block code' },
];

/* ---------------- Helpers ---------------- */
function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function fmtTime(ts){
  const diff = Date.now() - ts;
  if(diff < 60000) return 'just now';
  if(diff < 3600000) return Math.floor(diff/60000)+'m ago';
  if(diff < 86400000) return Math.floor(diff/3600000)+'h ago';
  return new Date(ts).toLocaleDateString(undefined,{month:'short', day:'numeric'});
}
function fmtSize(bytes){
  if(!bytes) return '—';
  if(bytes < 1024) return bytes+' B';
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1)+' KB';
  return (bytes/1024/1024).toFixed(1)+' MB';
}
function fileIcon(f){
  if(f.kind === 'doc') return '📝';
  if(f.kind === 'slides') return '📊';
  if(f.kind === 'sheet') return '📈';
  if(f.kind === 'blocks') return '🧩';
  if(f.kind === 'binary'){
    const ext = f.name.split('.').pop().toLowerCase();
    const map = { pdf:'📕', png:'🖼️', jpg:'🖼️', jpeg:'🖼️', gif:'🖼️', svg:'🖼️', zip:'🗜️', doc:'📘', docx:'📘', xls:'📊', xlsx:'📊', ppt:'📙', pptx:'📙' };
    return map[ext] || '📄';
  }
  const langIcons = { html:'💻', css:'🎨', javascript:'💻', markdown:'📝', python:'🐍' };
  return langIcons[f.lang] || '📄';
}
function typeTagColor(f){
  if(f.kind==='doc') return { bg:'rgba(111,179,255,0.15)', fg:'#6fb3ff' };
  if(f.kind==='slides') return { bg:'rgba(255,180,84,0.15)', fg:'#ffb454' };
  if(f.kind==='sheet') return { bg:'rgba(107,209,143,0.15)', fg:'#6bd18f' };
  if(f.kind==='blocks') return { bg:'rgba(199,146,234,0.15)', fg:'#c792ea' };
  if(f.kind==='binary') return { bg:'rgba(139,152,165,0.15)', fg:'#8b98a5' };
  return { bg:'rgba(255,123,114,0.15)', fg:'#ff7b72' };
}
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._tm);
  toast._tm = setTimeout(()=> t.classList.remove('show'), 1800);
}

/* ---------------- Sidebar ---------------- */
function renderSidebar(){
  const wrap = document.getElementById('sidebar');
  const u = Store.activeUser();
  wrap.innerHTML = `
    <div class="side-label">Navigate</div>
    <div class="side-nav-item ${view==='repo'?'active':''}" id="navProjects">📁 Projects</div>
    <div class="side-nav-item ${view==='settings'?'active':''}" id="navSettings">⚙️ Settings</div>

    <div class="side-label">Projects</div>
    <div id="repoList"></div>
    <button class="new-repo-btn" id="newRepoSideBtn">+ New project</button>
  `;

  Store.listRepos().forEach(repo => {
    const item = document.createElement('div');
    item.className = 'repo-item' + (repo.id === Store.getData().activeRepoId && view==='repo' ? ' active' : '');
    item.innerHTML = `
      <span class="dot" style="background:${repo.color}"></span>
      <span>${escapeHtml(repo.name)}</span>
      <span class="count">${repo.files.length}</span>
    `;
    item.addEventListener('click', ()=>{
      Store.setActiveRepo(repo.id);
      view = 'repo';
      renderAll();
    });
    wrap.querySelector('#repoList').appendChild(item);
  });

  wrap.querySelector('#navProjects').addEventListener('click', ()=>{ view='repo'; renderAll(); });
  wrap.querySelector('#navSettings').addEventListener('click', ()=>{ view='settings'; renderAll(); });
  wrap.querySelector('#newRepoSideBtn').addEventListener('click', openRepoModal);
}

/* ---------------- Topbar avatar ---------------- */
function renderTopbarUser(){
  const u = Store.activeUser();
  const el = document.getElementById('avatarBtn');
  el.textContent = u.name.slice(0,1).toUpperCase();
  el.style.background = u.color;
}

/* ---------------- Settings view ---------------- */
function renderSettings(){
  const main = document.getElementById('main');
  const s = Store.getSettings();
  const users = Store.listUsers();
  const active = Store.activeUser();

  main.innerHTML = `
    <div class="repo-title" style="margin-bottom:20px;">⚙️ Settings</div>

    <div class="side-label" style="margin-left:0;">Account</div>
    <div class="file-table" style="margin-bottom:24px; padding:16px;">
      <div class="field">
        <label>Display name</label>
        <input id="userNameInput" value="${escapeHtml(active.name)}">
      </div>
      <div class="field">
        <label>Switch profile</label>
        <select id="userSwitch">
          ${users.map(u=>`<option value="${u.id}" ${u.id===active.id?'selected':''}>${escapeHtml(u.name)}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex; gap:10px;">
        <button class="topbar-btn" id="saveNameBtn">Save name</button>
        <button class="topbar-btn" id="addProfileBtn">+ Add profile</button>
      </div>
      <p style="font-size:11.5px; color:var(--text-faint); margin-top:10px;">
        Profiles are stored locally in this browser only — this is not a secure login system. Wire up real authentication on your backend when you deploy.
      </p>
    </div>

    <div class="side-label" style="margin-left:0;">Appearance</div>
    <div class="file-table" style="margin-bottom:24px; padding:16px;">
      <div class="field">
        <label>Code editor font size</label>
        <input type="number" id="fontSizeInput" value="${s.codeFontSize}" min="10" max="24">
      </div>
      <button class="topbar-btn" id="saveAppearanceBtn">Save</button>
    </div>

    <div class="side-label" style="margin-left:0;">Data</div>
    <div class="file-table" style="padding:16px;">
      <p style="font-size:13px; color:var(--text-dim); margin-bottom:12px;">
        All your projects and files are stored in this browser's local storage. Export a backup regularly, especially before clearing browser data.
      </p>
      <div style="display:flex; gap:10px;">
        <button class="topbar-btn primary" id="exportBtn2">Export all data (.json)</button>
        <button class="topbar-btn" id="wipeBtn" style="color:var(--red); border-color:var(--red);">Erase all local data</button>
      </div>
    </div>
  `;

  main.querySelector('#saveNameBtn').addEventListener('click', ()=>{
    Store.renameActiveUser(main.querySelector('#userNameInput').value.trim() || 'You');
    renderAll();
    toast('Saved');
  });
  main.querySelector('#userSwitch').addEventListener('change', (e)=>{
    Store.switchUser(e.target.value);
    renderAll();
  });
  main.querySelector('#addProfileBtn').addEventListener('click', ()=>{
    const name = prompt('New profile name:');
    if(name) { Store.createUser(name); renderAll(); toast('Profile created'); }
  });
  main.querySelector('#saveAppearanceBtn').addEventListener('click', ()=>{
    Store.updateSettings({ codeFontSize: +main.querySelector('#fontSizeInput').value || 13 });
    toast('Saved');
  });
  main.querySelector('#exportBtn2').addEventListener('click', doExportAll);
  main.querySelector('#wipeBtn').addEventListener('click', ()=>{
    if(confirm('This permanently deletes everything stored in this browser. Continue?')){
      localStorage.removeItem('galaxy_data_v1');
      location.reload();
    }
  });
}

/* ---------------- Repo view ---------------- */
function renderRepoView(){
  const repo = Store.activeRepo();
  const main = document.getElementById('main');
  if(!repo){
    main.innerHTML = `<div class="empty-state"><div class="big">📁</div><h3>No projects yet</h3><p>Create your first project to start organizing your business files.</p></div>`;
    return;
  }

  main.innerHTML = `
    <div class="repo-header">
      <div>
        <div class="repo-title">
          <span style="color:${repo.color}">●</span> ${escapeHtml(repo.name)}
          <span class="badge">${repo.files.length} file${repo.files.length===1?'':'s'}</span>
        </div>
        <div class="repo-desc" id="repoDescEditable" contenteditable="true" spellcheck="false">${escapeHtml(repo.desc || 'Click to add a description…')}</div>
      </div>
      <div class="repo-actions">
        <button class="topbar-btn" id="deleteRepoBtn">Delete project</button>
        <button class="topbar-btn" id="deployBtn">🚀 Deploy</button>
        <button class="topbar-btn primary" id="addFileBtn">+ New file</button>
      </div>
    </div>

    <div class="stat-row">
      <div class="stat">Created <b>${new Date(repo.created).toLocaleDateString(undefined,{month:'short', day:'numeric', year:'numeric'})}</b></div>
      <div class="stat">Total size <b>${fmtSize(repo.files.reduce((a,f)=>a+(f.size||0),0))}</b></div>
      <div class="stat">Last update <b>${repo.commits[0] ? fmtTime(repo.commits[0].time) : '—'}</b></div>
    </div>

    <div class="file-drop" id="dropZone">
      <div><b>Drag & drop files here</b> to upload, or click "+ New file" to create a doc, slides, sheet, or code file</div>
    </div>

    <div id="fileTableWrap"></div>

    <div class="log">
      <div class="log-title">Activity</div>
      <div id="logList"></div>
    </div>
  `;

  renderFileTable(repo);
  renderLog(repo);

  main.querySelector('#repoDescEditable').addEventListener('blur', (e)=>{
    Store.updateRepoDesc(repo, e.target.textContent.trim());
  });
  main.querySelector('#addFileBtn').addEventListener('click', openNewFileModal);
  main.querySelector('#deleteRepoBtn').addEventListener('click', ()=> handleDeleteRepo(repo.id));
  main.querySelector('#deployBtn').addEventListener('click', ()=> openDeployModal(repo));

  const dz = main.querySelector('#dropZone');
  dz.addEventListener('click', ()=> document.getElementById('uploadInput').click());
  dz.addEventListener('dragover', (e)=>{ e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', ()=> dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e)=>{
    e.preventDefault(); dz.classList.remove('dragover');
    handleUploadedFiles(e.dataTransfer.files);
  });
}

function renderFileTable(repo){
  const wrap = document.getElementById('fileTableWrap');
  if(repo.files.length === 0){
    wrap.innerHTML = `<div class="empty-state"><div class="big">🗂️</div><p>No files yet. Create one or upload something to get started.</p></div>`;
    return;
  }
  let rows = `<div class="file-row head"><div></div><div>Name</div><div>Type</div><div>Added</div><div>Size</div><div></div></div>`;
  repo.files.slice().sort((a,b)=>b.added-a.added).forEach(f=>{
    const tag = typeTagColor(f);
    rows += `
      <div class="file-row" data-id="${f.id}">
        <div class="file-icon">${fileIcon(f)}</div>
        <div class="file-name" data-open="${f.id}">${escapeHtml(f.name)}</div>
        <div><span class="file-type-tag" style="background:${tag.bg}; color:${tag.fg};">${f.kind}</span></div>
        <div class="file-meta">${fmtTime(f.added)}</div>
        <div class="file-meta">${fmtSize(f.size)}</div>
        <button class="file-del" data-del="${f.id}" title="Delete file">✕</button>
      </div>
    `;
  });
  wrap.innerHTML = `<div class="file-table">${rows}</div>`;

  wrap.querySelectorAll('[data-open]').forEach(el=>{
    el.addEventListener('click', ()=> openFileEditor(el.getAttribute('data-open')));
  });
  wrap.querySelectorAll('[data-del]').forEach(el=>{
    el.addEventListener('click', (e)=>{ e.stopPropagation(); handleDeleteFile(el.getAttribute('data-del')); });
  });
}

function renderLog(repo){
  const list = document.getElementById('logList');
  if(repo.commits.length === 0){ list.innerHTML = `<p style="color:var(--text-faint);font-size:13px;">No activity yet.</p>`; return; }
  list.innerHTML = repo.commits.slice(0,12).map(c => `
    <div class="log-item">
      <div class="log-dot"></div>
      <div class="log-text">${escapeHtml(c.text)}</div>
      <div class="log-time">${fmtTime(c.time)}</div>
    </div>
  `).join('');
}

/* ---------------- Top-level render ---------------- */
function renderAll(){
  renderSidebar();
  renderTopbarUser();
  if(view === 'settings') renderSettings();
  else renderRepoView();
}

/* ---------------- Repo actions ---------------- */
function handleDeleteRepo(id){
  if(!confirm('Delete this project and all its files? This can\'t be undone.')) return;
  Store.deleteRepo(id);
  renderAll();
  toast('Project deleted');
}
function handleDeleteFile(fileId){
  const repo = Store.activeRepo();
  const f = Store.findFile(repo, fileId);
  if(!f || !confirm(`Delete "${f.name}"?`)) return;
  Store.deleteFile(repo, fileId);
  renderAll();
  toast('File deleted');
}
function handleUploadedFiles(fileList){
  const repo = Store.activeRepo();
  if(!repo) return;
  Array.from(fileList).forEach(file=>{
    const reader = new FileReader();
    const isText = /\.(txt|md|csv|json|html|css|js)$/i.test(file.name);
    reader.onload = (e)=>{
      Store.addFile(repo, {
        name: file.name, kind:'binary', lang:null, content: e.target.result
      });
      if(isText){
        // store as code kind so it's editable
      }
      renderAll();
      toast('File added');
    };
    reader.readAsDataURL(file);
  });
}

/* ---------------- New Repo modal ---------------- */
function openRepoModal(){
  document.getElementById('repoNameInput').value = '';
  document.getElementById('repoDescInput').value = '';
  selectedRepoColor = Store.COLORS[Math.floor(Math.random()*Store.COLORS.length)];
  const row = document.getElementById('swatchRow');
  row.innerHTML = Store.COLORS.map(c => `<div class="swatch ${c===selectedRepoColor?'sel':''}" style="background:${c}" data-color="${c}"></div>`).join('');
  row.querySelectorAll('.swatch').forEach(sw=>{
    sw.addEventListener('click', ()=>{
      selectedRepoColor = sw.getAttribute('data-color');
      row.querySelectorAll('.swatch').forEach(x=>x.classList.remove('sel'));
      sw.classList.add('sel');
    });
  });
  document.getElementById('repoModal').classList.add('show');
  document.getElementById('repoNameInput').focus();
}
function closeRepoModal(){ document.getElementById('repoModal').classList.remove('show'); }

/* ---------------- New File modal (type picker + name) ---------------- */
function openNewFileModal(){
  selectedNewFileType = 'code';
  selectedNewFileLang = 'html';
  const grid = document.getElementById('typeGrid');
  grid.innerHTML = FILE_TYPES.map(t => `
    <div class="type-card ${t.kind==='code'?'sel':''}" data-kind="${t.kind}" data-lang="${t.lang||''}">
      <div class="ic">${t.ic}</div><div class="lbl">${t.label}</div>
    </div>
  `).join('');
  grid.querySelectorAll('.type-card').forEach(card=>{
    card.addEventListener('click', ()=>{
      grid.querySelectorAll('.type-card').forEach(c=>c.classList.remove('sel'));
      card.classList.add('sel');
      selectedNewFileType = card.getAttribute('data-kind');
      selectedNewFileLang = card.getAttribute('data-lang') || null;
      updateNewFileNamePlaceholder();
    });
  });
  document.getElementById('newFileNameInput').value = '';
  updateNewFileNamePlaceholder();
  document.getElementById('newFileModal').classList.add('show');
}
function updateNewFileNamePlaceholder(){
  const map = { code:'index.html', doc:'business-plan', slides:'pitch-deck', sheet:'budget', blocks:'automation' };
  document.getElementById('newFileNameInput').placeholder = map[selectedNewFileType] || 'filename';
}
function closeNewFileModal(){ document.getElementById('newFileModal').classList.remove('show'); }

function createNewFile(){
  let name = document.getElementById('newFileNameInput').value.trim();
  const repo = Store.activeRepo();
  if(!repo) return;
  let content, lang = selectedNewFileLang;
  switch(selectedNewFileType){
    case 'code':
      if(!name) name = 'untitled.html';
      lang = name.endsWith('.js') ? 'javascript' : name.endsWith('.css') ? 'css' : name.endsWith('.py') ? 'python' : name.endsWith('.md') ? 'markdown' : 'html';
      content = newCodeDefaultContent(lang);
      break;
    case 'doc':
      if(!name) name = 'untitled-doc';
      if(!name.includes('.')) name += '.doc';
      content = newDocDefaultContent();
      break;
    case 'slides':
      if(!name) name = 'untitled-slides';
      if(!name.includes('.')) name += '.slides';
      content = newSlidesDefaultContent();
      break;
    case 'sheet':
      if(!name) name = 'untitled-sheet';
      if(!name.includes('.')) name += '.sheet';
      content = newSheetDefaultContent();
      break;
    case 'blocks':
      if(!name) name = 'untitled-blocks';
      if(!name.includes('.')) name += '.blocks';
      content = newBlocksDefaultContent();
      break;
  }
  const file = Store.addFile(repo, { name, kind: selectedNewFileType, lang, content });
  closeNewFileModal();
  renderAll();
  toast('File created');
  openFileEditor(file.id);
}

/* ---------------- File editor modal (routes by kind) ---------------- */
function openFileEditor(fileId){
  const repo = Store.activeRepo();
  const f = Store.findFile(repo, fileId);
  if(!f) return;
  editingFileId = fileId;

  document.getElementById('viewFileName').textContent = f.name;
  document.getElementById('viewFileMeta').textContent = `${f.kind} · Added ${fmtTime(f.added)} · ${fmtSize(f.size)}`;

  const body = document.getElementById('editorBody');
  const downloadBtn = document.getElementById('viewDownloadBtn');
  downloadBtn.style.display = 'inline-block';

  if(f.kind === 'binary'){
    body.innerHTML = `<div class="empty-state"><p>This file type can't be edited here. Download it to view it, or replace it by deleting and re-uploading.</p></div>`;
    liveEditorHandle = null;
  } else if(f.kind === 'doc'){
    liveEditorHandle = renderDocEditor(body, { content: f.content, onSave: autoSave });
  } else if(f.kind === 'slides'){
    liveEditorHandle = renderSlidesEditor(body, { content: f.content, onSave: autoSave });
  } else if(f.kind === 'sheet'){
    liveEditorHandle = renderSheetEditor(body, { content: f.content, onSave: autoSave });
  } else if(f.kind === 'blocks'){
    liveEditorHandle = renderBlocksEditor(body, { content: f.content, onSave: autoSave });
  } else {
    liveEditorHandle = renderCodeEditor(body, { content: f.content, lang: f.lang || 'html', onSave: autoSave });
  }

  document.getElementById('fileEditorModal').classList.add('show');
}

function autoSave(content){
  const repo = Store.activeRepo();
  if(!repo || !editingFileId) return;
  Store.updateFile(repo, editingFileId, content);
  // lightweight: refresh sidebar/file list counts silently without closing modal
  renderSidebar();
}

function closeFileEditor(){
  document.getElementById('fileEditorModal').classList.remove('show');
  editingFileId = null;
  liveEditorHandle = null;
  renderAll();
}

function downloadCurrentFile(){
  const repo = Store.activeRepo();
  const f = Store.findFile(repo, editingFileId);
  if(!f) return;
  let href, isDataUrl = (f.content||'').startsWith('data:');
  if(isDataUrl){
    href = f.content;
  } else {
    const blob = new Blob([f.content], {type:'text/plain'});
    href = URL.createObjectURL(blob);
  }
  const a = document.createElement('a');
  a.href = href; a.download = f.name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  if(!isDataUrl) URL.revokeObjectURL(href);
}

/* ---------------- Deploy modal (simulated) ---------------- */
function openDeployModal(repo){
  const modal = document.getElementById('deployModal');
  const slug = repo.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'project';
  document.getElementById('deployUrl').textContent = `${slug}.galaxy.app`;
  document.getElementById('deployBody').innerHTML = `
    <p class="sub" style="margin-bottom:14px;">
      This is a local preview only — Galaxy doesn't host live sites. To actually publish this project,
      download it below and push it to your own host (Netlify, Render, GitHub Pages, etc).
    </p>
  `;
  modal.classList.add('show');

  document.getElementById('deployDownloadBtn').onclick = ()=>{
    // bundle all code/doc files as a simple zip-less multi-download (individual files)
    const htmlFile = repo.files.find(f => f.kind==='code' && f.lang==='html');
    if(htmlFile){
      const blob = new Blob([htmlFile.content], {type:'text/html'});
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href; a.download = htmlFile.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(href);
      toast('Downloaded — push this to your host');
    } else {
      toast('Add an HTML file to this project first');
    }
  };

  document.getElementById('deployPreviewBtn').onclick = ()=>{
    const htmlFile = repo.files.find(f => f.kind==='code' && f.lang==='html');
    if(!htmlFile){ toast('Add an HTML file to this project first'); return; }
    const win = window.open('', '_blank');
    win.document.write(htmlFile.content);
    win.document.close();
  };
}
function closeDeployModal(){ document.getElementById('deployModal').classList.remove('show'); }

/* ---------------- Export ---------------- */
function doExportAll(){
  const blob = new Blob([Store.exportAllJSON()], {type:'application/json'});
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href; a.download = 'galaxy-backup.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(href);
  toast('Backup downloaded');
}

/* ---------------- Search ---------------- */
function handleSearch(q){
  q = q.trim().toLowerCase();
  if(!q){ renderAll(); return; }
  const main = document.getElementById('main');
  let results = [];
  Store.listRepos().forEach(repo=>{
    repo.files.forEach(f=>{
      if(f.name.toLowerCase().includes(q)) results.push({repo, f});
    });
  });
  main.innerHTML = `
    <div class="repo-title" style="margin-bottom:16px;">Search results <span class="badge">${results.length}</span></div>
    <div class="file-table">
      ${results.length ? results.map(r => `
        <div class="file-row" data-repo="${r.repo.id}" data-file="${r.f.id}" style="cursor:pointer; grid-template-columns:28px 1fr 90px 110px;">
          <div class="file-icon">${fileIcon(r.f)}</div>
          <div class="file-name">${escapeHtml(r.f.name)} <span style="color:var(--text-faint);font-size:11.5px;">— ${escapeHtml(r.repo.name)}</span></div>
          <div class="file-meta">${fmtTime(r.f.added)}</div>
          <div class="file-meta">${fmtSize(r.f.size)}</div>
        </div>
      `).join('') : `<div class="empty-state"><p>No files match "${escapeHtml(q)}"</p></div>`}
    </div>
  `;
  main.querySelectorAll('.file-row[data-file]').forEach(row=>{
    row.addEventListener('click', ()=>{
      Store.setActiveRepo(row.getAttribute('data-repo'));
      view = 'repo';
      renderSidebar();
      renderRepoView();
      openFileEditor(row.getAttribute('data-file'));
    });
  });
}

/* ---------------- Wire up static UI ---------------- */
function init(){
  document.getElementById('brandLogo').addEventListener('click', ()=>{ view='repo'; renderAll(); });
  document.getElementById('exportAllBtn').addEventListener('click', doExportAll);
  document.getElementById('newRepoTopBtn').addEventListener('click', openRepoModal);
  document.getElementById('avatarBtn').addEventListener('click', ()=>{ view='settings'; renderAll(); });

  document.getElementById('repoCancelBtn').addEventListener('click', closeRepoModal);
  document.getElementById('repoCreateBtn').addEventListener('click', ()=>{
    const name = document.getElementById('repoNameInput').value.trim();
    if(!name){ toast('Give your project a name'); return; }
    const desc = document.getElementById('repoDescInput').value.trim();
    Store.createRepo(name, desc, selectedRepoColor);
    closeRepoModal();
    view = 'repo';
    renderAll();
    toast('Project created');
  });

  document.getElementById('newFileCancelBtn').addEventListener('click', closeNewFileModal);
  document.getElementById('newFileCreateBtn').addEventListener('click', createNewFile);

  document.getElementById('viewCloseBtn').addEventListener('click', closeFileEditor);
  document.getElementById('viewDownloadBtn').addEventListener('click', downloadCurrentFile);

  document.getElementById('deployCloseBtn').addEventListener('click', closeDeployModal);

  document.getElementById('uploadInput').addEventListener('change', (e)=>{
    handleUploadedFiles(e.target.files);
    e.target.value = '';
  });

  document.getElementById('searchInput').addEventListener('input', (e)=> handleSearch(e.target.value));

  ['repoModal','newFileModal','fileEditorModal','deployModal'].forEach(id=>{
    const ov = document.getElementById(id);
    ov.addEventListener('click', (e)=>{ if(e.target === ov){
      ov.classList.remove('show');
      if(id === 'fileEditorModal') renderAll();
    }});
  });

  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
