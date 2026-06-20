const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("uvr", {
  isElectron: () => true,
  selectInputFiles: (options) => ipcRenderer.invoke("select-input-files", options),
  selectOutputFolder: () => ipcRenderer.invoke("select-output-folder"),
  openOutputFolder: (folderPath) => ipcRenderer.invoke("open-output-folder", folderPath),
  selectMasteringInputFile: () => ipcRenderer.invoke("select-mastering-input-file"),
  analyzeMasteringAudio: (request) => ipcRenderer.invoke("analyze-mastering-audio", request),
  runMasteringFfmpeg: (request) => ipcRenderer.invoke("run-mastering-ffmpeg", request),
  openMasteringAudioFile: (filePath) => ipcRenderer.invoke("open-mastering-audio-file", filePath),
  startProcessing: (config) => ipcRenderer.invoke("start-processing", config),
  cancelProcessing: () => ipcRenderer.invoke("cancel-processing"),
  haltProcessing: () => ipcRenderer.invoke("cancel-processing"),

  // Real Local Model Manager APIs (Task 1 & 4)
  getModelLibraryPath: () => ipcRenderer.invoke("get-model-library-path"),
  checkPackagedRuntime: () => ipcRenderer.invoke("check-packaged-runtime"),
  getPromptLibraryPath: () => ipcRenderer.invoke("get-prompt-library-path"),
  loadPromptLibrary: () => ipcRenderer.invoke("load-prompt-library"),
  savePromptLibrary: (document) => ipcRenderer.invoke("save-prompt-library", document),
  listLocalModelsCustom: () => ipcRenderer.invoke("list-local-models-custom"),
  getLocalModelIndexPath: () => ipcRenderer.invoke("get-local-model-index-path"),
  listLocalModelIndex: () => ipcRenderer.invoke("list-local-model-index"),
  saveLocalModelIndexEntry: (entry) => ipcRenderer.invoke("save-local-model-index-entry", entry),
  removeLocalModelIndexEntry: (modelId) => ipcRenderer.invoke("remove-local-model-index-entry", modelId),
  listCustomModelLibrary: () => ipcRenderer.invoke("list-custom-model-library"),
  saveCustomModelLibraryEntry: (entry) => ipcRenderer.invoke("save-custom-model-library-entry", entry),
  removeCustomModelLibraryEntry: (id) => ipcRenderer.invoke("remove-custom-model-library-entry", id),
  checkModelFileExists: (architecture, fileName) =>
    ipcRenderer.invoke("check-model-file-exists", architecture, fileName),
  importModelFile: (architecture, targetModel) => ipcRenderer.invoke("import-model-file", architecture, targetModel),
  reconnectModelFile: (targetModel, approvedSourcePath) =>
    ipcRenderer.invoke("reconnect-model-file", targetModel, approvedSourcePath),
  searchModelCandidates: (targetModel, options) => ipcRenderer.invoke("search-model-candidates", targetModel, options),
  openExternalUrl: (targetUrl) => ipcRenderer.invoke("open-external-url", targetUrl),
  downloadModel: (modelId, url, architecture, fileName) =>
    ipcRenderer.invoke("download-model", modelId, url, architecture, fileName),
  verifyModelHash: (modelOrArchitecture, fileName, checksum) =>
    ipcRenderer.invoke("verify-model-hash", modelOrArchitecture, fileName, checksum),
  deleteModelFile: (modelOrArchitecture, fileName) =>
    ipcRenderer.invoke("delete-model-file", modelOrArchitecture, fileName),
  purgeModel: (modelOrArchitecture, fileName) => ipcRenderer.invoke("delete-model-file", modelOrArchitecture, fileName),
  purgeModelCache: () => ipcRenderer.invoke("purge-model-cache"),
  selectFFmpegPath: () => ipcRenderer.invoke("select-ffmpeg-path"),
  checkFFmpegReady: (ffmpegPath) => ipcRenderer.invoke("check-ffmpeg-ready", ffmpegPath),
  checkBackendDetails: (customPythonPath, ffmpegPath) =>
    ipcRenderer.invoke("check-backend-details", customPythonPath, ffmpegPath),
  selectPythonPath: () => ipcRenderer.invoke("select-python-path"),
  verifyOutputFolder: (folderPath) => ipcRenderer.invoke("verify-output-folder", folderPath),
  verifyPythonPath: (pythonPath) => ipcRenderer.invoke("verify-python-path", pythonPath),
  clearTempFiles: () => ipcRenderer.invoke("clear-temp-files"),
  clearFailedDownloads: () => ipcRenderer.invoke("clear-failed-downloads"),
  resetWeightsCache: () => ipcRenderer.invoke("reset-weights-cache"),

  // Real Local YuE Engine integration APIs
  validateYuEEnvironment: (config) => ipcRenderer.invoke("validate-yue-environment", config),
  runYuEGeneration: (config) => ipcRenderer.invoke("run-yue-generation", config),
  readYuEProofReport: (outputFolder) => ipcRenderer.invoke("read-yue-proof-report", outputFolder),
  verifyAudioFile: (filePath) => ipcRenderer.invoke("verify-audio-file", filePath),

  // Real Local Basic Pitch integration APIs
  validateBasicPitchEnvironment: (config) => ipcRenderer.invoke("validate-basic-pitch-environment", config),
  runBasicPitchTranscription: (config) => ipcRenderer.invoke("run-basic-pitch-transcription", config),
  readBasicPitchProofReport: (outputFolder) => ipcRenderer.invoke("read-basic-pitch-proof-report", outputFolder),

  // Listening to real progress logs (Task 3)
  onBackendProgress: (callback) => {
    const handler = (event, update) => callback(update);
    ipcRenderer.on("backend-progress", handler);
    return () => {
      ipcRenderer.removeListener("backend-progress", handler);
    };
  },
});
