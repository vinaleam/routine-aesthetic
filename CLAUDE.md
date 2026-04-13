Act as a professional software architect and UI/UX designer. Enhance the existing ElectronJS desktop application by improving task search functionality while maintaining a simple single-day task model.

Technical Context:
- The application uses SQLite for task storage
- Each task is assigned to a single date (no start_date or end_date)
- The app uses a single-screen layout with calendar, timer, and task panel

Data Model:
- Keep a simple tasks table with:
  - id (primary key)
  - title
  - description
  - date (single day)
  - time (optional)
  - priority (low, medium, high)
  - reminder_enabled (boolean)
  - reminder_time (timestamp)
  - status (pending, completed)
  - created_at
  - updated_at

Search Feature:

1. Search Scope:
- Search tasks by title only
- Use partial matching (LIKE query)

2. UI Placement:
- Add a search input at the top of the Task Panel (right side)
- Include:
  - Text input for searching by title
  - Clear/reset button

3. Search Behavior:
- Results update dynamically as user types (with debounce)
- Display matching tasks in the task panel
- Keep interaction smooth and responsive

SQLite Query Example:

SELECT * FROM tasks
WHERE title LIKE ?
ORDER BY date ASC, time ASC;

- Use parameterized queries
- Add index on title for performance

Calendar Integration:

- Tasks are displayed only on their assigned date
- Calendar remains simple and easy to understand

UX Considerations:

- Keep search fast and minimal
- Avoid unnecessary filters
- Maintain pixel-art visual consistency
- Ensure readability and clarity

Technical Constraints:

- Use direct SQLite queries (no ORM)
- Keep implementation simple and maintainable
- Ensure smooth performance in Electron

Output:

- Updated task panel UI with search input
- SQLite query logic
- Data flow between UI and database