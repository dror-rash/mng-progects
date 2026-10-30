import { schema } from "@repo/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * One test = one request. React's `cache()` only memoizes inside a server render, so here it is replaced
 * by a memo that every test starts empty, the way each request starts with an empty cache.
 */
const requestCaches = vi.hoisted(() => [] as Map<string, unknown>[]);
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <A extends unknown[], R>(fn: (...args: A) => R) => {
    const memo = new Map<string, R>();
    requestCaches.push(memo as Map<string, unknown>);
    return (...args: A) => {
      const key = JSON.stringify(args);
      if (!memo.has(key)) memo.set(key, fn(...args));
      return memo.get(key)!;
    };
  },
}));

const session = { user: { id: "user-1", name: "Dana" } };
const getSession = vi.hoisted(() => vi.fn());
vi.mock("@repo/auth/server", () => ({ getSession }));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

/** A stand-in database: counts membership queries and answers them from `membershipRows`. */
const db = vi.hoisted(() => ({
  membershipQueries: 0,
  membershipRows: [] as unknown[][],
  orderBy: [] as unknown[],
}));
vi.mock("@repo/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/db")>();
  function chain(result: () => unknown): unknown {
    return new Proxy(() => {}, {
      get: (_target, prop) => {
        if (prop === "then") {
          return (resolve: (value: unknown) => void, reject: (error: unknown) => void) =>
            Promise.resolve().then(result).then(resolve, reject);
        }
        if (prop === "orderBy") {
          return (...args: unknown[]) => {
            db.orderBy = args;
            return chain(result);
          };
        }
        return () => chain(result);
      },
    });
  }
  const fake = {
    select: () =>
      chain(() => {
        db.membershipQueries += 1;
        // Answers in turn, then keeps answering with the last one.
        return (db.membershipRows.length > 1 ? db.membershipRows.shift() : db.membershipRows[0]) ?? [];
      }),
    insert: () => chain(() => [{ id: "created" }]),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(fake),
  };
  return { ...actual, getDb: () => fake };
});

const { listMemberships } = await import("./queries");
const { requireWorkspace, requireWorkspaceForAction } = await import("./require-workspace");

function membership(workspaceId: string, name: string, joinedAt = new Date("2026-01-01")) {
  return { workspaceId, role: "admin", joinedAt, name };
}

beforeEach(() => {
  for (const memo of requestCaches) memo.clear();
  getSession.mockReset().mockResolvedValue(session);
  db.membershipQueries = 0;
  db.membershipRows = [];
});

describe("request-scoped lookups", () => {
  it("looks up the session and the memberships once per page load", async () => {
    db.membershipRows = [[membership("ws-1", "Dana's workspace")]];

    await requireWorkspace("/");
    await requireWorkspace("/");
    await listMemberships(session.user.id);

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(db.membershipQueries).toBe(1);
  });

  it("shares the session and memberships between a page and an action check in the same request", async () => {
    db.membershipRows = [[membership("ws-1", "Dana's workspace")]];
    const form = new FormData();
    form.set("workspaceId", "ws-1");

    await requireWorkspace("/");
    await requireWorkspaceForAction(form);

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(db.membershipQueries).toBe(1);
  });

  it("reads the memberships again after creating the first workspace, so it isn't stale", async () => {
    db.membershipRows = [[], [membership("personal-user-1", "Dana's workspace")]];

    const { workspace } = await requireWorkspace("/");
    const memberships = await listMemberships(session.user.id);

    expect(workspace.id).toBe("personal-user-1");
    expect(memberships.map((m) => m.workspaceId)).toEqual(["personal-user-1"]);
    expect(db.membershipQueries).toBe(2);
  });

  it("orders memberships by join time, then by workspace id", async () => {
    await listMemberships(session.user.id);

    const columns = db.orderBy.map((order) => (order as { queryChunks: unknown[] }).queryChunks.find((c) => c !== undefined && typeof c === "object" && "name" in (c as object)));
    expect(columns).toEqual([schema.workspaceMember.joinedAt, schema.workspaceMember.workspaceId]);
  });
});
