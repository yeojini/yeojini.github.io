const browserViewMap = new Map();

function base64ToArrayBufferForBrowserView(base64Str) {
  let decodeStr = window.atob(base64Str);
  let len = decodeStr.length;
  let bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = decodeStr.charCodeAt(i)
  }
  return bytes.buffer;
}

class BrowserView {
  constructor(options) {
    this.didFinishLoad;
    this.printToPDFCallback;

    this.id = ipcRenderer.sendSync("BrowserView",
        JSON.stringify({'func': 'new', 'options': options}));
    browserViewMap.set(this.id, this);
  }

  setDidFinishLoad(callback) {
    this.didFinishLoad = callback;
  }

  getDidFinishLoad() {
    return this.didFinishLoad;
  }

  printToPDF(options, callback) {
    this.printToPDFCallback = callback;
    ipcRenderer.send("BrowserView", JSON.stringify({'func':'printToPDF', 'id': this.id, 'options':options}));
  };

  getPrintToPDFCallback() {
    return this.printToPDFCallback;
  }

  setAutoResize(options) {
    ipcRenderer.send("BrowserView",
        JSON.stringify({'id': this.id, 'func': 'setAutoResize', 'options': options}));
  }

  setBounds(bounds) {
    ipcRenderer.send("BrowserView",
        JSON.stringify({'id': this.id, 'func': 'setBounds', 'bounds': bounds}));
  }

  getBounds() {
    let retval = ipcRenderer.sendSync("BrowserView",
        JSON.stringify({'id': this.id, 'func': 'getBounds'}));
    let bounds = JSON.parse(retval);
    return bounds;
  }
  
  setBackgroundColor(color) {
    ipcRenderer.send("BrowserView",
        JSON.stringify({'id': this.id, 'func': 'setBackgroundColor', 'color': color}));
  }
  
  loadFile(filepath) {
    ipcRenderer.send("BrowserView",
      JSON.stringify({'id': this.id, 'func': 'loadFile', 'filepath': filepath}));
  };
  
  loadURL(url) {
    ipcRenderer.send("BrowserView",
      JSON.stringify({'id': this.id, 'func': 'loadURL', 'url': url}));
  };

  print(options) {
    ipcRenderer.send("BrowserView",
      JSON.stringify({'id': this.id, 'func':'print', 'options':options}));
  };

  getPrinters() {
    return ipcRenderer.sendSync("BrowserView",
      JSON.stringify({'id': this.id, 'func':'getPrinters'}));
  };

  hasSwitch(flag) {
    return ipcRenderer.sendSync("BrowserView",
      JSON.stringify({'func':'hasSwitch', 'flag': flag}));
  };

  getSwitchValue(flag) {
    return ipcRenderer.sendSync("BrowserView",
      JSON.stringify({'func':'getSwitchValue', 'flag': flag}));
  };

  // @deprecated
  openDevTools(options) {
    ipcRenderer.send("BrowserView",
      JSON.stringify({'id': this.id, 'func': 'openDevTools', 'options': options}));
  }
}

function GetBrowserView(id) {
  return browserViewMap.get(id);
}

ipcRenderer.on('BrowserViewEvent', (evt, message) => {
  let callback;
  const obj = JSON.parse(message);
  const func = obj.func;
  const id = obj.id;

  switch (func) {
    case 'didfinishload':
      callback = GetBrowserView(id).getDidFinishLoad();
      break;
  }

  if (callback !== undefined)
    callback();
});

ipcRenderer.on('onCompletePrintToPDFwithView', (evt, message) => {
  const obj = JSON.parse(message);
  const id = obj.id;
  const buffer = obj.buffer;

  console.log('id : ' + id + ', buffer : ' + buffer);

  let arrayBuffer = base64ToArrayBufferForBrowserView(buffer);
  if (GetBrowserView(id).getPrintToPDFCallback() !== undefined) {
    let callback = GetBrowserView(id).getPrintToPDFCallback();
    callback(arrayBuffer);
  }
});

module.exports = { BrowserView, GetBrowserView };
