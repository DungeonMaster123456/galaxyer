/* Galaxy — store.js
   Handles all data persistence. Swap this file's internals for real API calls
   later (fetch to your backend) without touching app.js or the editors —
   every function here already returns/accepts plain JS objects.
*/

const STORE_KEY = 'galaxy_data_v1';
export const COLORS = ['#ffb454','#6fb3ff','#6bd18f','#ff7b72','#c792ea','#7ee7d8'];

export function uid(){ return Math.random().toString(36).slice(2,9); }
export function now(){ return Date.now(); }

function seed(){
  const repo = {
    id: uid(), name:'Getting Started', desc:'A quick tour — feel free to delete this project.',
    color: COLORS[0], created: now(),
    files: [
      {
        id: uid(), name:'welcome.md', kind:'code', lang:'markdown',
        content:'# Welcome to Galaxy\n\nEach PROJECT (sidebar) is like a repo.\n\nAdd files with the "+ New file" button — pick Doc, Slides, Sheet, Code, or a plain upload.\n\nOpen the Code tab in the sidebar for a real code editor with a live preview.\n\nEverything here is stored in your browser. Replace store.js with real API calls when you wire up your own backend.',
        size:0, added: now()
      }
    ],
    commits:[{id: uid(), text:'Initial commit', time: now()}]
  };
  return {
    activeUserId: 'u_default',
    users: [{ id:'u_default', name:'You', color: COLORS[1] }],
    repos: [repo],
    activeRepoId: repo.id,
    settings: { theme:'dark', codeFontSize: 13 }
  };
}

let data = load();

function load(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return seed();
}

export function save(){
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

export function getData(){ return data; }

/* ---------------- Users / accounts ---------------- */
export function listUsers(){ return data.users; }
export function activeUser(){ return data.users.find(u=>u.id===data.activeUserId) || data.users[0]; }
export function switchUser(id){ data.activeUserId = id; save(); }
export function createUser(name){
  const u = { id: uid(), name, color: COLORS[Math.floor(Math.random()*COLORS.length)] };
  data.users.push(u);
  data.activeUserId = u.id;
  save();
  return u;
}
export function renameActiveUser(name){
  activeUser().name = name;
  save();
}

/* ---------------- Repos (projects) ---------------- */
export function listRepos(){ return data.repos; }
export function activeRepo(){ return data.repos.find(r=>r.id===data.activeRepoId) || data.repos[0]; }
export function setActiveRepo(id){ data.activeRepoId = id; save(); }

export function createRepo(name, desc, color){
  const repo = { id: uid(), name, desc, color, created: now(), files: [], commits: [] };
  addCommit(repo, 'Created project');
  data.repos.unshift(repo);
  data.activeRepoId = repo.id;
  save();
  return repo;
}

export function deleteRepo(id){
  data.repos = data.repos.filter(r=>r.id!==id);
  if(data.activeRepoId === id){
    data.activeRepoId = data.repos.length ? data.repos[0].id : null;
  }
  save();
}

export function updateRepoDesc(repo, desc){
  repo.desc = desc;
  save();
}

export function addCommit(repo, text){
  repo.commits.unshift({ id: uid(), text, time: now() });
  if(repo.commits.length > 60) repo.commits.pop();
}

/* ---------------- Files ---------------- */
/*
  File shape:
  { id, name, kind: 'code'|'doc'|'slides'|'sheet'|'binary', lang, content, size, added }
  - code: content = string (source)
  - doc: content = HTML string
  - slides: content = JSON string of [{title, body}]
  - sheet: content = JSON string of string[][]
  - binary: content = data URL
*/

export function addFile(repo, fileObj){
  const file = { id: uid(), added: now(), size:0, ...fileObj };
  file.size = new Blob([file.content || '']).size;
  repo.files.push(file);
  addCommit(repo, `Added ${file.name}`);
  save();
  return file;
}

export function updateFile(repo, fileId, newContent){
  const f = repo.files.find(x=>x.id===fileId);
  if(!f) return;
  f.content = newContent;
  f.size = new Blob([newContent]).size;
  addCommit(repo, `Updated ${f.name}`);
  save();
  return f;
}

export function deleteFile(repo, fileId){
  const f = repo.files.find(x=>x.id===fileId);
  if(!f) return;
  repo.files = repo.files.filter(x=>x.id!==fileId);
  addCommit(repo, `Deleted ${f.name}`);
  save();
}

export function findFile(repo, fileId){
  return repo.files.find(x=>x.id===fileId);
}

/* ---------------- Settings ---------------- */
export function getSettings(){ return data.settings; }
export function updateSettings(patch){
  Object.assign(data.settings, patch);
  save();
}

/* ---------------- Export ---------------- */
export function exportAllJSON(){
  return JSON.stringify(data, null, 2);
}
