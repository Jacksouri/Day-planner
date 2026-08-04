import { useCallback, useEffect, useMemo, useState } from 'react'
import { mergeData } from './merge'
import { emptyData, loadData, pruneTombstones, saveData } from './storage'
import type { KeyValueStore } from './storage'
import { createTask, deleteTask, toggleSubtask, toggleTask, updateTask } from './tasks'
import type { PlannerData, Task, TaskDraft } from './types'

function memoryStore(): KeyValueStore {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  }
}

function defaultStore(): KeyValueStore {
  if (typeof localStorage === 'undefined') return memoryStore()
  return localStorage
}

export interface Planner {
  data: PlannerData
  tasks: Task[]
  addTask(draft: TaskDraft): Task
  edit(id: string, patch: Partial<Task>): void
  toggle(id: string): void
  toggleSub(id: string, subtaskId: string): void
  remove(id: string): void
  replaceData(next: PlannerData): void
  mergeIn(remote: PlannerData): PlannerData
}

export function usePlanner(store: KeyValueStore = defaultStore()): Planner {
  const [data, setData] = useState<PlannerData>(() => loadData(store))

  useEffect(() => {
    saveData(store, data)
  }, [store, data])

  const mutate = useCallback((update: (tasks: Task[]) => Task[]) => {
    setData((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      tasks: pruneTombstones(update(current.tasks)),
    }))
  }, [])

  const addTask = useCallback(
    (draft: TaskDraft) => {
      const task = createTask(draft)
      mutate((tasks) => [...tasks, task])
      return task
    },
    [mutate],
  )

  const edit = useCallback(
    (id: string, patch: Partial<Task>) => {
      mutate((tasks) => tasks.map((task) => (task.id === id ? updateTask(task, patch) : task)))
    },
    [mutate],
  )

  const toggle = useCallback(
    (id: string) => {
      mutate((tasks) => {
        const next: Task[] = []
        for (const task of tasks) {
          if (task.id !== id) {
            next.push(task)
            continue
          }
          const result = toggleTask(task)
          next.push(result.task)
          if (result.logged) next.push(result.logged)
        }
        return next
      })
    },
    [mutate],
  )

  const toggleSub = useCallback(
    (id: string, subtaskId: string) => {
      mutate((tasks) => tasks.map((task) => (task.id === id ? toggleSubtask(task, subtaskId) : task)))
    },
    [mutate],
  )

  const remove = useCallback(
    (id: string) => {
      mutate((tasks) => tasks.map((task) => (task.id === id ? deleteTask(task) : task)))
    },
    [mutate],
  )

  const replaceData = useCallback((next: PlannerData) => {
    setData({ ...next, tasks: pruneTombstones(next.tasks) })
  }, [])

  const mergeIn = useCallback(
    (remote: PlannerData) => {
      const merged = mergeData(data, remote)
      replaceData(merged)
      return merged
    },
    [data, replaceData],
  )

  const tasks = useMemo(() => data.tasks, [data.tasks])

  return { data, tasks, addTask, edit, toggle, toggleSub, remove, replaceData, mergeIn }
}

export { emptyData }
