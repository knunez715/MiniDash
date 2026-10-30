# MiniDash — AI Development Log

## Project Overview

**Project:** MiniDash — Food Delivery Application  
**Language:** JavaScript (Node.js)  
**Framework:** Express.js  
**Database:** SQLite  
**Frontend:** HTML, CSS, JavaScript  
**Testing:** Node.js Test Runner (`node:test`)  
**AI Assistant:** OpenAI ChatGPT

## 1. Purpose of AI Assistance

AI assistance was used during the development of MiniDash to support code generation, debugging, testing, documentation, and implementation of new features.

The developer reviewed and tested AI-generated suggestions before incorporating them into the project.

## 2. AI Prompts and Development Activities

### Prompt 1: REST API Development

**Prompt:**

"Help me build a food delivery REST API using Node.js, Express, and SQLite."

**AI Assistance:**
- Suggested REST API structure.
- Assisted with restaurant and menu endpoints.
- Assisted with order creation and retrieval.
- Provided examples of API requests.

**Developer Actions:**
- Implemented the API.
- Tested restaurant and menu endpoints.
- Verified responses using the browser and REST requests.

### Prompt 2: Scheduled Delivery Feature

**Prompt:**

"Add scheduled delivery functionality to MiniDash."

**AI Assistance:**
- Suggested database changes for scheduled delivery.
- Provided scheduling validation logic.
- Assisted with scheduled order statuses.
- Suggested automatic release of scheduled orders.

**Developer Actions:**
- Updated database and backend files.
- Added scheduled delivery selection to the frontend.
- Successfully created an order with `SCHEDULED` status.
- Confirmed the automatic release function is called by a server timer.

### Prompt 3: Debugging the Frontend

**Issue:**

The MiniDash homepage initially displayed `Cannot GET /`.

**AI Assistance:**

Suggested serving frontend files using Express static middleware:

```javascript
app.use(express.static("public"));
```

**Developer Actions:**
- Updated `server.js`.
- Restarted the server.
- Confirmed the homepage loaded.

### Prompt 4: Restaurant Menu Debugging

**Issue:**

Restaurant menus were not displaying correctly.

**AI Assistance:**

Identified a mismatch between the frontend's expected `data.menu` property and the API's actual `data.items` property.

**Developer Actions:**
- Updated `public/script.js`.
- Confirmed restaurant menus and Add to Cart buttons worked.

### Prompt 5: Scheduled Order Cancellation

**Prompt:**

"Add a button to cancel scheduled orders."

**AI Assistance:**
- Suggested a conditional cancellation button.
- Provided an API request using `POST /orders/:id/cancel`.
- Added confirmation and error-handling logic.

**Developer Actions:**
- Updated the tracking interface.
- Tested the cancellation button.
- Confirmed scheduled order cancellation worked.

### Prompt 6: JavaScript Error Resolution

**Issue:**

The homepage became stuck displaying "Loading delicious restaurants..."

**Error:**

```text
Uncaught SyntaxError:
Identifier 'displayStatus' has already been declared
```

**AI Assistance:**

Identified a duplicate variable declaration in `public/script.js`.

**Developer Actions:**
- Removed the duplicate declaration.
- Saved the file.
- Refreshed the browser.
- Confirmed the homepage loaded correctly.

### Prompt 7: Automated Testing

**Prompt:**

"Write a function that reverses a string and a test for it."

**AI Assistance:**
- Generated a JavaScript string-reversal function.
- Generated a test using `node:test`.
- Provided instructions for running the test.

**Developer Actions:**
- Reviewed the example.
- Received instructions to run the test locally.

**Verification Status:** Local execution has not yet been confirmed.

## 3. Automated Testing Results

MiniDash includes automated tests for scheduled delivery functionality.

| Test Area | Result |
|---|---|
| Minimum scheduling time | Passed |
| Maximum scheduling time | Passed |
| Restaurant operating hours | Passed |
| Timezone validation | Passed |
| Scheduled order release timing | Passed |
| Scheduled order remains scheduled before release | Passed |
| Duplicate release prevention | Passed |

**Reported results:**

```text
Total Tests: 7
Passed: 7
Failed: 0
```

These tests include simulated database behavior. Full SQLite integration testing remains a recommended next step.

## 4. AI Coding Rules

An `AGENTS.md` file was created to document coding conventions for AI-assisted development.

The rules specify:

1. Use consistent JavaScript naming conventions.
2. Implement appropriate error handling.
3. Keep code reusable and add automated tests for new functionality.

## 5. Challenges and Solutions

| Challenge | Solution |
|---|---|
| PowerShell blocked `npm` commands | Used `npm.cmd` |
| Homepage returned `Cannot GET /` | Added Express static middleware |
| Restaurant menu failed to load | Corrected API response property |
| Scheduled delivery unavailable in UI | Added scheduling controls |
| Scheduled cancellation unavailable | Added conditional cancellation button |
| Homepage stopped loading | Removed duplicate JavaScript declaration |

## 6. Verification

The following functionality was verified during development:

- Restaurant API returns available restaurants.
- Restaurant menu endpoint returns menu items.
- Frontend homepage loads successfully.
- Immediate ordering and tracking work.
- Scheduled orders can be created.
- Scheduled orders can be cancelled.
- Database initialization command executes without errors.
- Both restaurants remain available after database initialization.
- Seven automated scheduling tests pass.

The background scheduler is configured to call the release function periodically, but an end-to-end timed release against SQLite has not yet been confirmed.

## 7. Responsible AI Usage

AI-generated code and suggestions were reviewed during development.

AI assistance supported the implementation process, while the developer remained responsible for selecting, integrating, testing, and maintaining the project code.

## 8. Future Improvements

- Add SQLite integration tests.
- Verify scheduled order release end to end.
- Expand frontend automated testing.
- Improve API error handling.
- Add authentication and payment processing.
- Implement live order tracking.

## 9. Conclusion

AI assistance contributed to the development and debugging of MiniDash.

The project demonstrates how AI tools can support software development through code suggestions, debugging, automated testing, and documentation while retaining developer oversight.