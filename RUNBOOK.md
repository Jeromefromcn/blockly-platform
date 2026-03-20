# Blockly 練習平台 — 項目構建與運維手冊

## 一、項目概述

| 項目 | 說明 |
|------|------|
| 功能 | Blockly 積木編程練習平台，支持題目管理、學生提交、自動評分 |
| 前端 | React 18 + Blockly 12.5.0，端口 **8090** |
| 後端 | Java 17 + Spring Boot 3.2，內部端口 8081 |
| 沙箱 | Node.js 20，內部端口 3000，執行學生代碼 |
| 數據庫 | MySQL 8.0，持久化存儲 |
| 部署 | Docker + Docker Compose |
| 代碼托管 | GitHub |

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
sudo docker compose up -d --build
```

首次構建需要下載依賴，預計 5-10 分鐘，請耐心等待。

### 3.3 驗證啟動

```bash
# 查看容器狀態（應有 4 個容器，均為 Up）
sudo docker compose ps

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

> 如果外部無法訪問，需在雲服務商（如 GCP）的防火牆中開放 8090 端口。

---

## 四、日常操作

### 啟動服務
```bash
cd blockly-platform
sudo docker compose up -d
```

### 停止服務
```bash
sudo docker compose down
```
> 數據保存在 Docker Volume `blockly-platform_db_data`，停止不會丟失數據。

### 重啟服務
```bash
sudo docker compose restart
```

### 查看容器狀態
```bash
sudo docker compose ps
```

---

## 五、更新部署

每次代碼有改動後，按以下步驟重新部署：

```bash
cd blockly-platform

# 1. 拉取最新代碼
git pull

# 2. 重新構建並啟動（只重建有改動的服務）
sudo docker compose up -d --build
```

### 只更新某個服務

```bash
# 只更新前端
sudo docker compose up -d --build frontend

# 只更新後端
sudo docker compose up -d --build backend

# 只更新沙箱
sudo docker compose up -d --build sandbox
```

---

## 六、查看日誌

```bash
# 查看所有服務日誌
sudo docker compose logs

# 實時跟蹤某個服務（Ctrl+C 退出）
sudo docker compose logs -f frontend
sudo docker compose logs -f backend
sudo docker compose logs -f sandbox
sudo docker compose logs -f db

# 查看最近 100 行
sudo docker compose logs --tail=100 backend
```

---

## 七、數據庫操作

### 進入數據庫

```bash
sudo docker exec -it blockly_db mysql -ublockly -pblockly123 blocklydb
```

常用 SQL：
```sql
-- 查看所有題目
SELECT id, code, title, status, current_version_number FROM exercises;

-- 查看提交記錄
SELECT s.id, e.title, s.student_name, g.auto_score
FROM submissions s
JOIN exercises e ON s.exercise_id = e.id
LEFT JOIN grades g ON g.submission_id = s.id
ORDER BY s.submitted_at DESC;

-- 退出
exit
```

### 數據備份

```bash
# 備份到當前目錄
sudo docker exec blockly_db mysqldump -ublockly -pblockly123 blocklydb > backup_$(date +%Y%m%d).sql
```

### 數據恢復

```bash
cat backup_20260101.sql | sudo docker exec -i blockly_db mysql -ublockly -pblockly123 blocklydb
```

---

## 八、回滾版本

```bash
# 查看提交歷史
git log --oneline

# 切換到指定版本
git checkout <commit-hash>

# 重新構建
sudo docker compose up -d --build
```

---

## 九、常見問題排查

### 服務無法訪問（外部）
1. 確認雲服務商防火牆已開放 8090 端口
2. 確認容器正在運行：`sudo docker compose ps`

### 後端啟動失敗
```bash
# 查看日誌找原因
sudo docker compose logs backend

# 常見原因：數據庫未就緒，等待後重試
sudo docker compose restart backend
```

### 數據庫連接失敗
```bash
# 確認 db 容器健康狀態
sudo docker inspect blockly_db | grep -A5 Health

# 重啟整個服務
sudo docker compose down && sudo docker compose up -d
```

### 代碼執行超時
沙箱默認 10 秒超時。如需調整，修改 `sandbox/src/index.js` 中的 `timeout` 默認值並重新構建。

---

## 十、架構說明

```
外部請求 :8090
       │
  [blockly_frontend] Nginx
  靜態文件 + 反向代理
       │
  [blockly_backend] Spring Boot :8081
  業務邏輯 + 評分
       │              │
  [blockly_db]   [blockly_sandbox]
  MySQL 數據庫    Node.js 代碼執行
       │
  [Docker Volume: db_data]
  持久化數據
```

---

## 十一、API 接口列表

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/exercises/published | 學生：獲取已發布題目 |
| GET | /api/exercises | 管理：獲取所有題目 |
| POST | /api/exercises | 創建題目 |
| PUT | /api/exercises/{id} | 更新題目（創建新版本） |
| POST | /api/exercises/{id}/publish | 發布題目 |
| POST | /api/exercises/{id}/unpublish | 下架題目 |
| POST | /api/exercises/{id}/rollback/{v} | 回滾到指定版本 |
| DELETE | /api/exercises/{id} | 刪除題目（軟刪除） |
| POST | /api/submissions | 學生提交答案 |
| GET | /api/submissions | 查看提交記錄 |
| PATCH | /api/submissions/{id}/grade | 老師覆蓋分數 |
