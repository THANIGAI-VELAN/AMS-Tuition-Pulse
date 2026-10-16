-- ====================================================================
-- TUITION PULSE - 10TH STANDARD STUDENTS BATCH INSERT
-- Total Students: 53 (29 Boys, 24 Girls)
-- Class: '10th' | Monthly Fee: 950 | Status: 'PENDING'
-- ====================================================================

-- Step 1: Ensure gender column exists before inserting
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'MALE' CHECK (gender IN ('MALE', 'FEMALE'));

-- Step 2: Insert 10th Standard Students
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
-- ====================================================================
-- MALE (29 Students)
-- ====================================================================
('Anand', '10th', 'MALE', '8610290973', '8610290973', 950, '2026-04-20', 'PENDING', false), -- Struck out
('Surjan', '10th', 'MALE', '9566602183', '9566602183', 950, '2026-06-04', 'PENDING', true),
('Akash', '10th', 'MALE', '8015851274', '8015851274', 950, '2026-06-04', 'PENDING', true),
('Rakshan', '10th', 'MALE', '8248311220', '8248311220', 950, '2026-06-08', 'PENDING', true),
('R. Nagavishnu', '10th', 'MALE', '9787883143', '9787883143', 950, '2026-06-08', 'PENDING', true),
('K. Kavin', '10th', 'MALE', '9659752933', '9659752933', 950, '2026-06-08', 'PENDING', true),
('Santhavel', '10th', 'MALE', '9698363689', '9698363689', 950, '2026-06-09', 'PENDING', true),
('Mouli', '10th', 'MALE', '8220293329', '8220293329', 950, '2026-06-09', 'PENDING', true),
('Rithishwaran', '10th', 'MALE', '9150560859', '9150560859', 950, '2026-06-12', 'PENDING', true),
('Kumaran', '10th', 'MALE', '9578288573', '9578288573', 950, '2026-06-15', 'PENDING', true),
('Soundharraj', '10th', 'MALE', '9342158609', '9342158609', 950, '2026-06-15', 'PENDING', true),
('Kishore', '10th', 'MALE', '9942722007', '9942722007', 950, '2026-06-18', 'PENDING', true),
('Giridharan', '10th', 'MALE', '9344313182', '9344313182', 950, '2026-06-23', 'PENDING', true),
('Praveen Kumar', '10th', 'MALE', '8870133498', '8870133498', 950, '2026-06-24', 'PENDING', true),
('Kabilar', '10th', 'MALE', '9047786031', '9047786031', 950, '2026-06-29', 'PENDING', true),
('Dhameshwaran', '10th', 'MALE', '7708602193', '7708602193', 950, '2026-07-01', 'PENDING', true),
('Boopathi', '10th', 'MALE', '8056829681', '8056829681', 950, '2026-07-01', 'PENDING', true),
('Vijayasoorian', '10th', 'MALE', '9861003924', '9861003924', 950, '2026-07-02', 'PENDING', true),
('Deepak', '10th', 'MALE', '7502396731', '7502396731', 950, '2026-07-02', 'PENDING', true),
('Prem', '10th', 'MALE', '9789783565', '9789783565', 950, '2026-07-02', 'PENDING', true),
('T. Sakthi', '10th', 'MALE', '8610726868', '8610726868', 950, '2026-07-05', 'PENDING', true),
('Prijil', '10th', 'MALE', '9629349609', '9080103922', 950, '2026-07-06', 'PENDING', true),
('Shamith', '10th', 'MALE', '7339024751', '7339024751', 950, '2026-07-24', 'PENDING', true),
('Raithik', '10th', 'MALE', '8526665398', '8526665398', 950, '2026-08-11', 'PENDING', true),
('Karthik', '10th', 'MALE', '6369986703', '6369986703', 950, '2026-08-12', 'PENDING', true),
('Kalep', '10th', 'MALE', '9788680071', '9788680071', 950, '2026-08-27', 'PENDING', true),
('Mukunthan', '10th', 'MALE', '9865070072', '9865070072', 950, '2026-09-01', 'PENDING', true),
('Loganathan', '10th', 'MALE', '9566350096', '9566350096', 950, '2026-09-02', 'PENDING', true),
('Gajendhran', '10th', 'MALE', '9940864363', '9940864363', 950, '2026-09-02', 'PENDING', true),

-- ====================================================================
-- FEMALE (24 Students)
-- ====================================================================
('Akashya P', '10th', 'FEMALE', '9344108408', '9344108408', 950, '2026-04-20', 'PENDING', true),
('Kavyat K H', '10th', 'FEMALE', '9551258664', '9551258664', 950, '2026-04-20', 'PENDING', true),
('Shafina Begam A', '10th', 'FEMALE', '7502214723', '7502214723', 950, '2026-04-20', 'PENDING', true),
('Kavin K', '10th', 'FEMALE', '9095554347', '9095554347', 950, '2026-04-20', 'PENDING', true),
('Dhusuvan', '10th', 'FEMALE', '9688313438', '9688313438', 950, '2026-04-20', 'PENDING', true),
('Dhivyannand', '10th', 'FEMALE', '9842986758', '9842986758', 950, '2026-04-20', 'PENDING', true),
('Gokila', '10th', 'FEMALE', '9698708061', '9698708061', 950, '2026-04-20', 'PENDING', true),
('Devi Krishnan', '10th', 'FEMALE', '6379130514', '9865094059', 950, '2026-04-20', 'PENDING', true),
('Shivabalan', '10th', 'FEMALE', '9942731747', '9942731747', 950, '2026-04-20', 'PENDING', true),
('Sre Harshini', '10th', 'FEMALE', '9976445599', '9976445599', 950, '2026-04-20', 'PENDING', true),
('Harshini', '10th', 'FEMALE', '9080559937', '9080559937', 950, '2026-04-20', 'PENDING', true),
('S. Sajitha', '10th', 'FEMALE', '9095478020', '9095478020', 950, '2026-06-04', 'PENDING', true),
('Akshaya', '10th', 'FEMALE', '7373576710', '7373576710', 950, '2026-06-05', 'PENDING', true),
('Prakasi Ravikrishnan', '10th', 'FEMALE', '6379130514', '9865094059', 950, '2026-06-08', 'PENDING', true),
('Sivaranjani', '10th', 'FEMALE', '9629770850', '9629770850', 950, '2026-06-08', 'PENDING', true),
('Gopika', '10th', 'FEMALE', '7200706907', '7200706907', 950, '2026-06-08', 'PENDING', true),
('Thamaraiselvi', '10th', 'FEMALE', '8973070390', '8973070390', 950, '2026-06-10', 'PENDING', true),
('Sousha', '10th', 'FEMALE', '9514959939', '9514959939', 950, '2026-06-22', 'PENDING', true),
('Gobika Sri', '10th', 'FEMALE', '8190042027', '8190042027', 950, '2026-07-01', 'PENDING', true),
('Ekath Sri', '10th', 'FEMALE', '9361907453', '9361907453', 950, '2026-07-02', 'PENDING', true),
('Vishalini', '10th', 'FEMALE', '7092862452', '7092862452', 950, '2026-07-07', 'PENDING', true),
('Kayalvizhi', '10th', 'FEMALE', '7339555158', '7339555158', 950, '2026-07-12', 'PENDING', true),
('Varsha', '10th', 'FEMALE', '8300120326', '8300120326', 950, '2026-07-24', 'PENDING', true),
('G. Renukha', '10th', 'FEMALE', '8825761431', '8825761431', 950, '2026-08-11', 'PENDING', true);
