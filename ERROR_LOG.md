# Error Log

A chronological record of bugs and issues encountered in this project, including root cause and resolution.

---

## Format

```
### [DATE] Short description
- **Symptom**: What was observed
- **Root Cause**: Why it happened
- **Fix**: What was done to resolve it
- **Files Changed**: Which files were modified
```

---

## Log

### [2026-03-22] 403 Forbidden on GET /api/exercises/published

- **Symptom**: Home page showed no exercises; network tab showed 403 on `/api/exercises/published`
- **Root Cause**: The endpoint was not added to the Spring Security `permitAll` list, so unauthenticated users were blocked
- **Fix**: Added `.requestMatchers(HttpMethod.GET, "/api/exercises/published").permitAll()` to `SecurityConfig`
- **Files Changed**: `backend/src/main/java/com/blocklyplatform/config/SecurityConfig.java`

---

### [2026-03-22] 403 Forbidden on GET /api/exercises/categories

- **Symptom**: Category filter dropdown was empty; network tab showed 403 on `/api/exercises/categories`
- **Root Cause**: Same as above — endpoint missing from `permitAll` list
- **Fix**: Added `.requestMatchers(HttpMethod.GET, "/api/exercises/categories").permitAll()`
- **Files Changed**: `backend/src/main/java/com/blocklyplatform/config/SecurityConfig.java`

---

### [2026-03-22] 403 Forbidden on GET /api/exercises/{id}

- **Symptom**: Exercise detail page returned 403 for unauthenticated users
- **Root Cause**: Individual exercise GET endpoint not in `permitAll` list
- **Fix**: Added `.requestMatchers(HttpMethod.GET, "/api/exercises/*").permitAll()`
- **Files Changed**: `backend/src/main/java/com/blocklyplatform/config/SecurityConfig.java`

---

### [2026-03-22] DB missing category/difficulty columns after schema update

- **Symptom**: `Column 'category' not found` errors at runtime after adding new columns to schema
- **Root Cause**: `spring.sql.init` with `CREATE TABLE IF NOT EXISTS` does not modify existing tables — it skips the entire statement if the table already exists, so new columns are never added
- **Fix**: Switched from `spring.sql.init` to Flyway for versioned migrations; used `V1__Initial_schema.sql` as the baseline
- **Files Changed**: `pom.xml`, `application.yml`, `src/main/resources/db/migration/V1__Initial_schema.sql`

---

### [2026-03-22] Flyway AbstractMethodError on startup

- **Symptom**: Application failed to start with `AbstractMethodError` related to Flyway
- **Root Cause**: Added `flyway-mysql` at version `10.4.1` while Spring Boot 3.2 ships with `flyway-core` `9.22.3` — version mismatch between core and database extension caused runtime incompatibility
- **Fix**: Pinned both `flyway-core` and `flyway-mysql` to `9.22.3` to match Spring Boot's managed version
- **Files Changed**: `pom.xml`

---

### [2026-03-22] Flyway "Found non-empty schema" error on startup

- **Symptom**: Flyway refused to run because the database already had tables (pre-existing schema)
- **Root Cause**: Flyway's default behavior is to reject migration on a non-empty schema unless a baseline is established
- **Fix**: Added `spring.flyway.baselineOnMigrate: true` to `application.yml`
- **Files Changed**: `backend/src/main/resources/application.yml`

---

### [2026-03-22] V2 Flyway migration SQL syntax error

- **Symptom**: Flyway failed on `V2__Add_hints_to_exercise_versions.sql` with SQL syntax error
- **Root Cause**: Used `ALTER TABLE ADD COLUMN IF NOT EXISTS` which is not supported in MySQL (only PostgreSQL)
- **Fix**: Deleted `V2` migration entirely — the `hints` column was already included in `V1__Initial_schema.sql`
- **Files Changed**: Deleted `src/main/resources/db/migration/V2__Add_hints_to_exercise_versions.sql`

---

### [2026-03-22] Variables/Functions categories always visible in student workspace

- **Symptom**: Even when the admin did not select any Variable or Function blocks for an exercise, students still saw those categories in the Blockly toolbox
- **Root Cause**: `buildFilteredToolbox` in `BlocklyWorkspace.jsx` treated `custom: 'VARIABLE'` and `custom: 'PROCEDURE'` categories specially but always included them regardless of `allowedBlocks`
- **Fix**: Added explicit checks — Variables category is only included if `variables_get` or `variables_set` is in `allowedBlocks`; Functions category only if any procedure block type is in `allowedBlocks`
- **Files Changed**: `frontend/src/components/BlocklyWorkspace.jsx`

---

### [2026-03-25] Like feature completely non-functional (403 + logic bug)

- **Symptom**: Clicking the like button had no effect; no visual change, no count update
- **Root Cause (1 — primary)**: `POST /api/exercises/*/like` was not in Spring Security's `permitAll` list, causing every like request to return 403 Forbidden before reaching the controller
- **Root Cause (2 — secondary)**: Even if the 403 were fixed, the toggle logic was broken — when a user who had already liked clicked again, the service returned `liked: true` without making any change (no-op instead of unlike)
- **Fix**:
  1. Added `.requestMatchers(HttpMethod.POST, "/api/exercises/*/like").permitAll()` to `SecurityConfig`
  2. Rewrote `ExerciseService.like()` to actually delete the like record and decrement the count when called a second time, returning `liked: false`
  3. Added `deleteByExerciseIdAndClientId` to `LikeRepository`
- **Files Changed**:
  - `backend/src/main/java/com/blocklyplatform/config/SecurityConfig.java`
  - `backend/src/main/java/com/blocklyplatform/service/ExerciseService.java`
  - `backend/src/main/java/com/blocklyplatform/config/SecurityConfig.java`
  - `backend/src/main/java/com/blocklyplatform/service/ExerciseService.java`
  - `backend/src/main/java/com/blocklyplatform/repository/LikeRepository.java`

---

### [2026-03-25] Like button silently fails on HTTP (non-secure context)

- **Symptom**: Like button had no effect in browser; no network request sent; API worked fine via curl
- **Root Cause**: `crypto.randomUUID()` requires a **secure context** (HTTPS or localhost). The site runs over plain HTTP, so calling `crypto.randomUUID()` threw a `TypeError` which was silently swallowed by `catch {}` in `handleLike` — the request was never sent
- **Fix**: Added a `generateUUID()` fallback using `Math.random()` for non-secure contexts. `getClientId()` now checks `crypto.randomUUID` availability before calling it
- **Files Changed**: `frontend/src/pages/Home.jsx`

---

### [2026-03-25] Run button opens browser print dialog instead of executing code

- **Symptom**: Clicking "Run" in AdminEditor (and Workspace) opened the browser's print dialog
- **Root Cause**: The Blockly `text_print` block generates `print(...)` calls (overridden in `BlocklyWorkspace.jsx` from `window.alert` to `print()`). The `runCode` sandbox only injected a mock `console` but did not define `print`, so `window.print()` was called — the browser's native print function
- **Fix**: Added `print` as a second injected parameter in `new Function('console', 'print', code)`, mapping it to the same log collector as `console.log`
- **Files Changed**: `frontend/src/pages/AdminEditor.jsx`, `frontend/src/pages/Workspace.jsx`

---

### [2026-03-25] 500 on save exercise — grading_mode column too small

- **Symptom**: PUT /api/exercises/{id} returned 500 with `Data truncation: Data too long for column 'grading_mode'`
- **Root Cause**: `grading_mode` column in `exercise_versions` was `VARCHAR(20)` — designed for a short string like `"OUTPUT_MATCH"`. After the Grading Aspect feature, it now stores a JSON array which easily exceeds 20 chars
- **Fix**: Added Flyway migration `V3__Widen_grading_mode_to_text.sql`: `ALTER TABLE exercise_versions MODIFY COLUMN grading_mode TEXT NOT NULL`
- **Files Changed**: `backend/src/main/resources/db/migration/V3__Widen_grading_mode_to_text.sql`

---

### [2026-03-27] "Run Code" button not appearing in grading panel

- **Symptom**: Clicking "▶ Expand" in Blockly Preview showed the visual workspace but no "Run Code" button
- **Root Cause**: Button was conditionally rendered only when `gradingState.generatedCode` was truthy. Existing submissions had `generatedCode = null` in the database because the field was optional during import
- **Fix**: Changed condition to always render the button; disabled it only when both `generatedCode` and `blocklyState` are absent. Also added fallback to generate code from `blocklyState` at runtime
- **Files Changed**: `frontend/src/pages/Admin.jsx`

---

### [2026-03-27] "No generated code available" warning shown despite visible blocks

- **Symptom**: Grading panel showed yellow warning "No generated code available" even though the Blockly workspace had visible blocks
- **Root Cause**: `generatedCode` was not stored for most submissions (optional field, not always included in imported JSON). The warning incorrectly treated missing `generatedCode` as "no code" rather than checking `blocklyState`
- **Fix**: Removed the separate `generatedCode` field entirely. `executeCode()` now generates JavaScript on-the-fly from `blocklyState` using `Blockly.serialization` + `javascriptGenerator`
- **Files Changed**: `backend/src/main/java/com/blocklyplatform/entity/Submission.java`, `backend/src/main/java/com/blocklyplatform/service/GradingService.java`, `backend/src/main/resources/db/migration/V5__Remove_generated_code_from_submissions.sql`, `frontend/src/pages/Admin.jsx`

---

### [2026-03-28] "Error: Blockly not available" when clicking Run Code

- **Symptom**: Clicking "▶ Run Code" in the grading panel showed `Error: Blockly not available` in the output box
- **Root Cause**: `executeCode()` accessed `window.Blockly` which does not exist — Blockly is bundled as an ES module (not a browser global) in this Vite project
- **Fix**: Added `import * as Blockly from 'blockly'` and `import { javascriptGenerator } from 'blockly/javascript'` to Admin.jsx; replaced `window.Blockly` references with the imported modules
- **Files Changed**: `frontend/src/pages/Admin.jsx`

---

### [2026-03-28] Back button hidden in grading panel

- **Symptom**: After selecting a submission, there was no way to return to the submission list; the page appeared stuck
- **Root Cause**: The "← Back to list" button had `display: none` inline style — it was a leftover mobile-only stub intended to be shown via a CSS class that was never implemented
- **Fix**: Changed to `display: inline-flex`; button now always visible. Click also clears `selectedSubmission` and `gradingState` to reset the right panel to placeholder state
- **Files Changed**: `frontend/src/pages/Admin.jsx`

---

### [2026-03-28] /progress page always redirects to login when already authenticated

- **Symptom**: Navigating to `/progress` redirected to `/login` even when the user was logged in
- **Root Cause**: `AuthContext.fetchMe()` used `apiGet('/api/auth/me')`. The `api.js` helper redirects to `/login` on any 401 response — including session checks. On a full page reload, if the token was expired or absent, the redirect fired immediately from inside the API helper before `ProtectedRoute` could handle it gracefully
- **Fix**: Changed `fetchMe` to use raw `fetch('/api/auth/me', { credentials: 'include' })` instead of `apiGet`. A 401 now silently sets `user: null`; `ProtectedRoute` handles the redirect cleanly with no forced loop
- **Files Changed**: `frontend/src/context/AuthContext.jsx`

---
