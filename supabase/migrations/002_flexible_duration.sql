-- Allow custom durations between 5 and 60 minutes (was restricted to 30 or 60 only)
ALTER TABLE sessions DROP CONSTRAINT sessions_duration_minutes_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_duration_minutes_check
  CHECK (duration_minutes BETWEEN 5 AND 60);
