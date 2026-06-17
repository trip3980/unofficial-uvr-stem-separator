const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    backgroundColor: '#07080c',
    title: 'Unofficial UVR Stem Separator',
    autoHideMenuBar: true
  });

  const startUrl = process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
  
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

// Select input files
ipcMain.handle('select-input-files', async (event, options) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Audio Files', extensions: ['wav', 'mp3', 'flac', 'ogg', 'm4a', 'aac', 'wma', 'aiff'] }]
  });
  return result.filePaths;
});

// Select output folder
ipcMain.handle('select-output-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0] || null;
});

// Open output folder
ipcMain.handle('open-output-folder', async (event, folderPath) => {
  if (folderPath && fs.existsSync(folderPath)) {
    await shell.openPath(folderPath);
    return true;
  }
  return false;
});

// Verify model path
ipcMain.handle('verify-model-path', async (event, modelPath) => {
  try {
    return fs.existsSync(modelPath);
  } catch (error) {
    return false;
  }
});

// Read model directory
ipcMain.handle('read-model-directory', async (event, dirPath) => {
  try {
    if (fs.existsSync(dirPath)) {
      return fs.readdirSync(dirPath);
    }
  } catch (error) {
    console.error(error);
  }
  return [];
});

// Start processing - Placeholder for Python/FFmpeg routing
ipcMain.handle('start-processing', async (event, config) => {
  console.log('Main process: start-processing received', config);
  // TODO: Implement Python/Audio-Separator child-process spawn
  // TODO: Send stderr/stdout progress updates via event.sender.send('backend-progress', data)
  return { success: true, message: 'Processing started in backend' };
});

// Cancel processing - Placeholder
ipcMain.handle('cancel-processing', async () => {
  console.log('Main process: cancel-processing received');
  // TODO: Kill Python child process if running
  return { success: true };
});
