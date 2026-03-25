# Blockly Exercise Platform — Build & Operations Guide

## 1. Project Overview

| Item | Description |
|------|-------------|
| Function | Blockly visual programming exercise platform with exercise management, student submissions, batch import grading, and likes |
| Frontend | React 18 + Blockly 12.5.0, port **8090** |
| Backend | Java 17 + Spring Boot 3.2, internal port 8081 |
| Database | MySQL 8.0, persistent storage |
| Monitoring | Prometheus (port 9090) + Grafana (port 3001) |
| Deployment | Docker + Docker Compose |
| Code Hosting | GitHub |

> **Note**: v2 removes the Node.js sandbox. All grading logic is handled entirely by the Java backend.

---

## 2. Prerequisites

The server must have the following tools installed:

```bash
# Verify
docker --version        # >= 24.0
docker compose version  # >= 2.0
git --version           # any version
```

If Docker is not installed:
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

---

## 3. First-Time Deployment

### 3.1 Clone the Repository

```bash
git clone https://github.com/Jeromefromcn/blockly-platform.git
cd blockly-platform
```

### 3.2 Start Services

```bash
docker compose up -d --build
```

The first build downloads dependencies and compiles code — this may take **5–10 minutes**. Please be patient.

### 3.3 Verify Startup

```bash
# Check container status (should show 5 containers, all "Up")
docker compose ps

# Test frontend accessibility
curl -o /dev/null -w "%{http_code}" http://localhost:8090
# Expected: 200

# Test backend API
curl http://localhost:8090/api/exercises/published
# Expected: []
```

### 3.4 Access URLs

| Page | URL |
|------|-----|
| Student exercise page | `http://SERVER_IP:8090` |
| Admin panel | `http://SERVER_IP:8090/admin` |
| Prometheus | `http://SERVER_IP:9090` |
| Grafana | `http://SERVER_IP:3001` (login: admin / admin123) |

> If external access fails, open the relevant ports in your cloud provider's firewall (e.g., GCP firewall rules).

---

## 4. Day-to-Day Operations

### Start Services
```bash
cd blockly-platform
docker compose up -d
```

### Stop Services
```bash
docker compose down
```
> Data is stored in Docker Volumes (`db_data`, `prometheus_data`, `grafana_data`). Stopping services does **not** delete data.

### Restart Services
```bash
docker compose restart
```

### Check Container Status
```bash
docker compose ps
```

---

## 5. Updating / Redeploying

After code changes, follow these steps:

```bash
cd blockly-platform

# 1. Pull latest code
git pull

# 2. Rebuild and restart (only changed services are rebuilt)
docker compose up -d --build
```

### Update a Single Service

```bash
# Rebuild only the frontend
docker compose up -d --build frontend

# Rebuild only the backend
docker compose up -d --build backend
```

---

## 6. Viewing Logs

```bash
# All services
docker compose logs

# Follow a specific service in real time (Ctrl+C to exit)
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f db
docker compose logs -f prometheus
docker compose logs -f grafana

# Last 100 lines
docker compose logs --tail=100 backend
```

---

## 7. Database Operations

### Enter the Database Shell

```bash
docker exec -it blockly_db mysql -ublockly -pblockly123 blocklydb
```

Common SQL queries:
```sql
-- List all exercises
SELECT id, code, title, status, current_version_number, like_count FROM exercises;

-- View submissions with scores
SELECT s.id, e.title, s.student_name, g.tutor_score, g.tutor_comment
FROM submissions s
JOIN exercises e ON s.exercise_id = e.id
LEFT JOIN grades g ON g.submission_id = s.id
ORDER BY s.submitted_at DESC;

-- View like counts per exercise
SELECT e.title, COUNT(l.id) AS likes
FROM likes l
JOIN exercises e ON l.exercise_id = e.id
GROUP BY e.id;

-- Exit
exit
```

### Backup Data

```bash
docker exec blockly_db mysqldump -ublockly -pblockly123 blocklydb > backup_$(date +%Y%m%d).sql
```

### Restore Data

```bash
cat backup_20260101.sql | docker exec -i blockly_db mysql -ublockly -pblockly123 blocklydb
```

---

## 8. Rolling Back a Version

```bash
# View commit history
git log --oneline

# Switch to a specific version
git checkout <commit-hash>

# Rebuild
docker compose up -d --build
```

---

## 9. Troubleshooting

### Service Unreachable (External)
1. Confirm required ports (8090, 9090, 3001) are open in your cloud firewall
2. Verify containers are running: `docker compose ps`

### Backend Fails to Start
```bash
# Check logs for the error
docker compose logs backend

# Common cause: database not ready yet (MySQL healthcheck start_period is 90s)
docker compose restart backend
```

### Database Connection Error
```bash
# Check db container health
docker inspect blockly_db | grep -A5 Health

# Full restart
docker compose down && docker compose up -d
```

---

## 10. Architecture

```
External Request :8090
       │
  [blockly_frontend] Nginx
  Static files + reverse proxy
       │
  [blockly_backend] Spring Boot :8081
  Business logic + grading (pure Java, no sandbox)
       │
  [blockly_db] MySQL 8.0
  Persistent data (Volume: db_data)

Monitoring:
  [blockly_backend] /actuator/prometheus
       │
  [blockly_prometheus] :9090  ←── scrape interval 10s (Volume: prometheus_data)
       │
  [blockly_grafana] :3001 (Volume: grafana_data)
```

---

## 11. API Reference

### Authentication

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | /api/auth/login | No | Login; sets httpOnly cookie `auth_token` |
| POST | /api/auth/logout | No | Logout; clears cookie |
| GET | /api/auth/me | Yes | Get current user info + permissions |

### User Profile

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | /api/profile | Yes | Get own profile |
| PUT | /api/profile | Yes | Update own display name and email |
| PUT | /api/profile/password | Yes (non-super-admin) | Change own password |

### User Management (Super Admin only)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/users | List all users |
| POST | /api/admin/users | Create a user |
| DELETE | /api/admin/users/{id} | Delete a user |
| POST | /api/admin/users/{id}/reset-password | Reset password to 12345678 |
| POST | /api/admin/users/{id}/force-logout | Increment token_version to invalidate sessions |
| POST | /api/admin/users/import-csv | Batch import users from CSV (columns: username,password,role) |
| GET | /api/admin/permissions/{role} | Get permissions for a role |
| PUT | /api/admin/permissions/{role} | Set permissions for a role |

### Exercise Management

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/exercises/published | Student: list published exercises |
| GET | /api/exercises | Admin: list all exercises |
| GET | /api/exercises/{id} | Get exercise detail (with current version) |
| GET | /api/exercises/{id}/versions | List all versions of an exercise |
| POST | /api/exercises | Create exercise |
| PUT | /api/exercises/{id} | Update exercise (creates new version) |
| POST | /api/exercises/{id}/publish | Publish exercise |
| POST | /api/exercises/{id}/unpublish | Unpublish exercise |
| POST | /api/exercises/{id}/rollback/{v} | Roll back to specific version |
| POST | /api/exercises/{id}/like | Like an exercise |
| DELETE | /api/exercises/{id} | Delete exercise (soft delete) |

### Submissions & Grading

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/submissions/import | Batch import student answers (JSON file upload) |
| POST | /api/submissions/import-zip | Batch import from ZIP archive containing JSON files |
| GET | /api/submissions | List submissions (filter by exerciseId optional) |
| GET | /api/submissions/{id} | Get submission detail |
| GET | /api/submissions/export-csv?exerciseId= | Export grades as CSV (exerciseId optional) |
| PATCH | /api/submissions/{id}/grade | Tutor overrides grade (tutorScore + tutorComment) |
| DELETE | /api/submissions/{id} | Delete submission |

### Batch Import File Format

Each JSON file must follow this structure:
```json
{
  "exerciseId": 1,
  "studentName": "Student Name",
  "blocklyState": { ... },
  "generatedCode": "function add(a,b){return a+b;}"
}
```

The `generatedCode` field is optional. When present, the submission is automatically graded and an `autoScore` (0–100) is stored.

---

## 12. Authentication & Roles

### Roles

| Role | Description |
|------|-------------|
| SUPER_ADMIN | Platform administrator. Credentials in `application.yml` (env override: `SUPER_ADMIN_USERNAME`, `SUPER_ADMIN_PASSWORD`). Not stored in DB. Always has all permissions. |
| TUTOR | Teacher/grader. Stored in DB. Created by super admin. Permissions configurable. |
| STUDENT | Learner. Stored in DB. Created by super admin. Permissions configurable. |

### Permissions

| Permission | Description |
|-----------|-------------|
| VIEW_EXERCISES | View published exercises |
| SUBMIT_EXERCISES | Submit answers |
| GRADE_SUBMISSIONS | Grade student submissions |
| MANAGE_EXERCISES | Create/edit/delete exercises (Admin Panel access) |
| MANAGE_USERS | Unused by routes; reserved for future use |

### JWT Cookie

- Cookie name: `auth_token`
- Type: httpOnly, path `/`
- Expiry: 8 hours
- Claims: `sub` (username), `role`, `tokenVersion`, `exp`

### Default Password

New users and users whose password has been reset by super admin receive the default password: **12345678**

### Application Configuration

```yaml
super-admin:
  username: ${SUPER_ADMIN_USERNAME:admin}       # default: admin
  password: ${SUPER_ADMIN_PASSWORD:admin123}    # default: admin123

jwt:
  secret: ${JWT_SECRET:blockly-platform-jwt-secret-key-2026-very-long}
  expiry-hours: 8
```

### Live Database Migration (new tables)

```sql
CREATE TABLE IF NOT EXISTS users (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  username       VARCHAR(100) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(20) NOT NULL,
  display_name   VARCHAR(100),
  email          VARCHAR(100),
  enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  token_version  INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_permissions (
  role        VARCHAR(20) NOT NULL,
  permission  VARCHAR(50) NOT NULL,
  PRIMARY KEY (role, permission)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 13. Changelog

### 2026-03-22 — Refactor: Translate Chinese in index.html to English

**Files changed:**
- `frontend/index.html` — Changed `lang="zh"` to `lang="en"`; changed page title from `Blockly 練習平台` to `Blockly Exercise Platform`

---

### 2026-03-22 — Test Case Documentation Added

Added comprehensive test case documentation:
- `TEST_CASES.md` — English, covers all 12 unit tests across `AutoGradingService` and `ExerciseService`, how to run tests, and coverage gaps with suggestions
- `TEST_CASES_ZH.md` — Traditional Chinese version of the same document

---

### 2026-03-22 — Backend: Auto-Grading, ZIP Import, CSV Export, Unit Tests

**Files changed:**
- `backend/pom.xml` — Added dependencies: Mozilla Rhino 1.7.14, Apache Commons CSV 1.10.0, spring-boot-starter-test, H2 (test scope)
- `backend/src/main/resources/schema.sql` — Added `grading_mode` to `exercise_versions`, `auto_score` to `grades`
- `backend/src/main/java/com/blocklyplatform/entity/ExerciseVersion.java` — Added `gradingMode` field
- `backend/src/main/java/com/blocklyplatform/entity/Grade.java` — Added `autoScore` field
- `backend/src/main/java/com/blocklyplatform/dto/ExerciseCreateDto.java` — Added `gradingMode` field (default `OUTPUT_MATCH`)
- `backend/src/main/java/com/blocklyplatform/service/ExerciseService.java` — `saveVersion` persists `gradingMode`; `toVersionMap` includes `gradingMode`
- `backend/src/main/java/com/blocklyplatform/service/AutoGradingService.java` — New service. Uses Mozilla Rhino to execute JS and grade submissions; supports `OUTPUT_MATCH` and `TRACE_MATCH` modes; returns score 0–100
- `backend/src/main/java/com/blocklyplatform/service/GradingService.java` — Injects `AutoGradingService`; `batchImport` auto-grades when `generatedCode` is present; added `batchImportZip`, `exportGradesCsv`; `listSubmissions` now includes `autoScore`
- `backend/src/main/java/com/blocklyplatform/util/ByteArrayMultipartFile.java` — New utility class wrapping byte arrays as `MultipartFile` for ZIP extraction
- `backend/src/main/java/com/blocklyplatform/controller/SubmissionController.java` — Added `POST /api/submissions/import-zip` and `GET /api/submissions/export-csv` endpoints
- `backend/src/test/java/com/blocklyplatform/service/AutoGradingServiceTest.java` — New, 8 test cases (OUTPUT_MATCH correct/wrong/half, TRACE_MATCH correct/wrong, invalid JS, empty/null expected output)
- `backend/src/test/java/com/blocklyplatform/service/ExerciseServiceTest.java` — New, 4 Mockito test cases (like new/existing clientId, publish with no version, soft delete)
- `backend/src/test/resources/application.properties` — New, H2 in-memory DB config for tests

**Live database migration:**
```bash
docker exec blockly_db mysql -uroot -proot123 blocklydb -e "ALTER TABLE exercise_versions ADD COLUMN grading_mode VARCHAR(20) NOT NULL DEFAULT 'OUTPUT_MATCH';"
docker exec blockly_db mysql -uroot -proot123 blocklydb -e "ALTER TABLE grades ADD COLUMN auto_score INT DEFAULT NULL;"
```

**Grading mode details:**
- `OUTPUT_MATCH`: `expected_output` is a JSON array `[{"input": "add(1,2)", "expected": "3"}]`; each test case is executed with Rhino and output compared
- `TRACE_MATCH`: `expected_output` is a JSON array `["step1", "step2"]`; compared against `__trace` array populated during execution

### 2026-03-25 — Feature: Block Palette Restrictions and Hints System

**Files changed:**
- `backend/src/main/resources/db/migration/V2__Add_hints_to_exercise_versions.sql` — New migration; adds `hints TEXT DEFAULT NULL` column to `exercise_versions`
- `backend/src/main/java/com/blocklyplatform/entity/ExerciseVersion.java` — Added `hints` field (JPA column `hints`)
- `backend/src/main/java/com/blocklyplatform/dto/ExerciseCreateDto.java` — Added `hints` field
- `backend/src/main/java/com/blocklyplatform/service/ExerciseService.java` — `saveVersion()` now persists `hints`; `toVersionMap()` now includes `hints` in response
- `frontend/src/pages/AdminEditor.jsx` — Replaced category-level block checkboxes with individual block-type checkboxes (29 block types); added "Allow all blocks" toggle; added Hints editor (add/remove/edit individual hints)
- `frontend/src/pages/Workspace.jsx` — Updated to pass `allowedBlocks` (block type array) to BlocklyWorkspace; added hints reveal panel below workspace
- `frontend/src/components/BlocklyWorkspace.jsx` — Added `allowedBlocks` prop and `buildFilteredToolbox()` helper to filter toolbox at individual block-type level

**Block Palette Restrictions:**
- `allowed_blocks` column in `exercise_versions` stores a JSON array of Blockly block type strings: `["controls_if","math_number",...]`
- `null` means all blocks are allowed (no restrictions)
- Admin sets per-exercise restrictions using individual block-type checkboxes in the editor
- Students see only the allowed blocks in their workspace toolbox
- Categories with no remaining allowed blocks are hidden entirely

**API fields (`allowed_blocks`):**
- In `POST /api/exercises` and `PUT /api/exercises/{id}` body: `"allowedBlocks": null` (all blocks) or `"allowedBlocks": "[\"controls_if\",\"math_number\"]"` (restricted)
- In `GET /api/exercises/{id}` response: returned under `version.allowedBlocks`

**Hints System:**
- `hints` column in `exercise_versions` stores a JSON array of strings: `["Hint 1","Hint 2","Hint 3"]`
- `null` means no hints for this exercise
- Admin writes hints one-by-one in the editor; hints are stored as ordered JSON array
- Students can click "Get Hint" to reveal hints one at a time; already-revealed hints remain visible
- Hints panel only appears when the exercise has at least one hint

**API fields (`hints`):**
- In `POST /api/exercises` and `PUT /api/exercises/{id}` body: `"hints": null` (no hints) or `"hints": "[\"Try using a loop\",\"Check the condition\"]"`
- In `GET /api/exercises/{id}` response: returned under `version.hints`

**Live migration SQL for hints column:**
```sql
ALTER TABLE exercise_versions ADD COLUMN hints TEXT DEFAULT NULL;
```

---

### 2026-03-22 — Frontend: Run Button, Grading Mode, Output Panel

**Files changed:**
- `frontend/src/pages/AdminEditor.jsx`
- `frontend/src/pages/Workspace.jsx`

**AdminEditor.jsx:**
- Added green **Run** button in the header toolbar (next to Save). Executes the current reference-solution workspace blocks as JavaScript.
- Added **Grading Mode** dropdown (`OUTPUT_MATCH` / `TRACE_MATCH`) stored in form state as `gradingMode` and sent to the API on save.
- The Expected Output textarea is now conditional:
  - `OUTPUT_MATCH` mode shows "Test Cases (JSON array)" with placeholder `[{"input": "add(1, 2)", "expected": "3"}]`
  - `TRACE_MATCH` mode shows "Expected Trace (JSON array)" with placeholder `["step1", "loop", "end"]`
- Output panel appears below the Blockly workspace card after Run is clicked — dark background, monospace font, red text on error.

**Workspace.jsx:**
- Added green **Run** button in the main area toolbar above the Blockly workspace.
- Output panel appears below the workspace after Run is clicked, showing captured `console.log` output or error message.
- Clearing the workspace also clears the output panel.

**JS execution implementation (shared pattern in both files):**
```javascript
function runCode(code) {
  const logs = [];
  const mockConsole = { log: (...args) => logs.push(args.map(String).join(' ')) };
  try {
    const fn = new Function('console', code);
    const result = fn(mockConsole);
    if (result !== undefined) logs.push(String(result));
    return { output: logs.join('\n') || '(no output)', error: null };
  } catch (e) {
    return { output: null, error: e.message };
  }
}
```
