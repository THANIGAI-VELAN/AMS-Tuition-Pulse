-- ====================================================================
-- MIGRATION: ADD GENDER COLUMN TO STUDENTS TABLE
-- Run this in your Supabase Dashboard -> SQL Editor -> Run
-- ====================================================================

-- 1. Add gender column with default 'MALE' and CHECK constraint
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'MALE' CHECK (gender IN ('MALE', 'FEMALE'));

-- 2. Update any existing NULL gender rows to 'MALE'
UPDATE public.students 
SET gender = 'MALE' 
WHERE gender IS NULL;

-- 3. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_students_gender ON public.students(gender);

-- 4. Verify the column is added
SELECT id, name, class_name, gender, parent_phone FROM public.students LIMIT 5;
