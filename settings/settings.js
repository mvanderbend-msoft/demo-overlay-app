const api = window.settings;

let sections = [];
let selected = -1;
let dirty = false;
let pickedFile = null;

const $ = (id) => document.getElementById(id);

const listEl = $('sectionList');
const editorEl = $('editor');
const emptyEl = $('emptyState');

function markDirty() { dirty = true; $('saveBtn').textContent = 'Save sections *'; }
function markClean() { dirty = false; $('saveBtn').textContent = 'Save sections'; }

function renderList() {
  listEl.innerHTML = '';
  sections.forEach((s, i) => {
    const li = document.createElement('li');
    if (i === selected) li.classList.add('active');
    li.innerHTML = `
      <span class="sec-idx">${i + 1}</span>
      <span class="sec-title"></span>
      <span class="move-btns">
        <button data-act="up" title="Move up">▲</button>
        <button data-act="down" title="Move down">▼</button>
      </span>`;
    li.querySelector('.sec-title').textContent = s.title || '(untitled)';
    li.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      selectSection(i);
    });
    li.querySelector('[data-act=up]').addEventListener('click', (e) => {
      e.stopPropagation(); move(i, -1);
    });
    li.querySelector('[data-act=down]').addEventListener('click', (e) => {
      e.stopPropagation(); move(i, +1);
    });
    listEl.appendChild(li);
  });
}

function selectSection(i) {
  if (selected >= 0 && selected < sections.length) pullForm(selected);
  selected = i;
  if (i < 0 || i >= sections.length) {
    editorEl.hidden = true;
    emptyEl.hidden = false;
  } else {
    editorEl.hidden = false;
    emptyEl.hidden = true;
    fillForm(sections[i]);
  }
  renderList();
}

function fillForm(s) {
  $('f-key').value = s.key || '';
  $('f-title').value = s.title || '';
  $('f-subtitle').value = s.subtitle || '';
  $('f-animation').value = s.animation || '';
  $('f-details').value = Array.isArray(s.details) ? s.details.join('\n') : '';
  $('f-notes').value = Array.isArray(s.notes) ? s.notes.join('\n') : (s.notes || '');
}

function pullForm(i) {
  const s = sections[i];
  if (!s) return;
  const before = JSON.stringify(s);
  s.key = $('f-key').value.trim() || undefined;
  s.title = $('f-title').value;
  s.subtitle = $('f-subtitle').value;
  s.animation = $('f-animation').value.trim() || undefined;
  s.details = $('f-details').value.split('\n').map((l) => l.trim()).filter(Boolean);
  s.notes = $('f-notes').value.split('\n').map((l) => l.trim()).filter(Boolean);
  Object.keys(s).forEach((k) => s[k] === undefined && delete s[k]);
  if (JSON.stringify(s) !== before) markDirty();
}

function move(i, delta) {
  const j = i + delta;
  if (j < 0 || j >= sections.length) return;
  pullForm(selected);
  const [it] = sections.splice(i, 1);
  sections.splice(j, 0, it);
  if (selected === i) selected = j;
  else if (selected === j) selected = i;
  markDirty();
  renderList();
}

$('addSectionBtn').addEventListener('click', () => {
  if (selected >= 0) pullForm(selected);
  sections.push({ title: '', subtitle: '', details: [], notes: [] });
  selectSection(sections.length - 1);
  $('f-title').focus();
  markDirty();
});

function isEmptySection(s) {
  return !s.title && !s.subtitle && !s.animation
    && (!s.details || s.details.length === 0)
    && (!s.notes || s.notes.length === 0);
}

$('deleteBtn').addEventListener('click', () => {
  if (selected < 0) return;
  sections.splice(selected, 1);
  const next = Math.min(selected, sections.length - 1);
  // Important: deselect first so selectSection() doesn't pullForm() the
  // stale form contents into the new neighbor.
  selected = -1;
  markDirty();
  selectSection(next);
});

$('saveBtn').addEventListener('click', async () => {
  if (selected >= 0) pullForm(selected);
  // Strip empty stubs (e.g. abandoned "+ Add" clicks) before persisting.
  const before = sections.length;
  sections = sections.filter((s) => !isEmptySection(s));
  if (sections.length !== before) {
    // Indices shifted — re-select cleanly so the form can't get pulled
    // back into a different section.
    const next = sections.length > 0 ? Math.min(Math.max(selected, 0), sections.length - 1) : -1;
    selected = -1;
    renderList();
    selectSection(next);
  }
  const res = await api.saveSections(sections);
  if (res && res.ok) markClean();
  else alert('Save failed: ' + (res && res.error));
});

['f-key', 'f-title', 'f-subtitle', 'f-animation', 'f-details', 'f-notes'].forEach((id) => {
  $(id).addEventListener('input', () => {
    if (selected >= 0) {
      pullForm(selected);
      renderList();
    }
  });
});

async function refreshKeyStatus() {
  const s = await api.getApiKeyStatus();
  const el = $('keyStatus');
  if (s.hasKey) { el.textContent = `Key saved (${s.preview}).`; el.className = 'status ok'; }
  else { el.textContent = 'No key saved.'; el.className = 'status'; }
}
$('saveKeyBtn').addEventListener('click', async () => {
  const v = $('apiKey').value.trim();
  if (!v) return;
  const r = await api.setApiKey(v);
  if (r.ok) { $('apiKey').value = ''; await refreshKeyStatus(); }
  else alert('Failed to save key: ' + r.error);
});
$('clearKeyBtn').addEventListener('click', async () => {
  await api.clearApiKey();
  await refreshKeyStatus();
});

$('pickFileBtn').addEventListener('click', async () => {
  const r = await api.pickScriptFile();
  if (r && r.path) {
    pickedFile = r.path;
    $('pickedFile').textContent = `Selected: ${r.name} (${r.size} bytes)`;
    $('pickedFile').className = 'status ok';
  }
});

$('generateBtn').addEventListener('click', async () => {
  if (!pickedFile) { alert('Pick a script file first.'); return; }
  const status = $('genStatus');
  status.textContent = 'Parsing & calling GitHub Models…';
  status.className = 'status busy';
  $('generateBtn').disabled = true;
  try {
    const res = await api.generateFromScript({ path: pickedFile, model: $('model').value });
    if (!res.ok) {
      status.textContent = 'Error: ' + res.error;
      status.className = 'status err';
      return;
    }
    sections = res.sections;
    // Deselect before re-selecting so we don't pullForm() stale inputs into
    // the freshly generated section 0.
    selected = -1;
    renderList();
    selectSection(sections.length > 0 ? 0 : -1);
    markDirty();
    status.textContent = `Generated ${sections.length} sections. Review and click Save.`;
    status.className = 'status ok';
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
    status.className = 'status err';
  } finally {
    $('generateBtn').disabled = false;
  }
});

(async function init() {
  sections = await api.getSections();
  selected = -1;
  renderList();
  if (sections.length > 0) selectSection(0);
  markClean();
  refreshKeyStatus();
  // Load branding fields.
  const b = await api.getBranding();
  $('b-brand').value = b.brandTitle || '';
  $('b-eyebrow').value = b.heroEyebrow || '';
  $('b-title').value = b.heroTitle || '';
  $('b-sub').value = b.heroSubtitle || '';
})();

$('saveBrandingBtn').addEventListener('click', async () => {
  const status = $('brandingStatus');
  status.textContent = 'Saving…';
  status.className = 'status busy';
  const res = await api.saveBranding({
    brandTitle: $('b-brand').value,
    heroEyebrow: $('b-eyebrow').value,
    heroTitle: $('b-title').value,
    heroSubtitle: $('b-sub').value,
  });
  if (res.ok) { status.textContent = 'Saved.'; status.className = 'status ok'; }
  else { status.textContent = 'Error: ' + res.error; status.className = 'status err'; }
});


