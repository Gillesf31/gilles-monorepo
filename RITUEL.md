# Rituel

Rituel is the recurring home-maintenance application in this Nx workspace.

## Identity

- **Name:** Rituel
- **Purpose:** Keep recurring home-care tasks visible at the right time.
- **Primary users:** People maintaining a household.

## MVP features

### Manage recurring tasks

- Create a task with a clear name, such as "Change the laundry" or "Deep clean the coffee machine".
- Choose its first due date. The date picker defaults to today.
- Choose how often it repeats.
- See tasks that are due now, overdue, and coming up.

### Repeat options

The first version should support the household rhythms that cover most use
cases:

- Every week
- Every 2 weeks — clearer than the ambiguous term "bi-weekly"
- Every month
- Every 3 months

Later, Rituel can add daily routines and a custom "every N days, weeks, or
months" option.

### Due-task flow

1. A task becomes due on its scheduled date.
2. At 8:00 AM in the person's local time zone, Rituel sends a notification,
   including when the app is not open.
3. The person can mark the task as done or leave it incomplete.
4. If it is not marked done, Rituel reminds the person again the next day.
5. When it is marked done, the next due date is calculated from the completion
   date using that task's selected frequency. For example, completing a weekly
   task today schedules its next reminder one week from today.

### Notification requirement

Reliable notifications while the app is closed are a product requirement. On
the web, this needs an installable PWA, a service worker, and a Web Push
delivery service. Reminders are sent at **8:00 AM in the person's local time
zone**. The server must store an IANA time zone such as `America/Toronto` with
each push subscription, so daylight-saving changes follow that zone correctly.

### Out of scope for the MVP

- Task assignment
- Custom recurrence rules and task history
- User accounts and cross-device synchronization

## Roadmap

1. **Dashboard** — show due and upcoming routines with sample data. _(Done)_
2. **Task creation** — build the date picker and repeat-frequency form, backed
   by an in-memory repository. _(Done)_
3. **Completion flow** — mark a task done, defer it to tomorrow, and calculate
   the next due date from its frequency. _(Done)_
4. **Routine management** — edit the reminder or delete a routine. _(Done)_
5. **Closed-app reminders** — make Rituel installable and deliver Web Push
   notifications at 8:00 AM local time. This is the next MVP slice.

## Technical roadmap

Build the MVP in this order. Each slice must leave the app usable and tested
before the next one begins. The browser-only routine loop is complete; the
next technical goal is closed-app notification delivery at 8:00 AM local time.

### 0. Keep the current foundation safe

- [x] Keep `apps/rituel` thin and route the application through
  `libs/rituel/shell`.
- [x] Keep the current dashboard in `libs/rituel/feature-dashboard`.
- [x] Run the current Rituel `lint`, `test`, and `typecheck` Nx targets before
  changing behavior.
- [x] Add new Rituel code only under `libs/rituel/`, with the appropriate
  Nx `type:*` tag.

### 1. Model a recurring routine

Create `libs/rituel/model` (`type:model`). It contains types and pure
functions only: no Angular service, HTTP call, browser storage, or UI.

- [x] Define a `Routine`: id, name, optional note, first due date, current
  next-due date, and frequency.
- [x] Define the four MVP frequencies explicitly: weekly, every two weeks,
  monthly, and every three months.
- [x] Store a due date as `YYYY-MM-DD`, not a timestamp, so a date does not
  shift when the browser converts it to UTC.
- [x] Define a separate creation input without an id.
- [x] Add pure functions that classify a routine as overdue, due today, or
  upcoming for a supplied date.
- [x] Add a pure function that calculates the next due date from the
  completion date and frequency.
- [x] Decide and test the month-end rule, for example monthly completion on
  31 January becoming 28 or 29 February.
- [x] Unit-test every frequency, overdue, today, upcoming, and month-end
  cases without Angular's test bed.

**Done when:** recurrence and date behavior are documented by fast pure tests.

### 2. Add an in-memory repository

Create `libs/rituel/data-access` (`type:data-access`). This layer owns routine
state and mutations; feature components do not hold a second copy of it.

- [x] Define a `RoutineRepository` contract: list, create, complete, and
  defer a routine until tomorrow.
- [x] Expose reactive state suitable for Angular (signals or an observable).
- [x] Implement an in-memory adapter with stable seed ids: one overdue
  routine, one due today, and two upcoming routines.
- [x] Generate an id for each new routine.
- [x] On completion, calculate the next due date from the completion date,
  never from the previous due date.
- [x] On defer, move only the current next-due date to tomorrow.
- [x] Test each mutation and its resulting list state.
- [x] Provide the repository from `rituel-shell`, so later adapters can
  replace it without changing a feature.

**Done when:** the dashboard can read all its data from the gateway and a
reload restores the deterministic in-memory seed state.

### 3. Connect the dashboard

Keep smart behavior in `feature-dashboard` (`type:feature`). Create a
`libs/rituel/ui` (`type:ui`) component only once a routine card is shared by a
second feature.

- [x] Replace the component's hard-coded arrays with repository state.
- [x] Derive overdue, due-today, and upcoming sections from model functions.
- [x] Make overdue routines visibly distinct; do not mix them into upcoming.
- [x] Add explicit empty states for no due routines and no upcoming routines.
- [x] Add a visible action that navigates to task creation.
- [x] Test overdue, today, upcoming, and empty dashboard states.
- [x] Add a Playwright check that opens Rituel and sees seeded routines.

**Done when:** the dashboard is driven by local state rather than sample
arrays in its component.

### 4. Create a routine

Create `libs/rituel/feature-create-task` (`type:feature`) and lazy-load it
from a `/tasks/new` route in `rituel-shell`.

- [x] Build a form with name, optional note, first due date, and frequency.
- [x] Default its date control to the user's local today.
- [x] Require name, date, and frequency; trim the name before saving.
- [x] Limit frequency choices to the four MVP values.
- [x] Add inline validation and prevent duplicate submits.
- [x] Save through the repository and return to the dashboard.
- [x] Verify that the new routine appears in the correct section.
- [x] Test defaults, validation, and a successful save.
- [x] Add a Playwright journey: create a weekly routine and find it on the
  dashboard.

**Done when:** someone can create a routine and immediately see its schedule
without a backend.

### 5. Complete or defer a due routine

This remains dashboard behavior; do not create an app-wide service for it.

- [x] Add an accessible **Done** action to due and overdue routines.
- [x] Add a **Remind me tomorrow** action.
- [ ] Disable an action while its update is pending and show a small success
  or error message.
- [x] On completion, show the calculated next due date immediately.
- [x] On defer, move the routine out of the due section.
- [x] Test completion and defer.
- [ ] Extend Playwright with a completion flow and a defer flow.

**Done when:** the complete lifecycle described above works through the
in-memory repository.

### 6. Manage an existing routine

Create `libs/rituel/feature-edit-task` (`type:feature`) and lazy-load it from
`/tasks/:id/edit` in `rituel-shell`.

- [x] Link every dashboard routine to its edit screen.
- [x] Edit a routine's name, optional note, next due date, and frequency.
- [x] Delete a routine behind an explicit confirmation step.
- [x] Extend the repository contract with get, update, and delete operations.
- [x] Test editing and confirmed deletion.

**Done when:** someone can correct or remove a routine without touching its
stored data directly.

### 7. Store the data required for closed-app reminders

The product priority is notification delivery, not a separate local-storage
feature. However, closed-app Web Push needs durable server-side data: a
scheduled worker cannot read in-memory browser state. Keep this storage behind
the existing `RoutineRepository` contract.

- [x] Add Supabase migrations for `routines`, `push_subscriptions`, and
  idempotent `notification_deliveries`.
- [x] Store each subscription's endpoint, encryption keys, and IANA time zone.
- [x] Implement a server-backed Rituel repository in `rituel-data-access`.
- [x] Keep the in-memory repository for local frontend development.
- [x] Define a minimal identity model before storing subscriptions: one
  anonymous Supabase user is one Rituel household.
- [x] Test create, update, complete, defer, and delete through the server
  adapter.

**Done when:** the notification worker can safely find a routine, its time
zone, and its subscribed devices while the browser is closed.

### 8. Make the app installable

PWA installation comes before push permissions. An installable application is
useful and verifiable without a notification server.

- [x] Select a PWA integration compatible with the Angular 21/Nx build.
- [x] Add a web-app manifest with Rituel name, icons, theme color, and display
  mode.
- [x] Add a service worker that caches the application shell for offline
  launch.
- [ ] Define offline behavior: local routines remain usable; server-only
  actions, if any, are clearly unavailable.
- [ ] Verify installation in desktop browser tools and on one mobile device.
- [ ] Offer an install prompt only when the browser exposes one; normal use
  must never depend on it.

**Done when:** Rituel can open from an installed icon, before any notification
permission request is shown.

### 9. Deliver Web Push notifications at 8:00 AM local time

- [x] Generate and store VAPID keys outside the frontend bundle.
- [x] Ask for notification permission contextually, after someone has created
  a routine, never on first page load.
- [x] Register the service-worker subscription and save it on the server.
- [x] Build a scheduled worker that finds routines due at 8:00 AM in each
  subscription's IANA time zone.
- [x] Send one due notification linking to the relevant routine in Rituel.
- [x] Make the worker idempotent so retries do not duplicate notifications.
- [x] At 8:00 AM local time on each following day, send a reminder only while
  the routine remains incomplete.
- [x] Remove invalid subscriptions after push-provider failures.
- [ ] Test permission denied, subscription failure, notification-click routing,
  due delivery, and the next-day reminder.

**Done when:** a supported installed browser receives a timely reminder while
the app is closed and opens directly into a usable completion flow.

### 10. Release checks

- [ ] Run `lint`, `test`, and `typecheck` through `pnpm nx` for every touched
  Rituel project.
- [ ] Run the Rituel Playwright suite against a production build.
- [ ] Test dates around month ends and daylight-saving changes.
- [ ] Test keyboard navigation, focus after mutations, labels, and contrast.
- [ ] Confirm that unsupported notifications fail quietly while the dashboard
  and local task flow still work.
- [ ] Keep non-MVP work separate: daily routines, custom frequencies, history,
  and assignments.

### 11. Share one household across installed devices

- [x] Keep the device's anonymous Supabase identity separate from the shared
  household record.
- [x] Automatically join every installed app to the one shared household.
- [x] Scope routines and Push subscriptions to that shared household rather
  than a single device identity.
- [ ] Add a live-update subscription so an already-open second device refreshes
  immediately; until then, reopening the dashboard fetches the shared data.

**Done when:** all joined devices read and update the same routines, while each
device can retain its own Push subscription and local time zone.

## Architecture

The application project will remain thin: bootstrap configuration, root routes,
global metadata, assets, and environment wiring only.

Application behavior will live in tagged libraries under `libs/`, following the
workspace conventions:

- `type:shell` for route-level composition and providers
- `type:feature` for user-facing behavior
- `type:ui` for reusable presentation components
- `type:data-access` for APIs and persistence
- `type:model` for shared types and pure model definitions
- `type:util` for generic helpers

## Decisions to make

- Whether an ignored notification is treated the same as "not done"
- Identity and authentication needs for server-stored push subscriptions
- Required feature, UI, model, and data-access libraries
