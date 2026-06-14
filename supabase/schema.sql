-- Enable uuid-ossp extension for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- 1. USERS TABLE (profile linked to auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SETTINGS TABLE
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  theme TEXT NOT NULL DEFAULT 'system',
  unit_system TEXT NOT NULL DEFAULT 'metric',
  reminder_morning_time TIME,
  reminder_evening_time TIME,
  is_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. WORKOUT PLANS TABLE
CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. WORKOUT DAYS TABLE
CREATE TABLE public.workout_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  day_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. EXERCISES TABLE
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workout_day_id UUID NOT NULL REFERENCES public.workout_days(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'strength',
  target_muscle_group TEXT,
  exercise_order INTEGER NOT NULL,
  notes TEXT,
  target_sets INTEGER NOT NULL DEFAULT 3,
  min_reps INTEGER NOT NULL DEFAULT 8,
  max_reps INTEGER NOT NULL DEFAULT 12,
  cardio_duration_minutes INTEGER,
  target_weight DECIMAL(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. WORKOUT LOGS TABLE
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workout_day_id UUID REFERENCES public.workout_days(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. EXERCISE SETS TABLE
CREATE TABLE public.exercise_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workout_log_id UUID NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  set_order INTEGER NOT NULL,
  weight DECIMAL(10, 2),
  reps INTEGER,
  rpe DECIMAL(3, 1),
  is_completed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. PERSONAL RECORDS TABLE
CREATE TABLE public.personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  pr_type TEXT NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workout_log_id UUID REFERENCES public.workout_logs(id) ON DELETE SET NULL,
  exercise_set_id UUID REFERENCES public.exercise_sets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. CARDIO LOGS TABLE
CREATE TABLE public.cardio_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workout_log_id UUID REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  distance DECIMAL(10, 2),
  duration_seconds INTEGER NOT NULL,
  calories_burned INTEGER,
  intensity TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. BODY MEASUREMENTS TABLE
CREATE TABLE public.body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  weight DECIMAL(5, 2),
  body_fat_percentage DECIMAL(4, 2),
  neck DECIMAL(5, 2),
  chest DECIMAL(5, 2),
  bicep_left DECIMAL(5, 2),
  bicep_right DECIMAL(5, 2),
  forearm_left DECIMAL(5, 2),
  forearm_right DECIMAL(5, 2),
  waist DECIMAL(5, 2),
  hips DECIMAL(5, 2),
  thigh_left DECIMAL(5, 2),
  thigh_right DECIMAL(5, 2),
  calf_left DECIMAL(5, 2),
  calf_right DECIMAL(5, 2),
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. PROGRESS PHOTOS TABLE
CREATE TABLE public.progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL DEFAULT 'front',
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardio_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Set up RLS Policies

-- Users
CREATE POLICY "Users can read own record" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own record" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Settings
CREATE POLICY "Users can read own settings" ON public.settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON public.settings FOR DELETE USING (auth.uid() = user_id);

-- Workout Plans
CREATE POLICY "Users can read own plans" ON public.workout_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plans" ON public.workout_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON public.workout_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON public.workout_plans FOR DELETE USING (auth.uid() = user_id);

-- Workout Days
CREATE POLICY "Users can read own days" ON public.workout_days FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own days" ON public.workout_days FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own days" ON public.workout_days FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own days" ON public.workout_days FOR DELETE USING (auth.uid() = user_id);

-- Exercises
CREATE POLICY "Users can read own exercises" ON public.exercises FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exercises" ON public.exercises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exercises" ON public.exercises FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own exercises" ON public.exercises FOR DELETE USING (auth.uid() = user_id);

-- Workout Logs
CREATE POLICY "Users can read own logs" ON public.workout_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.workout_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON public.workout_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON public.workout_logs FOR DELETE USING (auth.uid() = user_id);

-- Exercise Sets
CREATE POLICY "Users can read own sets" ON public.exercise_sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sets" ON public.exercise_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sets" ON public.exercise_sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sets" ON public.exercise_sets FOR DELETE USING (auth.uid() = user_id);

-- Personal Records
CREATE POLICY "Users can read own PRs" ON public.personal_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own PRs" ON public.personal_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own PRs" ON public.personal_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own PRs" ON public.personal_records FOR DELETE USING (auth.uid() = user_id);

-- Cardio Logs
CREATE POLICY "Users can read own cardio logs" ON public.cardio_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cardio logs" ON public.cardio_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cardio logs" ON public.cardio_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cardio logs" ON public.cardio_logs FOR DELETE USING (auth.uid() = user_id);

-- Body Measurements
CREATE POLICY "Users can read own measurements" ON public.body_measurements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own measurements" ON public.body_measurements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own measurements" ON public.body_measurements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own measurements" ON public.body_measurements FOR DELETE USING (auth.uid() = user_id);

-- Progress Photos
CREATE POLICY "Users can read own photos" ON public.progress_photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own photos" ON public.progress_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own photos" ON public.progress_photos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own photos" ON public.progress_photos FOR DELETE USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);


-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON public.workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_days_user_id ON public.workout_days(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_days_plan_id ON public.workout_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON public.exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_workout_day_id ON public.exercises(workout_day_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON public.workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_workout_day_id ON public.workout_logs(workout_day_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_user_id ON public.exercise_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_workout_log_id ON public.exercise_sets(workout_log_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_exercise_id ON public.exercise_sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_user_id ON public.personal_records(user_id);
CREATE INDEX IF NOT EXISTS idx_cardio_logs_user_id ON public.cardio_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_cardio_logs_workout_log_id ON public.cardio_logs(workout_log_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_id ON public.body_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_measured_at ON public.body_measurements(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_id ON public.progress_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_taken_at ON public.progress_photos(taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON public.notifications(scheduled_for);


-- Apply updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.workout_plans FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.workout_days FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.workout_logs FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.exercise_sets FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.personal_records FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cardio_logs FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.body_measurements FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.progress_photos FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


-- Trigger for auto-profile creation on auth.users sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.settings (user_id, theme, unit_system, is_notifications_enabled)
  VALUES (new.id, 'system', 'metric', TRUE);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
