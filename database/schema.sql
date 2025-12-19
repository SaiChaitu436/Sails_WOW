-- Database: SAILS_WOW

-- =====================================================
-- 1. Employee Data Table
-- =====================================================

CREATE TABLE IF NOT EXISTS sails_employee_data (
    "Employee_Number" TEXT,
    "Employee_Name" TEXT,
    "Agreed_Band" TEXT,
    "Managers_Manager" TEXT,
    "Reporting_Manager" TEXT,
    "Department" TEXT,
    "Current_Account" TEXT,
    "Current_Cost_Center" TEXT,
    "Current_Designation" TEXT
);

-- =====================================================
-- 2. Assessment Tables
-- =====================================================

CREATE TABLE IF NOT EXISTS assessment_answers (
    id SERIAL PRIMARY KEY,
    employee_id TEXT NOT NULL,
    band TEXT NOT NULL,
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer_value TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assessment_answers_employee_band 
ON assessment_answers(employee_id, band);

CREATE INDEX IF NOT EXISTS idx_assessment_answers_category 
ON assessment_answers(category, employee_id);

CREATE TABLE IF NOT EXISTS assessment_results (
    id SERIAL PRIMARY KEY,
    employee_number TEXT NOT NULL,
    agreed_band TEXT NOT NULL,
    total_score DOUBLE PRECISION,
    category_scores JSONB,
    questions_answers JSONB,
    completed_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assessment_results_employee_band 
ON assessment_results(employee_number, agreed_band);

CREATE INDEX IF NOT EXISTS idx_assessment_results_completed_at 
ON assessment_results(completed_at);

-- =====================================================
-- 3. Band Question Tables
-- =====================================================
-- These tables store questions for each band level
-- Each table has the same structure: Band, Competency, Sub_Section, Question

-- BAND1
CREATE TABLE IF NOT EXISTS band1 (
    "Band" TEXT,
    "Competency" TEXT,
    "Sub_Section" TEXT,
    "Q.No" INTEGER,
    "Question" TEXT
);

-- BAND1A
CREATE TABLE IF NOT EXISTS band1A (
    "Band" TEXT,
    "Competency" TEXT,
    "Sub_Section" TEXT,
    "Q.No" INTEGER,
    "Question" TEXT
);

-- BAND1B
CREATE TABLE IF NOT EXISTS band1B (
    "Band" TEXT,
    "Competency" TEXT,
    "Sub_Section" TEXT,
    "Q.No" INTEGER,
    "Question" TEXT
);

-- BAND2A
CREATE TABLE IF NOT EXISTS band2A (
    "Band" TEXT,
    "Competency" TEXT,
    "Sub_Section" TEXT,
    "Q.No" INTEGER,
    "Question" TEXT
);

-- BAND2B
CREATE TABLE IF NOT EXISTS band2B (
    "Band" TEXT,
    "Competency" TEXT,
    "Sub_Section" TEXT,
    "Q.No" INTEGER,
    "Question" TEXT
);

-- BAND3A
CREATE TABLE IF NOT EXISTS band3A (
    "Band" TEXT,
    "Competency" TEXT,
    "Sub_Section" TEXT,
    "Q.No" INTEGER,
    "Question" TEXT
);

-- BAND3B
CREATE TABLE IF NOT EXISTS band3B (
    "Band" TEXT,
    "Competency" TEXT,
    "Sub_Section" TEXT,
    "Q.No" INTEGER,
    "Question" TEXT
);

-- BAND4A
CREATE TABLE IF NOT EXISTS band4A (
    "Band" TEXT,
    "Competency" TEXT,
    "Sub_Section" TEXT,
    "Q.No" TEXT,
    "Question" TEXT
);

-- BAND4B
CREATE TABLE IF NOT EXISTS band4B (
    "Band" TEXT,
    "Competency" TEXT,
    "Sub_Section" TEXT,
    "Q.No" INTEGER,
    "Question" TEXT
);

-- BAND5A
CREATE TABLE IF NOT EXISTS band5A (
    "Band" TEXT,
    "Competency" TEXT,
    "Sub_Section" TEXT,
    "Q.No" INTEGER,
    "Question" TEXT
);

-- BAND5B
CREATE TABLE IF NOT EXISTS band5B (
    "Band" TEXT,
    "Competency" TEXT,
    "Sub_Section" TEXT,
    "Q.No" INTEGER,
    "Question" TEXT
);

-- BAND6A
CREATE TABLE IF NOT EXISTS band6A (
    "Band" TEXT,
    "Competency" TEXT,
    "Sub_Section" TEXT,
    "Q.No" TEXT,
    "Question" TEXT,
    "f" INTEGER
);

-- BAND6B
CREATE TABLE IF NOT EXISTS band6B (
    "Band" TEXT,
    "Competency" TEXT,
    "Sub_Section" TEXT,
    "Q.No" TEXT,
    "Question" TEXT
);


-- =====================================================
-- Notes:
-- =====================================================
-- 1. assessment_answers: Stores ongoing assessment answers
--    - Data is moved to assessment_results when assessment is completed
--    - Data is deleted from assessment_answers after completion

-- 2. assessment_results: Stores completed assessment results
--    - Contains final scores, category scores, and all questions/answers
--    - questions_answers column stores JSONB with all Q&A pairs
--    - completed_at timestamp is used for 45-day cooldown calculation

-- 3. Band tables: Store question banks for each band level
--    - Questions are randomly selected (25 per sub-section)
--    - Competency field maps to main competencies in the frontend (Communication, Adaptability & Learning Agility, etc.)
--    - Sub_Section field contains the specific sub-categories (Task Ownership, Reliability & Follow-Through, etc.)
--    - Q.No field stores the question number
--    - Note: band6A has an additional "f" column (may be a data artifact)

-- 4. Indexes: Created for performance optimization on frequently queried columns
--    - assessment_answers: Indexed on (employee_id, band) and (category, employee_id)
--    - assessment_results: Indexed on (employee_number, agreed_band) and (completed_at)

-- =====================================================
-- Migration Notes:
-- =====================================================
-- The database uses "Sub_Section" in band tables (not "Category")
-- The assessment_answers table uses "category" to store the competency name
-- This is intentional as category in assessment_answers refers to the main competency
