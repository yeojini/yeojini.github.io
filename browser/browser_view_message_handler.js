const { app, ipcMain, BrowserView } = require('electron');

const map = new Map();
let id = 0;

const onBrowserViewMessage = function() {
  ipcMain.on("BrowserView", (evt, payload) => {
    const obj = JSON.parse(payload);
    const func = obj.func;

    switch (func) {
      case "new":
        id = ++id;
        if (obj.options == undefined)
          obj.options = {};
        obj.options.webPreferences = {nodeIntegration: true, contextIsolation: false};
        let view = new BrowserView(obj.options);
        InitViewEventHandler(view, evt.sender);
        map.set(id, view);
        evt.returnValue = id;
        break;
      case 'setAutoResize':
        GetObject(obj.id).setAutoResize(obj.options);
        break;
      case 'setBounds':
        GetObject(obj.id).setBounds(obj.bounds);
        break;
      case 'getBounds':
        let bounds = GetObject(obj.id).getBounds();
        evt.returnValue = JSON.stringify(bounds);
        break;
      case 'setBackgroundColor':
        GetObject(obj.id).setBackgroundColor(obj.color);
        break;
      case 'loadFile': {
        let webContents = GetObject(obj.id).webContents;
        webContents.loadFile(obj.filepath);
        break;
      }
      case 'loadURL': {
        let webContents = GetObject(obj.id).webContents;
        webContents.loadURL(obj.url);
        break;
      }
      case 'print': {
        let webContents = GetObject(obj.id).webContents;
        webContents.print(obj.options);
        break;
      }
      case 'printToPDF': {
        let webContents = GetObject(obj.id).webContents;
        webContents.printToPDF(obj.options).then(data => {
          let bufferToStr = data.toString('base64');
          console.log("printToPDF called!!!");
          evt.sender.send('onCompletePrintToPDFwithView',
            JSON.stringify({'id': obj.id, 'buffer': bufferToStr}));
        });
      }
      case 'getPrinters': {
        let webContents = GetObject(obj.id).webContents;
        evt.returnValue = webContents.getPrinters();
        break;
      }
      case 'hasSwitch': {
        evt.returnValue = app.commandLine.hasSwitch(obj.flag);
        break;
      }
      case 'getSwitchValue': {
        evt.returnValue = app.commandLine.getSwitchValue(obj.flag);
        break;
      }
      // @deprecated
      case 'openDevTools': {
        let webContents = GetObject(obj.id).webContents;
        webContents.openDevTools(obj.options);
        break;
      }
    }
});
}

function GetObject(id) {
  return map.get(id);
}

function GetId(obj) {
  for (let [key, value] of map) {
    if (value == obj)
      return key;
  }
  return null;
}

function InitViewEventHandler(view, sender) {
  view.webContents.on("did-finish-load", () => {
    sender.send('BrowserViewEvent',
      JSON.stringify({'id': GetId(view), 'func': 'didfinishload'}));
  });
}

module.exports = { onBrowserViewMessage, GetObject, GetId };
