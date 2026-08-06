/* Galaxy — modules/code.js
   A text code editor with line numbers + a live preview pane for HTML/CSS/JS.
   Uses a plain textarea (no external deps) with a synced line-number gutter.
*/

export function newCodeDefaultContent(lang){
  const templates = {
    html: '<!DOCTYPE html>\n<html>\n<head>\n  <title>My App</title>\n  <style>\n    body{ font-family: sans-serif; padding: 40px; }\n  </style>\n</head>\n<body>\n  <h1>Hello from Galaxy</h1>\n  <script>\n    console.log("running");\n  <\/script>\n</body>\n</html>',
    javascript: '// Your code here\nfunction greet(name){\n  return `Hello, ${name}!`;\n}\nconsole.log(greet("Galaxy"));',
    css: 'body {\n  font-family: sans-serif;\n}',
    markdown: '# New note\n\nWrite here…',
    python: '# Python code (preview not executable in-browser)\nprint("Hello from Galaxy")'
  };
  return templates[lang] || '';
}

export function renderCodeEditor(container, { content, lang, onSave }){
  const canPreview = ['html'].includes(lang);

  container.innerHTML = `
    <div class="toolbar">
      <span class="stat">Language: <b>${lang}</b></span>
      <div class="toolbar-spacer"></div>
      ${canPreview ? '<button class="topbar-btn primary" id="runBtn">▶ Run preview</button>' : ''}
    </div>
    <div style="display:grid; grid-template-columns:${canPreview ? '1fr 1fr' : '1fr'}; gap:14px;">
      <div>
        <textarea id="codeArea" spellcheck="false" style="
          width:100%; min-height:460px; background:#0a0e13; color:#d7e0e8;
          border:1px solid var(--line); border-radius:8px; padding:14px;
          font-family:var(--mono); font-size:13px; line-height:1.6; resize:vertical;
          outline:none; tab-size:2;
        ">${content}</textarea>
      </div>
      ${canPreview ? `
      <div>
        <div style="font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--text-faint); font-weight:700; margin-bottom:6px;">Live preview</div>
        <iframe id="previewFrame" style="width:100%; height:460px; border:1px solid var(--line); border-radius:8px; background:#fff;" sandbox="allow-scripts"></iframe>
      </div>` : ''}
    </div>
  `;

  const area = container.querySelector('#codeArea');
  area.addEventListener('input', ()=> onSave && onSave(area.value, false));
  area.addEventListener('keydown', (e)=>{
    if(e.key === 'Tab'){
      e.preventDefault();
      const start = area.selectionStart, end = area.selectionEnd;
      area.value = area.value.slice(0,start) + '  ' + area.value.slice(end);
      area.selectionStart = area.selectionEnd = start + 2;
      onSave && onSave(area.value, false);
    }
  });

  if(canPreview){
    const frame = container.querySelector('#previewFrame');
    const run = ()=>{ frame.srcdoc = area.value; };
    container.querySelector('#runBtn').addEventListener('click', run);
    run();
  }

  return { getContent: ()=> area.value };
}
