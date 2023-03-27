const { BrowserWindow, ipcMain, globalShortcut } = require('electron');

const callback_accelerator_map = new Map();

const onGlobalShortcutMessage = function() {
  ipcMain.on("GolbalShortcut", (evt, payload) => {
    const obj = JSON.parse(payload);
    const func = obj.func;

    switch (func) {
      case "register":
        console.log(obj);
        console.log(obj.callback);
        let callback = new ShortcutCallback();
        callback_accelerator_map.set(callback.keyPressed, obj.accelerator);
        evt.returnValue =
            globalShortcut.register(obj.accelerator, callback.keyPressed);
        break;
    }
  });
}

function ShortcutCallback () {
  this.keyPressed = function() {
  console.log("Key Pressed" , callback_accelerator_map);
    const accelerator = callback_accelerator_map.get(this);
    let win = BrowserWindow.getFocusedWindow();
    win.webContents.send("OnShortcutPressed",
        JSON.stringify({'accelerator':accelerator}));
  }
}

module.exports = onGlobalShortcutMessage;
