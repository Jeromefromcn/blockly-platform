# Test Cases — Blockly Platform Backend

## Summary Table

| Metric | Value |
|---|---|
| Test files | 2 |
| Total test cases | 12 |
| Services covered | 2 (`AutoGradingService`, `ExerciseService`) |
| Test framework | JUnit 5 + Mockito |
| Last known run result | Not yet recorded (run `mvn test` to get current results) |

---

## How to Run the Tests

All tests are Maven-managed. Navigate to the `backend/` directory and run:

```bash
# Run all tests
cd /home/ubuntu/claude/jerome/blockly-platform/backend
mvn test

# Run a single test class
mvn test -Dtest=AutoGradingServiceTest
mvn test -Dtest=ExerciseServiceTest

# Run a single test method
mvn test -Dtest=AutoGradingServiceTest#outputMatch_correctAnswer_returns100

# Run with verbose output (surefire)
mvn test -Dsurefire.useFile=false
```

Test reports are written to `backend/target/surefire-reports/` after each run.

---

## Test Class: `AutoGradingServiceTest`

**File:** `backend/src/test/java/com/blocklyplatform/service/AutoGradingServiceTest.java`

**Purpose:** Tests the `AutoGradingService`, which executes student-submitted JavaScript code inside a Mozilla Rhino sandbox and scores it against expected outputs or execution traces. No mocks are used — the real service is instantiated and Rhino actually runs the JS.

| # | Test Method | What It Tests | Expected Result |
|---|---|---|---|
| 1 | `outputMatch_correctAnswer_returns100` | `OUTPUT_MATCH` mode with a single test case where the JS function produces the exact expected output (`add(1,2)` returns `3`) | Score = `100` |
| 2 | `outputMatch_wrongAnswer_returns0` | `OUTPUT_MATCH` mode where the JS function is semantically wrong (subtracts instead of adds) | Score = `0` |
| 3 | `outputMatch_halfCorrect_returns50` | `OUTPUT_MATCH` mode with two test cases: first passes, second expects an impossible value (`999`) | Score = `50` (1 of 2 passed, rounded) |
| 4 | `traceMatch_correctTrace_returns100` | `TRACE_MATCH` mode where the JS pushes the exact expected values into `__trace` | Score = `100` |
| 5 | `traceMatch_wrongTrace_returns0` | `TRACE_MATCH` mode where the JS pushes different values than expected into `__trace` | Score = `0` |
| 6 | `grade_invalidJs_returns0NoException` | Passing syntactically invalid JavaScript to `grade()` — must not throw an exception | Score = `0`, no exception thrown |
| 7 | `grade_emptyExpectedOutput_returns0` | `OUTPUT_MATCH` mode with an empty array `[]` as expected output | Score = `0` |
| 8 | `grade_nullExpectedOutput_returns0` | `OUTPUT_MATCH` mode with `null` as expected output — must not throw a NullPointerException | Score = `0`, no exception thrown |

### Setup

A fresh `AutoGradingService` instance is created before each test via `@BeforeEach`. No Spring context is loaded; the Rhino JS engine is exercised directly.

---

## Test Class: `ExerciseServiceTest`

**File:** `backend/src/test/java/com/blocklyplatform/service/ExerciseServiceTest.java`

**Purpose:** Tests the `ExerciseService` business logic using Mockito mocks for all three repositories (`ExerciseRepository`, `ExerciseVersionRepository`, `LikeRepository`). Database is never touched.

| # | Test Method | What It Tests | Expected Result |
|---|---|---|---|
| 1 | `like_newClientId_incrementsLikeCountAndReturnsLikedTrue` | Calling `like()` for a client ID that has not liked the exercise before | `liked = true`, `likeCount` increments from 0 to 1; `likeRepo.save()` and `exerciseRepo.save()` each called once |
| 2 | `like_existingClientId_doesNotIncrementLikeCount` | Calling `like()` for a client ID that already liked the exercise | `liked = true`, `likeCount` stays at 5; neither `likeRepo.save()` nor `exerciseRepo.save()` is called |
| 3 | `publish_noVersion_throwsException` | Calling `publish()` on an exercise whose `currentVersionNumber` is 0 (no version has been saved yet) | A `RuntimeException` is thrown with a message containing `"Cannot publish"` |
| 4 | `delete_softDeletesSetsDeletedAt` | Calling `delete()` on an existing exercise | `deletedAt` field is set to a non-null timestamp on the saved entity; no hard delete is issued |

### Setup

Before each test, an `Exercise` entity is pre-populated (`id=1`, `code="TEST-001"`, `title="Test Exercise"`, `status="DRAFT"`, `currentVersionNumber=1`, `likeCount=0`). All repositories are Mockito mocks injected via `@InjectMocks`.

---

## What Is NOT Yet Covered

### Services without any tests

| Service / Class | Methods not tested |
|---|---|
| `GradingService` | `batchImport()`, `batchImportZip()`, `exportGradesCsv()`, `grade()` (tutor grading), `listSubmissions()`, `getSubmissionDetail()`, `deleteSubmission()` |
| `ExerciseService` | `listAll()`, `listPublished()`, `getWithVersion()`, `listVersions()`, `create()`, `update()`, `publish()` (success path), `unpublish()`, `rollback()` |

### Controllers (no tests at all)

| Controller | Untested endpoints |
|---|---|
| `ExerciseController` | All REST endpoints (list, create, update, publish, unpublish, rollback, delete, like) |
| `SubmissionController` | All REST endpoints (import, import-zip, list, detail, grade, export CSV, delete) |

### Other untested areas

| Area | Notes |
|---|---|
| Repository layer | No repository integration tests; custom query methods in `ExerciseRepository`, `SubmissionRepository`, etc. are untested |
| Frontend (React + Blockly) | No unit or e2e tests exist for any frontend component |
| Integration / end-to-end | No Spring Boot `@SpringBootTest` tests; no full HTTP-level tests using `MockMvc` or `TestRestTemplate` |
| Database migrations / schema | No tests validate schema consistency or migration correctness |
| Error handling / HTTP status codes | Controller-level error mapping (e.g., 404 vs 500) is not tested |
| Security / CORS | `WebConfig` CORS settings are not tested |

### Suggested future test cases

1. **`ExerciseServiceTest` — missing happy paths**
   - `publish_alreadyPublished_idempotentOrThrows` — what happens when publishing an already-published exercise?
   - `rollback_toNonExistentVersion_throwsException`
   - `create_savesExerciseAndVersion_returnsCorrectMap`
   - `update_incrementsVersionNumber`

2. **`GradingServiceTest` (new file needed)**
   - `batchImport_validJson_createsSubmissionAndAutoGrades`
   - `batchImport_missingExercise_returnsErrorEntry`
   - `batchImport_noGeneratedCode_skipsAutoGrade`
   - `batchImportZip_extractsJsonFilesAndDelegates`
   - `exportGradesCsv_returnsValidCsvBytes`
   - `grade_tutorScore_savesGradeRecord`
   - `deleteSubmission_softDeletesSetsDeletedAt`

3. **Controller layer (`@WebMvcTest`)**
   - HTTP 404 when exercise not found
   - HTTP 400 on invalid request body (Bean Validation)
   - HTTP 200 with correct JSON shape for list endpoints

4. **Integration tests (`@SpringBootTest` + H2)**
   - Full create → publish → submit → grade flow using an in-memory H2 database

5. **Frontend tests**
   - React component rendering (Jest + React Testing Library)
   - Blockly workspace block generation smoke test
