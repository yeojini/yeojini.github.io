const { ipcMain, BrowserWindow } = require('electron');
const BrowserViewMessageHandler =
  require('./browser_view_message_handler.js');

const map = new Map();

function InitWindowEventHandler(win) {
  win.on('maximize', () => {
    win.webContents.send('BrowserWindowEvent', 'maximize');
	});
  win.on('resize', () => {
    win.webContents.send('BrowserWindowEvent', 'resize');
	});
  win.on('unmaximize', () => {
    win.webContents.send('BrowserWindowEvent', 'unmaximize');
  });
}

const onBrowserWindowMessage = function(shellWin) {
  map.set(shellWin.id, shellWin);
  InitWindowEventHandler(shellWin);

  ipcMain.on("BrowserWindow", (evt, payload) => {
    const obj = JSON.parse(payload);
    const func = obj.func;

    switch (func) {
      case "new":
        if (obj.options == undefined)
          obj.options = {};
        obj.options.webPreferences = {nodeIntegration: true, contextIsolation: false};
        let win = new BrowserWindow(obj.options);
        map.set(win.id, win);
        evt.returnValue = win.id;
        InitWindowEventHandler(win);
        break;
      case 'getID': {
        let webContents = evt.sender;
        let win = BrowserWindow.fromWebContents(webContents);
        evt.returnValue = win.id;
        break;
      }
      case 'minimize':
        GetObject(obj.id).minimize();
        break;
      case 'maximize':
        GetObject(obj.id).maximize();
        break;
      case 'unmaximize':
        GetObject(obj.id).unmaximzie();
        break;
      case 'close':
        GetObject(obj.id).close();
        break;
      case 'loadFile':
        GetObject(obj.id).loadFile(obj.url);
        break;
      case 'isMaximized':
        evt.returnValue = GetObject(obj.id).isMaximized();
        break;
      case 'isFullScreen':
        evt.returnValue = GetObject(obj.id).isFullScreen();
        break;
      case 'getFocusedWindow':
        evt.returnValue = GetId(BrowserWindow.getFocusedWindow());
        break;
      // @deprecated
      case 'reloadIgnoringCache':
        GetObject(obj.id).webContents.reloadIgnoringCache();
        break;
      // @deprecated
      case 'toggleDevTools':
        GetObject(obj.id).webContents.toggleDevTools();
        break;
      case 'focus':
        GetObject(obj.id).focus();
        break;
      case 'isDestroyed':
        evt.returnValue = GetObject(obj.id).isDestroyed();
        break;
      case 'hide':
        GetObject(obj.id).hide();
        break;
      case 'setSize':
        GetObject(obj.id).setSize(obj.width,obj.height);
        break;
      case 'getSize':
        let size = GetObject(obj.id).getSize();
        evt.returnValue = JSON.stringify(size);
        break;
      case 'center':
        GetObject(obj.id).center();
        break;
      case 'isMenuBarVisible':
        evt.returnValue = GetObject(obj.id).isMenuBarVisible();
        break;
      case 'setMenuBarVisibility':
        GetObject(obj.id).setMenuBarVisibility(obj.bool);
        break;
      case 'reload':
        GetObject(obj.id).reload();
        break;
      case 'restore':
        GetObject(obj.id).restore();
        break;
      case 'fromId':
        evt.returnValue = BrowserWindow.fromId(obj.winid);
        break;
      case 'loadURL':
        GetObject(obj.id).loadURL(obj.url);
        break;
      case 'setBrowserView': {
        let view = BrowserViewMessageHandler.GetObject(obj.viewId);
        GetObject(obj.id).setBrowserView(view);
        break;
       }
      case 'getBrowserView': {
        try {
          let view = GetObject(obj.id).getBrowserView();
          if (view)
            evt.returnValue = BrowserViewMessageHandler.GetId(view);
          else
            evt.returnValue = -1;
        } catch (err) {
          evt.returnValue = -1;
        }
        break;
      }
      case 'getBrowserViews': {
        let views = GetObject(obj.id).getBrowserViews();
        let viewIds = [];
        for (let view of views) {
          let viewId = BrowserViewMessageHandler.GetId(view);
          viewIds.push(viewId);
        }
        evt.returnValue = JSON.stringify(viewIds);
        break;
      }
      case 'addBrowserView': {
        let view = BrowserViewMessageHandler.GetObject(obj.viewId);
        GetObject(obj.id).addBrowserView(view);
        break;
      }
      case 'removeBrowserView': {
        let view = BrowserViewMessageHandler.GetObject(obj.viewId);
        GetObject(obj.id).removeBrowserView(view);
        break;
      }
      case 'setTopBrowserView': {
        let view = BrowserViewMessageHandler.GetObject(obj.viewId);
        GetObject(obj.id).setTopBrowserView(view);
        break;
      }
      case 'log': {
        console.log("CONSOLE LOG(" + obj.id + ") : " + obj.message);
        break;
      }
      case 'getWebContentsId':
        evt.returnValue = GetObject(obj.id).webContents.id;
        break;
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

module.exports = onBrowserWindowMessage;
