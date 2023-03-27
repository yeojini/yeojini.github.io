const {ipcRenderer } = require('electron');

const accelerator_callback_map = new Map();

class globalShortcut {
//  static register(accelerator, callback) {
//    accelerator_callback_map.set(accelerator, callback);
//    return ipcRenderer.sendSync("GolbalShortcut",
//        JSON.stringify({'func':"register", 'accelerator':accelerator}));
//  }

}

ipcRenderer.on("OnShortcutPressed", (evt, message) => {
  const obj = JSON.parse(message);
  console.log("On Message");

  accelerator_callback_map.get(obj.accelerator).call()
});

exports.globalShortcut = globalShortcut;
