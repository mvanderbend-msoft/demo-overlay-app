const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlay', {
  onSection: (cb) => {
    ipcRenderer.on('section:update', (_evt, payload) => cb(payload));
  },
  getInitial: () => ipcRenderer.invoke('overlay:getInitial'),
});
