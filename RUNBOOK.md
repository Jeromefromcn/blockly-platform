# Blockly 練習平台 — 項目構建與運維手冊

## 一、項目概述

| 項目 | 說明 |
|------|------|
| 功能 | Blockly 積木編程練習平台，支持題目管理、學生提交、批量導入評分、點贊 |
| 前端 | React 18 + Blockly 12.5.0，端口 **8090** |
| 後端 | Java 17 + Spring Boot 3.2，內部端口 8081 |
| 數據庫 | MySQL 8.0，持久化存儲 |
| 監控 | Prometheus（端口 9090）+ Grafana（端口 3001） |
| 部署 | Docker + Docker Compose |
| 代碼托管 | GitHub |

> **注意**：v2 已移除 Node.js 沙箱服務，評分邏輯完全由後端 Java 處理。

---

## 二、環境要求

服務器需安裝以下工具：

```bash
# 檢查
docker --version        # >= 24.0
docker compose version  # >= 2.0
git --version           # 任意版本
```

如未安裝 Docker：
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

---

## 三、首次部署

### 3.1 拉取代碼

```bash
git clone https://github.com/Jeromefromcn/blockly-platform.git
cd blockly-platform
```

### 3.2 啟動服務

```bash
docker compose up -d --build
```

首次構建需要下載依賴，預計 5-10 分鐘，請耐心等待。

### 3.3 驗證啟動

```bash
# 查看容器狀態（應有 5 個容器，均為 Up）
docker compose ps

# 測試前端可訪問
curl -o /dev/null -w "%{http_code}" http://localhost:8090
# 應返回 200

# 測試後端 API
curl http://localhost:8090/api/exercises/published
# 應返回 []
```

### 3.4 訪問地址

| 頁面 | 地址 |
|------|------|
| 學生練習頁面 | `http://服務器IP:8090` |
| 管理後台 | `http://服務器IP:8090/admin` |
| Prometheus | `http://服務器IP:9090` |
| Grafana | `http://服務器IP:3001`（帳號 admin / admin123） |

> 如果外部無法訪問，需在雲服務商（如 GCP）的防火牆中開放對應端口。

---

## 四、日常操作

### 啟動服務
```bash
cd blockly-platform
docker compose up -d
```

### 停止服務
```bash
docker compose down
```
> 數據保存在 Docker Volume（`db_data`、`prometheus_data`、`grafana_data`），停止不會丟失數據。

### 重啟服務
```bash
docker compose restart
```

### 查看容器狀態
```bash
docker compose ps
```

---

## 五、更新部署

每次代碼有改動後，按以下步驟重新部署：

```bash
cd blockly-platform

# 1. 拉取最新代碼
git pull

# 2. 重新構建並啟動（只重建有改動的服務）
docker compose up -d --build
```

### 只更新某個服務

```bash
# 只更新前端
docker compose up -d --build frontend

# 只更新後端
docker compose up -d --build backend
```

---

## 六、查看日誌

```bash
# 查看所有服務日誌
docker compose logs

# 實時跟蹤某個服務（Ctrl+C 退出）
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f db
docker compose logs -f prometheus
docker compose logs -f grafana

# 查看最近 100 行
docker compose logs --tail=100 backend
```

---

## 七、數據庫操作

### 進入數據庫

```bash
docker exec -it blockly_db mysql -ublockly -pblockly123 blocklydb
```

常用 SQL：
```sql
-- 查看所有題目
SELECT id, code, title, status, current_version_number, like_count FROM exercises;

-- 查看提交記錄
SELECT s.id, e.title, s.student_name, g.tutor_score, g.tutor_comment
FROM submissions s
JOIN exercises e ON s.exercise_id = e.id
LEFT JOIN grades g ON g.submission_id = s.id
ORDER BY s.submitted_at DESC;

-- 查看點贊記錄
SELECT e.title, COUNT(l.id) AS likes
FROM likes l
JOIN exercises e ON l.exercise_id = e.id
GROUP BY e.id;

-- 退出
exit
```

### 數據備份

```bash
docker exec blockly_db mysqldump -ublockly -pblockly123 blocklydb > backup_$(date +%Y%m%d).sql
```

### 數據恢復

```bash
cat backup_20260101.sql | docker exec -i blockly_db mysql -ublockly -pblockly123 blocklydb
```

---

## 八、回滾版本

```bash
# 查看提交歷史
git log --oneline

# 切換到指定版本
git checkout <commit-hash>

# 重新構建
docker compose up -d --build
```

---

## 九、常見問題排查

### 服務無法訪問（外部）
1. 確認雲服務商防火牆已開放相應端口（8090、9090、3001）
2. 確認容器正在運行：`docker compose ps`

### 後端啟動失敗
```bash
# 查看日誌找原因
docker compose logs backend

# 常見原因：數據庫未就緒，等待後重試（MySQL healthcheck start_period 為 90s）
docker compose restart backend
```

### 數據庫連接失敗
```bash
# 確認 db 容器健康狀態
docker inspect blockly_db | grep -A5 Health

# 重啟整個服務
docker compose down && docker compose up -d
```

---

## 十、架構說明

```
外部請求 :8090
       │
  [blockly_frontend] Nginx
  靜態文件 + 反向代理
       │
  [blockly_backend] Spring Boot :8081
  業務邏輯 + 評分（純 Java，無沙箱）
       │
  [blockly_db] MySQL 8.0
  持久化數據（Volume: db_data）

監控鏈路：
  [blockly_backend] /actuator/prometheus
       │
  [blockly_prometheus] :9090  ←── 抓取間隔 10s（Volume: prometheus_data）
       │
  [blockly_grafana] :3001（Volume: grafana_data）
```

---

## 十一、身份驗證與角色

### 角色說明

| 角色 | 說明 |
|------|------|
| SUPER_ADMIN | 超級管理員。憑證在 `application.yml` 配置（環境變量覆蓋：`SUPER_ADMIN_USERNAME`、`SUPER_ADMIN_PASSWORD`）。不存儲於數據庫。始終擁有全部權限。 |
| TUTOR | 教師/評分者。存儲於數據庫，由超級管理員創建。權限可配置。 |
| STUDENT | 學生。存儲於數據庫，由超級管理員創建。權限可配置。 |

### 權限列表

| 權限 | 說明 |
|------|------|
| VIEW_EXERCISES | 查看已發布題目 |
| SUBMIT_EXERCISES | 提交答案 |
| GRADE_SUBMISSIONS | 評閱提交 |
| MANAGE_EXERCISES | 創建/編輯/刪除題目（管理後台訪問） |
| MANAGE_USERS | 保留，暫未使用 |

### JWT Cookie

- Cookie 名稱：`auth_token`
- 類型：httpOnly，路徑 `/`
- 有效期：8 小時
- 包含字段：`sub`（用戶名）、`role`、`tokenVersion`、`exp`

### 默認密碼

新用戶及被超級管理員重置密碼的用戶，默認密碼為：**12345678**

### 應用配置

```yaml
super-admin:
  username: ${SUPER_ADMIN_USERNAME:admin}       # 默認：admin
  password: ${SUPER_ADMIN_PASSWORD:admin123}    # 默認：admin123

jwt:
  secret: ${JWT_SECRET:blockly-platform-jwt-secret-key-2026-very-long}
  expiry-hours: 8
```

### 數據庫在線遷移（新增兩張表）

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

## 十二、API 接口列表

### 身份驗證

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | /api/auth/login | 登錄，設置 httpOnly Cookie `auth_token` |
| POST | /api/auth/logout | 登出，清除 Cookie |
| GET | /api/auth/me | 獲取當前用戶信息及權限列表 |

### 個人資料

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/profile | 獲取自己的資料 |
| PUT | /api/profile | 更新自己的顯示名稱和郵箱 |
| PUT | /api/profile/password | 修改自己的密碼（超級管理員不可用） |

### 用戶管理（僅超級管理員）

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/admin/users | 列出所有用戶 |
| POST | /api/admin/users | 創建用戶 |
| DELETE | /api/admin/users/{id} | 刪除用戶 |
| POST | /api/admin/users/{id}/reset-password | 重置密碼為 12345678 |
| POST | /api/admin/users/{id}/force-logout | 強制登出（遞增 token_version） |
| POST | /api/admin/users/import-csv | 批量導入用戶（CSV：username,password,role） |
| GET | /api/admin/permissions/{role} | 獲取角色的權限列表 |
| PUT | /api/admin/permissions/{role} | 設置角色的權限列表 |

### 題目管理

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/exercises/published | 學生：獲取已發布題目 |
| GET | /api/exercises | 管理：獲取所有題目 |
| GET | /api/exercises/{id} | 獲取題目詳情（含當前版本） |
| GET | /api/exercises/{id}/versions | 獲取題目所有版本列表 |
| POST | /api/exercises | 創建題目 |
| PUT | /api/exercises/{id} | 更新題目（創建新版本） |
| POST | /api/exercises/{id}/publish | 發布題目 |
| POST | /api/exercises/{id}/unpublish | 下架題目 |
| POST | /api/exercises/{id}/rollback/{v} | 回滾到指定版本 |
| POST | /api/exercises/{id}/like | 點贊題目 |
| DELETE | /api/exercises/{id} | 刪除題目（軟刪除） |

### 提交與評分

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | /api/submissions/import | 批量導入學生答案（JSON 文件上傳） |
| POST | /api/submissions/import-zip | 批量導入（ZIP 壓縮包，含 JSON 文件） |
| GET | /api/submissions | 查看提交記錄（可按 exerciseId 篩選） |
| GET | /api/submissions/{id} | 獲取提交詳情 |
| GET | /api/submissions/export-csv?exerciseId= | 導出成績 CSV（exerciseId 可選） |
| PATCH | /api/submissions/{id}/grade | 老師覆蓋評分（tutorScore + tutorComment） |
| DELETE | /api/submissions/{id} | 刪除提交記錄 |

### 批量導入文件格式

每個 JSON 文件結構：
```json
{
  "exerciseId": 1,
  "studentName": "學生姓名",
  "blocklyState": { ... },
  "generatedCode": "function add(a,b){return a+b;}"
}
```

`generatedCode` 字段可選，若存在則自動評分（`autoScore`）。

---

## 十三、更新日誌

### 2026-03-22 — 重構：將 index.html 中的中文翻譯為英文

**修改文件：**
- `frontend/index.html` — 將 `lang="zh"` 改為 `lang="en"`；將頁面標題從 `Blockly 練習平台` 改為 `Blockly Exercise Platform`

---

### 2026-03-22 — 新增測試案例文件

新增完整的測試案例說明文件：
- `TEST_CASES.md` — 英文版，涵蓋 `AutoGradingService` 與 `ExerciseService` 共 12 個單元測試、執行方式及覆蓋缺口與改善建議
- `TEST_CASES_ZH.md` — 繁體中文版，內容相同

---

### 2026-03-22 — 後端：自動評分、ZIP 導入、CSV 導出、單元測試

**修改文件：**
- `backend/pom.xml` — 添加依賴：Mozilla Rhino 1.7.14、Apache Commons CSV 1.10.0、spring-boot-starter-test、H2（測試）
- `backend/src/main/resources/schema.sql` — `exercise_versions` 添加 `grading_mode` 列，`grades` 添加 `auto_score` 列
- `backend/src/main/java/com/blocklyplatform/entity/ExerciseVersion.java` — 添加 `gradingMode` 字段
- `backend/src/main/java/com/blocklyplatform/entity/Grade.java` — 添加 `autoScore` 字段
- `backend/src/main/java/com/blocklyplatform/dto/ExerciseCreateDto.java` — 添加 `gradingMode` 字段（默認 `OUTPUT_MATCH`）
- `backend/src/main/java/com/blocklyplatform/service/ExerciseService.java` — `saveVersion` 保存 `gradingMode`，`toVersionMap` 包含 `gradingMode`
- `backend/src/main/java/com/blocklyplatform/service/AutoGradingService.java` — 新增，使用 Mozilla Rhino 執行 JS 自動評分，支持 `OUTPUT_MATCH` / `TRACE_MATCH`
- `backend/src/main/java/com/blocklyplatform/service/GradingService.java` — 注入 `AutoGradingService`，`batchImport` 支持自動評分，新增 `batchImportZip`、`exportGradesCsv`，`listSubmissions` 返回 `autoScore`
- `backend/src/main/java/com/blocklyplatform/util/ByteArrayMultipartFile.java` — 新增，ZIP 解壓內部使用的 MultipartFile 實現
- `backend/src/main/java/com/blocklyplatform/controller/SubmissionController.java` — 添加 `POST /api/submissions/import-zip`、`GET /api/submissions/export-csv` 端點
- `backend/src/test/java/com/blocklyplatform/service/AutoGradingServiceTest.java` — 新增，8 個測試用例
- `backend/src/test/java/com/blocklyplatform/service/ExerciseServiceTest.java` — 新增，4 個 Mockito 測試用例
- `backend/src/test/resources/application.properties` — 新增，H2 內存數據庫測試配置

**數據庫變更（在線執行）：**
```bash
docker exec blockly_db mysql -uroot -proot123 blocklydb -e "ALTER TABLE exercise_versions ADD COLUMN grading_mode VARCHAR(20) NOT NULL DEFAULT 'OUTPUT_MATCH';"
docker exec blockly_db mysql -uroot -proot123 blocklydb -e "ALTER TABLE grades ADD COLUMN auto_score INT DEFAULT NULL;"
```

**評分模式說明：**
- `OUTPUT_MATCH`：`expected_output` 為 JSON 數組 `[{"input": "add(1,2)", "expected": "3"}]`，逐條執行對比輸出
- `TRACE_MATCH`：`expected_output` 為 JSON 數組 `["step1", "step2"]`，對比 `__trace` 執行軌跡

### 2026-03-22 — 前端：運行按鈕、評分模式、輸出面板

**修改文件：**
- `frontend/src/pages/AdminEditor.jsx`
- `frontend/src/pages/Workspace.jsx`

**AdminEditor.jsx：**
- 在頭部工具欄（Save 旁）新增綠色 **Run** 按鈕，點擊後執行當前參考解答積木生成的 JavaScript。
- 新增**評分模式**下拉選擇框（`OUTPUT_MATCH` / `TRACE_MATCH`），保存在 form state 的 `gradingMode` 字段，隨題目保存一并傳至 API。
- 預期輸出輸入框改為條件顯示：
  - `OUTPUT_MATCH` 模式顯示「測試用例（JSON 數組）」，佔位符：`[{"input": "add(1, 2)", "expected": "3"}]`
  - `TRACE_MATCH` 模式顯示「預期追蹤（JSON 數組）」，佔位符：`["step1", "loop", "end"]`
- 點擊 Run 後，在積木編輯器卡片下方顯示輸出面板——深色背景、等寬字體，錯誤時以紅色顯示。

**Workspace.jsx：**
- 在主區域積木編輯器上方的工具欄新增綠色 **Run** 按鈕。
- 點擊 Run 後，在積木編輯器下方顯示輸出面板，展示捕獲的 `console.log` 輸出或錯誤信息。
- 清空工作區時同步清除輸出面板。

**JS 執行實現（兩個文件共用方案）：**
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
