const { app, ipcMain } = require('electron');

const onWebContentsMessage = function() {
  ipcMain.on("WebContents", (evt, payload) => {
    const obj = JSON.parse(payload);
    const func = obj.func;
    let webContents = evt.sender;

    switch (func) {
      case 'openDevTools':
        webContents.openDevTools(obj.options);
        break;
      case 'toggleDevTools':
        webContents.toggleDevTools();
        break;
      case 'reloadIgnoringCache':
        webContents.reloadIgnoringCache();
        break;
      case 'print':
        webContents.print(obj.options);
        break;
      case 'printToPDF':
        webContents.printToPDF(obj.options).then(data => {
          let bufferToStr = data.toString('base64');
          webContents.send('onCompletePrintToPDF', bufferToStr);
        });
        break;
      case 'getPrinters':
        evt.returnValue = webContents.getPrinters();
        break;
      case 'hasSwitch':
        evt.returnValue = app.commandLine.hasSwitch(obj.flag)
        break;
      case 'getSwitchValue':
        evt.returnValue = app.commandLine.getSwitchValue(obj.flag);
        break;
    }
});
}

module.exports = onWebContentsMessage;
