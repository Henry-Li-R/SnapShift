function fallbackReschedule(tasks, pointer, fixedTasks, scheduledTasks) {
  const DAY_END = 21 * 60; // make global variable
  const unscheduled = tasks.filter(task => task.skipped && !task.completed);

  for (let time = pointer; time < DAY_END; time++) {
    for (const task of unscheduled) {
      const conflict = fixedTasks.concat(scheduledTasks).some(otherTask => {
        const otherStart = timeStrToMinutes(otherTask.startTime);
        const otherEnd = otherStart + otherTask.duration;
        const taskEnd = time + task.duration;
        return time < otherEnd && otherStart < taskEnd;
      });
      if (!conflict && time + task.duration <= DAY_END) {
        task.startTime = minutesToTimeStr(time);
        task.skipped = false;
        scheduledTasks.push({ ...task });
        break;
      }
    }
  }
}
function timeStrToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTimeStr(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function findNextAvailableSlot(task, pointer, fixedTasks, scheduledTasks) {
  const DAY_END = 21 * 60; // 9:00 PM in minutes
  let candidateStart = Math.max(pointer, 0);

  while (candidateStart + task.duration <= DAY_END) {
     
    const conflict = fixedTasks.concat(scheduledTasks).some(otherTask => {
      const otherStart = timeStrToMinutes(otherTask.startTime);
      const otherEnd = otherStart + otherTask.duration;
      const candidateEnd = candidateStart + task.duration;
      return candidateStart < otherEnd && otherStart < candidateEnd;
    });
    if (!conflict) {
      return candidateStart;
    }
    candidateStart++;
  }

  return null;
}

/**
 * Applies push mode rescheduling to tasks.
 * @param {Array} tasks - Array of task objects. Each task has:
 *   - startTime: string (e.g., "14:30") or null
 *   - duration: number (minutes)
 *   - fixed: boolean
 * @param {string} currentTimeStr - Current time as string (e.g., "15:00")
 */
function applyPushMode(tasks, currentTimeStr) {
  const DAY_END = 21 * 60; // 9:00 PM in minutes

  // Separate fixed and non-fixed tasks
  const fixedTasks = tasks
    .filter(task => task.fixed)
    .sort((a, b) => timeStrToMinutes(a.startTime) - timeStrToMinutes(b.startTime));

  const nonFixedTasks = tasks
    .filter(task => !task.fixed && !task.completed && !task.skipped)
    .sort((a, b) => {
      if (a.skippable === b.skippable) return 0;
      return a.skippable ? 1 : -1; // non-skippable first
    });

  let pointer = timeStrToMinutes(currentTimeStr);
  const scheduledTasks = [];

  for (const task of nonFixedTasks) {
    const newStart = findNextAvailableSlot(task, pointer, fixedTasks, scheduledTasks);
    if (newStart === null) {
      task.skipped = true;
      continue;
    }
    task.startTime = minutesToTimeStr(newStart);
    task.skipped = false;
    pointer = newStart + task.duration;
    scheduledTasks.push({ ...task });
  }
  fallbackReschedule(nonFixedTasks, pointer, fixedTasks, scheduledTasks);

  const completedTasks = tasks.filter(task => task.completed);
  const skippedTasks = tasks.filter(task => task.skipped);
  return [[...fixedTasks, ...completedTasks, ...scheduledTasks]
    .sort((a, b) => {
      const aTime = a.startTime ? timeStrToMinutes(a.startTime) : Infinity;
      const bTime = b.startTime ? timeStrToMinutes(b.startTime) : Infinity;
      return aTime - bTime;
    }), skippedTasks];
}

export { applyPushMode };



// Edge case unit test for applyPushMode
/*
function runTest() {
  const tasks = [
    // Fixed task blocking the only viable time window
    { id: 1, text: "Fixed Task", duration: 60, startTime: "14:00", fixed: true, completed: false },

    // Task that should be skipped due to no available slot
    { id: 2, text: "Too Long Task", duration: 300, startTime: "14:30", fixed: false, completed: false },

    // Already skipped task, should remain unchanged
    { id: 3, text: "Previously Skipped", duration: 30, startTime: null, fixed: false, completed: false, skipped: true },

    // Completed task, should be ignored
    { id: 4, text: "Completed Task", duration: 45, startTime: "15:30", fixed: false, completed: true }
  ];

  const currentTimeStr = "14:30";
  applyPushMode(tasks, currentTimeStr);
  console.log("Updated tasks (edge cases):", tasks);
}

runTest();
*/