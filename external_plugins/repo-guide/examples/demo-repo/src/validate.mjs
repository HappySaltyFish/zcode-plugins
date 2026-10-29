// Classroom fixture: validate a task name before accepting a new task.
export function validateTask(input) {
  if (typeof input !== 'string') return { ok: false, reason: 'Expected text' };
  const value = input.trim();
  if (!value) return { ok: false, reason: 'Task cannot be empty' };
  if (value.length > 80) return { ok: false, reason: 'Task is too long' };
  return { ok: true, value };
}
