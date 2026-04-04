# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
## Tech Stack
- Language: Java 17 + Spring Boot 3.2
- Database: MySQL 8.0
- Build Tool: Maven
- Test Framework: JUnit 5 + Mockito
- Frontend: React 18 + Blockly 12.5.0 + TypeScript 5
- Deployment: Docker + Docker Compose
- Monitoring: Prometheus (9090) + Grafana (3001)

## Commands
### Development

```bash
# Start all services (first run — builds images, ~5–10 min)
docker compose up -d --build

# Subsequent runs
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f backend
docker compose logs -f frontend
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev      # Dev server on :5173 with proxy to backend :8081
npm run build    # Production build → frontend/dist/
```

### Backend (Spring Boot + Maven)

```bash
cd backend
mvn clean package          # Build JAR
mvn test                   # Run all 45 unit tests
mvn test -Dtest=ClassName  # Run a single test class
```

### Core Development Rules
#### Code Style
- All public methods must be clearly named and self-explanatory
- Methods must not exceed 40 lines; classes must not exceed 300 lines
- Use DTOs instead of exposing entities directly
- Exception handling: use custom exceptions for business errors; let system exceptions propagate
- No Chinese in code, comments, or strings

#### Testing Requirements
- Every Service method must have at least three tests: happy path, boundary condition, and exception path
- Test naming: `should_[expected behavior]_when_[condition]`
- Mock external dependencies; do not mock the class under test
- The backend currently has 45 unit tests — new features must include corresponding tests

#### Security Rules
- Never hardcode passwords or secrets
- Validate and sanitize all user input
- Use parameterized queries for all SQL; never concatenate strings
- Database migrations use Flyway — never edit existing migration files

#### Git Conventions
- Commit message format: `type(scope): description`
- Types: feat | fix | refactor | test | docs | chore
- One logical change per commit
- Develop on the `develop` branch; push after each task; merge to `main` only on user confirmation

## Architecture

A full-stack Blockly visual programming platform. Docker Compose orchestrates 5 services:

| Service    | Tech                        | Port  |
|------------|-----------------------------|-------|
| frontend   | React 18 + Blockly + Nginx  | 8090  |
| backend    | Spring Boot 3.2 / Java 17   | 8081  |
| db         | MySQL 8.0                   | 3306  |
| prometheus | Prometheus                  | 9090  |
| grafana    | Grafana                     | 3001  |

All external traffic enters on port 8090. Nginx proxies `/api/**` to the backend and serves the React SPA for everything else.

### Backend

**Package**: `com.example.blocklyplatform`

Key services:
- **AuthService** — JWT (httpOnly cookie, 8h expiry) with `tokenVersion` for invalidation; BCrypt passwords; supports a config-level super-admin plus DB users.
- **UserService** — CRUD, CSV bulk import, password reset, RBAC (STUDENT / TUTOR / SUPER_ADMIN with 5 fine-grained permissions).
- **ExerciseService** — Exercises with versioning; published/draft states; like tracking.
- **AutoGradingService** — Executes student JS code in Mozilla Rhino sandbox; supports grading modes: `OUTPUT_MATCH`, `REQUIRED_BLOCKS`, `FORBIDDEN_BLOCKS`, `MAX_BLOCKS`.
- **SubmissionController** — JSON/ZIP import, batch grading, CSV export.

Database migrations use **Flyway** (`src/main/resources/db/migration/V*.sql`). Add new migrations as `V<n>__Description.sql`; never edit existing ones.

`@AuthenticationPrincipal` injects a `UserDetails` (not a custom `User` entity) — cast carefully or use `SecurityContextHolder` if you need the full user object.

### Frontend

**Entry**: `frontend/src/main.jsx` → React Router SPA.

Key pages/components:
- `Home.jsx` — Student exercise list with filters.
- `Workspace.jsx` — Blockly editor + code execution for students.
- `Admin.jsx` — Tutor panel: exercise list, bulk submission grading with Blockly preview.
- `AdminEditor.jsx` — Exercise authoring: Blockly config, hints, grading mode.
- `Progress.jsx` — Student progress dashboard.
- `SuperAdminPanel.jsx` — User management.

API calls go through a central `fetch` wrapper in `src/api.js` that adds credentials and handles 401s. The one exception is `fetchMe` which uses raw `fetch` to avoid redirect loops.

The Vite dev config (`vite.config.js`) proxies `/api` to `http://localhost:8081`.

### Key documentation

- `RUNBOOK.md` — Full ops guide: deploy, restart, DB access, backup, API reference.
- `ERROR_LOG.md` — Chronological bug log; read before debugging recurring issues.
- `dev-log/` — Per-date development notes.
- `TODO.md` — Pending and completed features.

## Prohibited Actions
- Do not modify files under .github/
- Do not write directly to the production database (queries only)
- Do not use @Autowired field injection; use constructor injection
- Do not modify tests just to make them pass
- Do not delete data in Docker Volumes
- Do not edit existing Flyway migration files (V*.sql)
