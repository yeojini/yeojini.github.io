// SuperOffice Client가 토핑으로 등록될 시 필요한 구문  
// 현재 토핑구조상 SuperOS API가 동작하기 위해선 아래 스크립트가 추가로 필요함 
// ( SuperOffice Client가 단독으로 빌드되어 토핑으로 올라갈 경우 필요함 )
ipcRenderer = window?.parent?.require?.('electron')?.ipcRenderer;
