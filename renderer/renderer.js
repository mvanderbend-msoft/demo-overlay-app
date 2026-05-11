const card = document.getElementById('card');
const titleEl = document.getElementById('title');
const subtitleEl = document.getElementById('subtitle');
const indexEl = document.getElementById('index');
const accentEl = document.getElementById('accent');
const detailsEl = document.getElementById('details');
const animationEl = document.getElementById('animation');

let firstRender = true;
let lastIndex = -1;

function renderDetails(section) {
  detailsEl.innerHTML = '';
  if (!Array.isArray(section?.details)) return;
  for (const item of section.details) {
    const li = document.createElement('li');
    li.textContent = item;
    detailsEl.appendChild(li);
  }
}

function renderAnimation(section) {
  const key = section?.animation;
  const fn = key && window.ANIMATIONS && window.ANIMATIONS[key];
  animationEl.innerHTML = fn ? fn() : '';
}

function applyContent(section, index, total) {
  titleEl.textContent = section?.title ?? '';
  subtitleEl.textContent = section?.subtitle ?? '';
  indexEl.textContent = `${index + 1} / ${total}`;
  renderDetails(section);
  renderAnimation(section);
}

function render({ index, total, section, accentColor, brandTitle, expanded }) {
  if (brandTitle) {
    const bEl = document.getElementById('brand');
    if (bEl && bEl.textContent !== brandTitle) bEl.textContent = brandTitle;
  }
  if (accentColor) {
    accentEl.style.background = accentColor;
    accentEl.style.boxShadow = `0 0 14px ${accentColor}88`;
    document.documentElement.style.setProperty('--accent', accentColor);
    document.documentElement.style.setProperty('--accent-glow', `${accentColor}88`);
  }

  const sameSection = !firstRender && index === lastIndex;
  lastIndex = index;

  if (sameSection) {
    // Same index — could be just an expand toggle, or an in-place edit from
    // the Settings UI. Always re-apply content so edits show up; skip the
    // fade animation for a smoother UX.
    applyContent(section, index, total);
    card.classList.toggle('expanded', !!expanded);
    return;
  }

  if (firstRender) {
    firstRender = false;
    requestAnimationFrame(() => {
      applyContent(section, index, total);
      card.classList.toggle('expanded', !!expanded);
      card.classList.add('visible');
    });
    return;
  }

  card.classList.remove('visible');
  card.classList.add('leaving');
  setTimeout(() => {
    applyContent(section, index, total);
    card.classList.toggle('expanded', !!expanded);
    card.classList.remove('leaving');
    void card.offsetWidth;
    card.classList.add('visible');
  }, 180);
}

window.overlay.onSection(render);
window.overlay.getInitial().then((payload) => {
  if (payload && payload.section) render(payload);
});

