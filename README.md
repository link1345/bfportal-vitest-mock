# bfportal-vitest-mock

![NPM Version](https://img.shields.io/npm/v/bfportal-vitest-mock)
![NPM License](https://img.shields.io/npm/l/bfportal-vitest-mock)
![NPM Downloads](https://img.shields.io/npm/dw/bfportal-vitest-mock)
![GitHub last commit](https://img.shields.io/github/last-commit/link1345/bfportal-vitest-mock)
![Discord](https://img.shields.io/discord/1329272750099136552)

> [※ 日本語説明ページはこちらです。](./README-JP.md)

`bfportal-vitest-mock` is a mocking tool that makes it easier to unit test Battlefield 6 Portal (BF Portal) TypeScript scripts with Vitest.

- Mocks the global `mod` namespace
- Automatically generates a list of functions from the BF Portal SDK `.d.ts`
- When the SDK version changes, you just re-run `generate` to catch up

> ⚠️ **Note**  
> This library does **not** redistribute the BF Portal SDK `.d.ts`.  
> Please provide the SDK `.d.ts` file in your own project before using this.


## Installation

Install as a development dependency:

```bash
npm install -D bfportal-vitest-mock vitest typescript
```

If you already have `vitest` or `typescript` installed, they will not be reinstalled, so you can just run this command as-is.

In your project, place the BF Portal SDK `.d.ts` file somewhere appropriate (for example: `./code/mod/index.d.ts`).


## Usage Overview

The basic flow is as follows:

1. Prepare the SDK `.d.ts`
2. Run the `generate` CLI command to create a project-specific support file
3. Call `setupBfPortalMock` in a test setup file
4. Use `modMock` from each test to verify behavior


### 1. Prepare the SDK `.d.ts`

Place the official BF Portal SDK `index.d.ts` inside your project.

#### Example:

```txt
your-project/
  code/
    mod/
      index.d.ts   // ← Put the BF Portal SDK here
  test/
    src/
      ...
```

Use this file **only inside your own project**, and make sure you do **not** redistribute it via npm or any other channel.


### 2. Generate the Support File (`generate`)

Use the CLI provided by `bfportal-vitest-mock` to read function information from the SDK and generate a project-specific support file.

```bash
npx bfportal-vitest-mock generate \
  --sdk ./code/mod/index.d.ts \
  --out ./test-support/bfportal-vitest-mock.generated.ts
```

- `--sdk`  
  Path to the BF Portal SDK `.d.ts` file

- `--out`  
  Output path of the generated TypeScript file  
  (in the example: `./test-support/bfportal-vitest-mock.generated.ts`)

The generated file contains, for example:

- `modFnNames` … List of function names defined on `mod` in the SDK
- `BfPortalMod` … Type corresponding to `typeof mod`
- `BfPortalModMock` … Type of the mocked `mod`
- `BfPortalModImpls` … Type used to provide default implementations
- `createBfPortalModMock` / `setupBfPortalMock` … Functions that actually create and install the mocks

🔁 **When you update the SDK**  
After replacing `index.d.ts` with a new version, run the `generate` command again.


### 3. Mocking `mod` in Test Setup

Create a Vitest setup file and call `setupBfPortalMock` there.

Example: `test/setup/bfportal.ts`

```ts
import {
  setupBfPortalMock,
  type BfPortalModMock,
} from "../test-support/bfportal-vitest-mock.generated";
import stringkeys from "../src/strings.json"; // Example JSON for stringkeys

export let modMock: BfPortalModMock;

beforeEach(() => {
  // Default implementations for functions (only what you need)
  modMock = setupBfPortalMock(
    {
      GetObjId: () => 1,
      // Message can be implemented as one function that covers all overloads
      Message(msg, arg0, arg1, arg2) {
        return {
          __test: true,
          msg,
          args: [arg0, arg1, arg2],
        } as unknown as mod.Message;
      },
    },
  );

  // Non-function members (e.g. mod.stringkeys) can be assigned directly
  (modMock as any).stringkeys = stringkeys;
});
```

#### Example Vitest config (`vitest.config.ts`)

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["test/setup/bfportal.ts"],
    environment: "node",
  },
});
```


### 4. Using It in Test Code

In each test file, you can simply use `mod` and `modMock` as usual.

```ts
// test/src/WarFactory.test.ts
import { describe, it, expect } from "vitest";
import { modMock } from "../setup/bfportal";
import { OnPlayerJoinGame } from "../../src/WarFactory";

describe("OnPlayerJoinGame", () => {
  it("shows a message when a player joins the game", async () => {
    const fakePlayer = { __test: true } as unknown as mod.Player;

    await OnPlayerJoinGame(fakePlayer);

    // Verify that the mock was called
    expect(modMock.DisplayNotificationMessage).toHaveBeenCalled();

    // If you want to inspect the arguments passed to Message
    const msgCalls = modMock.Message.mock.calls;
    // Example: check the first argument of the first call
    expect(msgCalls[0][0]).toBe(modMock.stringkeys.hello);
  });
});
```

`globalThis.mod` is automatically set inside `setupBfPortalMock`.

`modMock` is a reference to the same underlying object, so you can directly use Vitest's mock APIs, for example:

- `modMock.GetObjId.mockReturnValueOnce(...)`
- `expect(modMock.Message).toHaveBeenCalledTimes(1)`


## Example Usage

This repository includes several working sample tests:

- Test code examples: `test/src/*.test.ts`
- Sample scripts under test: `src/*.ts`
- Example of a generated file for `bfportal-vitest-mock`: `test-support/bfportal-vitest-mock.generated.ts`

For concrete examples of how to write tests, how to mock `mod.stringkeys`, and how to handle the overloads of `mod.Message`, please check the files under `test/src`.
