const { ipcMain } = require('electron');
const db = require('../database/database');

function registerHandlers() {
  ipcMain.handle('db:getAllTasksGrouped', () => db.getAllTasksGrouped());
  ipcMain.handle('db:getTasksByDate', (_, date) => db.getTasksByDate(date));
  ipcMain.handle('db:searchByTitle', (_, query) => db.searchByTitle(query));
  ipcMain.handle('db:createTask', (_, task) => db.createTask(task));
  ipcMain.handle('db:updateTask', (_, task) => db.updateTask(task));
  ipcMain.handle('db:deleteTask', (_, id) => db.deleteTask(id));
  ipcMain.handle('db:toggleTaskStatus', (_, id) => db.toggleTaskStatus(id));
  ipcMain.handle('db:importFromLocalStorage', (_, tasks) => db.importFromLocalStorage(tasks));
  ipcMain.handle('db:getDatesWithTasks', () => db.getDatesWithTasks());
}

module.exports = { registerHandlers };
