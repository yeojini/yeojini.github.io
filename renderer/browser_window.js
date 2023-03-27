const { ipcRenderer } = require('electron');

const browserWindowMap = new Map();

class BrowserWindow {
  #id;
  static secondInstanceCallback;

  constructor(options) {
    if (options && options.dummy) {
      this.#id = options.id;
    } else {
      this.#id = ipcRenderer.sendSync("BrowserWindow",
          JSON.stringify({'func': 'new', 'options': options}));
    }
    browserWindowMap.set(this.#id, this);
  }

  id() {
    return this.#id;
  }

  loadFile(filepath) {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'loadFile', 'url': filepath}));
    return true;
  }

  maximize() {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'maximize'}));
  }

  minimize() {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'minimize'}));
  }

  unmaximize() {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'unmaximize'}));
  }

  close() {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'close'}));
  }

  isMaximized() {
    return ipcRenderer.sendSync("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'isMaximized'}));
  }

  isFullScreen() {
    return ipcRenderer.sendSync("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'isFullScreen'}));
  }

  // @deprecated
  reloadIgnoringCache() {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'reloadIgnoringCache'}));
  }

  // @deprecated
  toggleDevTools() {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'toggleDevTools'}));
  }
  
  focus() {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'focus'}));
  }

  isDestroyed() {
    return ipcRenderer.sendSync("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'isDestroyed'}));
  }

  hide() {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'hide'}));
  }

  setSize(width, height) {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'setSize', 'width': width, 'height': height}));
  }
  getSize() {
    let json = ipcRenderer.sendSync("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func':'getSize'}));
    let size = JSON.parse(json);
    return size;
  }

  center() {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'center'}));
  }

  isMenuBarVisible() {
    return ipcRenderer.sendSync("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'isMenuBarVisible'}));
  }

  setMenuBarVisibility(bool) {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'setMenuBarVisibility', 'bool': bool}));
  }

  restore() {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'restore'}));
  }

  loadURL(url) {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'loadURL', 'url': url}));
    return true;
  }

  setBrowserView(view) {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'setBrowserView', 'viewId': view.id}));
  }

  getBrowserView() {
    let viewId = ipcRenderer.sendSync("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'getBrowserView'}));

    if (viewId < 0)
      return undefined;

    return GetBrowserView(viewId);
  }

  getBrowserViews() {
    let json = ipcRenderer.sendSync("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'getBrowserViews'}));
    let viewIds = JSON.parse(json);
    let views = [];
    for (let id of viewIds) {
      let view = GetBrowserView(id);
      if (view)
        views.push(view);
    }
    return views;
  }

  addBrowserView(view) {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'addBrowserView', 'viewId': view.id}));
  }

  removeBrowserView(view) {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'removeBrowserView', 'viewId': view.id}));
  }

  setTopBrowserView(view) {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'setTopBrowserView', 'viewId': view.id}));
  }

  log(message) {
    ipcRenderer.send("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'log', 'message': message}));
  }

  getWebContentsId() {
    return ipcRenderer.sendSync("BrowserWindow",
        JSON.stringify({'id': this.#id, 'func': 'getWebContentsId'}));
  }

  static setSecondInstanceCallback(callback) {
    BrowserWindow.secondInstanceCallback = callback;
  }
}

function GetBrowserWindowFromId(id) {
  return browserWindowMap.get(id);
}

BrowserWindow.getFocusedWindow = function() {
  let id = ipcRenderer.sendSync("BrowserWindow",
      JSON.stringify({'func': 'getFocusedWindow'}));

  if (GetBrowserWindowFromId(id) == null)
    return new BrowserWindow({dummy: true, id: id });
  return GetBrowserWindowFromId(id);
}

BrowserWindow.fromId = function(id) {
  return GetBrowserWindowFromId(id);
}

class AppWindow {
  constructor() {
    this.maximizeCallback;
    this.unmaximizeCallback;
    this.resizeCallback;
    this.browserWindow;

    let id = ipcRenderer.sendSync("BrowserWindow", JSON.stringify({'func': 'getID'}));
    this.browserWindow = new BrowserWindow({dummy: true, id: id});
  }
}

let appWindow = new AppWindow();

function SetMaximizeCallback(callback) {
  appWindow.maximizeCallback = callback;
}

function SetUnmaximizeCallback(callback) {
  appWindow.unmaximizeCallback = callback;
}

function SetResizeCallback(callback) {
  appWindow.resizeCallback = callback;
}

function GetMaximizeCallback() {
  return appWindow.maximizeCallback;
}

function GetUnmaximizeCallback() {
  return appWindow.unmaximizeCallback;
}

function GetResizeCallback() {
  return appWindow.resizeCallback;
}

function GetBrowserWindow() {
  return appWindow.browserWindow;
}

ipcRenderer.on('BrowserWindowEvent', (evt, message) => {
  let callback;
  switch (message) {
    case 'maximize':
      callback = GetMaximizeCallback();
      break;
    case 'unmaximize':
      callback = GetUnmaximizeCallback();
      break;
	  case 'resize':
	    callback = GetResizeCallback();
      break;
  }

  if (callback !== undefined)
    callback();
});

ipcRenderer.on('second-instance', () => {
  let callback = BrowserWindow.secondInstanceCallback();
  if (callback !== undefined)
    callback();
});

module.exports = BrowserWindow
