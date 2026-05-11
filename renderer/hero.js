const COLORS = ['#ffd166', '#ff9f1c', '#8957e5', '#c9a4ff', '#1f6feb', '#79b8ff', '#ffffff'];
const container = document.getElementById('confetti');

// Apply branding passed via URL hash (set by the main process on loadFile).
try {
  const raw = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (raw) {
    const b = JSON.parse(raw);
    if (b.eyebrow) document.getElementById('heroEyebrow').textContent = b.eyebrow;
    if (b.subtitle) document.getElementById('heroSubtitle').textContent = b.subtitle;
    if (b.title) {
      // Highlight the last word with the gradient span, preserving the
      // existing visual style.
      const t = b.title.trim();
      const lastSpace = t.lastIndexOf(' ');
      const head = lastSpace > 0 ? t.slice(0, lastSpace) : '';
      const tail = lastSpace > 0 ? t.slice(lastSpace + 1) : t;
      const titleEl = document.getElementById('heroTitle');
      titleEl.innerHTML = '';
      if (head) titleEl.appendChild(document.createTextNode(head + ' '));
      const span = document.createElement('span');
      span.className = 'grad';
      span.textContent = tail;
      titleEl.appendChild(span);
    }
  }
} catch (_e) { /* keep defaults */ }


function spawn() {
  for (let i = 0; i < 90; i += 1) {
    const el = document.createElement('span');
    el.style.left = `${Math.random() * 100}%`;
    el.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
    const dur = 3 + Math.random() * 3.5;
    const delay = Math.random() * 1.5;
    el.style.animationDuration = `${dur}s`;
    el.style.animationDelay = `${delay}s`;
    el.style.width = `${6 + Math.random() * 8}px`;
    el.style.height = `${10 + Math.random() * 8}px`;
    el.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(el);
  }
}
spawn();
