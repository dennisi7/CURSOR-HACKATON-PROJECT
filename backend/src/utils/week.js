// Shared week-boundary helper so all reports use the same definition.
// Week runs Monday 00:00 -> Sunday 23:59 (school week).

export function getWeekBounds(reference = new Date()) {
  const d = new Date(reference);
  d.setHours(0, 0, 0, 0);
  // getDay(): 0 = Sunday ... 6 = Saturday. Convert so Monday = 0.
  const dayFromMonday = (d.getDay() + 6) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - dayFromMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 7); // exclusive upper bound

  return {
    start, // inclusive
    end, // exclusive
    startISO: start.toISOString().slice(0, 10),
    endISO: new Date(end.getTime() - 1).toISOString().slice(0, 10),
  };
}
