const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('uvr', {
  selectInputFiles: (options) => ipcRenderer.invoke('select-input-files', options),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  openOutputFolder: (folderPath) => ipcRenderer.invoke('open-output-folder', folderPath),
  verifyModelPath: (modelPath) => ipcRenderer.invoke('verify-model-path', modelPath),
  readModelDirectory: (dirPath) => ipcRenderer.invoke('read-model-directory', dirPath),
  startProcessing: (config) => ipcRenderer.invoke('start-processing', config),
  cancelProcessing: () => ipcRenderer.invoke('cancel-processing'),
  
  // Future hook for backend updates (Python/FFmpeg to React)
  onBackendProgress: (callback) => {
    const handler = (event, update) => callback(update);
    ipcRenderer.on('backend-progress', handler);
    return () => {
      ipcRenderer.removeListener('backend-progress', handler);
    };
  }
});
