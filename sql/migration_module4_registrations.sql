-- =============================================================================
-- IDMS — Registration Workflow Migration
-- Extends children table with enrollment pipeline status.
--
-- Run AFTER migration_module2_children.sql
-- NOTE: Run exactly once per database instance.
--       Existing active children default to enrollment_status = 'active'.
-- =============================================================================

USE idms_db;

-- Add enrollment_status column (DEFAULT 'active' keeps all existing rows valid)
ALTER TABLE children
  ADD COLUMN enrollment_status
    ENUM('pending', 'approved', 'enrolled', 'active', 'rejected', 'withdrawn')
    NOT NULL DEFAULT 'active'
    COMMENT 'Registration pipeline: pending→approved→enrolled→active'
    AFTER is_active,
  ADD COLUMN rejection_reason
    VARCHAR(255) DEFAULT NULL
    COMMENT 'Director note explaining why the registration was rejected'
    AFTER enrollment_status;

-- Fix existing withdrawn children (is_active=0 means withdrawn in legacy data)
UPDATE children SET enrollment_status = 'withdrawn' WHERE is_active = 0;

-- Index for the registrations dashboard query (status-filtered lookups)
CREATE INDEX idx_children_enroll_status ON children (enrollment_status);
