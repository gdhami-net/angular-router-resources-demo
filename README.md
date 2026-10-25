# angular-router-resources-demo

Companion to the post **"How to load parent and child route data at the same
time with Angular's router resources"**.

A project page (`/projects/:id`) with a tasks tab under it
(`/projects/:id/tasks`). Both load data. The same two pages are wired three
ways over the same fake endpoints:

| route prefix | how the data loads |
| --- | --- |
| `/resolvers/…` | a resolver on the parent, a resolver on the child |
| `/resources/…` | router resources on both, both blocking (the default) |
| `/nonblocking/…` | router resources; the project blocks, the tasks are wrapped in `nonBlocking()` |

The fake backend is an HTTP interceptor (`src/app/api.ts`): the project answers
after **400 ms**, its tasks after **600 ms**. Project `999` answers 500, and
project `777` loads but its tasks answer 500.
It logs each request's start and end with `performance.now()`, next to the
router events (`src/app/app.ts`), into `window.__log`, which the specs read.

## What it proves

`npm run check` builds the app, then runs the Playwright specs in Edge against
the dev server and a production build:

- **Resolvers run in sequence.** The tasks request starts only after the
  project response; the tab is on screen after 1,000 ms plus a few (median
  1,017 to 1,024 ms over five runs, depending on the run).
- **Router resources run together.** Both requests start within 5 ms of each
  other; the tab is on screen after 600 ms plus a few (median 615 to 625 ms).
  The median saving is the parent's delay, about 400 ms.
- **`nonBlocking()`** ends the navigation as soon as the project is in
  (~435 ms). The tab then shows `Loading tasks…` with no tasks for about
  200 ms, then the list.
- **Switching project 1 to project 2 on the tab:** with blocking resources,
  project 1's page and URL stay on screen until both new loads finish. With
  the tasks non-blocking, project 1 and its tasks stay until project 2 is in,
  then the tab shows its loading state. Project 1's tasks never sit under
  project 2's heading.
- **A failing parent request** (project 999) ends in `NavigationError`, calls
  the `withNavigationErrorHandler` callback, and leaves the old URL and page
  in place, in both versions.

The bounds in `e2e/timing.spec.ts` allow 250 ms of slack over 1,000 ms and
600 ms. They hold together only if resolvers wait for the sum and resources
for the larger of the two.

Real output of the last run, production build (the dev build is within a few
milliseconds). `npm run check` ends with `22 passed`.

```
resolvers   tasks on screen after: 1022, 1025, 1022, 1013, 1013 ms (median 1022)
resources   tasks on screen after: 625, 613, 617, 624, 626 ms (median 624)
resolvers   tasks on screen after: 1020, 1016, 1021, 1015, 1017 ms (median 1017)
resources   tasks on screen after: 628, 617, 623, 622, 624 ms (median 623)
median saving: 394 ms
nonblocking tasks on screen after: 615, 623, 625, 626, 622 ms (median 623)
```

## Run it

```
npm install
npm run check        # build + all Playwright specs, dev and prod
npm start            # the app on http://localhost:4200, links at the top
node scripts/explore.mjs http://localhost:4200   # timeline of one navigation per mode
node scripts/switch.mjs 2 http://localhost:4200  # what is on screen while switching to project 2 (or 999)
node scripts/fresh.mjs http://localhost:4200     # DOM samples during a non-blocking navigation
```

Playwright needs Microsoft Edge installed (`channel: 'msedge'`). It gives the
browser a temporary profile and deletes it when the browser closes; the
scripts close it in a `finally` block.

## Versions

Angular 22.2.3 (`@angular/core`, `@angular/router`, `@angular/common`,
`@angular/build`, `@angular/cli`), TypeScript 6.0.3, Playwright 1.64.1,
Node 26.1.0, npm 11.13.0, Windows 11, Microsoft Edge. Router resources are
`@developerPreview 22.2` in the type definitions.

## Where the behaviour comes from

Read in `node_modules/@angular/router/fesm2022/` at 22.2.3:

- `_router-chunk.mjs`, `resolveData()`: the routes that need data go through
  `concatMap`, so one route's resolvers finish before the next route's start.
  Inside one route, its resolver keys run with `mergeMap`, in parallel.
- `_router_module-chunk.mjs`, `setupAndRunResources()`: walks the whole target
  route tree, calls every route's `resources` function, then waits on
  `Promise.all` of the blocking ones.
- `createResourceOutletBindingEffects()`: a blocking resource is bound to the
  component input as its value. A non-blocking one reaches the input through
  the ordinary input binder, as the `Resource` object. That's why the tab's
  input type changes from `Task[]` to `Resource<Task[] | undefined>` when you
  add `nonBlocking()`.
- `createTransactionalSnapshot()`: from `NavigationStart` to `NavigationEnd`
  the resource shows its old snapshot, which is why the old page stays put.

## Edge cases the post leaves out

- **Resources run after resolvers.** In one navigation the router runs the
  resolve phase, loads lazy components, then starts resources. A route tree
  that mixes both pays for the resolvers first.
- **A failed navigation fetches the old data again.** With resources, the
  child's request for project 999 is sent (both start together) and then
  cancelled when the parent fails. After the `NavigationError`, the reused
  resources fetch project 1 and its tasks again: the route's params signal
  went to 999 and back. Nothing changes on screen, but that's two extra
  requests per failed navigation. With resolvers, the child's request is
  never sent. Both asserted in `e2e/navigation.spec.ts`.
- **Params inheritance.** The child reads `:id` from its own params in both
  versions (`route.params['id']`, `params()['id']`). That works because the
  router's default `paramsInheritanceStrategy` is `'always'` in 22.2.3
  (`DEFAULT_PARAMS_INHERITANCE_STRATEGY` in `_router-chunk.mjs`). An app that
  sets `'emptyOnly'` has to read the parent's params instead.
- **Reading resources without input binding.** `ActivatedRoute.resources` and
  `ActivatedRouteSnapshot.resources` hold the same record. The demo uses
  `withComponentInputBinding()` only.
- **A failing non-blocking resource** doesn't fail the navigation. For
  project 777 the navigation ends normally, no `NavigationError`, and the tab
  shows its error branch from the resource's `error()` signal. Asserted in
  `e2e/navigation.spec.ts`.
- **The 10 ms head start.** Resolvers send their first request about 1 ms
  after `NavigationStart`; resources send theirs about 10 ms after, because
  they start later in the navigation. It doesn't change the result.
- **Test harness:** the non-blocking loading state lasts about 200 ms, shorter
  than the retry steps of Playwright's `expect()`, so that check waits on
  every animation frame (`waitForFunction` with `polling: 'raf'`).

## License

MIT
