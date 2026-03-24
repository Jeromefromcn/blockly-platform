# Test Cases — Blockly Platform Backend

## Summary Table

| Metric | Value |
|---|---|
| Test files | 5 |
| Total test cases | 45 |
| Services covered | 5 (`AutoGradingService`, `ExerciseService`, `JwtService`, `AuthService`, `UserService`) |
| Test framework | JUnit 5 + Mockito |
| Last known run result | 45 passed, 0 failed, 0 errors (2026-03-24) |

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

---

## Test Class: `JwtServiceTest`

**File:** `backend/src/test/java/com/blocklyplatform/service/JwtServiceTest.java`

**Purpose:** Tests `JwtService` directly (no Spring context). A real `JwtService` instance is constructed with a test secret and expiry, so the full JJWT library is exercised without mocking.

| # | Test Method | What It Tests | Expected Result |
|---|---|---|---|
| 1 | `generateToken_returnsNonNullToken` | `generateToken()` for a normal user | Returns a non-null, non-blank JWT string |
| 2 | `validateToken_validToken_returnsClaims` | `validateToken()` on a freshly generated token | Returns `Claims` object with the correct `subject` |
| 3 | `validateToken_expiredToken_throwsExpiredJwtException` | `validateToken()` on a token generated with 0-hour expiry | Throws `ExpiredJwtException` |
| 4 | `validateToken_tamperedToken_throwsSignatureException` | `validateToken()` after last character of token is flipped | Throws a JWT signature-related exception |
| 5 | `extractUsername_returnsCorrectUsername` | `extractUsername()` on a token for user "bob" | Returns `"bob"` |
| 6 | `extractTokenVersion_returnsCorrectVersion` | `extractTokenVersion()` on a token generated with version 5 | Returns `5` |
| 7 | `generateToken_tokenContainsCorrectRoleClaim` | `role` claim in a SUPER_ADMIN token | `claims.get("role")` equals `"SUPER_ADMIN"` |

---

## Test Class: `AuthServiceTest`

**File:** `backend/src/test/java/com/blocklyplatform/service/AuthServiceTest.java`

**Purpose:** Tests `AuthService` business logic using Mockito mocks for `UserRepository`, `JwtService`, and `PasswordEncoder`. The `@Value`-injected super-admin credentials are set via `ReflectionTestUtils`.

| # | Test Method | What It Tests | Expected Result |
|---|---|---|---|
| 1 | `login_validSuperAdminCredentials_returnsToken` | Login with configured super admin username + password | Returns the JWT from `jwtService`; `userRepository` is never called |
| 2 | `login_wrongSuperAdminPassword_throwsException` | Login with super admin username but wrong password | Throws `RuntimeException("Invalid credentials")` |
| 3 | `login_validTutorUser_returnsToken` | Login with a TUTOR user whose password matches | Returns the JWT; `passwordEncoder.matches()` is called |
| 4 | `login_validStudentUser_returnsToken` | Login with a STUDENT user whose password matches | Returns the JWT for STUDENT role |
| 5 | `login_wrongDbUserPassword_throwsException` | Login with a valid username but wrong password | Throws `RuntimeException("Invalid credentials")` |
| 6 | `login_nonExistentUsername_throwsException` | Login with a username not in the DB | Throws `RuntimeException("Invalid credentials")` |
| 7 | `login_disabledUser_throwsException` | Login with a DB user whose `enabled` flag is false | Throws `RuntimeException("Account is disabled")` |
| 8 | `isSuperAdmin_configuredUsername_returnsTrue` | `isSuperAdmin()` with exact and differently-cased super admin username | Returns `true` for all case variants |
| 9 | `isSuperAdmin_regularUsername_returnsFalse` | `isSuperAdmin()` with a regular username, tutor1, student1, empty string | Returns `false` for all |

---

## Test Class: `UserServiceTest`

**File:** `backend/src/test/java/com/blocklyplatform/service/UserServiceTest.java`

**Purpose:** Tests `UserService` business logic using Mockito mocks for `UserRepository`, `RolePermissionRepository`, and `PasswordEncoder`. No Spring context or database is involved.

| # | Test Method | What It Tests | Expected Result |
|---|---|---|---|
| 1 | `createUser_newUser_savesWithHashedPassword` | `createUser()` with a new unique username and explicit password | `userRepository.save()` called with the BCrypt-encoded password |
| 2 | `createUser_duplicateUsername_throwsException` | `createUser()` with an existing username | Throws `RuntimeException` containing "Username already exists" |
| 3 | `createUser_invalidRole_throwsException` | `createUser()` with role "ADMIN" (not TUTOR/STUDENT) | Throws `RuntimeException` containing "Invalid role" |
| 4 | `createUser_nullPassword_usesDefaultPassword` | `createUser()` with `null` password | `passwordEncoder.encode("12345678")` is called |
| 5 | `resetPassword_setsDefaultPasswordAndIncrementsTokenVersion` | `resetPassword()` on an existing user | Password set to `encode("12345678")`; `tokenVersion` incremented by 1 |
| 6 | `forceLogout_incrementsTokenVersion` | `forceLogout()` on a user with `tokenVersion=3` | Saved user has `tokenVersion=4` |
| 7 | `deleteUser_existingUser_callsRepositoryDelete` | `deleteUser()` on an existing user | `userRepository.deleteById(1L)` is called |
| 8 | `deleteUser_nonExistentUser_throwsException` | `deleteUser()` when user does not exist | Throws `RuntimeException("User not found")` |
| 9 | `getPermissions_tutorRole_returnsPermissionsFromRepository` | `getPermissions("TUTOR")` when repository returns 2 entries | Returns list containing `VIEW_EXERCISES` and `GRADE_SUBMISSIONS` |
| 10 | `getPermissions_superAdminRole_returnsAllPermissions` | `getPermissions("SUPER_ADMIN")` | Returns all 5 permissions; `rolePermissionRepository` never called |
| 11 | `setPermissions_tutorRole_deletesOldAndSavesNew` | `setPermissions("TUTOR", ["VIEW_EXERCISES","GRADE_SUBMISSIONS"])` | `deleteByRole("TUTOR")` called once; 2 `save()` calls with correct permissions |
| 12 | `setPermissions_superAdminRole_throwsException` | `setPermissions("SUPER_ADMIN", ...)` | Throws `RuntimeException` containing "TUTOR or STUDENT" |
| 13 | `importCsv_validCsv_createsMultipleUsers` | CSV with 2 valid rows (alice/TUTOR, bob/STUDENT) | Returns 2 result entries, both with `status=created` |
| 14 | `importCsv_duplicateUsername_recordsFailedStatus` | CSV with a username that already exists in the repository | Returns 1 entry with `status=failed` and a non-null `error` |
| 15 | `updateProfile_validId_updatesDisplayNameAndEmail` | `updateProfile()` for an existing user | Saved user has the new `displayName` and `email` values |
| 16 | `changePassword_correctOldPassword_updatesHash` | `changePassword()` when old password matches | Password updated to new hash; `tokenVersion` incremented |
| 17 | `changePassword_wrongOldPassword_throwsException` | `changePassword()` when old password does not match | Throws `RuntimeException("Current password is incorrect")`; `save()` never called |

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
