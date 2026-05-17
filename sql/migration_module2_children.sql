-- =============================================================================
-- IDMS — Module 2: Child & Attendance Management
-- Migration Script
--
-- Run AFTER schema.sql (Module 1 must already exist).
-- Safe to re-run: all DDL uses IF NOT EXISTS / INSERT IGNORE.
-- =============================================================================

USE idms_db;

-- -----------------------------------------------------------------------------
-- TABLE: classrooms
-- Groups children into named groups, each assigned to one Educator.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS classrooms (
  classroom_id  INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  name          VARCHAR(80)      NOT NULL,
  educator_id   INT UNSIGNED              DEFAULT NULL
                                 COMMENT 'FK → users.user_id (Educator role)',
  max_capacity  TINYINT UNSIGNED NOT NULL DEFAULT 10,
  color_tag     VARCHAR(7)       NOT NULL DEFAULT '#2BB39B'
                                 COMMENT 'Hex colour shown in the UI',
  is_active     TINYINT(1)       NOT NULL DEFAULT 1,
  created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (classroom_id),
  UNIQUE KEY uq_classroom_name (name),

  CONSTRAINT fk_classroom_educator
    FOREIGN KEY (educator_id) REFERENCES users (user_id)
    ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'Daycare classroom groups';

-- -----------------------------------------------------------------------------
-- TABLE: children
-- Core profile for every enrolled child.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS children (
  child_id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name         VARCHAR(60)  NOT NULL,
  last_name          VARCHAR(60)  NOT NULL,
  date_of_birth      DATE         NOT NULL,
  gender             ENUM('M','F','Other') NOT NULL DEFAULT 'Other',
  classroom_id       INT UNSIGNED          DEFAULT NULL,
  medical_notes      TEXT                  DEFAULT NULL
                     COMMENT 'Allergies, conditions, medication',
  dietary_notes      TEXT                  DEFAULT NULL
                     COMMENT 'Food restrictions or preferences',
  emergency_contact  VARCHAR(120)          DEFAULT NULL,
  emergency_phone    VARCHAR(20)           DEFAULT NULL,
  is_active          TINYINT(1)   NOT NULL DEFAULT 1
                     COMMENT '0 = withdrawn / inactive',
  enrolled_at        DATE         NOT NULL DEFAULT (CURDATE()),
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                           ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (child_id),
  KEY fk_child_classroom_idx (classroom_id),

  CONSTRAINT fk_child_classroom
    FOREIGN KEY (classroom_id) REFERENCES classrooms (classroom_id)
    ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'Enrolled children profiles';

-- -----------------------------------------------------------------------------
-- TABLE: child_parent_link
-- Many-to-many: one child may have multiple guardians,
-- one parent account may have multiple children.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS child_parent_link (
  link_id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  child_id            INT UNSIGNED NOT NULL,
  parent_user_id      INT UNSIGNED NOT NULL,
  relationship        VARCHAR(40)  NOT NULL DEFAULT 'Parent'
                      COMMENT 'e.g. Mother, Father, Guardian',
  is_primary_contact  TINYINT(1)   NOT NULL DEFAULT 0,

  PRIMARY KEY (link_id),
  UNIQUE KEY uq_child_parent (child_id, parent_user_id),

  CONSTRAINT fk_link_child
    FOREIGN KEY (child_id) REFERENCES children (child_id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_link_parent
    FOREIGN KEY (parent_user_id) REFERENCES users (user_id)
    ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'Links children to their parent / guardian user accounts';

-- -----------------------------------------------------------------------------
-- TABLE: attendance_logs
-- One row per child per calendar day.
-- UNIQUE KEY on (child_id, attendance_date) enforces this constraint.
-- Use INSERT … ON DUPLICATE KEY UPDATE to mark or update attendance.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_logs (
  log_id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  child_id         INT UNSIGNED    NOT NULL,
  attendance_date  DATE            NOT NULL,
  status           ENUM('present','absent','late','excused') NOT NULL,
  check_in_time    TIME                     DEFAULT NULL,
  check_out_time   TIME                     DEFAULT NULL,
  marked_by        INT UNSIGNED             DEFAULT NULL
                   COMMENT 'user_id of the educator / director who recorded this',
  notes            VARCHAR(255)             DEFAULT NULL,
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (log_id),
  UNIQUE KEY uq_child_date    (child_id, attendance_date),
  KEY         idx_att_date    (attendance_date),
  KEY         fk_att_child_idx (child_id),

  CONSTRAINT fk_att_child
    FOREIGN KEY (child_id) REFERENCES children (child_id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_att_marked_by
    FOREIGN KEY (marked_by) REFERENCES users (user_id)
    ON DELETE SET NULL ON UPDATE CASCADE

) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'Daily attendance records — one row per child per day';

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- 5 classrooms (colours mirror the UI palette)
INSERT IGNORE INTO classrooms (name, max_capacity, color_tag) VALUES
  ('Sunflower',  10, '#2BB39B'),
  ('Rainbow',    10, '#82B3E1'),
  ('Butterfly',  10, '#F5B5CC'),
  ('Starfish',   10, '#FBB92A'),
  ('Dragonfly',  10, '#EB5E5A');

-- 20 children distributed across the 5 classrooms (4 per class)
INSERT IGNORE INTO children
  (first_name, last_name, date_of_birth, gender, classroom_id,
   dietary_notes, emergency_contact, emergency_phone, enrolled_at)
VALUES
  -- Sunflower (1)
  ('Lena',    'Farah',    '2021-03-15', 'F', 1, 'Nut allergy',     'Karim Farah',    '+213 550 111 001', '2024-09-01'),
  ('Youssef', 'Benali',   '2020-11-22', 'M', 1, NULL,              'Nadia Benali',   '+213 550 111 002', '2024-09-01'),
  ('Sara',    'Khelil',   '2021-07-04', 'F', 1, 'Lactose intol.', 'Amir Khelil',    '+213 550 111 003', '2024-09-01'),
  ('Omar',    'Mansour',  '2020-09-18', 'M', 1, NULL,              'Rima Mansour',   '+213 550 111 004', '2024-09-01'),
  -- Rainbow (2)
  ('Nour',    'Rahali',   '2021-02-28', 'F', 2, NULL,              'Salim Rahali',   '+213 550 222 001', '2024-09-01'),
  ('Adam',    'Bouzid',   '2020-12-10', 'M', 2, 'Gluten-free',    'Fatima Bouzid',  '+213 550 222 002', '2024-09-01'),
  ('Rania',   'Hadjadj',  '2021-05-15', 'F', 2, NULL,              'Tarik Hadjadj', '+213 550 222 003', '2024-09-01'),
  ('Karim',   'Mekki',    '2020-08-30', 'M', 2, NULL,              'Souad Mekki',   '+213 550 222 004', '2024-09-01'),
  -- Butterfly (3)
  ('Yasmine', 'Aouadi',   '2021-01-20', 'F', 3, NULL,              'Hamid Aouadi',  '+213 550 333 001', '2024-09-01'),
  ('Bilal',   'Cherif',   '2020-10-05', 'M', 3, 'Egg allergy',    'Leila Cherif',  '+213 550 333 002', '2024-09-01'),
  ('Amira',   'Boudiaf',  '2021-04-12', 'F', 3, NULL,              'Djamel Boudiaf','+213 550 333 003', '2024-09-01'),
  ('Ilyes',   'Saadi',    '2020-07-25', 'M', 3, NULL,              'Meriem Saadi',  '+213 550 333 004', '2024-09-01'),
  -- Starfish (4)
  ('Nadia',   'Benmahdi', '2021-06-08', 'F', 4, 'Dairy-free',     'Khaled Benmahdi','+213 550 444 001','2024-09-01'),
  ('Rafik',   'Belkadi',  '2020-06-14', 'M', 4, NULL,              'Amina Belkadi', '+213 550 444 002', '2024-09-01'),
  ('Leila',   'Hamidi',   '2021-08-19', 'F', 4, NULL,              'Mourad Hamidi', '+213 550 444 003', '2024-09-01'),
  ('Mehdi',   'Bensalem', '2020-05-23', 'M', 4, NULL,              'Karima Bensalem','+213 550 444 004','2024-09-01'),
  -- Dragonfly (5)
  ('Cylia',   'Yousfi',   '2021-09-02', 'F', 5, 'Nut allergy',    'Nadir Yousfi',  '+213 550 555 001', '2024-09-01'),
  ('Hicham',  'Gherbi',   '2020-04-17', 'M', 5, NULL,              'Soraya Gherbi', '+213 550 555 002', '2024-09-01'),
  ('Sabrina', 'Khaldi',   '2021-10-11', 'F', 5, NULL,              'Farid Khaldi',  '+213 550 555 003', '2024-09-01'),
  ('Amine',   'Djebbour', '2020-03-28', 'M', 5, NULL,              'Lynda Djebbour','+213 550 555 004', '2024-09-01');

-- Today's attendance — most present, a few absent / late
-- Uses a subquery so the Director's user_id is resolved dynamically
INSERT IGNORE INTO attendance_logs
  (child_id, attendance_date, status, check_in_time, marked_by)
SELECT
  c.child_id,
  CURDATE(),
  CASE c.child_id
    WHEN 3  THEN 'absent'   -- Sara Khelil
    WHEN 8  THEN 'late'     -- Karim Mekki
    WHEN 14 THEN 'absent'   -- Rafik Belkadi
    WHEN 19 THEN 'late'     -- Sabrina Khaldi
    ELSE         'present'
  END,
  CASE c.child_id
    WHEN 3  THEN NULL
    WHEN 14 THEN NULL
    WHEN 8  THEN '08:47:00'
    WHEN 19 THEN '09:03:00'
    WHEN 1  THEN '07:32:00'
    WHEN 2  THEN '07:41:00'
    WHEN 4  THEN '07:55:00'
    WHEN 5  THEN '07:29:00'
    WHEN 6  THEN '08:02:00'
    WHEN 7  THEN '07:50:00'
    WHEN 9  THEN '07:38:00'
    WHEN 10 THEN '07:44:00'
    WHEN 11 THEN '08:10:00'
    WHEN 12 THEN '07:58:00'
    WHEN 13 THEN '07:35:00'
    WHEN 15 THEN '07:52:00'
    WHEN 16 THEN '08:05:00'
    WHEN 17 THEN '07:48:00'
    WHEN 18 THEN '08:00:00'
    WHEN 20 THEN '07:43:00'
    ELSE         '07:45:00'
  END,
  (SELECT user_id FROM users WHERE role_id = 1 LIMIT 1)
FROM children c
WHERE c.is_active = 1;
