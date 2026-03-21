# 測試案例文件 — Blockly Platform 後端

## 摘要表

| 指標 | 數值 |
|---|---|
| 測試檔案數量 | 2 |
| 測試案例總數 | 12 |
| 已覆蓋的服務 | 2 個（`AutoGradingService`、`ExerciseService`） |
| 測試框架 | JUnit 5 + Mockito |
| 最後執行結果 | 尚未記錄（請執行 `mvn test` 取得最新結果） |

---

## 如何執行測試

所有測試皆由 Maven 管理。切換至 `backend/` 目錄後執行：

```bash
# 執行所有測試
cd /home/ubuntu/claude/jerome/blockly-platform/backend
mvn test

# 執行單一測試類別
mvn test -Dtest=AutoGradingServiceTest
mvn test -Dtest=ExerciseServiceTest

# 執行單一測試方法
mvn test -Dtest=AutoGradingServiceTest#outputMatch_correctAnswer_returns100

# 顯示詳細輸出（透過 surefire）
mvn test -Dsurefire.useFile=false
```

每次執行後，測試報告會產生於 `backend/target/surefire-reports/`。

---

## 測試類別：`AutoGradingServiceTest`

**檔案：** `backend/src/test/java/com/blocklyplatform/service/AutoGradingServiceTest.java`

**目的：** 測試 `AutoGradingService`，該服務會在 Mozilla Rhino 沙盒中執行學生提交的 JavaScript 程式碼，並依據預期輸出或執行軌跡進行評分。此測試類別不使用任何 Mock，直接建立真實的服務實例，由 Rhino 引擎實際執行 JS。

| # | 測試方法名稱 | 測試內容 | 預期結果 |
|---|---|---|---|
| 1 | `outputMatch_correctAnswer_returns100` | `OUTPUT_MATCH` 模式，單一測試案例，JS 函式輸出與預期完全一致（`add(1,2)` 回傳 `3`） | 分數 = `100` |
| 2 | `outputMatch_wrongAnswer_returns0` | `OUTPUT_MATCH` 模式，JS 函式語意錯誤（執行減法而非加法） | 分數 = `0` |
| 3 | `outputMatch_halfCorrect_returns50` | `OUTPUT_MATCH` 模式，共兩個測試案例：第一個通過，第二個預期值為不可能的 `999` | 分數 = `50`（1/2 通過，四捨五入） |
| 4 | `traceMatch_correctTrace_returns100` | `TRACE_MATCH` 模式，JS 將完全符合預期的值推入 `__trace` 陣列 | 分數 = `100` |
| 5 | `traceMatch_wrongTrace_returns0` | `TRACE_MATCH` 模式，JS 推入 `__trace` 的值與預期不符 | 分數 = `0` |
| 6 | `grade_invalidJs_returns0NoException` | 傳入語法不合法的 JavaScript，`grade()` 必須不拋出例外 | 分數 = `0`，無例外拋出 |
| 7 | `grade_emptyExpectedOutput_returns0` | `OUTPUT_MATCH` 模式，傳入空陣列 `[]` 作為預期輸出 | 分數 = `0` |
| 8 | `grade_nullExpectedOutput_returns0` | `OUTPUT_MATCH` 模式，傳入 `null` 作為預期輸出，不得拋出 `NullPointerException` | 分數 = `0`，無例外拋出 |

### 測試初始化

每個測試執行前，`@BeforeEach` 會建立一個新的 `AutoGradingService` 實例。不載入 Spring Context，Rhino JS 引擎由測試直接呼叫。

---

## 測試類別：`ExerciseServiceTest`

**檔案：** `backend/src/test/java/com/blocklyplatform/service/ExerciseServiceTest.java`

**目的：** 透過 Mockito 對三個 Repository（`ExerciseRepository`、`ExerciseVersionRepository`、`LikeRepository`）進行模擬，測試 `ExerciseService` 的業務邏輯。測試過程中完全不觸及資料庫。

| # | 測試方法名稱 | 測試內容 | 預期結果 |
|---|---|---|---|
| 1 | `like_newClientId_incrementsLikeCountAndReturnsLikedTrue` | 某個從未按讚的 client ID 呼叫 `like()` | `liked = true`，`likeCount` 從 0 增加至 1；`likeRepo.save()` 與 `exerciseRepo.save()` 各呼叫一次 |
| 2 | `like_existingClientId_doesNotIncrementLikeCount` | 已按讚的 client ID 再次呼叫 `like()` | `liked = true`，`likeCount` 維持 5；`likeRepo.save()` 與 `exerciseRepo.save()` 均未被呼叫 |
| 3 | `publish_noVersion_throwsException` | 對 `currentVersionNumber` 為 0（尚無版本）的習題呼叫 `publish()` | 拋出 `RuntimeException`，訊息包含 `"Cannot publish"` |
| 4 | `delete_softDeletesSetsDeletedAt` | 對已存在的習題呼叫 `delete()` | 儲存至 Repository 的 Entity 其 `deletedAt` 欄位被設為非 null 的時間戳記；不執行實際刪除 |

### 測試初始化

每個測試前，`@BeforeEach` 會預先建立一個 `Exercise` 實體（`id=1`、`code="TEST-001"`、`title="Test Exercise"`、`status="DRAFT"`、`currentVersionNumber=1`、`likeCount=0`），三個 Repository 皆為 Mockito Mock，透過 `@InjectMocks` 注入 `ExerciseService`。

---

## 尚未覆蓋的測試範圍

### 無任何測試的服務

| 服務 / 類別 | 未測試的方法 |
|---|---|
| `GradingService` | `batchImport()`、`batchImportZip()`、`exportGradesCsv()`、`grade()`（教師評分）、`listSubmissions()`、`getSubmissionDetail()`、`deleteSubmission()` |
| `ExerciseService` | `listAll()`、`listPublished()`、`getWithVersion()`、`listVersions()`、`create()`、`update()`、`publish()`（成功路徑）、`unpublish()`、`rollback()` |

### 無任何測試的控制器

| 控制器 | 未測試的端點 |
|---|---|
| `ExerciseController` | 所有 REST 端點（列表、建立、更新、發布、取消發布、回溯版本、刪除、按讚） |
| `SubmissionController` | 所有 REST 端點（匯入、ZIP 匯入、列表、詳情、評分、匯出 CSV、刪除） |

### 其他未覆蓋的範圍

| 範圍 | 說明 |
|---|---|
| Repository 層 | 無 Repository 整合測試；`ExerciseRepository`、`SubmissionRepository` 等自訂查詢方法均未測試 |
| 前端（React + Blockly） | 前端元件目前沒有任何單元測試或端對端測試 |
| 整合 / 端對端測試 | 無 `@SpringBootTest` 整合測試；無 `MockMvc` 或 `TestRestTemplate` 的 HTTP 層測試 |
| 資料庫結構 / Schema | 無測試驗證 Schema 一致性或資料庫遷移的正確性 |
| 錯誤處理 / HTTP 狀態碼 | 控制器層的錯誤對應（如 404 vs 500）未測試 |
| 安全性 / CORS | `WebConfig` 的 CORS 設定未被測試驗證 |

### 建議新增的測試案例

1. **`ExerciseServiceTest` — 補充正常流程測試**
   - `publish_alreadyPublished_idempotentOrThrows` — 對已發布的習題再次呼叫 `publish()` 的行為
   - `rollback_toNonExistentVersion_throwsException` — 回溯至不存在版本號時應拋出例外
   - `create_savesExerciseAndVersion_returnsCorrectMap` — 建立習題並驗證回傳 Map 內容
   - `update_incrementsVersionNumber` — 更新習題時版本號應遞增

2. **`GradingServiceTest`（需新建測試檔）**
   - `batchImport_validJson_createsSubmissionAndAutoGrades` — 有效 JSON 匯入後自動建立提交紀錄並評分
   - `batchImport_missingExercise_returnsErrorEntry` — 習題不存在時回傳錯誤項目
   - `batchImport_noGeneratedCode_skipsAutoGrade` — 無 `generatedCode` 時跳過自動評分
   - `batchImportZip_extractsJsonFilesAndDelegates` — ZIP 匯入時正確解壓並委派給 `batchImport()`
   - `exportGradesCsv_returnsValidCsvBytes` — CSV 匯出內容格式正確
   - `grade_tutorScore_savesGradeRecord` — 教師評分後正確儲存 Grade 紀錄
   - `deleteSubmission_softDeletesSetsDeletedAt` — 軟刪除提交紀錄時設定 `deletedAt`

3. **控制器層測試（`@WebMvcTest`）**
   - 習題不存在時回傳 HTTP 404
   - 請求 Body 不合法時回傳 HTTP 400（Bean Validation）
   - 列表端點回傳 HTTP 200 及正確 JSON 結構

4. **整合測試（`@SpringBootTest` + H2 記憶體資料庫）**
   - 完整流程：建立習題 → 發布 → 提交答案 → 教師評分

5. **前端測試**
   - React 元件渲染測試（Jest + React Testing Library）
   - Blockly 工作區積木生成程式碼的冒煙測試
