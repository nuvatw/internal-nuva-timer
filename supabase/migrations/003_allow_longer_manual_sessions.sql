-- Allow manual entries up to 8 hours (was max 60 minutes)
ALTER TABLE sessions DROP CONSTRAINT sessions_duration_minutes_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_duration_minutes_check
  CHECK (duration_minutes BETWEEN 5 AND 480);
