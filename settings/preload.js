const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settings', {
  getSections: () => ipcRenderer.invoke('settings:getSections'),
  saveSections: (sections) => ipcRenderer.invoke('settings:saveSections', sections),
  getBranding: () => ipcRenderer.invoke('settings:getBranding'),
  saveBranding: (b) => ipcRenderer.invoke('settings:saveBranding', b),
  getApiKeyStatus: () => ipcRenderer.invoke('settings:getApiKeyStatus'),
  setApiKey: (key) => ipcRenderer.invoke('settings:setApiKey', key),
  clearApiKey: () => ipcRenderer.invoke('settings:clearApiKey'),
  pickScriptFile: () => ipcRenderer.invoke('settings:pickScriptFile'),
  generateFromScript: (opts) => ipcRenderer.invoke('settings:generateFromScript', opts),
  closeWindow: () => ipcRenderer.invoke('settings:close'),
});
