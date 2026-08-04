# Day Planner

A day and week planner that installs on your iPhone and your computer, works offline, and keeps
your data on your own devices. There is no account and no server.

- **Quick add** — type `Email advisor tomorrow 9am #school !!! *weekly @30m` and the date, time, tag,
  priority, repeat and reminder are all parsed out of the sentence.
- **Day / Week / All views** — step through days and weeks; overdue tasks follow you into today.
- **Priority 1–3** — `!`, `!!` or `!!!`, shown in red next to the task and used to sort your day.
- **Reminders** — notifications while the planner is open, plus a calendar export so your phone
  itself alerts you (see below).
- **More than a checkbox** — notes, steps (subtasks), tags, repeats, and a someday/unscheduled list.
- **Offline** — installed as an app, it launches and works with no signal.
- **Sync without a server** — see below.

## Install it

### iPhone / iPad

1. Open the app URL in **Safari** (it must be Safari; Chrome on iOS cannot install web apps).
2. Tap the **Share** button (square with an arrow, at the bottom).
3. Scroll and tap **Add to Home Screen**, then **Add**.
4. Launch it from the home screen icon. It runs full screen with no browser bars and works offline.

### Mac / Windows / Linux

- **Chrome or Edge**: open the URL and click the **install** icon (a monitor with an arrow) in the
  address bar, or menu → *Cast, save and share* → *Install page as app*.
- **Safari on Mac**: File → **Add to Dock**.

The address is `https://<your-username>.github.io/<repo-name>/`, so renaming the repository changes it.
[docs/renaming.md](docs/renaming.md) walks through that (and custom domains) click by click.

## Reminders and notifications

Open a task's details and pick a **Reminder** (at the time, 15 minutes before, 1 day before, …), or
type `@30m` / `@2h` / `@1d` in the quick-add box.

There are two ways they reach you, and the difference matters on iPhone:

- **While the planner is open** — tap **Reminders → Enable notifications** once and it notifies you
  directly. On iPhone this only works after the app is on your home screen.
- **When the planner is closed** — iOS does not run a closed web app, so it cannot fire an alert on
  its own. Instead tap **Reminders → Add to phone calendar (.ics)** and open the downloaded file:
  every scheduled task becomes a calendar event carrying its own alarm, so the iPhone itself alerts
  you. Repeats become real repeating events.

### About widgets

iOS home screen widgets can only be built by a native app, so this web app cannot provide one. The
practical substitute is the calendar export above: the tasks land in the stock **Calendar** app, and
its widget then shows your upcoming tasks on the home screen. Re-export after you add tasks.

## Sync between phone and computer

There is no server, so sync works by passing one small snapshot file between devices — the same
"export here, import there" idea people use for Anki decks, but the merge is automatic and safe to
repeat.

1. On device A: **Sync → Export snapshot**. You get a `day-planner-….json` file.
2. Put that file somewhere the other device can see it (iCloud Drive, Dropbox, Google Drive, AirDrop,
   email to yourself).
3. On device B: **Sync → Import & merge** and pick the file.

Merging keeps the newest version of every task, so both devices end up with everything, in any order,
however many times you do it. Deleting a task on one device also survives the merge instead of coming
back. On desktop Chrome/Edge there is also **Choose sync file…**, which remembers one file (put it in
your iCloud/Dropbox folder) so later syncs are a single **Sync now** click.

Because there is no server, nothing you write leaves your devices — but that also means the app is
your only copy, so export a snapshot now and then as a backup.

## Development

Requires Node 22 (see `.nvmrc`).

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests
npm run coverage   # tests with coverage
npm run lint       # oxlint
npm run typecheck  # tsc
npm run build      # production build into dist/
```

### How it is put together

| File | Role |
| --- | --- |
| `src/lib/types.ts` | Task/snapshot shapes |
| `src/lib/dates.ts` | `YYYY-MM-DD` day-key arithmetic in local time |
| `src/lib/tasks.ts` | Pure task logic: create/edit/complete, recurrence roll-forward, sorting, filters |
| `src/lib/quickAdd.ts` | Parses the quick-add shorthand |
| `src/lib/merge.ts` | Snapshot validation and the last-write-wins merge |
| `src/lib/storage.ts` | localStorage persistence, tombstone pruning |
| `src/lib/sync.ts` | `SyncAdapter` interface plus file-based transports |
| `src/lib/reminders.ts` | Reminder times and which ones are due |
| `src/lib/calendar.ts` | `.ics` export with alarms, so the phone fires reminders itself |
| `src/lib/usePlanner.ts` | React state on top of the pure logic |
| `src/lib/useReminders.ts` | Notification permission and in-page reminder timers |
| `src/components/` | Quick add, task rows, reminders panel, sync panel |

Deletes are tombstones (`deletedAt`) rather than removals, which is what lets two devices merge
without resurrecting deleted tasks; tombstones older than 30 days are pruned.
