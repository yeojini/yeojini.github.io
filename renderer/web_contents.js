if (typeof ipcRenderer == 'undefined') {
  ipcRenderer = require('electron').ipcRenderer;
}

function base64ToArrayBuffer(base64Str) {
  let decodeStr = window.atob(base64Str);
  let len = decodeStr.length;
  let bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = decodeStr.charCodeAt(i);
  }
  return bytes.buffer;
}

let printToPDFCallback;
ipcRenderer.on('onCompletePrintToPDF', (evt, base64Str) => {
  let arrayBuffer = base64ToArrayBuffer(base64Str);
  if (printToPDFCallback !== undefined)
    printToPDFCallback(arrayBuffer);
});

function openDevTools(options) {
  ipcRenderer.send("WebContents", JSON.stringify({'func': 'openDevTools', 'options': options}));
}

function toggleDevTools() {
  ipcRenderer.send("WebContents", JSON.stringify({'func': 'toggleDevTools'}));
}

function reloadIgnoringCache() {
  ipcRenderer.send("WebContents", JSON.stringify({'func': 'reloadIgnoringCache'}));
}

function print(options) {
  ipcRenderer.send("WebContents", JSON.stringify({'func':'print', 'options':options}));
}

function printToPDF(options, callback) {
  printToPDFCallback = callback;
  ipcRenderer.send("WebContents", JSON.stringify({'func':'printToPDF', 'options':options}));
}

function getPrinters() {
  return ipcRenderer.sendSync("WebContents", JSON.stringify({'func':'getPrinters'}));
}

function hasSwitch(flag) {
  return ipcRenderer.sendSync("WebContents", JSON.stringify({'func':'hasSwitch', 'flag': flag}));
}

function getSwitchValue(flag) {
  return ipcRenderer.sendSync("WebContents", JSON.stringify({'func':'getSwitchValue', 'flag': flag}));
}
