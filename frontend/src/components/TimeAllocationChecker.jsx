// Lets a teacher allocate minutes per lesson stage and instantly checks
// the total against the lesson duration. No backend call needed.

export function totalAllocated(allocations) {
  return allocations.reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
}

export default function TimeAllocationChecker({ allocations, duration, onChange }) {
  const total = totalAllocated(allocations);
  const dur = Number(duration) || 0;
  const diff = total - dur;

  let status, message, style;
  if (dur === 0) {
    status = 'info';
    message = 'Set a lesson duration to check time balance.';
    style = 'bg-gray-50 text-gray-600 border-gray-200';
  } else if (diff === 0) {
    status = 'balanced';
    message = 'Lesson time is balanced.';
    style = 'bg-green-50 text-green-800 border-green-200';
  } else if (diff < 0) {
    status = 'under';
    message = `You have ${Math.abs(diff)} minute${
      Math.abs(diff) === 1 ? '' : 's'
    } unallocated.`;
    style = 'bg-amber-50 text-amber-800 border-amber-200';
  } else {
    status = 'over';
    message = `You exceeded the lesson duration by ${diff} minute${
      diff === 1 ? '' : 's'
    }.`;
    style = 'bg-red-50 text-red-800 border-red-200';
  }

  function update(index, field, value) {
    const next = allocations.map((a, i) =>
      i === index ? { ...a, [field]: value } : a
    );
    onChange(next);
  }

  function addStage() {
    onChange([...allocations, { stage: '', minutes: '' }]);
  }

  function removeStage(index) {
    onChange(allocations.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {allocations.map((a, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="input flex-1"
              placeholder="Stage (e.g. Introduction)"
              value={a.stage}
              onChange={(e) => update(i, 'stage', e.target.value)}
            />
            <input
              className="input w-24"
              type="number"
              min="0"
              placeholder="mins"
              value={a.minutes}
              onChange={(e) => update(i, 'minutes', e.target.value)}
            />
            <button
              type="button"
              className="rounded-lg px-2 py-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
              onClick={() => removeStage(i)}
              aria-label="Remove stage"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="btn-secondary" onClick={addStage}>
        + Add stage
      </button>

      <div className={`rounded-lg border px-3 py-2.5 text-sm ${style}`}>
        <div className="flex items-center justify-between font-medium">
          <span>
            Allocated: {total} min{dur ? ` / ${dur} min` : ''}
          </span>
          <span className="uppercase tracking-wide text-xs">{status}</span>
        </div>
        <p className="mt-0.5">{message}</p>
      </div>
    </div>
  );
}
