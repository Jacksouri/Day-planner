import { useMemo, useState } from 'react'
import './App.css'
import { QuickAdd } from './components/QuickAdd'
import { RemindersPanel } from './components/RemindersPanel'
import { SyncPanel } from './components/SyncPanel'
import { TaskItem } from './components/TaskItem'
import { addDays, formatDayLabel, toDayKey, weekDays } from './lib/dates'
import { allTags, backlogTasks, filterTasks, progress, sortTasks, tasksForDay } from './lib/tasks'
import { usePlanner } from './lib/usePlanner'
import { useReminders } from './lib/useReminders'
import type { Task } from './lib/types'

type View = 'today' | 'week' | 'all'
type Panel = 'reminders' | 'sync' | null

export default function App() {
  const planner = usePlanner()
  const [view, setView] = useState<View>('today')
  const [anchor, setAnchor] = useState(() => toDayKey(new Date()))
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)
  const [panel, setPanel] = useState<Panel>(null)
  const reminders = useReminders(planner.tasks)

  const today = toDayKey(new Date())
  const visible = useMemo(
    () => filterTasks(planner.tasks, { query, tag, showDone }),
    [planner.tasks, query, tag, showDone],
  )
  const tags = useMemo(() => allTags(planner.tasks), [planner.tasks])

  const taskProps = {
    today,
    onToggle: planner.toggle,
    onToggleSub: planner.toggleSub,
    onEdit: planner.edit,
    onRemove: planner.remove,
  }

  const dayTasks = tasksForDay(visible, anchor, { includeOverdue: anchor === today })
  const backlog = backlogTasks(visible)
  const dayProgress = progress(dayTasks)

  return (
    <div className="app">
      <header>
        <div className="titles">
          <h1>Day Planner</h1>
          <p>{formatDayLabel(anchor, today)}</p>
        </div>
        <nav>
          {(['today', 'week', 'all'] as View[]).map((option) => (
            <button
              key={option}
              type="button"
              className={view === option ? 'active' : undefined}
              onClick={() => {
                setView(option)
                if (option === 'today') setAnchor(today)
              }}
            >
              {option === 'today' ? 'Day' : option === 'week' ? 'Week' : 'All'}
            </button>
          ))}
          {(['reminders', 'sync'] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={panel === option ? 'active' : undefined}
              onClick={() => setPanel(panel === option ? null : option)}
            >
              {option === 'reminders' ? 'Reminders' : 'Sync'}
            </button>
          ))}
        </nav>
      </header>

      <QuickAdd today={today} defaultDue={view === 'all' ? null : anchor} onAdd={planner.addTask} />

      <div className="filters">
        <input
          aria-label="Search tasks"
          placeholder="Search…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <label className="toggle">
          <input type="checkbox" checked={showDone} onChange={() => setShowDone((value) => !value)} />
          Show done
        </label>
        {tags.length > 0 ? (
          <div className="tag-filters">
            <button type="button" className={tag === null ? 'active' : undefined} onClick={() => setTag(null)}>
              all
            </button>
            {tags.map((option) => (
              <button
                key={option}
                type="button"
                className={tag === option ? 'active' : undefined}
                onClick={() => setTag(tag === option ? null : option)}
              >
                #{option}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {panel === 'reminders' ? <RemindersPanel tasks={planner.tasks} reminders={reminders} /> : null}
      {panel === 'sync' ? (
        <SyncPanel data={planner.data} onMerge={planner.mergeIn} onReplace={planner.replaceData} />
      ) : null}

      {view === 'today' ? (
        <section className="panel">
          <div className="day-header">
            <button type="button" onClick={() => setAnchor(addDays(anchor, -1))} aria-label="Previous day">
              ‹
            </button>
            <h2>
              {formatDayLabel(anchor, today)}
              <small>
                {dayProgress.done}/{dayProgress.total} done
              </small>
            </h2>
            <button type="button" onClick={() => setAnchor(addDays(anchor, 1))} aria-label="Next day">
              ›
            </button>
          </div>
          <TaskList tasks={dayTasks} empty="Nothing scheduled. Add something above." {...taskProps} />
          {backlog.length > 0 ? (
            <>
              <h3>Someday / unscheduled</h3>
              <TaskList tasks={backlog} empty="" {...taskProps} />
            </>
          ) : null}
        </section>
      ) : null}

      {view === 'week' ? (
        <section className="panel">
          <div className="day-header">
            <button type="button" onClick={() => setAnchor(addDays(anchor, -7))} aria-label="Previous week">
              ‹
            </button>
            <h2>Week of {formatDayLabel(weekDays(anchor)[0], today)}</h2>
            <button type="button" onClick={() => setAnchor(addDays(anchor, 7))} aria-label="Next week">
              ›
            </button>
          </div>
          <div className="week-grid">
            {weekDays(anchor).map((day) => (
              <div className={`week-day${day === today ? ' is-today' : ''}`} key={day}>
                <h3>{formatDayLabel(day, today)}</h3>
                <TaskList
                  tasks={tasksForDay(visible, day, { includeOverdue: false })}
                  empty="—"
                  {...taskProps}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {view === 'all' ? (
        <section className="panel">
          <h2>All tasks</h2>
          <TaskList tasks={sortTasks(visible, today)} empty="No tasks yet." {...taskProps} />
        </section>
      ) : null}
    </div>
  )
}

interface TaskListProps {
  tasks: Task[]
  empty: string
  today: string
  onToggle(id: string): void
  onToggleSub(id: string, subtaskId: string): void
  onEdit(id: string, patch: Partial<Task>): void
  onRemove(id: string): void
}

function TaskList({ tasks, empty, ...rest }: TaskListProps) {
  if (tasks.length === 0) return empty ? <p className="empty">{empty}</p> : null
  return (
    <ul className="tasks">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} {...rest} />
      ))}
    </ul>
  )
}
