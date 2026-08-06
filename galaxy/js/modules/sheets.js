/* Galaxy — modules/sheets.js
   A lightweight spreadsheet: grid of text inputs, supports simple formulas
   starting with "=" for SUM, AVG, and cell references like A1, B2.
   File content stored as JSON string of a 2D string array.
*/

const DEFAULT_ROWS = 14;
const DEFAULT_COLS = 8;

export function newSheetDefaultContent(){
  const grid = Array.from({length: DEFAULT_ROWS}, ()=> Array(DEFAULT_COLS).fill(''));
  return JSON.stringify(grid);
}

function colLabel(i){
  let s = '';
  i++;
  while(i > 0){
    const rem = (i - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

function cellRef(row, col){ return colLabel(col) + (row+1); }

function parseRef(ref){
  const m = /^([A-Z]+)(\d+)$/.exec(ref.trim().toUpperCase());
  if(!m) return null;
  let col = 0;
  for(const ch of m[1]) col = col*26 + (ch.charCodeAt(0) - 64);
  col -= 1;
  const row = parseInt(m[2],10) - 1;
  return { row, col };
}

function evalFormula(raw, grid){
  if(!raw.startsWith('=')) return raw;
  const expr = raw.slice(1).trim();

  const rangeFn = (name, fn, init) => {
    const re = new RegExp(name+'\\(([A-Z]+\\d+):([A-Z]+\\d+)\\)', 'i');
    const m = re.exec(expr);
    if(!m) return null;
    const a = parseRef(m[1]), b = parseRef(m[2]);
    if(!a || !b) return null;
    let vals = [];
    for(let r=Math.min(a.row,b.row); r<=Math.max(a.row,b.row); r++){
      for(let c=Math.min(a.col,b.col); c<=Math.max(a.col,b.col); c++){
        const v = parseFloat(grid[r] && grid[r][c]);
        if(!isNaN(v)) vals.push(v);
      }
    }
    return fn(vals);
  };

  const sum = rangeFn('SUM', vals => vals.reduce((a,b)=>a+b,0));
  if(sum !== null) return String(sum);
  const avg = rangeFn('AVG', vals => vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) : 0);
  if(avg !== null) return String(avg);
  const max = rangeFn('MAX', vals => vals.length ? Math.max(...vals) : 0);
  if(max !== null) return String(max);
  const min = rangeFn('MIN', vals => vals.length ? Math.min(...vals) : 0);
  if(min !== null) return String(min);

  // simple arithmetic with cell refs, e.g. =A1+B2*2
  try{
    const substituted = expr.replace(/[A-Z]+\d+/gi, (ref)=>{
      const p = parseRef(ref);
      if(!p) return '0';
      const v = parseFloat(grid[p.row] && grid[p.row][p.col]);
      return isNaN(v) ? '0' : v;
    });
    if(/^[\d+\-*/.()\s]+$/.test(substituted)){
      // eslint-disable-next-line no-eval
      const result = Function('"use strict";return ('+substituted+')')();
      return String(result);
    }
  }catch(e){ /* fall through */ }
  return '#ERR';
}

export function renderSheetEditor(container, { content, onSave }){
  let grid;
  try{
    grid = JSON.parse(content);
    if(!Array.isArray(grid) || !Array.isArray(grid[0])) throw new Error();
  }catch(e){ grid = JSON.parse(newSheetDefaultContent()); }

  function persist(){ onSave && onSave(JSON.stringify(grid), false); }

  function draw(){
    const rows = grid.length, cols = grid[0].length;
    let html = `
      <div class="sheet-toolbar">
        <button class="btn-ghost" id="addRowBtn">+ Row</button>
        <button class="btn-ghost" id="addColBtn">+ Column</button>
        <span style="font-size:11.5px; color:var(--text-faint); align-self:center; font-family:var(--mono);">
          Formulas: =SUM(A1:A5) =AVG(...) =MAX(...) =MIN(...) or =A1+B2
        </span>
      </div>
      <div class="sheet-wrap"><table class="sheet"><thead><tr><th class="rownum"></th>`;
    for(let c=0;c<cols;c++) html += `<th>${colLabel(c)}</th>`;
    html += `</tr></thead><tbody>`;
    for(let r=0;r<rows;r++){
      html += `<tr><td class="rownum">${r+1}</td>`;
      for(let c=0;c<cols;c++){
        const raw = grid[r][c] || '';
        html += `<td><input data-r="${r}" data-c="${c}" value="${escapeAttr(raw)}"></td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table></div>`;
    container.innerHTML = html;

    container.querySelectorAll('input[data-r]').forEach(inp=>{
      inp.addEventListener('focus', (e)=>{
        // show raw formula while editing
        const r = +inp.dataset.r, c = +inp.dataset.c;
        inp.value = grid[r][c] || '';
      });
      inp.addEventListener('blur', (e)=>{
        const r = +inp.dataset.r, c = +inp.dataset.c;
        grid[r][c] = inp.value;
        persist();
        inp.value = evalFormula(inp.value, grid);
      });
      inp.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter'){ e.preventDefault(); inp.blur(); }
      });
      // initial display: evaluated
      const r = +inp.dataset.r, c = +inp.dataset.c;
      inp.value = evalFormula(grid[r][c] || '', grid);
    });

    container.querySelector('#addRowBtn').addEventListener('click', ()=>{
      grid.push(Array(cols).fill(''));
      persist();
      draw();
    });
    container.querySelector('#addColBtn').addEventListener('click', ()=>{
      grid.forEach(row => row.push(''));
      persist();
      draw();
    });
  }

  function escapeAttr(s){
    return (s||'').replace(/"/g,'&quot;');
  }

  draw();
  return { getContent: ()=> JSON.stringify(grid) };
}
