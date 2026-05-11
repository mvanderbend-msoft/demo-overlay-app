const { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage, dialog, safeStorage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { extractText, generateSections } = require('./settings/generate');

const ROOT = __dirname;
const SECTIONS_PATH = path.join(ROOT, 'sections.json');
const CONFIG_PATH = path.join(ROOT, 'config.json');
// API key (encrypted via safeStorage) lives in the user data dir, not the repo.
const API_KEY_PATH = () => path.join(app.getPath('userData'), 'github-models.key');

const DEFAULT_CONFIG = {
  position: 'bottom-center',
  width: 960,
  collapsedHeight: 160,
  expandedHeight: 460,
  marginBottom: 60,
  accentColor: '#8957e5',
  brandTitle: 'GitHub Copilot Foundations',
  heroEyebrow: 'CONGRATULATIONS',
  heroTitle: 'You are now a Hero',
  heroSubtitle: 'GitHub Copilot · Zero-To-Hero · Complete',
  hotkeys: {
    next: 'Control+Alt+Right',
    prev: 'Control+Alt+Left',
    first: 'Control+Alt+Home',
    toggle: 'Control+Alt+H',
    expand: 'Control+Alt+Space',
    frame: 'Control+Alt+F',
    hero: 'Control+Alt+Enter',
    settings: 'Control+Alt+,',
    quit: 'Control+Alt+Q',
  },
};

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.warn(`[overlay] Failed to read ${filePath}: ${err.message}`);
    return fallback;
  }
}

function loadConfig() {
  const cfg = readJsonSafe(CONFIG_PATH, {});
  return {
    ...DEFAULT_CONFIG,
    ...cfg,
    hotkeys: { ...DEFAULT_CONFIG.hotkeys, ...(cfg.hotkeys || {}) },
  };
}

function loadSections() {
  // On first run sections.json may not exist (it's gitignored). Seed it
  // from sections.example.json so the user gets something to look at.
  if (!fs.existsSync(SECTIONS_PATH)) {
    const examplePath = path.join(ROOT, 'sections.example.json');
    if (fs.existsSync(examplePath)) {
      try { fs.copyFileSync(examplePath, SECTIONS_PATH); }
      catch (err) { console.warn(`[overlay] could not seed sections.json: ${err.message}`); }
    }
  }
  const data = readJsonSafe(SECTIONS_PATH, []);
  if (!Array.isArray(data) || data.length === 0) {
    return [{ title: 'No sections.json', subtitle: 'Add entries to sections.json' }];
  }
  return data;
}

let win = null;
let frameWin = null;
let heroWin = null;
let settingsWin = null;
let tray = null;
let sections = [];
let currentIndex = 0;
let visible = true;
let expanded = false;
let frameVisible = true;
let heroVisible = false;
let config = DEFAULT_CONFIG;

function computeBounds(cfg) {
  const display = screen.getPrimaryDisplay();
  const { workArea } = display;
  const w = cfg.width;
  const h = cfg.expandedHeight;
  let x = workArea.x + Math.round((workArea.width - w) / 2);
  let y = workArea.y + workArea.height - h - cfg.marginBottom;

  switch (cfg.position) {
    case 'bottom-left':
      x = workArea.x + 40;
      break;
    case 'bottom-right':
      x = workArea.x + workArea.width - w - 40;
      break;
    case 'top-center':
      y = workArea.y + cfg.marginBottom;
      break;
    case 'bottom-center':
    default:
      break;
  }
  return { x, y, width: w, height: h };
}

function applyBounds() {
  if (!win || win.isDestroyed()) return;
  win.setBounds(computeBounds(config), false);
}

function createWindow() {
  const bounds = computeBounds(config);

  win = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    thickFrame: false,
    roundedCorners: false,
    backgroundColor: '#00000000',
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(ROOT, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });

  win.loadFile(path.join(ROOT, 'renderer', 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
    pushSection();
  });
}

function createFrameWindow() {
  const display = screen.getPrimaryDisplay();
  const { bounds } = display; // full screen including taskbar area

  frameWin = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    thickFrame: false,
    roundedCorners: false,
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Sit just below the lower-third card so the card is always on top.
  frameWin.setAlwaysOnTop(true, 'screen-saver');
  frameWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  frameWin.setIgnoreMouseEvents(true, { forward: false });

  frameWin.loadFile(path.join(ROOT, 'renderer', 'frame.html'));

  frameWin.once('ready-to-show', () => {
    if (frameVisible) frameWin.showInactive();
    // Make sure the lower-third card sits above the frame.
    if (win && !win.isDestroyed()) {
      win.moveTop();
      win.setAlwaysOnTop(true, 'screen-saver');
    }
  });

  frameWin.on('closed', () => { frameWin = null; });
}

function toggleFrame() {
  if (!frameWin || frameWin.isDestroyed()) return;
  frameVisible = !frameVisible;
  if (frameVisible) frameWin.showInactive();
  else frameWin.hide();
}

function createHeroWindow() {
  const display = screen.getPrimaryDisplay();
  const { bounds } = display;

  heroWin = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    thickFrame: false,
    roundedCorners: false,
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  heroWin.setAlwaysOnTop(true, 'screen-saver');
  heroWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  heroWin.setIgnoreMouseEvents(true, { forward: false });

  heroWin.loadFile(path.join(ROOT, 'renderer', 'hero.html'), {
    hash: encodeURIComponent(JSON.stringify({
      eyebrow: config.heroEyebrow,
      title: config.heroTitle,
      subtitle: config.heroSubtitle,
    })),
  });

  heroWin.on('closed', () => { heroWin = null; heroVisible = false; });
}

function showHero() {
  if (!heroWin || heroWin.isDestroyed()) createHeroWindow();
  // Reload to retrigger CSS animations + confetti every time.
  heroWin.webContents.reload();
  heroWin.showInactive();
  heroWin.moveTop();
  heroVisible = true;
}

function hideHero() {
  if (heroWin && !heroWin.isDestroyed()) heroWin.hide();
  heroVisible = false;
}

function toggleHero() {
  if (heroVisible) hideHero();
  else showHero();
}

function pushSection() {
  const total = sections.length;
  const idx = ((currentIndex % total) + total) % total;
  currentIndex = idx;
  const payload = {
    index: idx,
    total,
    section: sections[idx],
    accentColor: config.accentColor,
    brandTitle: config.brandTitle,
    expanded,
  };
  if (win && !win.isDestroyed()) win.webContents.send('section:update', payload);
}

function next() {
  // If we're on the last section, trigger the hero finale instead of wrapping.
  if (currentIndex === sections.length - 1 && !heroVisible) {
    showHero();
    return;
  }
  if (heroVisible) hideHero();
  currentIndex += 1;
  pushSection();
}
function prev() {
  if (heroVisible) { hideHero(); return; }
  currentIndex -= 1;
  pushSection();
}
function first() { currentIndex = 0; pushSection(); }
function jumpTo(i) {
  if (i >= 0 && i < sections.length) {
    currentIndex = i;
    pushSection();
  }
}

function toggleVisibility() {
  if (!win) return;
  visible = !visible;
  if (visible) win.showInactive();
  else win.hide();
}

function toggleExpanded() {
  expanded = !expanded;
  pushSection();
}

function registerShortcuts() {
  const hk = config.hotkeys;
  const bindings = [
    [hk.next, next],
    [hk.prev, prev],
    [hk.first, first],
    [hk.toggle, toggleVisibility],
    [hk.expand, toggleExpanded],
    [hk.frame, toggleFrame],
    [hk.hero, toggleHero],
    [hk.settings, openSettings],
    [hk.quit, () => app.quit()],
  ];
  for (const [accel, fn] of bindings) {
    if (!accel) continue;
    const ok = globalShortcut.register(accel, fn);
    if (!ok) console.warn(`[overlay] Failed to register ${accel}`);
  }
  for (let i = 0; i <= 9; i += 1) {
    const accel = `Control+Alt+${i}`;
    globalShortcut.register(accel, () => jumpTo(i === 0 ? 9 : i - 1));
  }
}

// ---------- Settings window ----------

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 980,
    height: 720,
    title: 'Demo Overlay — Settings',
    backgroundColor: '#0d1117',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(ROOT, 'settings', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  settingsWin.setMenuBarVisibility(false);
  settingsWin.loadFile(path.join(ROOT, 'settings', 'index.html'));
  settingsWin.on('closed', () => { settingsWin = null; });
}

// ---------- Tray ----------

function createTray() {
  // Build a tiny purple square icon in memory so we don't ship a binary asset.
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    buf[i * 4 + 0] = 0x89; // R
    buf[i * 4 + 1] = 0x57; // G
    buf[i * 4 + 2] = 0xe5; // B
    buf[i * 4 + 3] = 0xff; // A
  }
  const icon = nativeImage.createFromBuffer(buf, { width: size, height: size });
  tray = new Tray(icon);
  tray.setToolTip('Demo Overlay');
  const menu = Menu.buildFromTemplate([
    { label: 'Open Settings…', click: openSettings },
    { label: 'Toggle overlay', click: toggleVisibility },
    { label: 'Next section', click: next },
    { label: 'Previous section', click: prev },
    { type: 'separator' },
    { label: 'Open sections.json folder', click: () => shell.showItemInFolder(SECTIONS_PATH) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on('click', openSettings);
}

// ---------- IPC for settings window ----------

function readApiKey() {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    const p = API_KEY_PATH();
    if (!fs.existsSync(p)) return null;
    const enc = fs.readFileSync(p);
    return safeStorage.decryptString(enc);
  } catch (err) {
    console.warn(`[overlay] readApiKey failed: ${err.message}`);
    return null;
  }
}

function writeApiKey(key) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS encryption (safeStorage) is not available on this machine.');
  }
  const enc = safeStorage.encryptString(key);
  fs.mkdirSync(path.dirname(API_KEY_PATH()), { recursive: true });
  fs.writeFileSync(API_KEY_PATH(), enc, { mode: 0o600 });
}

function registerSettingsIpc() {
  ipcMain.handle('settings:getSections', () => loadSections());

  ipcMain.handle('settings:getBranding', () => ({
    brandTitle: config.brandTitle,
    heroEyebrow: config.heroEyebrow,
    heroTitle: config.heroTitle,
    heroSubtitle: config.heroSubtitle,
  }));

  ipcMain.handle('settings:saveBranding', (_evt, branding) => {
    try {
      const raw = readJsonSafe(CONFIG_PATH, {});
      const next = {
        ...raw,
        brandTitle: String(branding.brandTitle || DEFAULT_CONFIG.brandTitle),
        heroEyebrow: String(branding.heroEyebrow || DEFAULT_CONFIG.heroEyebrow),
        heroTitle: String(branding.heroTitle || DEFAULT_CONFIG.heroTitle),
        heroSubtitle: String(branding.heroSubtitle || DEFAULT_CONFIG.heroSubtitle),
      };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2) + '\n', 'utf8');
      // Apply live (overlay updates next pushSection; hero gets fresh content
      // on next show).
      config = { ...config, ...next };
      pushSection();
      if (heroWin && !heroWin.isDestroyed()) {
        heroWin.loadFile(path.join(ROOT, 'renderer', 'hero.html'), {
          hash: encodeURIComponent(JSON.stringify({
            eyebrow: config.heroEyebrow,
            title: config.heroTitle,
            subtitle: config.heroSubtitle,
          })),
        });
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('settings:saveSections', (_evt, newSections) => {
    try {
      if (!Array.isArray(newSections)) throw new Error('sections must be an array');
      fs.writeFileSync(SECTIONS_PATH, JSON.stringify(newSections, null, 2) + '\n', 'utf8');
      // watcher will hot-reload, but push immediately for responsiveness
      sections = newSections.length > 0 ? newSections : sections;
      if (currentIndex >= sections.length) currentIndex = Math.max(0, sections.length - 1);
      pushSection();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('settings:getApiKeyStatus', () => {
    const k = readApiKey();
    if (!k) return { hasKey: false };
    const preview = k.length > 8 ? `${k.slice(0, 4)}…${k.slice(-4)}` : '••••';
    return { hasKey: true, preview };
  });

  ipcMain.handle('settings:setApiKey', (_evt, key) => {
    try {
      if (!key || typeof key !== 'string') throw new Error('Key required.');
      writeApiKey(key.trim());
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('settings:clearApiKey', () => {
    try { fs.unlinkSync(API_KEY_PATH()); } catch (_e) { /* ignore */ }
    return { ok: true };
  });

  ipcMain.handle('settings:pickScriptFile', async () => {
    const res = await dialog.showOpenDialog(settingsWin || win, {
      title: 'Choose a script file',
      properties: ['openFile'],
      filters: [
        { name: 'Script files', extensions: ['txt', 'md', 'pdf', 'docx'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (res.canceled || !res.filePaths[0]) return { ok: false };
    const p = res.filePaths[0];
    const stat = fs.statSync(p);
    return { ok: true, path: p, name: path.basename(p), size: stat.size };
  });

  ipcMain.handle('settings:generateFromScript', async (_evt, opts) => {
    try {
      const { path: filePath, model } = opts || {};
      if (!filePath) throw new Error('No file path provided.');
      const apiKey = readApiKey();
      if (!apiKey) throw new Error('No GitHub PAT saved. Add one above first.');
      const text = await extractText(filePath);
      if (!text || !text.trim()) throw new Error('No text could be extracted from this file.');
      const generated = await generateSections({
        scriptText: text,
        apiKey,
        model: model || 'openai/gpt-4o',
      });
      if (!Array.isArray(generated) || generated.length === 0) {
        throw new Error('Model returned zero sections.');
      }
      return { ok: true, sections: generated };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('settings:close', () => {
    if (settingsWin && !settingsWin.isDestroyed()) settingsWin.close();
  });
}

function watchSections() {
  let timer = null;
  fs.watch(SECTIONS_PATH, { persistent: false }, () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      sections = loadSections();
      pushSection();
      console.log('[overlay] sections.json reloaded');
    }, 150);
  });
}

app.whenReady().then(() => {
  config = loadConfig();
  sections = loadSections();
  registerSettingsIpc();
  createFrameWindow();
  createWindow();
  createHeroWindow();
  createTray();
  registerShortcuts();
  try { watchSections(); } catch (err) {
    console.warn(`[overlay] watch failed: ${err.message}`);
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.handle('overlay:getInitial', () => ({
  index: currentIndex,
  total: sections.length,
  section: sections[currentIndex],
  accentColor: config.accentColor,
  brandTitle: config.brandTitle,
  expanded,
}));
