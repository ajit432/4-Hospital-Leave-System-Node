-- Migration: Add is_active field to leave_categories table
-- Date: 2024-01-XX
-- Description: Adds is_active field to track active/inactive status of leave categories

-- Add is_active column to leave_categories table
ALTER TABLE leave_categories 
ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 for active, 0 for inactive';

-- Update existing records to be active by default
UPDATE leave_categories SET is_active = 1 WHERE is_active IS NULL;

-- Add index for better performance on status filtering
CREATE INDEX idx_leave_categories_is_active ON leave_categories(is_active);

-- Add composite index for common queries
CREATE INDEX idx_leave_categories_status_name ON leave_categories(is_active, name);
