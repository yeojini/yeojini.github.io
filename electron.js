const {
  app,
  BrowserWindow,
  BrowserView,
  ipcMain,
  screen,
  clipboard,
  ipcRenderer,
  dialog,
  webContents,
  globalShortcut,
  session,
} = require('electron');

const fs = require('fs-extra');
const path = require('path');


const onBrowserWindowMessage = require('./browser/browser_window_message_handler.js')
const onWebContentsMessage = require('./browser/web_contents_message_handler.js')
//const onBrowserWindowMessage = require('./browser/browser_window_message_handler.js')
const { onBrowserViewMessage } = require('./browser/browser_view_message_handler.js')
//const { onBrowserViewMessage } = require('./browser/browser_view_message_handler.js')
const onDialogMessage = require('./browser/dialog_message_handler.js')

exports.__esModule = true;
app.commandLine.appendSwitch('no-sandbox');
// superos_for_office를 포함하지 않고 패키징시 다음 줄을 제거하고 진행해야함
app.commandLine.appendSwitch('enable-blink-features', 'LayoutNGBlockFragmentation');

const isDev = require('electron-is-dev');
// const url = require('url');
// const fontmanager = require('fontmanager-redux');
const { default: fscreen } = require('fscreen');
const webpackConf = require('../conf/webpack.conf');

const AppPath = app.getAppPath();

const DOMAIN = isDev
  ? `http://${webpackConf.devServer.host}:8080/#/`
  : `${path.join(AppPath, 'dist')}/`;

let mainWindow;

const windowConfig = {
  width: 1500,
  height: 1125,
  minWidth: 280, // 추후 GUI 가이드 통해 변경 필요
  webViewTag: false,
  // useContentSize: true,
  title: 'Super Office',
  // center: true,
  // fullscreen: true,
  // kiosk: !isDev,
  resizable: false,
  webPreferences: {
    // 2.
    // 웹 애플리케이션을 데스크탑으로 모양만 바꾸려면 안 해도 되지만,
    // Node 환경처럼 사용하려면 (Node에서 제공되는 빌트인 패키지 사용 포함)
    // true 해야 합니다.
    nodeIntegration: true,
    enableRemoteModule: true,
    nodeIntegrationInWorker: true,
    // spellcheck: (os.platform() == "darwin" ? true : false),
    contextIsolation: false, 
    preload: path.join(__dirname, 'preload.js'),
  },
  frame: true,
  // sandbox: true, sandbox flag에 따라 sub window 에 대한 기능셋이 달라짐
};

// window config deep cp
const cloneObj = obj => JSON.parse(JSON.stringify(obj));
const editWindowConfig = cloneObj(windowConfig);

const isValidPayload = payload => {
  if (!payload) {
    console.log('Invalid payload (undefined)...');
    return false;
  }
  // payload[0] : windowId
  // payload[1] : { fileItem, printOptions? } (null 가능)
  const { fileItem } = payload[1];
  if (!fileItem) {
    console.log('Invalid payload (fileItem null)...');
    return false;
  }
  return true;
};

const getFileItem = payload => {
  if (!isValidPayload(payload)) {
    return null;
  }
  return payload[1].fileItem;
};

const getPrintOptions = payload => {
  if (!isValidPayload(payload)) {
    return null;
  }
  return payload[1].printOptions;
};

// COMMENT(210729, peter_song)
// map에서의 삭제는 app on close 에서만 실시
// map에 삽입은 registerDocId 에서만 실시
const docIdWindowIdMap = new Map();
const windowIdDocIdMap = new Map();

const initWindowEventListener = window => {
  if (!window || window.isDestroyed()) {
    return;
  }
  window.webContents.on('did-finish-load', () => {
    console.log('window created...', window.id);
    addEventToNewDocument(window);
    window.webContents.send('giveWindowId', window.id);
  });
  window.on('close', (event, title) => {
    // COMMENT(210729, peter_song)
    // closed / unload / beforeunload 사용가능
    // https://tinydew4.github.io/electron-ko/docs/api/browser-window/#event-close
    // 위 documentation 확인하여 추가 기능 필요시 변경
    // ex) 창 닫을 때 dialog 출력 단계 추가시 beforeunload 필요
    // close 는 closed 직전에 발생하는 이벤트
    window.hide(); // window가 보이지 않는 상태로 만들어주어야 정상 close됨
  });
  window.on('unresponsive', () => {
    // TODO(210730, peter_song)
    // window.close 호출 시 페이지의 응답이 없는 경우 이 이벤트 catch됨
    // window.close 호출 시 왜 해당 페이지의 응답이 없는 경우가 발생하며
    // 왜 이 이벤트가 발생하는지 분석이 필요함
    window.destroy();
  });

  window.on('maximize', () => {
    window.webContents.send('onWindowMaximized');
  });
  window.on('unmaximize', () => {
    window.webContents.send('onWindowUnMaximized');
  });
};

function addEventToNewDocument(targetWindow) {
  const code = `const ipc = require('electron').ipcRenderer;
      document.addEventListener('keydown', event => {
        if (event.key === 'F5') {
          ipc.send('refresh', '${targetWindow.id}');
        } else if(event.key === 'F12'){
          ipc.send('toggle-debug', '${targetWindow.id}');
        }
      });`;
  targetWindow.webContents.executeJavaScript(code);
}

function getWindow(payload) {
  if (!payload || payload.length === 0) {
    return null;
  }
  return getWindowByBrowserWindowID(payload[0]);
}

function getWindowByBrowserWindowID(id) {
  const window = BrowserWindow.fromId(Number(id));
  if (!window || window.isDestroyed()) {
    return null;
  }
  return window;
}

const getWindowByDocId = documentId => {
  const windowId = docIdWindowIdMap.get(documentId);
  if (!windowId) {
    return null;
  }
  return getWindowByBrowserWindowID(windowId);
};

const makeChildWindow = payload => {
  const fileItem = getFileItem(payload);
  if (!fileItem) {
    return null;
  }
  const { documentId } = fileItem;
  if (documentId === -1 || !documentId) {
    console.log('docId is not available...');
    return null;
  }
  const landingPageWindow = getWindow(payload);
  let window = getWindowByDocId(fileItem.documentId);

  if (window) {
    // UI 문서 1.2.2 열기 Use Case(현재 실행 중인 문서 호출 시) :
    // 열린 문서 다시 열때는 기존 window focus
    window.focus();
    return null;
  }
  if (!landingPageWindow) {
    console.log('ERROR : cannot find origin landing page window, open doc edit page failed...');
    return null;
  }

  editWindowConfig.resizable = true;
  editWindowConfig.minWidth = 217;
  editWindowConfig.minHeight = 64;

  window = new BrowserWindow(editWindowConfig);
  initWindowEventListener(window);
  window.setSize(1856, 1024);
  window.center(true);

  return window;
};

const openChildWindow = (window, payload) => {
  const fileItem = getFileItem(payload);
  if (!fileItem) {
    console.log('Failed to open child window...');
    return;
  }
  if (fileItem.documentId === -1) {
    console.log('Failed to open child window...');
    return;
  }
  const { documentId, documentName, documentExtension, userId } = fileItem;

  if (isDev) {
    window.loadURL(
      `${DOMAIN}index.html?documentId=${documentId}&documentName=${documentName}&documentExtension=${documentExtension}&userId=${userId}`
    );
  } else {
    window.loadFile(`${DOMAIN}index.html`, {
      hash: `index.html?documentId=${documentId}&documentName=${documentName}&documentExtension=${documentExtension}&userId=${userId}`,
    });
  }
};

function openLandingPageWindow() {
  const window = new BrowserWindow(windowConfig);
  if (isDev) {
    // 개발 중에는 개발 도구에서 호스팅하는 주소에서 로드
    window.loadURL(DOMAIN);
  } else {
    // 프로덕션 환경에서는 패키지 내부 리소스에 접근
    window.loadFile(`${DOMAIN}index.html`);
  }
  window.setMenuBarVisibility(false);
  initWindowEventListener(window);
}

const registerDocIdWithWindowId = payload => {
  if (!payload || payload.length < 2) {
    return;
  }
  const windowId = payload[0];
  const documentId = payload[1];
  docIdWindowIdMap.set(documentId, windowId);
  windowIdDocIdMap.set(windowId, documentId);
};

// src/routes/electron.ts 의 channelType 과 동일한 channel string 요구됨
// 각 callback func의 2번째 인자 : payload : [windowId, fileItem]
// 단 fileItem은 nullable
const ipcMainOnCallbackFuncList = {
  minimize: [
    'minimizeApp',
    (event, payload) => {
      const window = getWindow(payload);
      if (!window) {
        return;
      }
      window.minimize();
    },
  ],
  maximizeRestore: [
    'maximizeRestoreApp',
    (event, payload) => {
      const window = getWindow(payload);
      if (!window) {
        return;
      }
      if (window.isMaximized()) {
        window.restore();
      } else {
        window.maximize();
      }
    },
  ],
  goHome: [
    'goBackHome',
    (event, payload) => {
      const window = getWindow(payload);
      if (!window) {
        return;
      }
      // window.webContents.goBack();
      window.reload();
    },
  ],
  close: [
    'closeApp',
    (event, payload) => {
      const window = getWindow(payload);
      if (!window) {
        return;
      }
      if (window.isDestroyed()) {
        return;
      }
      const docId = windowIdDocIdMap.get(window.id);
      if (docId) {
        docIdWindowIdMap.delete(docId);
      }
      windowIdDocIdMap.delete(window.id);
      window.close();
    },
  ],
  addChildWindow: [
    'openDocumentWindow',
    (event, payload) => {
      const window = makeChildWindow(payload);
      if (!window) {
        return;
      }
      openChildWindow(window, payload);
    },
  ],
  openLanding: [
    'openLandingPage',
    (event, payload) => {
      // payload 의 fileItem docId는 -1
      openLandingPageWindow();
    },
  ],
  registerDocId: [
    'registerDocId',
    (event, payload) => {
      registerDocIdWithWindowId(payload);
    },
  ],
  loadUrl: [
    'loadUrl',
    (event, payload) => {
      const window = getWindow(payload);
      const fileItem = getFileItem(payload);
      const { documentId, documentName, documentExtension, userId } = fileItem;
      if (isDev) {
        window.loadURL(
          `${DOMAIN}index.html?documentId=${documentId}&documentName=${documentName}&documentExtension=${documentExtension}&userId=${userId}`
        );
      } else {
        window.loadFile(`${DOMAIN}index.html`, {
          hash: `index.html?documentId=${documentId}&documentName=${documentName}&documentExtension=${documentExtension}&userId=${userId}`,
        });
      }
    },
  ],
  getOSClipboardData: [
    'getOSClipboardData',
    (event, payload) => {
      // Electron 9.0 이상 버전에서 ipc시 직렬화를 더이상 해주지 않는 오류가 있음
      // Electron NativeImage가 직렬화 되지 않아 전송 불가
      // ToDo: NativeImage를 다른 형태로 변환하거나 해서 전송할 필요가 있음
      const clipboardData = [
        clipboard.readText(),
        `<html>\n<body>\n<!--StartFragment-->${clipboard.readHTML()}<!--EndFragment-->\n</body>\n</html>`,
      ];
      // StartFragment, EndFragment는 MS에서 사용하는 HTML Preset같은데 HTMLConvert에서 이대로 사용하고 있음
      // Converter쪽에서 해당 플래그가 아닌경우에도 호환하는 방법을 찾아야함
      event.returnValue = clipboardData;
    },
  ],
  setOSClipboardData: [
    'setOSClipboardData',
    (event, payload) => {
      // payload에 배열로 Data가 전달되며 원하는 데이터를 ipcRenderer에서 send시 추가해서 사용
      clipboard.write({
        text: payload[0],
        html: payload[1],
      });
      // event.returnValue = clipboardData;
    },
  ],
  exportFileDialog: [
    'exportFileDialog',
    async (event, payload) => {
      const { exportFileProp, fileItem } = payload[1];
      const options = {
        title: '내보내기',
        defaultPath: 'C:\\\\Documents\\'.concat(exportFileProp.exportFileName),
        filters: [{ name: 'All Files', extensions: ['*'] }],
      };
      const curWindow = BrowserWindow.getFocusedWindow();
      const result = dialog.showSaveDialogSync(curWindow, options);
      if (result) {
        fs.outputFile(result, exportFileProp.exportFileArrayBuffer, err => {
          console.log(err);
        });
      }
    },
  ],
  // localFileDialog: [
  //   'localFileDialog',
  //   (event, payload) => {
  //     dialog
  //       .showOpenDialog({ properties: ['openFile', 'multiselections'] })
  //       .then(res => {
  //         if (!res.canceled) {
  //           // File Dialog에서 정상동작 (File 선택 후 확인)
  //           const isWindow = session.defaultSession.getUserAgent().includes('Windows');
  //           let pathTok;
  //           if (isWindow) {
  //             pathTok = res.filePaths[0].split('\\');
  //           } else {
  //             pathTok = res.filePaths[0].split('/');
  //           }
  //           const fileName = pathTok[pathTok.length - 1];
  //           event.returnValue = [fs.readFileSync(res.filePaths[0]), fileName];
  //         } else {
  //           // File Dialog에서 취소를 한 경우
  //           event.returnValue = undefined;
  //         }
  //       })
  //       .catch(err => {
  //         console.log(err);
  //       });
  //   },
  // ],
  printCall: [
    'printCall',
    (event, payload) => {
      const curWindow = BrowserWindow.getFocusedWindow();
      const printOptions = getPrintOptions(payload);
      if(printOptions === null) {
        return;
      }

      // curWindow.webContents.getPrintersAsync().then(list => {
      //   console.log(list);
      // });
      //getPrinters함수는 blocking방식. electron 17버전에선 Deprecated
      //electron 17버전부터는 non-blicking방식인 getPrintersAsync() 적용 필요
      //[출처]https://github.com/electron/electron/pull/31023
      const printerInfos = curWindow.webContents.getPrinters();

      const defaultPrinter = printerInfos.filter(p => {
        return p.isDefault === true;
      });
      if(defaultPrinter.length === 0 || defaultPrinter[0].name.length === 0) {
        return;
      }
      console.log(defaultPrinter[0].name);
      // if(!printOptions.printer || printOptions.printer.length === 0) {
      //   console.error('No Registed Print List');
      //   return;
      // }
      // console.log(printOptions.printer);

      const options = {
        silent: true,
        // printBackground: false,
        deviceName: printOptions.printer,
        deviceName: defaultPrinter[0].name,
        // // deviceName: 'pdf', // (TODO) 프린터 목록
        // copies: Number(printOptions.copies), // 복사본
        // collate: printOptions?.collate === 'collate', // 한부씩 인쇄
        // color: printOptions.color === 'color', // 컬러
        // pageSize: printOptions?.pageSize?.toUpperCase(),
        // landscape: printOptions?.orientation === 'landscape',
        // pageRanges: printOptions?.pageRanges, // (TODO) 모든 슬라이드 인쇄
        // duplexMode: printOptions?.duplexMode, // 단면 인쇄
      };

      if (options.deviceName === 'pdf') {
        // pdf
        const pdfPath = path.join('~/', 'temp.pdf'); // temp
        curWindow.webContents
          .printToPDF(options)
          .then(data => {
            fs.writeFile(pdfPath, data, error => {
              if (error) throw error;
              console.log(`Wrote PDF successfully to ${pdfPath}`);
            });
          })
          .catch(error => {
            console.log(`Failed to write PDF to ${pdfPath}: `, error);
          });
      } else {
        // printer
        curWindow.webContents.print(options, (success, errorType) => {
          if (success) console.log('print success');
          else console.log(errorType);
        });
      }
    },
  ],
  printListCall: [
    'printListCall',
    (event, payload) => {
      const curWindow = BrowserWindow.getFocusedWindow();
      const printerInfos = curWindow.webContents.getPrinters();
      let printList = [];
      if(printerInfos.length > 0) {
        printerInfos.forEach(print => {
          printList.push(print.name);
        });
      }
      event.returnValue = printList;
    },
  ],
  /*
    onAppReady: [
      'onAppReady',
      (event, payload) => {
        console.log('onAppReady...ipcmain on event?>');
        event.reply('giveWindowId', [getNextWindowId()]);
      }
    ]
    */
  // getSystemFontList: [
  //   'getSystemFontList',
  //   (event, arg) => {
  //     const sysFontlist = [];
  //     fontmanager.getAvailableFontsSync().forEach(fontInfo => {
  //       sysFontlist.push(fontInfo.postscriptName);
  //     });
  //     event.returnValue = sysFontlist;
  //   },
  // ],
  // getSubstitueFont: [
  //   'getSubstituteFont',
  //   (event, arg) => {
  //     let findFont = '';
  //     findFont += fontmanager.substituteFontSync(arg.font, arg.text).postscriptName;
  //     event.returnValue = findFont;
  //   },
  // ],
};

const initIpcMainOnMsgHandlers = () => {
  Object.keys(ipcMainOnCallbackFuncList).forEach(channelStr => {
    const options = ipcMainOnCallbackFuncList[channelStr];
    ipcMain.on(options[0], options[1]);
  });
};


ipcMain.on('print-renderer-processID', ( event ) => {
   console.log("\x1b[2m", "\x1b[31m", "\x1b[43m", `Renderer Processs ID : ${event.sender.getOSProcessId()}`, "\x1b[0m")
});


function createWindow() {
  mainWindow = new BrowserWindow(windowConfig);

  if (isDev) {
    // 개발 중에는 개발 도구에서 호스팅하는 주소에서 로드
    mainWindow.webContents.loadURL(DOMAIN);
  } else {
    // 프로덕션 환경에서는 패키지 내부 리소스에 접근
    mainWindow.loadFile(`${DOMAIN}index.html`);
  }
  // 윈도우 전부를 닫고, null로 지정한다.
  mainWindow.on('closed', () => {
    // mainWindow = null;
    // COMMENT(210729, peter_song)
    // 랜딩페이지는 여러개가 뜰 수 있으므로 quit 하면 안됨
    // app.quit();
  });
  mainWindow.setMenuBarVisibility(false);
  initWindowEventListener(mainWindow);
}

function startWatchingOSClipboard() {
  /*
    // 테스트용 구현으로, 해당 기능 구현자의 참고를 위해 남겨놓음
    // electron-clipboard-extended 패키지도 제거함
    //
    const osClipboard = require('electron-clipboard-extended');
    osClipboard
      .on('text-changed', () => {
        const currentText = clipboard.readText();
        console.log(`TextData Copied : ${currentText}`);
        const currentHTML = clipboard.readHTML();
        console.log(`HTMLData Copied : ${currentHTML}`);
      })
      .on('image-changed', () => {
        const currentImage = clipboard.readImage();
        console.log('imageDataChanged');
      })
      .on('html-changed', () => {
        const currentHTML = clipboard.readHTML();
        console.log(`HTMLData Copied${currentHTML}`);
      })
      .startWatching();
    */
}
/* ipcRenderer에서 보내는 메세지 처리 */
ipcMain.on('toggle-debug', (event, arg) => {
  // 디버깅 툴 토글(on/off)
  const window = getWindowByBrowserWindowID(arg);
  if (window) window.toggleDevTools();
});
// ipcMain.on('refresh', (event, arg) => {
//   // 페이지 갱신
//   const window = getWindowByBrowserWindowID(arg);
//   if (window) window.reload();
// });


function registerGlobalShortcuts(){
  globalShortcut.register('CommandOrControl+o+d', ()=>{
    toggleDebugInWebView();
  })

  globalShortcut.register('CommandOrControl+o+p', ()=>{
    printRendererProcessOfWevView();
  })
}

function toggleDebugInWebView(){
  mainWindow.webContents.toggleDevTools();
}

function printRendererProcessOfWevView(){
  console.log("\x1b[2m", "\x1b[31m", "\x1b[43m", `Renderer Processs ID : ${mainWindow.webContents.getOSProcessId()}`, "\x1b[0m")
}

app.on('ready', () => {
  createWindow();
  onBrowserWindowMessage(mainWindow);
  onBrowserViewMessage();
  onWebContentsMessage();
  onDialogMessage();
  initIpcMainOnMsgHandlers();
  startWatchingOSClipboard();
  registerGlobalShortcuts();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // os 가 mac인 경우 darwin,
    app.quit();
  }
});
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
