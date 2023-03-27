const { ipcMain, dialog } = require('electron');

const onDialogMessage = function() {
  ipcMain.on("Dialog", (evt, payload) => {
    const obj = JSON.parse(payload);
    const func = obj.func;

    switch (func) {
      case 'showSaveDialogSync':
        evt.returnValue =
          dialog.showSaveDialogSync(obj.browserWindow, obj.options);
        break;
    }
  });
}

module.exports = onDialogMessage;
