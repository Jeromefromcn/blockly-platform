# Blockly Platform — Dev Log

Reverse-chronological development history. Each entry records what changed, which files, and why.

---

## 2026-03-28

### Fix: Blockly import and back button in grading panel

**Files changed:**
- `frontend/src/pages/Admin.jsx`

**Fixes:**
- `executeCode()` was using `window.Blockly` which doesn't exist; now imports `* as Blockly` and `{ javascriptGenerator }` as ES modules (same as BlocklyWorkspace component)
- Back button in grading panel had `display: none` (leftover mobile-only stub); now always visible and deselects the current submission on click

---

## 2026-03-27

### Refactor: Remove generatedCode field

Removed the `generatedCode` field from the entire system. Code is now generated on-the-fly from `blocklyState` when the tutor clicks "Run Code" in the grading panel.

**Files changed:**
- `backend/src/main/java/com/blocklyplatform/entity/Submission.java` — Removed `generatedCode` field
- `backend/src/main/java/com/blocklyplatform/service/GradingService.java` — Removed reading/storing/returning `generatedCode`; removed auto-grading block that depended on it
- `backend/src/main/resources/db/migration/V5__Remove_generated_code_from_submissions.sql` — New migration: `ALTER TABLE submissions DROP COLUMN generated_code`
- `frontend/src/pages/Admin.jsx` — `executeCode()` now generates code from `blocklyState` at runtime using `Blockly.serialization` + `javascriptGenerator`; removed all `generatedCode` state

**Why:** Submission JSON exported by students already contains `blocklyState`. Storing `generatedCode` separately was redundant — the same code can always be regenerated from blocks. Removing it simplifies the data model.

---

### Feature: Code Execution in Blockly Preview

Added a "▶ Run Code" button inside the "Blockly Preview" collapsible section in the grading panel. Tutors can run the student's code and see output without leaving the grading view.

**Files changed:**
- `frontend/src/pages/Admin.jsx` — Added `executeCode()` function; extended `gradingState` with `codeOutput` and `codeRunning`; Run Code button + monospace output panel added inside the Blockly Preview section

**UX:**
- Button disabled until `blocklyState` is loaded
- Output shown in a scrollable monospace box; shows `(no output)` or `Error: ...` as appropriate

---

### Feature: Bulk Grading UI with Two-Panel Layout (#9)

Redesigned the Submissions tab in the Admin panel from a vertical card list + modal approach into an efficient two-panel bulk grading interface.

**Files changed:**
- `frontend/src/pages/Admin.jsx` — Replaced the single-column submissions list and grade modal with a side-by-side two-panel layout. Left panel (~40%) shows a filterable, paginated submission list with exercise dropdown and All/Ungraded/Graded status toggle. Right panel (~60%) shows the full grading form for the selected submission: student details, collapsible Blockly workspace preview (read-only), auto-grade aspect results (✅/❌), score input, comment textarea, and a Save Grade button. After saving, the panel automatically advances to the next ungraded submission in the filtered list.

**State changes:**
- Removed modal-based `grading` state; replaced with `selectedSubmission`, `gradingState`, `gradeForm`, `savingGrade`, `showMobilePanel`
- Added `filterExercise` and `filterStatus` state for the filter bar in the left panel
- `openGrade(sub)` now loads into the right panel instead of a modal overlay
- `saveGrade()` reloads submissions after PATCH and finds the next ungraded submission to auto-advance

---

### Feature: Student Progress Dashboard (#4)

Added a Progress page for students to track their exercise completion, scores, and overall performance.

**Files changed:**
- `backend/src/main/java/com/blocklyplatform/repository/SubmissionRepository.java` — Added `findByStudentNameAndDeletedAtIsNullOrderBySubmittedAtDesc` query method
- `backend/src/main/java/com/blocklyplatform/service/GradingService.java` — Added `getMySubmissions(username)` method
- `backend/src/main/java/com/blocklyplatform/controller/SubmissionController.java` — Added `GET /api/submissions/mine` endpoint (authenticated)
- `frontend/src/pages/Progress.jsx` — New page with summary stats bar and per-exercise status list
- `frontend/src/App.jsx` — Added `/progress` route; added "My Progress" nav link for STUDENT role

**New API endpoint:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/submissions/mine | Yes | Returns all non-deleted submissions where `studentName` matches authenticated username |

---

### Feature: Blockly Preview in Grade Submission Modal (#11)

Added a collapsible read-only Blockly workspace preview inside the grading panel so tutors can visually inspect student block arrangements while grading.

**Files changed:**
- `frontend/src/pages/Admin.jsx` — Imported `BlocklyWorkspace`; added `blocklyState` and `previewOpen` fields to grading state; updated `openGrade` to fetch and store `detail.blocklyState`; added collapsible "Blockly Preview" section

**Behavior:**
- Expand/Collapse toggle; renders read-only workspace with student's saved JSON state
- No backend changes required — `blocklyState` was already returned by `GET /api/submissions/{id}`

---

### Feature: Frontend Pagination for All Tables and Lists

Added client-side pagination to all tables and lists. No backend changes.

**Files changed:**
- `frontend/src/pages/SuperAdminPanel.jsx` — Users table paginated (default 10/page)
- `frontend/src/pages/Admin.jsx` — Exercises grid and submissions list paginated independently
- `frontend/src/pages/Home.jsx` — Exercise cards list paginated; resets to page 1 on filter change

**Pagination features:** page size selector (10/25/50/100), prev/next buttons, numbered pages with ellipsis, "Showing X–Y of Z items" counter

---

## 2026-03-25

### Feature: Block Palette Restrictions and Hints System

**Files changed:**
- `backend/src/main/resources/db/migration/V2__Add_hints_to_exercise_versions.sql` — Adds `hints TEXT` column to `exercise_versions`
- `backend/src/main/java/com/blocklyplatform/entity/ExerciseVersion.java` — Added `hints` field
- `backend/src/main/java/com/blocklyplatform/dto/ExerciseCreateDto.java` — Added `hints` field
- `backend/src/main/java/com/blocklyplatform/service/ExerciseService.java` — `saveVersion()` persists `hints`; `toVersionMap()` includes `hints`
- `frontend/src/pages/AdminEditor.jsx` — Replaced category-level block checkboxes with individual block-type checkboxes (29 types); added "Allow all blocks" toggle; added Hints editor
- `frontend/src/pages/Workspace.jsx` — Passes `allowedBlocks` to BlocklyWorkspace; added hints reveal panel
- `frontend/src/components/BlocklyWorkspace.jsx` — Added `allowedBlocks` prop and `buildFilteredToolbox()` helper

---

## 2026-03-22

### Backend: Auto-Grading, ZIP Import, CSV Export, Unit Tests

**Files changed:**
- `backend/pom.xml` — Added: Mozilla Rhino 1.7.14, Apache Commons CSV 1.10.0, spring-boot-starter-test, H2 (test scope)
- `backend/src/main/java/com/blocklyplatform/service/AutoGradingService.java` — New; runs JS with Rhino; supports `OUTPUT_MATCH` and `TRACE_MATCH`
- `backend/src/main/java/com/blocklyplatform/service/GradingService.java` — Injects `AutoGradingService`; added `batchImportZip`, `exportGradesCsv`
- `backend/src/main/java/com/blocklyplatform/controller/SubmissionController.java` — Added `POST /api/submissions/import-zip` and `GET /api/submissions/export-csv`
- `backend/src/test/...` — New unit tests for `AutoGradingService` (8 cases) and `ExerciseService` (4 cases)

---

### Frontend: Run Button, Grading Mode, Output Panel

**Files changed:**
- `frontend/src/pages/AdminEditor.jsx` — Added Run button, Grading Mode dropdown (`OUTPUT_MATCH`/`TRACE_MATCH`), conditional Expected Output field, output panel
- `frontend/src/pages/Workspace.jsx` — Added Run button, output panel

---

### Refactor: Translate Chinese in index.html to English

**Files changed:**
- `frontend/index.html` — `lang="zh"` → `lang="en"`; title `Blockly 練習平台` → `Blockly Exercise Platform`

---

### Test Case Documentation Added

- `TEST_CASES.md` — English, covers 12 unit tests across `AutoGradingService` and `ExerciseService`
