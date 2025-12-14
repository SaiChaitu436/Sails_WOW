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
-- 2. Assessment Answers Table (Ongoing Assessments)
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

-- =====================================================
-- 3. Assessment Results Table (Completed Assessments)
-- =====================================================
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
-- 4. Band Question Tables
-- =====================================================
-- These tables store questions for each band level
-- Each table has the same structure: Band, Category, Question

-- Band 1
CREATE TABLE IF NOT EXISTS band1 (
    "Band" TEXT,
    "Category" TEXT,
    "Question" TEXT
);

-- Band 1A
CREATE TABLE IF NOT EXISTS band1A (
    "Band" TEXT,
    "Category" TEXT,
    "Question" TEXT
);

-- Band 1B
CREATE TABLE IF NOT EXISTS band1B (
    "Band" TEXT,
    "Category" TEXT,
    "Question" TEXT
);

-- Band 2A
CREATE TABLE IF NOT EXISTS band2A (
    "Band" TEXT,
    "Category" TEXT,
    "Question" TEXT
);

-- Band 2B
CREATE TABLE IF NOT EXISTS band2B (
    "Band" TEXT,
    "Category" TEXT,
    "Question" TEXT
);

-- Band 3A
CREATE TABLE IF NOT EXISTS band3A (
    "Band" TEXT,
    "Category" TEXT,
    "Question" TEXT
);

-- Band 3B
CREATE TABLE IF NOT EXISTS band3B (
    "Band" TEXT,
    "Category" TEXT,
    "Question" TEXT
);

-- Band 4A
CREATE TABLE IF NOT EXISTS band4A (
    "Band" TEXT,
    "Category" TEXT,
    "Question" TEXT
);

-- Band 4B
CREATE TABLE IF NOT EXISTS band4B (
    "Band" TEXT,
    "Category" TEXT,
    "Question" TEXT
);

-- Band 5A
CREATE TABLE IF NOT EXISTS band5A (
    "Band" TEXT,
    "Category" TEXT,
    "Question" TEXT
);

-- Band 5B
CREATE TABLE IF NOT EXISTS band5B (
    "Band" TEXT,
    "Category" TEXT,
    "Question" TEXT
);

-- Band 6A
CREATE TABLE IF NOT EXISTS band6A (
    "Band" TEXT,
    "Category" TEXT,
    "Question" TEXT
);

-- Band 6B
CREATE TABLE IF NOT EXISTS band6B (
    "Band" TEXT,
    "Category" TEXT,
    "Question" TEXT
);

-- =====================================================
-- Notes:
-- =====================================================
-- 1. assessment_answers: Stores ongoing assessment answers
--    - Data is moved to assessment_results when assessment is completed
--    - Data is deleted from assessment_answers after completion
--
-- 2. assessment_results: Stores completed assessment results
--    - Contains final scores, category scores, and all questions/answers
--    - questions_answers column stores JSONB with all Q&A pairs
--    - completed_at timestamp is used for 45-day cooldown calculation
--
-- 3. Band tables: Store question banks for each band level
--    - Questions are randomly selected (25 per category)
--    - Categories map to competencies in the frontend
--
-- 4. Indexes: Created for performance optimization on frequently queried columns
--
-- =====================================================
-- Migration Scripts (if needed):
-- =====================================================

-- If questions_answers column doesn't exist in assessment_results:
-- ALTER TABLE assessment_results ADD COLUMN IF NOT EXISTS questions_answers JSONB;

-- =====================================================

