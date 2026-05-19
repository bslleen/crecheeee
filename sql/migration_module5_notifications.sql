-- =============================================================================
-- IDMS — Notifications & Review Audit Migration
--
-- Adds:
--   1. notifications table (in-app inbox for parents & staff)
--   2. children.reviewed_by   — director who last approved/rejected
--   3. children.reviewed_at   — when the review happened
--
-- Run AFTER migration_module4_registrations.sql.
-- Safe to re-run: all DDL uses IF NOT EXISTS guards (see note below).
-- NOTE: MySQL 8 does not support `ADD COLUMN IF NOT EXISTS`, so the ALTER
--       below will error on the second run. That's intentional — these
--       migrations are run once per database instance.
-- =============================================================================

USE idms_db;

-- -----------------------------------------------------------------------------
-- TABLE: notifications
-- One row per delivered notification. Recipients are users.user_id; the kind
-- column drives the icon/colour in the UI. Related entities (e.g. child_id)
-- are stored in metadata JSON to keep the table schema-stable across modules.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  notification_id  BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  recipient_id     INT UNSIGNED     NOT NULL
                   COMMENT 'FK → users.user_id (the parent or staff member being notified)',
  kind             VARCHAR(40)      NOT NULL
                   COMMENT 'e.g. registration_approved, registration_rejected, registration_enrolled, registration_activated, registration_submitted, registration_withdrawn, registration_resubmitted',
  title            VARCHAR(160)     NOT NULL,
  body             VARCHAR(500)             DEFAULT NULL,
  metadata         JSON                     DEFAULT NULL
                   COMMENT 'Structured context, e.g. { childId, classroomName, reason }',
  is_read          TINYINT(1)       NOT NULL DEFAULT 0,
  read_at          DATETIME                 DEFAULT NULL,
  created_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (notification_id),
  KEY idx_notif_recipient_unread (recipient_id, is_read, created_at),
  KEY idx_notif_kind             (kind),

  CONSTRAINT fk_notif_recipient
    FOREIGN KEY (recipient_id) REFERENCES users (user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'In-app notifications inbox — populated by registration workflow.';

-- -----------------------------------------------------------------------------
-- Reviewer attribution on children
-- reviewed_by  → users.user_id of the director who approved or rejected
-- reviewed_at  → timestamp of the latest review action
-- Both are nullable: pre-existing children predate the workflow.
-- -----------------------------------------------------------------------------
ALTER TABLE children
  ADD COLUMN reviewed_by INT UNSIGNED DEFAULT NULL
    COMMENT 'Director (user_id) who last approved/rejected this registration'
    AFTER rejection_reason,
  ADD COLUMN reviewed_at DATETIME DEFAULT NULL
    COMMENT 'Timestamp of the latest approve/reject action'
    AFTER reviewed_by,
  ADD CONSTRAINT fk_child_reviewed_by
    FOREIGN KEY (reviewed_by) REFERENCES users (user_id)
    ON DELETE SET NULL ON UPDATE CASCADE;
