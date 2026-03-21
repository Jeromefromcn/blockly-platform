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
| GET | /api/submissions | List submissions (filter by exerciseId optional) |
| GET | /api/submissions/{id} | Get submission detail |
| PATCH | /api/submissions/{id}/grade | Tutor overrides grade (tutorScore + tutorComment) |
| DELETE | /api/submissions/{id} | Delete submission |

### Batch Import File Format

Each JSON file must follow this structure:
```json
{
  "exerciseId": 1,
  "studentName": "Student Name",
  "blocklyState": { ... }
}
```
