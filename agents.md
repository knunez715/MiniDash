# MiniDash — AI Coding Instructions

## Language
- Use **JavaScript (Node.js)** for backend development.
- Use HTML, CSS, and vanilla JavaScript for the frontend.
- Use Express.js for REST API endpoints and SQLite for database operations.

## Testing Framework
- Use the built-in **Node.js Test Runner** (`node:test`).
- Use `node:assert/strict` for assertions.
- Run automated tests with `npm test` or `npm.cmd test` on Windows PowerShell.

## Coding Conventions

1. **Naming:** Use `camelCase` for variables and functions, and `UPPER_SNAKE_CASE` for constants.

2. **Error Handling:** Use `try/catch` for asynchronous operations and return meaningful HTTP status codes and JSON error messages.

3. **Code Quality:** Keep functions small and reusable, use `async/await` for asynchronous operations, and add automated tests for new features or bug fixes.

## Project Requirements
- Preserve existing REST API endpoints.
- Maintain compatibility with the SQLite database.
- Validate scheduled delivery times and restaurant operating hours.
- Ensure scheduled orders transition safely from `SCHEDULED` to `PLACED`.
- Do not commit `node_modules`, `.env`, or local database files.