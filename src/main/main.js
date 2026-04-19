const { app, BrowserWindow } = require('electron');
const { registerHandlers } = require('./ipc/handlers');
const { createMainWindow } = require('./windows/mainWindow');

// Security: disable navigation to external URLs
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});

app.whenReady().then(() => {
  (require('./database/database')).init();
  registerHandlers();
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    (require('./database/database')).close();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  (require('./database/database')).close();
});
