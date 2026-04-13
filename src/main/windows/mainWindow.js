const { BrowserWindow } = require('electron');
const path = require('path');

function createMainWindow() {
  const isDev = !require('electron').app.isPackaged;

  const win = new BrowserWindow({
    width: 1300,
    height: 880,
    minWidth: 1100,
    minHeight: 750,
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '..', '..', 'assets', 'icons', 'icon.png'),
    backgroundColor: '#1a1a2e',
    title: 'Routine Aesthetic',
    show: false,
  });

  win.loadFile(path.join(__dirname, '..', '..', 'renderer', 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
  });

  // Disable devtools in production
  if (!isDev) {
    win.webContents.on('devtools-opened', () => {
      win.webContents.closeDevTools();
    });
  }

  return win;
}

module.exports = { createMainWindow };
