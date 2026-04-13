# 🚀 Building a Practice Project with TanStack/React Query

> **Course:** [React - The Complete Guide (incl. Next.js, Redux)](https://www.udemy.com/course/react-the-complete-guide-incl-redux/)  
> **Section:** React Query (TanStack Query): Handling HTTP Requests With Ease (Advanced)  
> **Demo Project:** A comprehensive Events Management application (CRUD) built to master modern React Query data-handling patterns.

---

## 🤖 Acknowledgments & Learning Approach

This study journey is powered by a unique AI-assisted learning workflow:

- **[Google Antigravity Agent](https://deepmind.google/)** — Acts as a **Senior Instructor / Mentor**, guiding deep conceptual discussions, explaining JavaScript internals, and fostering a **Product Engineer** mindset rather than just teaching syntax.
- **Code Wiki & Repository Exploration** — Used to explore the actual source code repositories of React and other packages, trying to understand their internals as deeply as possible.

The goal is not just to follow along with the course, but to **deeply understand the "why"** behind every concept — how things work under the hood, what trade-offs exist, and how a Product Engineer makes architectural decisions.

---

## 🎯 Module Roadmap

1. **Server State vs Client State** — the foundational mental shift.
2. **`useQuery` internals** — QueryClient, QueryCache, QueryObserver, State Machine.
3. **Caching Theory** — TTL, Invalidation, Stale-While-Revalidate.
4. **HTTP Status 304** — The two-layer caching system (React Query + Browser HTTP Cache).
5. **Race Conditions** — How TanStack Query prevents them via AbortController.
6. **`useMutation`** — Managing POST/PATCH/DELETE efficiently.
7. **Cache Invalidation** — `queryClient.invalidateQueries()`.
8. **Optimistic Updates** — The `onMutate` pattern.

---

## 📚 Concepts Learned

### 1. Server State vs. Client State

Two fundamentally different types of state exist in every application:

| Type | What it is | Who owns it | Tool |
| :--- | :--- | :--- | :--- |
| **Client State** | Lives only in the browser | The frontend | `useState`, `useReducer`, Redux |
| **Server State** | Lives on a remote server/database | The backend | TanStack Query, SWR, Apollo |

**Key Insight:** `useState` was never designed for managing remote data. Using it for server data means you manually carry the full responsibility of caching, synchronization, staleness, de-duplication, and error retries — all things TanStack Query does for you.

---

### 2. Why TanStack Query? The Real Problems It Solves

The pattern of `useEffect + useState` for data fetching is not wrong — it is **incomplete**. Here are the concrete problems it creates at scale:

| Problem | `useEffect` Behavior | TanStack Query Solution |
| :--- | :--- | :--- |
| **Boilerplate** | 3 `useState` + `useEffect` per component | 1 `useQuery` call |
| **Double Fetch** | Each component fires its own `fetch()` | **Request Deduplication** — 1 fetch, N components |
| **Stale Data** | Fetches once on mount, never updates | **`refetchOnWindowFocus`** — auto-syncs with server |
| **Navigation** | Loading spinner every time you go back | **Cache** — instant display, silent background refetch |
| **Post-Mutation Sync** | Manual state update or page refresh | **`invalidateQueries`** — one line syncs everything |
| **Unmounted Updates** | Memory leak / React warning | Internal cleanup — handled automatically |
| **Race Conditions** | Old responses overwrite new data | **`AbortController`** — old requests are cancelled |

---

### 3. The `useEffect` Initial State Safeguard (JS Internals)

When a component mounts, `useState()` initializes as `undefined`. The component renders before `useEffect` fires. The safeguard against `.map()` crashing on `undefined` is JavaScript's **Truthiness**:

```javascript
// This is why there's no crash — undefined is falsy
if (data) {
  content = <ul>{data.map(...)}</ul>; // Only runs when data is truthy (an array)
}
```

**React Component Lifecycle on mount:**
1. Component function runs → state is `undefined`.
2. `if (data)` evaluates to `false` → `.map()` is never called.
3. Empty section is rendered to the DOM.
4. **Then** `useEffect` fires → fetch starts.
5. Data arrives → `setData()` triggers re-render → `if (data)` is now `true`.

**Senior Note:** Using `undefined` as initial state (vs `[]`) is intentional in complex apps — it lets you distinguish "haven't fetched yet" from "fetched but zero results."

---

### 4. Race Conditions (JS Internals)

A Race Condition happens when two async operations are in-flight and the result depends on which finishes first — and the network does **not** guarantee order.

**The Bug:** User types "c", "co", "con" rapidly. Three requests fire. If Request 1 ("c") finishes last, it overwrites the UI with stale results, even though the user typed "con".

**The Manual Fix (with `useEffect`):** `AbortController` — cancel the previous request in the `useEffect` cleanup function.

**TanStack Query's Fix:** Automatically uses `AbortController` internally. Old, superseded queries are cancelled at the network level. Your component only ever receives the result of the **latest** query.

**Why does this happen? (JS Internals):**
JavaScript is single-threaded, but I/O is not. `fetch()` delegates to the Browser's Web APIs (off-thread). Multiple `fetch()` calls run in parallel. Responses arrive in unpredictable order and are placed in the **Microtask Queue** as Promises resolve. Whichever Promise resolves last wins — creating the race.

---

### 5. The Microtask Queue vs Macrotask Queue

JavaScript manages async execution through two separate queues, governed by the **Event Loop**.

| | Microtask Queue | Macrotask Queue |
| :--- | :--- | :--- |
| **Contents** | Promise `.then()`, `await`, `queueMicrotask()` | `setTimeout`, `setInterval`, DOM events |
| **Priority** | **HIGH** — runs first | **LOW** — runs after Microtasks drain |
| **Per loop tick** | **ALL** of them (full drain) | **ONE** task at a time |
| **Mental model** | "Finish what I started" | "Start a new job" |

**Event Loop Rule:** After the Call Stack empties → drain the entire Microtask Queue → pick ONE Macrotask → repeat.

```javascript
console.log("1");           // Call Stack → immediate
setTimeout(() => console.log("2"), 0); // Macrotask Queue
Promise.resolve().then(() => console.log("3")); // Microtask Queue
console.log("4");           // Call Stack → immediate
// Output: 1, 4, 3, 2
```

---

### 6. HTTP Status 304 — The Two-Layer Cache System

When TanStack Query refetches and you see `304 Not Modified` in DevTools, **two separate caching systems are cooperating**:

```
React Query Cache (JS Map, in RAM)
    ↓  decides to refetch (staleTime expired)
Browser HTTP Cache (on disk)
    ↓  sends request with If-None-Match: "etag-hash"
Backend Server
    ↓  compares ETags — data unchanged → returns 304 (no body)
Browser HTTP Cache
    ↓  returns cached response body (zero bytes transferred)
React Query Cache
    ↓  updates state
Your Component re-renders
```

**Key Insight:** `304` means a network round-trip still happened (React Query asked "is this stale?"), but **zero data bytes** were transferred. The system is efficient at every layer.

---

### 7. Caching Theory — The Universal Concept

Caching exists at every layer of the software stack. The fundamental trade-off is always:

```
SPEED  ←————————————→  ACCURACY (Freshness)
```

**The 4 Core Questions every cache must answer:**

1. **Key** — How do you identify "the same request"? (`queryKey` in TanStack Query)
2. **TTL (Time To Live)** — How long is data considered fresh? (`staleTime`)
3. **Eviction** — When memory is limited, what gets deleted? (`gcTime` / LRU strategy)
4. **Invalidation** — When does cached data become wrong? (`invalidateQueries`)

**Invalidation Strategies:**

| Strategy | How | Trade-off |
| :--- | :--- | :--- |
| **TTL Expiry** | Auto-expire after N seconds | Simple, but stale for up to N seconds |
| **Event-Based** | Explicitly clear cache on write | Accurate, but complex tracking |
| **Stale-While-Revalidate** | Show old data, fetch new in background | Best UX, slight accuracy delay |
| **Write-Through** | Update cache and DB simultaneously | Always consistent, complex writes |

> TanStack Query uses **Event-Based** (`invalidateQueries`) + **Stale-While-Revalidate** (`staleTime`).

**The Caching Layers (from hardware to UI):**

| Layer | Owner | Tool |
| :--- | :--- | :--- |
| CPU Cache (L1/L2/L3) | Hardware | Automatic |
| RAM / OS Cache | OS | Automatic |
| Database Query Cache | Backend / DBA | DB config |
| Server-Side Cache | Backend Engineer | Redis / Memcached |
| CDN Cache | DevOps / Platform | Cloudflare, Fastly |
| HTTP Cache | Backend sets / Frontend respects | ETag, `Cache-Control` |
| Application Cache | **Frontend Engineer** | **TanStack Query, SWR** |

---

### 8. TanStack Query — Internal Architecture

TanStack Query is built on 5 internal pillars:

#### Pillar 1: `QueryClient` — The Manager
A JavaScript **class instance** created once (singleton pattern) and shared via React's Context API through `QueryClientProvider`. Holds the global `QueryCache` and configuration defaults.

#### Pillar 2: `QueryCache` — The Database
A JavaScript **`Map`** where keys are deterministic hashes of `queryKey` arrays and values are `Query` objects.

#### Pillar 3: `Query` — The State Machine
Each cache entry is a `Query` object — a state machine with two independent dimensions:

```
STATUS (data availability):   pending → success | error
FETCH STATUS (network):       idle → fetching → idle | paused
```

This is why React Query can show **stale data while fetching new data**: `status: 'success'` (old data available) + `fetchStatus: 'fetching'` (new data being loaded).

#### Pillar 4: `QueryObserver` — The Spy (Observer Pattern)
Every `useQuery` call creates a `QueryObserver` that **subscribes** to a `Query` object. When the `Query`'s state changes, all observers are notified and their components re-render. Multiple components subscribing to the same `queryKey` share **one** `Query` object → one network request → all components update simultaneously.

#### Pillar 5: `useQuery` — The Bridge to React
The hook that connects the React component world to TanStack Query's internal world. On mount, it:
1. Computes the `queryKey` hash.
2. Looks up or creates the `Query` in `QueryCache`.
3. Creates a `QueryObserver` that subscribes to that `Query`.
4. Schedules a fetch if data is missing or stale.
5. Returns the derived state object: `{ data, isLoading, isError, error, isFetching }`.

**Design Patterns used internally:**
- **Observer Pattern** → `Query` notifies `QueryObserver` instances.
- **State Machine** → `Query.state.status` / `fetchStatus`.
- **Singleton** → One `QueryClient` shared via Context.

### 9. Dependency Inversion Principle (SOLID) and `queryFn`

TanStack Query relies heavily on the **Dependency Inversion Principle (the 'D' in SOLID)**.
It asks you for one simple contract: **"Give me a function that returns a Promise."**

It doesn't care if you use `fetch`, `axios`, `GraphQL`, or a local `IndexedDB`. By programming to this interface (a Promise), TanStack Query decouples its complex caching/state machine logic from your low-level transport/network logic. 

**JS Internals:** Any function declared with the `async` keyword automatically wraps its return value in a `Promise`. That's why your `async function fetchEvents()` satisfies the contract perfectly.

---

### 10. `QueryFunctionContext` and Native Fetch Cancellation

TanStack Query silently passes an object, the `QueryFunctionContext`, to every `queryFn` execution.
It contains: `{ queryKey, signal, meta }` and more.

The most important property here is `signal` (an `AbortSignal` instance):
1. **The Wiring**: You pass this `signal` directly into the native `fetch` API: `fetch(url, { signal })`.
2. **The Execution**: If a component unmounts quickly, or if a user types rapidly triggering a **Race Condition**, React Query internally triggers `.abort()` on its controller.
3. **The Result**: The browser's native networking engine sees the red signal and **violently terminates the TCP connection** immediately, saving user bandwidth. The `fetch` promise rejects with an `AbortError`, which React Query catches and silently swallows.

---

### 11. `staleTime` vs `gcTime`

These two configuration properties control completely different aspects of data lifecycle:

| Property | Default | Question it Answers | Result |
| :--- | :--- | :--- | :--- |
| **`staleTime`** | `0` | "Is the data fresh enough to trust?" | Controls if a background **refetch** triggers when components mount or window focuses. |
| **`gcTime`** | `5 mins`| "Should we keep this data in memory?" | Controls when an unused Query is **completely deleted** from the cache to prevent memory leaks. |

**Important Note:** `staleTime` does **NOT** decide if data is shown to the user. Stale data is still shown instantly from the cache, providing a seamless UX, while the verification fetch happens silently in the background (Stale-While-Revalidate).

---

### 12. `isPending` vs `isLoading` (and `enabled`)

React Query v5 clearly separated these states to align with literal English definitions:

*   **`isPending`**: "I have no data yet." (Whether I'm fetching it right now, or the query is paused/disabled).
*   **`isLoading`**: "I have no data yet **AND** a network request is happening *right now* to get it." (`isPending && isFetching`).

When a query is explicitly paused using the `enabled: false` property (e.g., waiting for user search input):
*   `isPending = true`
*   `isLoading = false`

You should use `isLoading` to trigger your initial loading spinners to avoid infinite spinners when a query is intentionally paused.

### 13. Declarative Queries vs Imperative Mutations

The two main hooks in TanStack Query serve fundamentally different purposes:

*   **`useQuery` (Declarative):** For **READING** data (`GET`). You just declare it, and it fires automatically when the component mounts. It handles caching, deduplication, and background sync.
*   **`useMutation` (Imperative):** For **CHANGING** data (`POST`, `PUT`, `DELETE`). It does *nothing* on mount. It gives you a `mutate` function that you trigger manually (e.g., when a user clicks a button). It does not cache the result.

---

### 14. Architecture: Lifting State Up & `FormData`

Building "Dumb" form components using native DOM APIs is a superior pattern to creating 10 different `useState` hooks for 10 different inputs.

1.  **Uncontrolled Inputs**: Let the HTML `<input>` manage its own text.
2.  **Native `onSubmit`**: Attach a handler to the `<form>` itself.
3.  **The Extraction**: Use `new FormData(event.target)` and `Object.fromEntries()` to instantly convert the entire form into a clean JavaScript object.
4.  **Lifting State Up**: Pass that object upward via a custom `onSubmit` prop to the parent component, so the parent can call the `mutate` function. This keeps network logic decoupled from UI logic.

---

### 15. The UX Redirect Mental Model

After a successful mutation, where should you redirect the user? Apply this mental model:

1.  **Delete (The Destruction Rule)**: If you destroy the page the user is standing on (`/events/123`), you **must** redirect them back to a safe parent list (`/events`).
2.  **Create (The Generation Rule)**: Redirect to the list view OR the details view of the newly created item.
3.  **Modals (The Context Rule)**: Send them back to the exact layout they were looking at before the modal opened.
4.  **Edit (The Flow Rule)**: Stay on the Edit page (with a "Saved" toast) or redirect to the item's Details page. Do not force them entirely back to the home page if they might need to make more tweaks.

---

### 16. The `refetchType: "none"` Gotcha (React Lifecycle)

When you invalidate a query (e.g., after creating an event), TanStack Query immediately fires a background refetch. If you are navigating away immediately, this can cause an unnecessary double-fetch.
Adding `refetchType: "none"` tells the cache: *"Mark this as stale, but DO NOT fetch it right now."*

**The Senior Lifecycle Gotcha:**
*   If you invalidate with `"none"`, and the target page was **already mounted in the background** (like a page sitting behind a Modal), it will **NOT** refetch automatically, leaving the user with stale data until they focus the window!
*   If the target page was **unmounted** (like entirely switching routes from `/events/123` back to `/events`), using `"none"` is perfect. When the page mounts again, React Query's default `refetchOnMount: true` behavior will trigger the fetch automatically, completely safely.

### 17. The 5 Logical Steps of Optimistic Updating

Optimistic Updating is a UI pattern where you assume a network mutation will succeed and update the screen instantly (like the Instagram "Like" button), hiding the network latency from the user. Under the hood, it follows 5 strict logical steps:

1. **The Trigger & Intercept**: User clicks save. You intercept the action using `onMutate` and **cancel** any background `GET` requests (`cancelQueries`) so they don't resolve late and overwrite your fake data.
2. **The Backup (Snapshot)**: You take a snapshot of the current known-good data in the cache (`getQueryData`) and hold onto it inside the `context` object.
3. **The Fake-Out**: You forcefully overwrite local memory (`setQueryData`) with the user's new input. The UI updates instantly.
4. **The Rollback (`onError`)**: If the backend rejects the request (e.g., no internet), you retrieve your backup from Step 2 and push it back into the cache to revert the UI.
5. **The Final Sync (`onSettled`)**: Regardless of success or failure, you invalidate the query at the very end to force TanStack Query to fetch the absolute truth from the database.

### 18. `cancelQueries` Internals

`await queryClient.cancelQueries({ queryKey: [...] })` acts as a laser-guided sniper. 
It does **not** cancel all network requests. It **only** targets background `useQuery` operations fetching that exact `queryKey`. It works by finding the active `AbortController` for that query and calling `.abort()`, immediately severing the browser's TCP connection. You must `await` it to guarantee the fetch is dead before you inject your optimistic data.

### 19. Cache Access: `useQuery` vs `getQueryData()`

Even if you *know* data is sitting in the global cache, you should almost always use `useQuery` to access it rather than `queryClient.getQueryData()`.

*   **Direct Link Protection**: If a user refreshes the page or uses a direct bookmark, the memory cache is wiped. `getQueryData()` would return `undefined` and crash your form. `useQuery` realizes the cache is empty and safely fires a fetch.
*   **Reactivity**: `useQuery` registers an Observer. If another part of the app updates that exact data, `useQuery` triggers a re-render. `getQueryData()` is a one-time static read.

### 20. The `mutate` Parameter Rule

The structure of what you pass into `mutate()` must perfectly map to what your `mutationFn` expects in your HTTP util file.

If your HTTP function is written as: `export async function updateEvent({ id, event })`
Your mutate call **must** be: `mutate({ id: params.id, event: formData })`
TanStack Query acts as a dumb middleman—it simply takes the exact payload you pass to `mutate` and hands it to the `mutationFn`.

### 21. Pure Query Functions (`queryKey` as Input)

When configuring a `useQuery`, your `queryFn` can be decoupled entirely from external component state. TanStack Query automatically injects a `QueryFunctionContext` object into your fetcher.

Instead of your fetcher looking "outside" for a state variable like `searchterm`, you map it natively through the `queryKey` array:
```javascript
// The setup
queryKey: ["events", { searchTerm: searchterm }]

// The extraction
queryFn: ({ signal, queryKey }) => fetchEvents({ signal, ...queryKey[1] })
```
**Under the Hood:**
1. `queryKey` is the identical array you provided above: `["events", { searchTerm: "..." }]`.
2. `queryKey[1]` grabs the exact object containing your configuration at index 1.
3. The Spread Operator (`...`) cracks open that object and pastes its properties directly inside the new argument for `fetchEvents`.

**Why?** This ensures your `queryFn` is a strict **Pure Function**. It relies 100% on TanStack Query state, eliminating hidden dependencies on React component closures and preventing stale closures when components re-render.

### 22. React Router Integration (Render-as-You-Fetch)

You can achieve flawless UX (zero layout shifts or loading spinners) by merging React Router navigation guards with the TanStack Query cache.

1. **The Global Client**: You must instantiate `new QueryClient()` in a standard JS file (like `http.js`) and export it, so it can be accessed outside of React's component tree.
2. **The Loader Fetch (`fetchQuery`)**: React Router `loaders` are standard JS functions; they cannot use hooks. You use `queryClient.fetchQuery(...)` which returns a Promise. React Router naturally `awaits` this promise, fetching the data in the background and populating the cache *before* transitioning the page.
3. **The UX Magic**: Once React Router transitions the page, your component mounts and its `useQuery` hook fires. Because the data is already securely in the cache from the `loader`, it renders instantly. 
4. **Mutations vs Actions**: While React Router has `action` functions, it is an industry best practice to stick to TanStack Query's `useMutation`. It provides superior scalpel-like control over the cache (via `invalidateQueries` and Optimistic Updating) compared to React Router's blunt-force page-level revalidation.

### 23. The 4 Automatic Refetch Triggers

TanStack Query acts as an aggressive watchdog to provide a "Zero-Effort Realtime UI", mimicking native iOS/Android apps. It automatically triggers background fetches (if data is marked `stale`) based on 4 events:

1. **`refetchOnMount`**: A new component subscribes to the data.
2. **`refetchOnWindowFocus`**: The user leaves the browser tab/app and returns.
3. **`refetchOnReconnect`**: The browser loses internet connection and regains it.
4. **Manual Invalidation**: You explicitly run `queryClient.invalidateQueries(...)` after a mutation.

### 24. The `fetchQuery` Stale Time Trap

When utilizing the **Render-as-You-Fetch** pattern, you might notice your app feeling sluggish or "frozen" when clicking a link. This happens because TanStack Query's default `staleTime` is `0`. 

**The Problem:**
Inside your React Router loader, `queryClient.fetchQuery(...)` looks at the cache. Even if the data is there, because `staleTime=0`, it assumes the data is dead. It refuses to resolve the Promise until it fetches fresh data from the backend. Since the Promise doesn't resolve, React Router blocks the page transition. The UI freezes.

**The Solution:**
You must pass a manual `staleTime` directly into the loader's `fetchQuery`:
```javascript
export function loader({ params }) {
  return queryClient.fetchQuery({
    queryKey: ["events", params.id],
    queryFn: ({ signal }) => fetchEvent({ id: params.id, signal }),
    staleTime: 10000, 
  });
}
```
If the cached data is less than 10 seconds old, `fetchQuery` resolves **instantly**. React Router transitions the page instantly. Then, once the target component mounts, its internal `useQuery` hook (which still behaves under default rules) will silently fire a background fetch to ensure the data is perfectly synced, resulting in the ultimate user experience.

---

## 🏗️ Key Refactoring: `useEffect` → `useQuery`

The core transformation in `NewEventsSection.jsx`:

**Before (39 lines, 3 states, manual lifecycle):**
```javascript
const [data, setData] = useState();
const [error, setError] = useState();
const [isLoading, setIsLoading] = useState(false);

useEffect(() => {
  // ... fetch logic, error handling, finally block
}, []);
```

**After (4 lines, zero manual state):**
```javascript
import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from '../../util/http.js';

const { data, isLoading, error } = useQuery({
  queryKey: ['events'],
  queryFn: fetchEvents,
});
```

The `fetchEvents` function was also extracted to `src/util/http.js` as a **reusable, pure async function** — following the **Separation of Concerns** principle.

---

## 🔧 Setup

```javascript
// App.jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
```
