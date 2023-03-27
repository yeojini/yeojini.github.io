if (typeof ipcRenderer == 'undefined') {
  ipcRenderer = require('electron').ipcRenderer;
}

class dialog {
static showSaveDialogSync = function(browserWindow, options) {
    return ipcRenderer.sendSync('Dialog',
        JSON.stringify({'func': 'showSaveDialogSync',
                        'browserWindow': browserWindow,
                        'options': options}));
  }
}
