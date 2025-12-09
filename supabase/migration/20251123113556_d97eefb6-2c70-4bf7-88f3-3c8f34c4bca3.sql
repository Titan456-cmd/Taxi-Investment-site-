-- Fix: Add INSERT policy for profiles (handled by trigger, but allow for manual inserts)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
