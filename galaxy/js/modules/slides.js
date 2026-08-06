/* Galaxy — modules/slides.js
   A presentation editor: list of {title, body} slides, thumbnail rail + stage.
   File content stored as JSON string of the slide array.
*/

export function newSlidesDefaultContent(){
  return JSON.stringify([
    { title:'Untitled presentation', body:'Click to edit this text' }
  ]);
}

export function renderSlidesEditor(container, { content, onSave }){
  let slides;
  try{ slides = JSON.parse(content); }catch(e){ slides = JSON.parse(newSlidesDefaultContent()); }
  let activeIdx = 0;

  function persist(){ onSave && onSave(JSON.stringify(slides), false); }

  function draw(){
    container.innerHTML = `
      <div class="slides-wrap">
        <div class="slide-list" id="slideList"></div>
        <div>
          <div class="slide-stage" id="slideStage"></div>
          <div class="slide-toolbar">
            <button class="btn-ghost" id="dupSlideBtn">Duplicate slide</button>
            <button class="btn-ghost" id="delSlideBtn">Delete slide</button>
          </div>
        </div>
      </div>
    `;

    const list = container.querySelector('#slideList');
    slides.forEach((s, i)=>{
      const thumb = document.createElement('div');
      thumb.className = 'slide-thumb' + (i===activeIdx ? ' active' : '');
      thumb.innerHTML = `
        <div style="font-weight:800; font-size:9px; color:#fff; overflow:hidden; max-height:18px;">${escapeHtml(s.title)||'&nbsp;'}</div>
        <div style="margin-top:4px; color:#8b98a5; overflow:hidden; max-height:24px;">${escapeHtml(s.body)||''}</div>
        <div class="num">${i+1}</div>
      `;
      thumb.addEventListener('click', ()=>{ activeIdx = i; draw(); });
      list.appendChild(thumb);
    });
    const addBtn = document.createElement('button');
    addBtn.className = 'add-slide-btn';
    addBtn.textContent = '+';
    addBtn.title = 'Add slide';
    addBtn.addEventListener('click', ()=>{
      slides.push({ title:'New slide', body:'Click to edit this text' });
      activeIdx = slides.length - 1;
      persist();
      draw();
    });
    list.appendChild(addBtn);

    const stage = container.querySelector('#slideStage');
    const s = slides[activeIdx];
    stage.innerHTML = `
      <div class="stitle" contenteditable="true" id="stageTitle">${escapeHtml(s.title)}</div>
      <div class="sbody" contenteditable="true" id="stageBody">${escapeHtml(s.body)}</div>
    `;
    stage.querySelector('#stageTitle').addEventListener('input', (e)=>{
      slides[activeIdx].title = e.target.textContent;
      persist();
      // update thumb text without full redraw to avoid losing focus
      const thumb = list.children[activeIdx];
      if(thumb) thumb.firstChild.textContent = e.target.textContent || '\u00A0';
    });
    stage.querySelector('#stageBody').addEventListener('input', (e)=>{
      slides[activeIdx].body = e.target.textContent;
      persist();
      const thumb = list.children[activeIdx];
      if(thumb) thumb.children[1].textContent = e.target.textContent;
    });

    container.querySelector('#dupSlideBtn').addEventListener('click', ()=>{
      const copy = { ...slides[activeIdx] };
      slides.splice(activeIdx+1, 0, copy);
      activeIdx += 1;
      persist();
      draw();
    });
    container.querySelector('#delSlideBtn').addEventListener('click', ()=>{
      if(slides.length <= 1) return;
      slides.splice(activeIdx, 1);
      activeIdx = Math.max(0, activeIdx - 1);
      persist();
      draw();
    });
  }

  function escapeHtml(s){
    return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  draw();
  return { getContent: ()=> JSON.stringify(slides) };
}
