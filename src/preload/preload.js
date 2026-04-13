const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Task CRUD
  getAllTasksGrouped: () => ipcRenderer.invoke('db:getAllTasksGrouped'),
  getTasksByDate: (date) => ipcRenderer.invoke('db:getTasksByDate', date),
  searchByTitle: (query) => ipcRenderer.invoke('db:searchByTitle', query),
  createTask: (task) => ipcRenderer.invoke('db:createTask', task),
  updateTask: (task) => ipcRenderer.invoke('db:updateTask', task),
  deleteTask: (id) => ipcRenderer.invoke('db:deleteTask', id),
  toggleTaskStatus: (id) => ipcRenderer.invoke('db:toggleTaskStatus', id),
  importFromLocalStorage: (tasks) => ipcRenderer.invoke('db:importFromLocalStorage', tasks),
  getDatesWithTasks: () => ipcRenderer.invoke('db:getDatesWithTasks'),
});
