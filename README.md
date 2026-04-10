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
