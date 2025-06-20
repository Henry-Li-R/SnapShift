import { useState, useEffect } from "react";
import TaskInput from "./components/TaskInput";
import { applyPushMode, applyCompressMode } from "./rescheduleUtils";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [editedAttributes, setEditedAttributes] = useState({});
  const handleAttributeChange = (id, key, value) => {
    setEditedAttributes((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [key]: value,
      },
    }));
  };

  const handleAdd = ({
    text,
    duration,
    startTime,
    fixed,
    skippable,
    completed,
  }) => {
    setTasks((prev) => [
      ...prev,
      {
        id: Date.now(),
        text,
        duration,
        startTime,
        fixed,
        skippable,
        completed,
      },
    ]);
  };

  const taskToString = (task) =>
    `[${task.startTime || "--:--"}] ${task.text} (${task.duration}m)` +
    (task.fixed ? " [Fixed]" : "") +
    (task.completed ? " [Done]" : "") +
    (task.skipped ? " [Skipped]" : "");

  useEffect(() => {
    const saved = localStorage.getItem("snapshift-tasks");
    if (saved) {
      //console.log("Loaded from storage:", saved);
      setTasks(JSON.parse(saved));
    }
    setInitialized(true); // run the useEffect() below AFTER initilized
  }, []);

  useEffect(() => {
    if (initialized) {
      localStorage.setItem("snapshift-tasks", JSON.stringify(tasks));
    }
  }, [tasks, initialized]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 px-4 py-8">
      <div className="col-span-1">
        <h1 className="text-2xl font-bold mb-4">SnapShift</h1>
        <TaskInput onAdd={handleAdd} />

        <div className="mt-4 space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-600">
            Task Management
          </h3>
          {/* Button to delete all tasks */}
          {tasks.length > 0 && (
            <button
              onClick={() => setTasks([])}
              className="mt-4 text-sm text-gray-500 hover:underline"
            >
              Clear all
            </button>
          )}
          {/*Export Tasks*/}
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(tasks, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "snapshift-tasks.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export tasks
          </button>
          {/* Import Tasks */}
          <input
            type="file"
            accept="application/json"
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();

              reader.onload = (e) => {
                try {
                  // can add more structural validation
                  const importedTasks = JSON.parse(e.target.result);
                  if (Array.isArray(importedTasks)) {
                    setTasks(importedTasks);
                  } else {
                    alert("Invalid file format.");
                  }
                } catch (err) {
                  console.error("Failed to import tasks:", err);
                  alert("Failed to import tasks.");
                }
              };

              reader.readAsText(file);
            }}
          />
        </div>

        <div className="mt-4 space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-600">Reschedule</h3>
          <button
            onClick={() => {
              const now = new Date();
              const currentTimeStr = `${now
                .getHours()
                .toString()
                .padStart(2, "0")}:${now
                .getMinutes()
                .toString()
                .padStart(2, "0")}`;
              const [updated, skippedTasks] = applyPushMode(
                tasks,
                currentTimeStr
              );
              setTasks(updated);

              alert(
                `Push mode applied.\n${skippedTasks.length} task(s) could not be scheduled and were skipped.`
              );
              console.log(
                "Skipped tasks:\n" + skippedTasks.map(taskToString).join("\n")
              );
            }}
            className="mt-4 mb-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Push Now
          </button>
          <button
            onClick={() => {
              const now = new Date();
              const currentTimeStr = `${now
                .getHours()
                .toString()
                .padStart(2, "0")}:${now
                .getMinutes()
                .toString()
                .padStart(2, "0")}`;
              const updated = applyCompressMode(tasks, currentTimeStr);
              setTasks(updated);
              alert(`Compress Mode applied.`);
            }}
            className="mt-2 mb-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Compress Now
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="col-span-1">
        <h2 className="text-lg font-semibold mt-8 mb-2">Timeline</h2>
        {tasks.filter((task) => task.startTime).length === 0 && (
          <p className="text-sm text-gray-500 italic">
            No tasks scheduled yet. <br />
            Add tasks to populate your timeline.
          </p>
        )}
        <div className="space-y-1 border-l-2 border-gray-400 pl-4">
          {tasks
            .filter((task) => task.startTime)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((task) => (
              <div
                key={task.id}
                className="bg-blue-100 p-2 rounded-md shadow-sm transition-opacity duration-200 hover:opacity-80"
              >
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    if (expandedTaskId !== task.id) {
                      setEditedAttributes({
                        [task.id]: {
                          text: task.text,
                          fixed: task.fixed,
                          skippable: task.skippable,
                          completed: task.completed,
                        },
                      });
                      setExpandedTaskId(task.id);
                    } else {
                      setExpandedTaskId(null);
                    }
                  }}
                >
                  <div className="text-sm text-gray-600 mb-1">
                    <span>{task.startTime}</span> ·{" "}
                    <span>{task.duration} min</span>
                  </div>
                  <div className="font-medium">{task.text}</div>
                  <div className="text-xs text-right mt-1 space-y-1">
                    {task.completed && <div>[Completed]</div>}
                    {task.fixed && <div>[Fixed]</div>}
                    {task.skippable && <div>[Skippable]</div>}
                  </div>
                </div>

                {expandedTaskId === task.id && (
                  <div className="mt-2 text-sm text-gray-700 space-y-1">
                    <div>
                      <input
                        type="text"
                        className="border px-2 py-1 rounded w-full"
                        defaultValue={task.text}
                        onChange={(e) =>
                          handleAttributeChange(task.id, "text", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-x-2">
                      {["fixed", "skippable", "completed"].map((key) => (
                        <label key={key}>
                          <input
                            type="checkbox"
                            checked={
                              editedAttributes[task.id]?.[key] ?? task[key]
                            }
                            onChange={(e) =>
                              handleAttributeChange(
                                task.id,
                                key,
                                e.target.checked
                              )
                            }
                          />
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </label>
                      ))}
                    </div>
                    <div className="flex justify-between items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTasks((prev) =>
                            prev.filter((t) => t.id !== task.id)
                          );
                        }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTasks((prev) =>
                            prev.map((t) =>
                              t.id === task.id
                                ? { ...t, ...editedAttributes[task.id] }
                                : t
                            )
                          );
                          setEditedAttributes((prev) => {
                            const updated = { ...prev };
                            delete updated[task.id];
                            return updated;
                          });
                          setExpandedTaskId(null); // Close expanded view after saving
                        }}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
