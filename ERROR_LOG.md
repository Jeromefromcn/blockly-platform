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
