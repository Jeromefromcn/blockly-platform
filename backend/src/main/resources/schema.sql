CREATE TABLE IF NOT EXISTS exercises (
  id                     BIGINT PRIMARY KEY AUTO_INCREMENT,
  code                   VARCHAR(64) NOT NULL,
  title                  VARCHAR(255) NOT NULL,
  status                 VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  current_version_number INT NOT NULL DEFAULT 0,
  like_count             INT NOT NULL DEFAULT 0,
  deleted_at             DATETIME DEFAULT NULL,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS exercise_versions (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  exercise_id     BIGINT NOT NULL,
  version_number  INT NOT NULL,
  description     TEXT NOT NULL,
  blockly_state   TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  grading_mode    VARCHAR(20) NOT NULL DEFAULT 'OUTPUT_MATCH',
  created_by      VARCHAR(100) DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_exercise_version (exercise_id, version_number),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS likes (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  exercise_id BIGINT NOT NULL,
  client_id   VARCHAR(64) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id),
  UNIQUE KEY uq_likes_exercise_client (exercise_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS submissions (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  exercise_id      BIGINT NOT NULL,
  version_number   INT NOT NULL,
  student_name     VARCHAR(255) DEFAULT NULL,
  source_filename  VARCHAR(255) NOT NULL,
  blockly_state    TEXT NOT NULL,
  submitted_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at       DATETIME DEFAULT NULL,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS grades (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  submission_id BIGINT NOT NULL UNIQUE,
  tutor_score   INT DEFAULT NULL,
  auto_score    INT DEFAULT NULL,
  tutor_comment TEXT,
  graded_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
