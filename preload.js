const { ipcRenderer } = require('electron');

window.electronAPI = {
  printRendererProcessID : () => ipcRenderer.send('print-renderer-processID'),
};

