const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function getDbPath() {
  return path.join(app.getPath('userData'), 'tasks.db');
}

function init() {
  db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      date TEXT NOT NULL,
      time TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium',
      reminder_enabled INTEGER DEFAULT 0,
      reminder_time TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_title ON tasks(title);
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
  `);

  return db;
}

function getAllTasksGrouped() {
  const rows = db.prepare(`
    SELECT * FROM tasks ORDER BY date ASC, time ASC
  `).all();

  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.date]) grouped[row.date] = [];
    grouped[row.date].push(rowToTask(row));
  }
  return grouped;
}

function getTasksByDate(date) {
  return db.prepare(`
    SELECT * FROM tasks WHERE date = ? ORDER BY time ASC
  `).all(date).map(rowToTask);
}

function searchByTitle(query) {
  return db.prepare(`
    SELECT * FROM tasks
    WHERE title LIKE ?
    ORDER BY date ASC, time ASC
  `).all(`%${query}%`).map(row => ({ ...rowToTask(row), _date: row.date }));
}

function createTask(task) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO tasks (id, title, description, date, time, priority, reminder_enabled, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    task.id,
    task.title,
    task.description || '',
    task.date,
    task.time || '',
    task.priority || 'medium',
    task.reminder ? 1 : 0,
    task.completed ? 'completed' : 'pending',
    now,
    now
  );
}

function updateTask(task) {
  db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, date = ?, time = ?, priority = ?, reminder_enabled = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    task.title,
    task.description || '',
    task.date,
    task.time || '',
    task.priority || 'medium',
    task.reminder ? 1 : 0,
    task.completed ? 'completed' : 'pending',
    task.id
  );
}

function deleteTask(id) {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
}

function toggleTaskStatus(id) {
  const task = db.prepare('SELECT status FROM tasks WHERE id = ?').get(id);
  if (!task) return null;
  const newStatus = task.status === 'completed' ? 'pending' : 'completed';
  db.prepare(`UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(newStatus, id);
  return newStatus;
}

function importFromLocalStorage(tasksObj) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO tasks (id, title, description, date, time, priority, reminder_enabled, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  const tx = db.transaction((tasks) => {
    for (const [date, taskList] of Object.entries(tasks)) {
      for (const t of taskList) {
        insert.run(
          t.id,
          t.title,
          t.description || '',
          date,
          t.time || '',
          t.priority || 'medium',
          t.reminder ? 1 : 0,
          t.completed ? 'completed' : 'pending',
          now,
          now
        );
      }
    }
  });
  tx(tasksObj);
}

function getDatesWithTasks() {
  return db.prepare(`
    SELECT DISTINCT date FROM tasks
  `).all().map(r => r.date);
}

function rowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    time: row.time,
    priority: row.priority,
    reminder: row.reminder_enabled === 1,
    completed: row.status === 'completed',
  };
}

function close() {
  if (db) db.close();
}

module.exports = {
  init,
  getAllTasksGrouped,
  getTasksByDate,
  searchByTitle,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  importFromLocalStorage,
  getDatesWithTasks,
  close,
};
