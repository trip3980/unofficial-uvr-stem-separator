const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('uvr', {
  isElectron: () => true,
  selectInputFiles: (options) => ipcRenderer.invoke('select-input-files', options),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  openOutputFolder: (folderPath) => ipcRenderer.invoke('open-output-folder', folderPath),
  verifyModelPath: (modelPath) => ipcRenderer.invoke('verify-model-path', modelPath),
  readModelDirectory: (dirPath) => ipcRenderer.invoke('read-model-directory', dirPath),
  startProcessing: (config) => ipcRenderer.invoke('start-processing', config),
  cancelProcessing: () => ipcRenderer.invoke('cancel-processing'),
  haltProcessing: () => ipcRenderer.invoke('cancel-processing'),
  
  // Real Local Model Manager APIs (Task 1 & 4)
  getModelLibraryPath: () => ipcRenderer.invoke('get-model-library-path'),
  listLocalModelsCustom: () => ipcRenderer.invoke('list-local-models-custom'),
  checkModelFileExists: (architecture, fileName) => ipcRenderer.invoke('check-model-file-exists', architecture, fileName),
  importModelFile: (architecture) => ipcRenderer.invoke('import-model-file', architecture),
  downloadModel: (modelId, url, architecture, fileName) => ipcRenderer.invoke('download-model', modelId, url, architecture, fileName),
  checkFFmpegReady: () => ipcRenderer.invoke('check-ffmpeg-ready'),
  checkBackendDetails: (customPythonPath) => ipcRenderer.invoke('check-backend-details', customPythonPath),
  selectPythonPath: () => ipcRenderer.invoke('select-python-path'),
  verifyOutputFolder: (folderPath) => ipcRenderer.invoke('verify-output-folder', folderPath),
  verifyPythonPath: (pythonPath) => ipcRenderer.invoke('verify-python-path', pythonPath),
  clearTempFiles: () => ipcRenderer.invoke('clear-temp-files'),
  clearFailedDownloads: () => ipcRenderer.invoke('clear-failed-downloads'),
  resetWeightsCache: () => ipcRenderer.invoke('reset-weights-cache'),
  
  // Real Local YuE Engine integration APIs
  validateYuEEnvironment: (config) => ipcRenderer.invoke('validate-yue-environment', config),
  runYuEGeneration: (config) => ipcRenderer.invoke('run-yue-generation', config),
  readYuEProofReport: (outputFolder) => ipcRenderer.invoke('read-yue-proof-report', outputFolder),
  verifyAudioFile: (filePath) => ipcRenderer.invoke('verify-audio-file', filePath),

  // Real Local Basic Pitch integration APIs
  validateBasicPitchEnvironment: (config) => ipcRenderer.invoke('validate-basic-pitch-environment', config),
  runBasicPitchTranscription: (config) => ipcRenderer.invoke('run-basic-pitch-transcription', config),
  readBasicPitchProofReport: (outputFolder) => ipcRenderer.invoke('read-basic-pitch-proof-report', outputFolder),

  // Listening to real progress logs (Task 3)
  onBackendProgress: (callback) => {
    const handler = (event, update) => callback(update);
    ipcRenderer.on('backend-progress', handler);
    return () => {
      ipcRenderer.removeListener('backend-progress', handler);
    };
  }
});
