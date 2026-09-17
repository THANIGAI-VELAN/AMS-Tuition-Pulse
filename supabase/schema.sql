-- ====================================================================
-- TUITION PULSE - DATABASE SCHEMA & RLS POLICIES
-- PostgreSQL DDL for Supabase
-- ====================================================================

-- 1. EXTENSIONS & SETUP
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_cron for background 30-second scheduled processing (if available in Supabase project)
-- CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 2. TABLES DEFINITION

-- Table: students
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    class_name TEXT NOT NULL CHECK (class_name IN ('10th', '11th', '12th')),
    parent_phone TEXT NOT NULL,
    whatsapp_phone TEXT NOT NULL,
    school TEXT,
    joining_date DATE DEFAULT CURRENT_DATE,
    monthly_fee NUMERIC(10,2) DEFAULT 1500,
    fee_status TEXT DEFAULT 'PENDING' CHECK (fee_status IN ('PENDING', 'PAID', 'PARTIAL', 'OVERDUE')),
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Migration support: Ensure extended columns exist if table was previously created
ALTER TABLE public.students DROP COLUMN IF EXISTS parent_name;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10,2) DEFAULT 1500;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS fee_status TEXT DEFAULT 'PENDING';

-- Table: attendance
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('PRESENT', 'ABSENT')),
    marked_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_student_date UNIQUE (student_id, attendance_date)
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id UUID REFERENCES public.attendance(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    parent_phone TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Scheduled', 'Sent', 'Failed', 'Cancelled')),
    provider_message_id TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: fees (Schema reserved for future automation expansion)
CREATE TABLE IF NOT EXISTS public.fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year >= 2024),
    amount_due NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    payment_date DATE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'PARTIAL', 'OVERDUE')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_student_fee_month UNIQUE (student_id, month, year)
);

-- Table: class_groups (WhatsApp Group mapping for 10th, 11th, 12th)
CREATE TABLE IF NOT EXISTS public.class_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_name TEXT NOT NULL UNIQUE CHECK (class_name IN ('10th', '11th', '12th')),
    group_jid TEXT NOT NULL,
    group_name TEXT NOT NULL,
    invite_url TEXT,
    participant_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_name);
CREATE INDEX IF NOT EXISTS idx_students_active ON public.students(active);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_notifications_status_scheduled ON public.notifications(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_class_groups_class ON public.class_groups(class_name);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_groups ENABLE ROW LEVEL SECURITY;

-- Allow anon, authenticated, and service_role full access
DROP POLICY IF EXISTS "Allow authenticated admin full access to students" ON public.students;
DROP POLICY IF EXISTS "Allow anon and authenticated full access to students" ON public.students;
CREATE POLICY "Allow anon and authenticated full access to students" ON public.students
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated admin full access to attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow anon and authenticated full access to attendance" ON public.attendance;
CREATE POLICY "Allow anon and authenticated full access to attendance" ON public.attendance
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated admin full access to notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow anon and authenticated full access to notifications" ON public.notifications;
CREATE POLICY "Allow anon and authenticated full access to notifications" ON public.notifications
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated admin full access to fees" ON public.fees;
DROP POLICY IF EXISTS "Allow anon and authenticated full access to fees" ON public.fees;
CREATE POLICY "Allow anon and authenticated full access to fees" ON public.fees
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon and authenticated full access to class_groups" ON public.class_groups;
CREATE POLICY "Allow anon and authenticated full access to class_groups" ON public.class_groups
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- Enable service role access for Edge Functions
DROP POLICY IF EXISTS "Allow service role full access to notifications" ON public.notifications;
CREATE POLICY "Allow service role full access to notifications" ON public.notifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. INITIAL SETUP READY (NO DEFAULT MOCK DATA)
-- All student, attendance, and notification records will be created directly by Admin in the app and synced to Supabase.

