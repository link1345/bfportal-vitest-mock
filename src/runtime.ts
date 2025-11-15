// src/runtime.ts
import { vi, type MockInstance } from "vitest";

// Helper: if T is a function type, keep it; otherwise resolve to never
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FnOf<T> = T extends (...args: any[]) => any ? T : never;

/**
 * Mod: user's `typeof mod`
 * Names: array of keys you want to mock (`readonly (keyof Mod)[]`)
 *
 * For each key K:
 *   - If Mod[K] is a function, the type is MockInstance<Mod[K]>
 *   - If it's not a function, it becomes MockInstance<never> (should not really happen)
 */
export type ModMockFor<
  Mod,
  Names extends readonly (keyof Mod)[]
> = {
    [K in Names[number]]: MockInstance<FnOf<Mod[K]>>;
  };

/**
 * Map of default implementations:
 *   - For each key K, the value is "the function type of Mod[K]" itself.
 *
 * Example: if Mod["GetObjId"] is `(obj: unknown) => number`
 *   then ImplMapFor<Mod, ["GetObjId"]>["GetObjId"]
 *   is also `(obj: unknown) => number`
 */
export type ImplMapFor<
  Mod,
  Names extends readonly (keyof Mod)[]
> = {
    [K in Names[number]]?: FnOf<Mod[K]>;
  };

/**
 * Create a mock object from:
 *   - a list of function names
 *   - optional default implementations
 */
export function createModMockFor<
  Mod,
  Names extends readonly (keyof Mod)[]
>(
  fnNames: Names,
  impls: ImplMapFor<Mod, Names> = {} as ImplMapFor<Mod, Names>,
): ModMockFor<Mod, Names> {
  const mock = {} as Partial<ModMockFor<Mod, Names>>;

  for (const name of fnNames) {
    const impl = impls[name];
    // If an implementation is provided, wrap it with vi.fn; otherwise create an empty mock function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mock as any)[name] = impl
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? vi.fn(impl as any)
      : vi.fn();
  }

  return mock as ModMockFor<Mod, Names>;
}

/**
 * Install the mock object into globalThis.mod and return it
 */
export function setupGlobalModMock<
  Mod,
  Names extends readonly (keyof Mod)[]
>(
  fnNames: Names,
  impls?: ImplMapFor<Mod, Names>,
  extra?: Partial<Mod>,
): ModMockFor<Mod, Names> & Partial<Mod> {
  const mock = createModMockFor<Mod, Names>(
    fnNames,
    impls ?? ({} as ImplMapFor<Mod, Names>),
  );

  const merged = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(extra as any),
    ...mock,
  } as ModMockFor<Mod, Names> & Partial<Mod>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).mod = merged;
  return merged;
}
