const { ipcMain } = require('electron');
const keytar = require('keytar');

const onSecureStorageMessage = function() {
  ipcMain.on("SecureStorage", async (evt, payload) => {
    const obj = JSON.parse(payload);
    const func = obj.func;

    switch (func) {
      case 'setPassword':
        await keytar.setPassword(obj.identifier, obj.account, obj.password);
        break;
      case 'getPassword':
        let pw = await keytar.getPassword(obj.identifier, obj.account);
        evt.returnValue = JSON.stringify(pw)
        break;
      case 'deletePassword':
        evt.returnValue = await keytar.deletePassword(obj.identifier, obj.account);
        break;
    }
  });
}

module.exports = onSecureStorageMessage;
