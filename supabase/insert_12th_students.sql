-- ====================================================================
-- TUITION PULSE - 12TH STANDARD STUDENTS BATCH INSERT
-- Total Students: 52 (Boys & Girls)
-- Monthly Fee: 950 | Class: '12th' | Status: 'PENDING'
-- ====================================================================

-- Step 1: Ensure gender column exists before inserting
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'MALE' CHECK (gender IN ('MALE', 'FEMALE'));

-- Step 2: Insert 12th Standard Students
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
-- 04/06/2026
('Surjan', '12th', 'MALE', '9566602183', '9566602183', 950, '2026-06-04', 'PENDING', true),
('Ranjitha', '12th', 'FEMALE', '9659362504', '9659362504', 950, '2026-06-04', 'PENDING', true),

-- 05/06/2026
('Lekha Sri', '12th', 'FEMALE', '7373576710', '7373576710', 950, '2026-06-05', 'PENDING', true),

-- 08/06/2026
('Surya', '12th', 'MALE', '9080269258', '9080269258', 950, '2026-06-08', 'PENDING', true),
('Karthika', '12th', 'FEMALE', '9344721311', '9344721311', 950, '2026-06-08', 'PENDING', true),
('Dhanush', '12th', 'MALE', '9842788995', '9842788995', 950, '2026-06-08', 'PENDING', true),
('Arjun', '12th', 'MALE', '9080526699', '9080526699', 950, '2026-06-08', 'PENDING', true),
('Pugalendhi', '12th', 'MALE', '9360825270', '9360825270', 950, '2026-06-08', 'PENDING', true),

-- 09/06/2026
('Mouli', '12th', 'MALE', '9488393028', '9488393028', 950, '2026-06-09', 'PENDING', true),
('Dheena', '12th', 'MALE', '8610726868', '8610726868', 950, '2026-06-09', 'PENDING', true),
('Sanmathi', '12th', 'FEMALE', '9952702361', '9952702361', 950, '2026-06-09', 'PENDING', true),

-- 10/06/2026
('Santhosh', '12th', 'MALE', '9952621296', '9952621296', 950, '2026-06-10', 'PENDING', true),

-- 12/06/2026
('S. Gowtham', '12th', 'MALE', '9790285144', '9790285144', 950, '2026-06-12', 'PENDING', true),

-- 15/06/2026
('Dhivya', '12th', 'FEMALE', '6369761771', '6369761771', 950, '2026-06-15', 'PENDING', true),
('Prabha', '12th', 'FEMALE', '9629200060', '9629200060', 950, '2026-06-15', 'PENDING', true),

-- 16/06/2026
('K. Ganesh', '12th', 'MALE', '9629761901', '9629761901', 950, '2026-06-16', 'PENDING', true),
('M. Kumaravel', '12th', 'MALE', '8838900752', '8838900752', 950, '2026-06-16', 'PENDING', true),

-- 19/06/2026
('Parekshith', '12th', 'MALE', '9790181938', '9790181938', 950, '2026-06-19', 'PENDING', true),

-- 22/06/2026
('Nantheesh', '12th', 'MALE', '9865363536', '9865363536', 950, '2026-06-22', 'PENDING', true),

-- 24/06/2026
('Gopika', '12th', 'FEMALE', '9095522012', '9095522012', 950, '2026-06-24', 'PENDING', true),
('Aravind', '12th', 'MALE', '9500630658', '9500630658', 950, '2026-06-24', 'PENDING', true),
('Karthick', '12th', 'MALE', '9842775113', '9842775113', 950, '2026-06-24', 'PENDING', true),

-- 27/06/2026
('Shanmugavel', '12th', 'MALE', '9842837575', '9842837575', 950, '2026-06-27', 'PENDING', true),

-- 29/06/2026
('Sri Ramu', '12th', 'MALE', '8526262610', '8526262610', 950, '2026-06-29', 'PENDING', true),
('S. Gokul', '12th', 'MALE', '9976057315', '9976057315', 950, '2026-06-29', 'PENDING', true),

-- 30/06/2026
('Nithish', '12th', 'MALE', '9092555575', '9092555575', 950, '2026-06-30', 'PENDING', true),
('Poovarasi', '12th', 'FEMALE', '8526064439', '8526064439', 950, '2026-06-30', 'PENDING', true),

-- 11/07/2026
('K. Praveena', '12th', 'FEMALE', '9659599414', '9659599414', 950, '2026-07-11', 'PENDING', true),
('Gomedhagan', '12th', 'MALE', '7695934854', '7695934854', 950, '2026-07-11', 'PENDING', true),
('Boopathi', '12th', 'MALE', '8056829681', '8056829681', 950, '2026-07-11', 'PENDING', true),
('Mohan Kumar', '12th', 'MALE', '6369907874', '6369907874', 950, '2026-07-11', 'PENDING', true),
('Dinesh', '12th', 'MALE', '7904905142', '7904905142', 950, '2026-07-11', 'PENDING', true),

-- 13/07/2026
('Deepan', '12th', 'MALE', '9698922471', '9698922471', 950, '2026-07-13', 'PENDING', true),

-- 05/08/2026
('Kaviya', '12th', 'FEMALE', '9842489611', '9842489611', 950, '2026-08-05', 'PENDING', true),
('Jaishree', '12th', 'FEMALE', '9629210134', '9629210134', 950, '2026-08-05', 'PENDING', true),

-- 11/08/2026
('Kaviyasri', '12th', 'FEMALE', '9865063760', '9865063760', 950, '2026-08-11', 'PENDING', true),

-- 12/08/2026
('Hariprasad', '12th', 'MALE', '8754374252', '8754374252', 950, '2026-08-12', 'PENDING', true),
('Pradeep', '12th', 'MALE', '8610879550', '8610879550', 950, '2026-08-12', 'PENDING', true),

-- 17/08/2026
('Sathana', '12th', 'FEMALE', '9360848886', '9360848886', 950, '2026-08-17', 'PENDING', true),

-- 11/09/2026
('Kavin', '12th', 'MALE', '6380747678', '6380747678', 950, '2026-09-11', 'PENDING', true),

-- 08/04/2026
('Nithya Sri', '12th', 'FEMALE', '9245253507', '9245253507', 950, '2026-04-08', 'PENDING', true),
('Vasanth', '12th', 'MALE', '9952214824', '9952214824', 950, '2026-04-08', 'PENDING', true),
('Praveena', '12th', 'FEMALE', '7848307036', '7848307036', 950, '2026-04-08', 'PENDING', true),
('Sara', '12th', 'FEMALE', '6374859595', '6374859595', 950, '2026-04-08', 'PENDING', true),
('Indrish', '12th', 'MALE', '7200706907', '7200706907', 950, '2026-04-08', 'PENDING', true),
('Vignesh', '12th', 'MALE', '9715880467', '9715880467', 950, '2026-04-08', 'PENDING', true),
('Yogesh', '12th', 'MALE', '9384412375', '9384412375', 950, '2026-04-08', 'PENDING', true),

-- 09/04/2026
('Nathiya', '12th', 'FEMALE', '8973878694', '8973878694', 950, '2026-04-09', 'PENDING', true),
('Bharat', '12th', 'MALE', '8883075148', '8883075148', 950, '2026-04-09', 'PENDING', true),

-- 13/04/2026
('Thiru', '12th', 'MALE', '9842040021', '9842040021', 950, '2026-04-13', 'PENDING', true),

-- 10/05/2026
('S. Srigayathri', '12th', 'FEMALE', '9655179438', '9655179438', 950, '2026-05-10', 'PENDING', true),
('S. Manjula', '12th', 'FEMALE', '7603876165', '7603876165', 950, '2026-05-10', 'PENDING', true);

-- Step 3: Verify the inserted students
SELECT count(*), gender FROM public.students WHERE class_name = '12th' GROUP BY gender;
