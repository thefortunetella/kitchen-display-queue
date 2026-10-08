# Decisions

## Scope

I treated the ranking and the status rules as the product, because those are what a kitchen relies on and what is most likely to change. The score weights, the tie-break order and the allowed transitions each live in one table with tests next to it. A product tweak to ranking or status is one edit and one test, and the screen needs no change.

**Built.** The full required core, and all three extras: `POST /orders` with validation and Jest tests for the error cases; a Vitest test for the cancel button (shown only for `received` orders) and the empty state; and a Playwright happy path that starts a seeded order, with `npm run test:e2e` booting what it needs. Every rule in the spec has a test: 166 API tests (unit and integration), 4 component tests and 2 end-to-end tests, all passing, with lint and the type-checked build clean.

**Added beyond the spec, and why.** A *Ready* view and a *Finished* view, backed by read-only `GET /orders/ready` and `GET /orders/finished` and a `status_changed_at` column. Without them, an order marked ready leaves the screen, and the `pickup` transition can only be reached through the API. With each order, the API also sends the actions it allows and the parts of its score, so the screen can explain the ranking without copying the formula or the state machine.

**Left out, and what it costs.**

- No form to create orders: the spec asks for the API only.
- The screen polls every 15 seconds instead of receiving push updates. The expeditor's own actions show immediately; a change made elsewhere can take up to 15 seconds to appear.
- No menu endpoint, so a client calling `POST /orders` has to know the menu item ids.
- The finished list shows the last 20 orders, with no pagination.
- The end-to-end tests run against the development database and reset it to the demo data.

## Layers

**Module** (`api/src/modules`). Every business rule, as plain functions that receive `now` instead of reading the clock: the score (`priority.js`), the queue order and its tie-breaks (`queue.js`), the state machine (`transitions.js`), new-order validation (`new-order.js`), and the use cases that combine them with the repository (`orders.module.js`). Nothing here imports Express, and only the use cases call the repository, so every rule is unit-tested without a database or a mock. This is the [functional core, imperative shell](https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell) split: decisions in pure functions, I/O in a thin layer around them.

**Repository** (`api/src/repositories`). Sequelize only: it loads orders with their items, filters by the statuses it is given, creates an order and its lines in one transaction, and moves a status with a conditional `UPDATE ... WHERE status = <expected>`. It makes no decisions. Even which statuses form the active queue is a module rule, passed in as a list.

**Endpoint** (`api/src/endpoints`). Parses the request, reads the clock once per request, calls the module and writes JSON. Every expected error carries a stable code; one table maps codes to HTTP statuses, and one handler writes them.

**UI** (`web/src`). Renders rows in the order the API returns them and turns values into words: status labels, "12 min", "in 20 min". It computes no score and sorts nothing. The one thing it derives is the *Next up* marker: the first row whose allowed actions include `start`.

**The rule I kept on the server and out of the UI: which actions an order allows.** The obvious version is a check in the component, such as "if the status is `received`, show Start and Cancel". That creates a second copy of the state machine, and copies drift. If the server is changed to allow cancelling a `preparing` order, the screen keeps hiding the button. Change it the other way and the screen offers a move the server rejects. The server has to enforce every move anyway, because hiding a button stops no one: as the [OWASP guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) puts it, client-side checks may improve the user experience but must never be the deciding factor, because client-side logic is easy to bypass. So the API sends `allowed_actions`, derived from the same `TRANSITIONS` table that enforces each move, and the screen draws one button per action. It is a light form of the [hypermedia controls](https://martinfowler.com/articles/richardsonMaturityModel.html) idea: the response tells the client what it can do next. The server remains the only authority, and allowing a new transition is one edit in one file, with no UI change.

## Priority

**Produced at request time, never stored.** The endpoint reads the clock once per request and passes that `now` down. The module loads the active orders, scores every one of them against the same `now`, and sorts them in memory with the tie-break list in `QUEUE_ORDER`. One instant per response means the score, the waiting time and the "promised in" shown on a row always agree with each other. The score is not a column because it depends on the clock: a stored score is wrong a minute later and would need a background job to keep it fresh. Computing it in SQL would make a second copy of the formula. The cost is loading every active order on each request, which is fine for a kitchen with a few dozen open orders.

The weights, caps and promise buckets live in `PRIORITY_RULES`. `scoreBreakdown` returns the points of each part and `computeScore` is their sum, so the score and the explanation on screen cannot disagree. The clock is injected through `createApp({ clock })`: the running app uses the real time and the tests a frozen `2026-06-15T12:00:00Z`. This is the approach the [Java time API documents as best practice](https://docs.oracle.com/javase/8/docs/api/java/time/Clock.html): pass a clock to any code that needs the current instant, so tests can use a fixed one.

**The edge case that was easy to get wrong: the promise buckets.** The spec gives 25 points "within 30 minutes", 15 "within 31–60 minutes", and 0 for "more than 60 minutes away or null". Read naively, this has two holes:

- **A gap between buckets.** With seconds precision, a promise 30 minutes 30 seconds away is neither within 30 nor within 31–60, and falls through to 0. I measure it in whole floored minutes, the same rule the spec sets for `minutes_waiting`. The buckets then have no gap: 30m59s is 30 minutes and scores 25, 31 minutes scores 15.
- **An overdue promise.** The spec does not list it. A check such as `minutes >= 0 && minutes <= 30` gives a late order 0 points, so it drops in the queue exactly when it should go first. On the literal reading, only "more than 60 minutes away or null" scores 0, and an overdue promise is within 30 minutes, so it scores 25.

Both boundaries are tests: 30m59s, 31m, 60m59s, 61m, due now, and 10 minutes overdue. If the kitchen wants late orders boosted even more, that is a new bucket in `PRIORITY_RULES`.

## Transitions

**Enforced in the module, in one table.** `TRANSITIONS` in `api/src/modules/transitions.js` lists each action, the statuses it may start from, and the status it leads to. Before anything is written, `resolveTransition` checks the requested move against that table, so a button click and a direct API call reach the same check. The `allowed_actions` the screen uses come from the same table, so the screen only reflects the rule and never decides it. The spec's cases (skipping a step, repeating one, leaving `picked_up` or `cancelled`) are covered by a unit test for all 20 status and action pairs.

**Two clicks at the same time.** Checking and writing are two steps, so two expeditors pressing *Start* together could both pass the check. The repository therefore writes with `UPDATE orders SET status = <to> WHERE id = <id> AND status = <status just read>`. If no row changes, another request moved the order first, and the module answers `INVALID_TRANSITION` with the status it found. This is the idea behind [Optimistic Offline Lock](https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html): validate that a change does not conflict with another session's change before committing it, instead of locking rows. An integration test fires two starts at once and expects exactly one `200` and one `409`.

**Starting an order that is already `preparing`.** The API answers `409` and writes nothing: the status and `status_changed_at` stay as they were.

```json
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot start an order that is preparing.",
    "details": { "action": "start", "current_status": "preparing", "allowed_from": ["received"] }
  }
}
```

I chose `409` because [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html#name-409-conflict) defines it for a request that "could not be completed due to a conflict with the current state of the target resource", which is exactly this case. A silent `200` would be easier, but the spec calls a repeated transition an error, and in a kitchen a second *Start* usually means two people are working the same ticket, which someone should know about. On screen, the error appears in a red alert with the message and the code. The queue refreshes at the same time, so the row shows the order's real status.

## AI

**Kept: "Concurrent transitions (two clicks on start): conditional UPDATE `WHERE status = from` / row lock."** This came up while analysing the spec, before any code existed, as one of the edge cases the spec does not mention. A read, check and save would let two expeditors start the same order. I kept the conditional `UPDATE` and dropped the row lock: one query, no lock held across requests, and a lost race comes back as the same `INVALID_TRANSITION` the client already handles. It is described under *Transitions* and covered by a test that fires two starts at once.

**Rewritten: a score explanation built inside the priority module.** The first version of `scoreBreakdown` returned, for each part of the score, `{ component, label, formula, points }`, with display strings such as `` `VIP +${rules.vipPoints}` `` and `` `${prep} min of total prep time` ``, and the tooltip on screen showed them with their points. I rejected it for two reasons. Display text inside the rule module mixes layers: rewording a tooltip would mean editing the scoring code. And with the points on every row, anyone can add them up, so the screen effectively carries the formula, which is what the spec says the UI must not contain. I rewrote it so the module returns only numbers (`score_breakdown`), and the screen turns the parts that count into plain reasons, such as "VIP customer" or "promised soon", with no points.

## Next

**1. Staff sign-in and a status history.** Today anyone who can reach the screen can move any order, and only the latest status change is kept. In a real kitchen, a mis-click on *Mark ready* sends a cook's order to the pass with no trace of who did it and no way back. I would add sign-in per station and an `order_status_events` table (order, from, to, who, when), written in the same transaction as the conditional update. That gives the manager an audit trail and makes a safe *undo* possible, through a new entry in `TRANSITIONS` that only some roles may use.

**2. Safe order intake from the point of sale.** Orders would arrive from the till and delivery platforms through `POST /orders`, which today is open and not retry-safe. A network timeout followed by a retry creates the same ticket twice, and the kitchen cooks it twice. I would require an API key per source and an `Idempotency-Key` header: the server stores the result of the first request for each key and returns it for any retry, as [Stripe's API does](https://docs.stripe.com/api/idempotent_requests) and as the [IETF draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) standardises.

I would not start with push updates. Polling every 15 seconds is enough to see what to cook next, and a screen that is behind is already safe: an action on an order that moved elsewhere is rejected and the screen refreshes.
