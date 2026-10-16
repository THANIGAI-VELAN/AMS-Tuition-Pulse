-- ====================================================================
-- TUITION PULSE - 1ST-8TH & 9TH STANDARD STUDENTS BATCH INSERT
-- Total: 44 Students (25 in 1st-8th Std, 19 in 9th Std)
-- Monthly Fee: 950 | Status: 'PENDING'
-- ====================================================================

-- Step 1: Ensure gender column exists before inserting
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'MALE' CHECK (gender IN ('MALE', 'FEMALE'));

-- Step 2: Insert 1st - 8th Standard Students (25 Students)
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
-- 1st - 8th Standard Students
('Rethusna', '1st-8th', 'FEMALE', '9791721521', '9791721521', 950, '2026-04-16', 'PENDING', true),
('Sabarivel', '1st-8th', 'MALE', '8056994359', '8056994359', 950, '2026-06-04', 'PENDING', true),
('Infiya', '1st-8th', 'FEMALE', '9787567209', '9787567209', 950, '2026-06-04', 'PENDING', true),
('Nidhesh', '1st-8th', 'MALE', '9047291506', '9047291506', 950, '2026-06-04', 'PENDING', true),
('Dharaneesh', '1st-8th', 'MALE', '9095554347', '9095554347', 950, '2026-06-04', 'PENDING', true),
('Santhosh Sudan', '1st-8th', 'MALE', '9688716147', '9688716147', 950, '2026-06-08', 'PENDING', true),
('Dharanesh', '1st-8th', 'MALE', '9342058258', '9342058258', 950, '2026-06-08', 'PENDING', true),
('Pavisri', '1st-8th', 'FEMALE', '7598313421', '7598313421', 950, '2026-06-09', 'PENDING', true),
('Sarvesh', '1st-8th', 'MALE', '8667427831', '8667427831', 950, '2026-06-09', 'PENDING', true),
('Kanish Kavin', '1st-8th', 'MALE', '9994682728', '9994682728', 950, '2026-06-30', 'PENDING', true),
('Chitrita', '1st-8th', 'FEMALE', '9865740876', '9865740876', 950, '2026-06-30', 'PENDING', true),
('Nikul Singh', '1st-8th', 'MALE', '7849982439', '7849982439', 950, '2026-07-01', 'PENDING', true),
('Sabarish', '1st-8th', 'MALE', '9842146624', '9842146624', 950, '2026-07-02', 'PENDING', true),
('Manvendra Singh', '1st-8th', 'MALE', '7849982439', '7849982439', 950, '2026-07-09', 'PENDING', true),
('Harshita', '1st-8th', 'FEMALE', '9865019585', '9865019585', 950, '2026-07-15', 'PENDING', true),
('Hari Vardhan', '1st-8th', 'MALE', '9715123501', '9715123501', 950, '2026-07-20', 'PENDING', true),
('Kavin Raj', '1st-8th', 'MALE', '9715123501', '9715123501', 950, '2026-07-21', 'PENDING', true),
('Sanidhya', '1st-8th', 'FEMALE', '8874074175', '8874074175', 950, '2026-07-23', 'PENDING', true),
('Shivansh', '1st-8th', 'MALE', '8874074175', '8874074175', 950, '2026-07-23', 'PENDING', true),
('Sri Sarvesh', '1st-8th', 'MALE', '7200149509', '7200149509', 950, '2026-07-30', 'PENDING', true),
('Vaishali', '1st-8th', 'FEMALE', '9994280327', '9994280327', 950, '2026-08-05', 'PENDING', true),
('Sujith', '1st-8th', 'MALE', '9965418471', '9965418471', 950, '2026-08-10', 'PENDING', true),
('Shri Saran', '1st-8th', 'MALE', '9629842131', '9629842131', 950, '2026-09-01', 'PENDING', true),
('Durkish', '1st-8th', 'MALE', '8220591472', '8220591472', 950, '2026-09-04', 'PENDING', true),
('Ritikish', '1st-8th', 'MALE', '9043985219', '9043985219', 950, '2026-09-21', 'PENDING', true),

-- Step 3: Insert 9th Standard Students (19 Students)
('Guhan', '9th', 'MALE', '9487009700', '9487009700', 950, '2026-06-02', 'PENDING', true),
('Mydheesh', '9th', 'MALE', '6380170903', '6380170903', 950, '2026-06-02', 'PENDING', true),
('Samitha', '9th', 'FEMALE', '9361226750', '9361226750', 950, '2026-06-04', 'PENDING', true),
('Sathursan', '9th', 'MALE', '9965867036', '9965867036', 950, '2026-06-04', 'PENDING', true),
('Sivadhanush', '9th', 'MALE', '8667335120', '8667335120', 950, '2026-06-08', 'PENDING', true),
('Dhanastesh', '9th', 'MALE', '9965066304', '9965066304', 950, '2026-06-08', 'PENDING', true),
('Susila', '9th', 'FEMALE', '8973070390', '8973070390', 950, '2026-06-10', 'PENDING', true),
('Haritha', '9th', 'FEMALE', '9787567208', '9787567208', 950, '2026-06-27', 'PENDING', true),
('Ruban', '9th', 'MALE', '9943542882', '9943542882', 950, '2026-06-30', 'PENDING', true),
('Poovarashi', '9th', 'FEMALE', '8825644905', '8825644905', 950, '2026-07-01', 'PENDING', true),
('Prithanya', '9th', 'FEMALE', '9042234090', '9042234090', 950, '2026-07-13', 'PENDING', true),
('Dhanya Sri', '9th', 'FEMALE', '8667796822', '8667796822', 950, '2026-07-13', 'PENDING', true),
('Mohan Prasath', '9th', 'MALE', '8838734472', '8838734472', 950, '2026-07-14', 'PENDING', true),
('Dharesh', '9th', 'MALE', '9384412375', '9384412375', 950, '2026-07-21', 'PENDING', true),
('Sreeya', '9th', 'FEMALE', '6374568657', '6374568657', 950, '2026-08-17', 'PENDING', true),
('Tamilarasi', '9th', 'FEMALE', '9750111982', '9750111982', 950, '2026-08-27', 'PENDING', true),
('Saptharan', '9th', 'MALE', '8682864256', '8682864256', 950, '2026-09-15', 'PENDING', true),
('Keerthika', '9th', 'FEMALE', '7339697656', '7339697656', 950, '2026-09-18', 'PENDING', true),
('V. Guhan', '9th', 'MALE', '9865890471', '9865890471', 950, '2026-09-19', 'PENDING', true);
