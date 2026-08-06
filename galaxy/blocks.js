/* Galaxy — modules/blocks.js
   Simple block-based visual coding (Scratch-style). A palette of block types
   on the left, a stack area in the middle, generates + runs real JS.
   File content stored as JSON string of the block stack.
*/

const PALETTE = [
  { type:'say',       label:'say [ ]',            color:'#6fb3ff', fields:['text'] },
  { type:'log',       label:'console.log [ ]',    color:'#8b98a5', fields:['text'] },
  { type:'setvar',    label:'set [var] to [ ]',    color:'#c792ea', fields:['name','value'] },
  { type:'changevar', label:'change [var] by [ ]', color:'#c792ea', fields:['name','value'] },
  { type:'if',        label:'if [ ] then',         color:'#ffb454', fields:['cond'] },
  { type:'repeat',    label:'repeat [ ] times',    color:'#ff7b72', fields:['count'] },
  { type:'wait',      label:'wait [ ] ms',         color:'#6bd18f', fields:['ms'] },
];

export function newBlocksDefaultContent(){
  return JSON.stringify([
    { id:'b1', type:'setvar', name:'score', value:'0' },
    { id:'b2', type:'say', text:'Game started!' },
  ]);
}

export function renderBlocksEditor(container, { content, onSave }){
  let blocks;
  try{ blocks = JSON.parse(content); }catch(e){ blocks = JSON.parse(newBlocksDefaultContent()); }

  function persist(){ onSave && onSave(JSON.stringify(blocks), false); }
  function uid(){ return 'b' + Math.random().toString(36).slice(2,8); }

  function blockToJS(b){
    switch(b.type){
      case 'say': return `alert(${JSON.stringify(b.text||'')});`;
      case 'log': return `console.log(${JSON.stringify(b.text||'')});`;
      case 'setvar': return `vars[${JSON.stringify(b.name||'x')}] = (${JSON.stringify(b.value||'')});`;
      case 'changevar': return `vars[${JSON.stringify(b.name||'x')}] = (Number(vars[${JSON.stringify(b.name||'x')}])||0) + (${JSON.stringify(b.value||'0')});`;
      case 'if': return `if (${b.cond||'true'}) {`;
      case 'repeat': return `for(let i=0;i<${Number(b.count)||0};i++){`;
      case 'wait': return `await new Promise(r=>setTimeout(r, ${Number(b.ms)||0}));`;
      default: return '';
    }
  }

  function generateCode(){
    let lines = ['const vars = {};', '(async ()=>{'];
    blocks.forEach(b=>{
      lines.push('  ' + blockToJS(b));
      if(b.type === 'if' || b.type === 'repeat') lines.push('  }');
    });
    lines.push('})();');
    return lines.join('\n');
  }

  function draw(){
    container.innerHTML = `
      <div style="display:grid; grid-template-columns:200px 1fr 1fr; gap:14px;">
        <div>
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--text-faint); font-weight:700; margin-bottom:8px;">Blocks</div>
          <div id="palette" style="display:flex; flex-direction:column; gap:6px;"></div>
        </div>
        <div>
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--text-faint); font-weight:700; margin-bottom:8px;">Script</div>
          <div id="stack" style="display:flex; flex-direction:column; gap:6px; min-height:400px; border:1px dashed var(--line); border-radius:8px; padding:10px;"></div>
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--text-faint); font-weight:700;">Generated JS + Output</span>
            <button class="topbar-btn primary" id="runBlocksBtn">▶ Run</button>
          </div>
          <pre id="genCode" style="background:#0a0e13; border:1px solid var(--line); border-radius:8px; padding:12px; font-family:var(--mono); font-size:11.5px; color:#8fd6a8; max-height:220px; overflow:auto; white-space:pre-wrap;"></pre>
          <div id="output" style="margin-top:10px; background:var(--bg-panel); border:1px solid var(--line); border-radius:8px; padding:12px; font-family:var(--mono); font-size:12px; color:var(--text-dim); min-height:120px; white-space:pre-wrap;">Output will appear here…</div>
        </div>
      </div>
    `;

    const palette = container.querySelector('#palette');
    PALETTE.forEach(p=>{
      const el = document.createElement('div');
      el.textContent = p.label;
      el.style.cssText = `background:${p.color}; color:#111; padding:8px 10px; border-radius:6px; font-size:12.5px; font-weight:700; cursor:pointer;`;
      el.addEventListener('click', ()=>{
        const nb = { id: uid(), type: p.type };
        p.fields.forEach(f=> nb[f] = f==='value'||f==='count'||f==='ms' ? '0' : '');
        blocks.push(nb);
        persist();
        draw();
      });
      palette.appendChild(el);
    });

    const stack = container.querySelector('#stack');
    if(blocks.length === 0){
      stack.innerHTML = `<div style="color:var(--text-faint); font-size:12.5px; text-align:center; padding:20px;">Click a block on the left to add it to your script.</div>`;
    }
    blocks.forEach((b, i)=>{
      const def = PALETTE.find(p=>p.type===b.type);
      const row = document.createElement('div');
      row.style.cssText = `background:${def.color}; color:#111; padding:8px 10px; border-radius:6px; font-size:12.5px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;`;
      let inner = `<b style="font-weight:800;">${def.type}</b>`;
      def.fields.forEach(f=>{
        inner += ` <input data-field="${f}" value="${(b[f]||'').toString().replace(/"/g,'&quot;')}" style="width:${f==='cond'?110:70}px; border:none; border-radius:4px; padding:3px 6px; font-family:var(--mono); font-size:11.5px;">`;
      });
      inner += `<span style="margin-left:auto; display:flex; gap:4px;">
        <button data-up="${i}" title="Move up" style="background:none;border:none;cursor:pointer;font-weight:800;">↑</button>
        <button data-down="${i}" title="Move down" style="background:none;border:none;cursor:pointer;font-weight:800;">↓</button>
        <button data-del="${i}" title="Delete" style="background:none;border:none;cursor:pointer;font-weight:800;">✕</button>
      </span>`;
      row.innerHTML = inner;
      stack.appendChild(row);
    });

    stack.querySelectorAll('input[data-field]').forEach(inp=>{
      inp.addEventListener('input', (e)=>{
        const row = e.target.closest('div');
        const idx = Array.from(stack.children).indexOf(row);
        blocks[idx][e.target.dataset.field] = e.target.value;
        persist();
        updateGenCode();
      });
    });
    stack.querySelectorAll('[data-del]').forEach(btn=>{
      btn.addEventListener('click', ()=>{ blocks.splice(+btn.dataset.del,1); persist(); draw(); });
    });
    stack.querySelectorAll('[data-up]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const i = +btn.dataset.up;
        if(i>0){ [blocks[i-1],blocks[i]]=[blocks[i],blocks[i-1]]; persist(); draw(); }
      });
    });
    stack.querySelectorAll('[data-down]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const i = +btn.dataset.down;
        if(i<blocks.length-1){ [blocks[i+1],blocks[i]]=[blocks[i],blocks[i+1]]; persist(); draw(); }
      });
    });

    updateGenCode();

    container.querySelector('#runBlocksBtn').addEventListener('click', runBlocks);
  }

  function updateGenCode(){
    const el = container.querySelector('#genCode');
    if(el) el.textContent = generateCode();
  }

  function runBlocks(){
    const out = container.querySelector('#output');
    out.textContent = '';
    const logs = [];
    const fakeConsole = { log: (...args)=> logs.push(args.join(' ')) };
    const fakeAlert = (msg) => logs.push('💬 ' + msg);
    try{
      const code = generateCode()
        .replace('const vars = {};', 'const vars = {};')
        .replace(/console\.log/g, '__console.log')
        .replace(/alert\(/g, '__alert(');
      const fn = new Function('__console', '__alert', code);
      fn(fakeConsole, fakeAlert);
      setTimeout(()=>{ out.textContent = logs.length ? logs.join('\n') : '(no output)'; }, 50);
    }catch(e){
      out.textContent = 'Error: ' + e.message;
    }
  }

  draw();
  return { getContent: ()=> JSON.stringify(blocks) };
}
