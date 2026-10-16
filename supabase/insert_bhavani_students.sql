-- ====================================================================
-- TUITION PULSE - BHAVANI BRANCH STUDENTS BATCH INSERT
-- Total Students: 31 (All Students Under Bhavani Branch)
-- Monthly Fee: 950 | Class: 'Bhavani' | Status: 'PENDING'
-- ====================================================================

-- Step 1: Ensure gender column exists before inserting
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'MALE' CHECK (gender IN ('MALE', 'FEMALE'));

-- Step 2: Ensure check constraint allows 'Bhavani'
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_class_name_check;
ALTER TABLE public.students ADD CONSTRAINT students_class_name_check 
CHECK (class_name IN ('1st-8th', '9th', '10th', '11th', '12th', 'Bhavani'));

-- Step 3: Insert Bhavani Branch Students
INSERT INTO public.students (
    name,
    class_name,
    gender,
    parent_phone,
    whatsapp_phone,
    monthly_fee,
    joining_date,
    fee_status,
    active
) VALUES
-- Boys
('Sanjay', 'Bhavani', 'MALE', '8807780657', '8807780657', 950, '2026-05-02', 'PENDING', true),
('Sujith', 'Bhavani', 'MALE', '6383886116', '6383886116', 950, '2026-06-11', 'PENDING', true),
('Yaswanth', 'Bhavani', 'MALE', '8248278605', '8248278605', 950, '2026-06-18', 'PENDING', true),
('Kavin', 'Bhavani', 'MALE', '98420547824', '98420547824', 950, '2026-06-15', 'PENDING', true),
('Gugan', 'Bhavani', 'MALE', '9940813162', '9940813162', 950, '2026-06-29', 'PENDING', true),
('Pradeesh', 'Bhavani', 'MALE', '8438351175', '8438351175', 950, '2026-04-20', 'PENDING', true),
('Muthish', 'Bhavani', 'MALE', '8508023134', '8508023134', 950, '2026-06-05', 'PENDING', true),
('Ramana', 'Bhavani', 'MALE', '8056279966', '8056279966', 950, '2026-08-05', 'PENDING', true),
('Kishore', 'Bhavani', 'MALE', '9976874086', '9976874086', 950, '2026-09-08', 'PENDING', true),
('Muguthan', 'Bhavani', 'MALE', '95782627164', '95782627164', 950, '2026-06-08', 'PENDING', true),
('Dhanish', 'Bhavani', 'MALE', '9994178255', '9994178255', 950, '2026-04-22', 'PENDING', true),
('Mohamed Afsan', 'Bhavani', 'MALE', '6383539146', '6383539146', 950, '2026-06-15', 'PENDING', true),
('Vyas', 'Bhavani', 'MALE', '9659278811', '9659278811', 950, '2026-07-04', 'PENDING', true),
('Santhosh', 'Bhavani', 'MALE', '9942931755', '9942931755', 950, '2026-06-09', 'PENDING', true),
('Prathish', 'Bhavani', 'MALE', '9994463097', '9994463097', 950, '2026-08-31', 'PENDING', true),
('Mugil', 'Bhavani', 'MALE', '8883618635', '8883618635', 950, '2026-06-17', 'PENDING', true),

-- Girls
('Ilakya', 'Bhavani', 'FEMALE', '8042118924', '8042118924', 950, '2026-06-04', 'PENDING', true),
('Indhuja', 'Bhavani', 'FEMALE', '6380319877', '6380319877', 950, '2026-06-14', 'PENDING', true),
('Pugalmani', 'Bhavani', 'FEMALE', '9944239417', '9944239417', 950, '2026-06-17', 'PENDING', true),
('Selvi', 'Bhavani', 'FEMALE', '8072877896', '8072877896', 950, '2026-06-16', 'PENDING', true),
('Vaishnavi', 'Bhavani', 'FEMALE', '7502210204', '7502210204', 950, '2026-07-08', 'PENDING', true),
('Mithuna', 'Bhavani', 'FEMALE', '9344390833', '9344390833', 950, '2026-06-21', 'PENDING', true),
('Tanusri', 'Bhavani', 'FEMALE', '8680976779', '8680976779', 950, '2026-06-09', 'PENDING', true),
('Dhanusri', 'Bhavani', 'FEMALE', '6381836158', '6381836158', 950, '2026-05-01', 'PENDING', true),
('Devadharshini', 'Bhavani', 'FEMALE', '6369411006', '6369411006', 950, '2026-05-15', 'PENDING', true),
('Swathi', 'Bhavani', 'FEMALE', '7904345595', '7904345595', 950, '2026-06-08', 'PENDING', true),
('Keerthika', 'Bhavani', 'FEMALE', '8015532784', '8015532784', 950, '2026-06-08', 'PENDING', true),
('Pavithra', 'Bhavani', 'FEMALE', '8975411083', '8975411083', 950, '2026-07-13', 'PENDING', true),
('Dhanushka', 'Bhavani', 'FEMALE', '8012681788', '8012681788', 950, '2026-07-16', 'PENDING', true),
('Vijaya Sri', 'Bhavani', 'FEMALE', '9994463097', '7200414751', 950, '2026-08-17', 'PENDING', true),
('Hari', 'Bhavani', 'FEMALE', '', '', 950, '2026-08-11', 'PENDING', true);
