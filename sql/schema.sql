-- =============================================================================
-- IDMS — Module 1: User & Access Management
-- Database Schema
-- Engine      : MySQL 8.x
-- Character Set: utf8mb4 (full Unicode + emoji-safe)
-- Collation   : utf8mb4_unicode_ci
-- =============================================================================

-- Create and select the database
CREATE DATABASE IF NOT EXISTS idms_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE idms_db;

-- -----------------------------------------------------------------------------
-- TABLE: roles
-- Purpose : Master lookup for the five IDMS stakeholder roles.
--           role_id is used as a foreign key in `users` to enforce referential
--           integrity and to drive RBAC middleware decisions.
-- Note    : Populated with seed data immediately after creation.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  role_id   TINYINT      UNSIGNED NOT NULL AUTO_INCREMENT,
  role_name VARCHAR(50)  NOT NULL,

  PRIMARY KEY (role_id),
  UNIQUE KEY uq_role_name (role_name)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Master lookup table for all IDMS stakeholder roles.';

-- Seed the five stakeholder roles defined in the SPMP.
-- INSERT IGNORE prevents duplicate-key errors on repeated schema runs.
INSERT IGNORE INTO roles (role_name) VALUES
  ('Director'),
  ('Educator'),
  ('Transport Coordinator'),
  ('Catering Staff'),
  ('Parent');

-- -----------------------------------------------------------------------------
-- TABLE: users
-- Purpose : Stores registered user accounts.
--           password_hash holds a bcrypt digest — plain-text passwords are
--           NEVER persisted.
--           role_id references the `roles` table; ON DELETE RESTRICT prevents
--           orphaned accounts if a role is ever removed.
--           is_active enables soft-deletion / account suspension without
--           destroying audit history.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id       INT          UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(180) NOT NULL,
  password_hash VARCHAR(255) NOT NULL  COMMENT 'bcrypt hash — never plain-text',
  role_id       TINYINT      UNSIGNED NOT NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '1=active, 0=suspended',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id),
  UNIQUE KEY uq_email (email),
  KEY fk_users_role_idx (role_id),

  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id)
    REFERENCES roles (role_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Registered IDMS user accounts with hashed credentials and role binding.';

-- -----------------------------------------------------------------------------
-- TABLE: audit_logs
-- Purpose : Immutable compliance trail required by the SPMP QA plan.
--           Every significant system mutation (login, role change, data write)
--           writes a row here via the logAction() utility.
--           user_id is nullable to support pre-authentication events
--           (e.g., failed login attempts with an unknown email).
--           ON DELETE SET NULL preserves the audit trail even if the
--           originating user account is later deactivated or removed.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  log_id        BIGINT       UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT          UNSIGNED         DEFAULT NULL
                             COMMENT 'NULL for unauthenticated events',
  action        VARCHAR(100) NOT NULL         COMMENT 'e.g. USER_LOGIN, USER_REGISTERED',
  target_module VARCHAR(80)  NOT NULL         COMMENT 'e.g. auth, transportation, catering',
  ip_address    VARCHAR(45)             DEFAULT NULL
                             COMMENT 'IPv4 or IPv6; 45 chars covers ::ffff:255.255.255.255',
  metadata      JSON                    DEFAULT NULL
                             COMMENT 'Optional structured context (role, endpoint, etc.)',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (log_id),
  KEY idx_audit_user   (user_id),
  KEY idx_audit_action (action),
  KEY idx_audit_ts     (created_at),

  CONSTRAINT fk_audit_user
    FOREIGN KEY (user_id)
    REFERENCES users (user_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable operational audit trail for SPMP regulatory compliance.';
