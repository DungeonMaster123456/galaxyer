/* Galaxy — modules/docs.js
   A lightweight rich-text document editor using contenteditable + execCommand.
   File content is stored as raw HTML.
*/
import { addFile, updateFile } from '../store.js';

export function newDocDefaultContent(){
  return '<p>Start writing your document…</p>';
}

export function renderDocEditor(container, { content, onSave, onClose }){
  container.innerHTML = `
    <div class="doc-toolbar">
      <button data-cmd="bold" title="Bold"><b>B</b></button>
      <button data-cmd="italic" title="Italic"><i>I</i></button>
      <button data-cmd="underline" title="Underline"><u>U</u></button>
      <div class="sep"></div>
      <button data-cmd="formatBlock" data-val="H1" title="Heading 1">H1</button>
      <button data-cmd="formatBlock" data-val="H2" title="Heading 2">H2</button>
      <button data-cmd="formatBlock" data-val="P" title="Paragraph">¶</button>
      <div class="sep"></div>
      <button data-cmd="insertUnorderedList" title="Bullet list">•≡</button>
      <button data-cmd="insertOrderedList" title="Numbered list">1.≡</button>
      <div class="sep"></div>
      <button data-cmd="justifyLeft" title="Align left">⟸</button>
      <button data-cmd="justifyCenter" title="Align center">≡</button>
      <button data-cmd="justifyRight" title="Align right">⟹</button>
    </div>
    <div class="doc-canvas" contenteditable="true" spellcheck="true" id="docCanvas">${content}</div>
  `;

  const canvas = container.querySelector('#docCanvas');

  container.querySelectorAll('.doc-toolbar button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const cmd = btn.getAttribute('data-cmd');
      const val = btn.getAttribute('data-val') || null;
      canvas.focus();
      document.execCommand(cmd, false, val);
    });
  });

  function getContent(){ return canvas.innerHTML; }

  canvas.addEventListener('input', ()=> onSave && onSave(getContent(), false));

  return { getContent };
}
