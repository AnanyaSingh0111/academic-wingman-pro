ALTER TABLE public.study_tasks
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS ai_instructions text,
  ADD COLUMN IF NOT EXISTS learning_objective text,
  ADD COLUMN IF NOT EXISTS exam_id uuid REFERENCES public.exams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false;