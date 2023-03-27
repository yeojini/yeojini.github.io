class SecureStorage {
  static setPassword(identifier, account, password) {
    ipcRenderer.send("SecureStorage",
        JSON.stringify(
            {'func': 'setPassword', 'identifier': identifier, 'account': account, 'password': password}));
  }

static getPassword(identifier, account) {
    return (ipcRenderer.sendSync("SecureStorage",
        JSON.stringify({'func': 'getPassword', 'identifier': identifier, 'account': account})));
  }

  static deletePassword(identifier, account) {
    return (ipcRenderer.sendSync("SecureStorage",
        JSON.stringify({'func': 'deletePassword', 'identifier': identifier, 'account': account})));
  }
}
