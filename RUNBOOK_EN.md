# Blockly Exercise Platform — Build & Operations Guide

## 1. Project Overview

| Item | Description |
|------|-------------|
| Function | Blockly visual programming exercise platform with exercise management, student submissions, and auto-grading |
| Frontend | React 18 + Blockly 12.5.0, port **8090** |
| Backend | Java 17 + Spring Boot 3.2, internal port 8081 |
| Sandbox | Node.js 20, internal port 3000, executes student code |
| Database | MySQL 8.0, persistent storage |
| Deployment | Docker + Docker Compose |
| Code Hosting | GitHub |

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
sudo docker compose up -d --build
```

The first build downloads dependencies and compiles code — this may take **5–10 minutes**. Please be patient.

### 3.3 Verify Startup

```bash
# Check container status (should show 4 containers, all "Up")
sudo docker compose ps

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

> If external access fails, open port 8090 in your cloud provider's firewall (e.g., GCP firewall rules).

---

## 4. Day-to-Day Operations

### Start Services
```bash
cd blockly-platform
sudo docker compose up -d
```

### Stop Services
```bash
sudo docker compose down
```
> Data is stored in the Docker Volume `blockly-platform_db_data`. Stopping services does **not** delete data.

### Restart Services
```bash
sudo docker compose restart
```

### Check Container Status
```bash
sudo docker compose ps
```

---

## 5. Updating / Redeploying

After code changes, follow these steps:

```bash
cd blockly-platform

# 1. Pull latest code
git pull

# 2. Rebuild and restart (only changed services are rebuilt)
sudo docker compose up -d --build
```

### Update a Single Service

```bash
# Rebuild only the frontend
sudo docker compose up -d --build frontend

# Rebuild only the backend
sudo docker compose up -d --build backend

# Rebuild only the sandbox
sudo docker compose up -d --build sandbox
```

---

## 6. Viewing Logs

```bash
# All services
sudo docker compose logs

# Follow a specific service in real time (Ctrl+C to exit)
sudo docker compose logs -f frontend
sudo docker compose logs -f backend
sudo docker compose logs -f sandbox
sudo docker compose logs -f db

# Last 100 lines
sudo docker compose logs --tail=100 backend
```

---

## 7. Database Operations

### Enter the Database Shell

```bash
sudo docker exec -it blockly_db mysql -ublockly -pblockly123 blocklydb
```

Common SQL queries:
```sql
-- List all exercises
SELECT id, code, title, status, current_version_number FROM exercises;

-- View submissions with scores
SELECT s.id, e.title, s.student_name, g.auto_score
FROM submissions s
JOIN exercises e ON s.exercise_id = e.id
LEFT JOIN grades g ON g.submission_id = s.id
ORDER BY s.submitted_at DESC;

-- Exit
exit
```

### Backup Data

```bash
sudo docker exec blockly_db mysqldump -ublockly -pblockly123 blocklydb > backup_$(date +%Y%m%d).sql
```

### Restore Data

```bash
cat backup_20260101.sql | sudo docker exec -i blockly_db mysql -ublockly -pblockly123 blocklydb
```

---

## 8. Rolling Back a Version

```bash
# View commit history
git log --oneline

# Switch to a specific version
git checkout <commit-hash>

# Rebuild
sudo docker compose up -d --build
```

---

## 9. Troubleshooting

### Service Unreachable (External)
1. Confirm port 8090 is open in your cloud firewall
2. Verify containers are running: `sudo docker compose ps`

### Backend Fails to Start
```bash
# Check logs for the error
sudo docker compose logs backend

# Common cause: database not ready yet — wait and retry
sudo docker compose restart backend
```

### Database Connection Error
```bash
# Check db container health
sudo docker inspect blockly_db | grep -A5 Health

# Full restart
sudo docker compose down && sudo docker compose up -d
```

### Code Execution Timeout
The sandbox defaults to a 10-second timeout. To change it, edit the `timeout` default in `sandbox/src/index.js` and rebuild:
```bash
sudo docker compose up -d --build sandbox
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
  Business logic + grading
       │              │
  [blockly_db]   [blockly_sandbox]
  MySQL database  Node.js code runner
       │
  [Docker Volume: db_data]
  Persistent data storage
```

---

## 11. API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/exercises/published | Student: list published exercises |
| GET | /api/exercises | Admin: list all exercises |
| POST | /api/exercises | Create exercise |
| PUT | /api/exercises/{id} | Update exercise (creates new version) |
| POST | /api/exercises/{id}/publish | Publish exercise |
| POST | /api/exercises/{id}/unpublish | Unpublish exercise |
| POST | /api/exercises/{id}/rollback/{v} | Roll back to specific version |
| DELETE | /api/exercises/{id} | Delete exercise (soft delete) |
| POST | /api/submissions | Student submits answer |
| GET | /api/submissions | List all submissions |
| PATCH | /api/submissions/{id}/grade | Tutor overrides score |
