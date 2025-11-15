# bfportal-vitest-mock

> [※ Here is the English description of this repository.](./README-EN.md)

Battlefield 6 Portal（BF Portal）の TypeScript スクリプトを、Vitest でユニットテストしやすくするためのモックツールです。

- グローバルな `mod` 名前空間をまるごとモック
- BF Portal SDK の `.d.ts` から関数一覧を自動生成
- SDK のバージョンが変わっても、`generate` を叩き直すだけで追従

を目的としたライブラリです。

> ⚠️ **注意**  
> このライブラリは BF Portal SDK の `.d.ts` を **再配布しません**。  
> 自分のプロジェクトに SDK の `.d.ts` を用意した上で利用してください。


## インストール方法

開発用依存としてインストールします。

```bash
npm install -D bfportal-vitest-mock vitest typescript
```

すでに vitest や typescript を入れている場合は、重複インストールされないのでそのままでOKです。

プロジェクト側には、BF Portal SDK の `.d.ts` を配置してください（例：`./code/mod/index.d.ts`）。

## 使い方の流れ
基本的な流れは以下の通りです。

1. SDK の `.d.ts` を用意する
2. CLI で `generate` を実行して、プロジェクト専用のサポートファイルを生成する
3. テスト用のセットアップファイルで `setupBfPortalMock` を呼ぶ
4. 各テストから `modMock` を使って、挙動を確認する

### 1. SDK の .d.ts を用意する
公式から配布されている BF Portal SDK の index.d.ts を、プロジェクト内に配置します。

#### 例:

```txt
your-project/
  code/
    mod/
      index.d.ts   // ← ここに BF Portal SDK を置く
  test/
    src/
      ...
```

このファイルは 自分のプロジェクト内だけ で使い、npm などで再配布しないようにしてください。

### 2. サポートファイルの生成（generate）
`bfportal-vitest-mock` が提供する CLI を使って、SDK から関数一覧などを読み取り、
プロジェクト専用のサポートファイルを生成します。

```bash
    npx bfportal-vitest-mock generate \
    --sdk ./code/mod/index.d.ts \
    --out ./test-support/bfportal-vitest-mock.generated.ts
```

* `--sdk`
BF Portal SDK の `.d.ts` へのパス

* `--out`
生成される TypeScript ファイルの出力先
（例では `./test-support/bfportal-vitest-mock.generated.ts`）

生成されたファイルには、例えば以下のようなものが含まれます：

* `modFnNames` … SDK に定義されている `mod` の関数名一覧
* `BfPortalMod` … `typeof mod` に対応する型
* `BfPortalModMock` … モックされた mod の型
* `BfPortalModImpls` … デフォルト実装用の型
* `createBfPortalModMock` / `setupBfPortalMock` … 実際にモックを生成・インストールする関数

🔁 SDK を更新したら
`index.d.ts` を新しいバージョンに差し替えたあと、再度 `generate` コマンドを実行してください。

### 3. テストセットアップで mod をモックする
Vitest 用のセットアップファイルを用意し、そこで `setupBfPortalMock` を呼び出します。

例：`test/setup/bfportal.ts`

```ts
import {
  setupBfPortalMock,
  type BfPortalModMock,
} from "../test-support/bfportal-vitest-mock.generated";
import stringkeys from "../src/strings.json"; // stringkeys 用の JSON 例

export let modMock: BfPortalModMock;

beforeEach(() => {
  // 関数のデフォルト実装（必要なものだけ）
  modMock = setupBfPortalMock(
    {
      GetObjId: () => 1,
      // Message はオーバーロードをまとめた実装で書くこともできます
      Message(msg, arg0, arg1, arg2) {
        return {
          __test: true,
          msg,
          args: [arg0, arg1, arg2],
        } as unknown as mod.Message;
      },
    },
  );

  // 非関数メンバ（例: mod.stringkeys）は直接差し込む
  (modMock as any).stringkeys = stringkeys;
});
```

#### Vitest 側の設定例（vitest.config.ts）：

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["test/setup/bfportal.ts"],
    environment: "node",
  },
});
```

### 4. テストコードからの使い方
あとは各テストファイルで、普通に mod と modMock を使ってテストを書くだけです。

```ts
// test/src/WarFactory.test.ts
import { describe, it, expect } from "vitest";
import { modMock } from "../setup/bfportal";
import { OnPlayerJoinGame } from "../../src/WarFactory";

describe("OnPlayerJoinGame", () => {
  it("ゲーム内にプレイヤーが参加したら、メッセージを出す", async () => {
    const fakePlayer = { __test: true } as unknown as mod.Player;

    await OnPlayerJoinGame(fakePlayer);

    // モックの呼び出しを検証する
    expect(modMock.DisplayNotificationMessage).toHaveBeenCalled();

    // Message の引数を確認したい場合など
    const msgCalls = modMock.Message.mock.calls;
    // 例: 最初の呼び出しの第1引数を確認
    expect(msgCalls[0][0]).toBe(modMock.stringkeys.hello);
  });
});
```
`globalThis.mod` は `setupBfPortalMock` 内で自動的に差し込まれます

`modMock` はその実体への参照なので、

`modMock.GetObjId.mockReturnValueOnce(...)`

`expect(modMock.Message).toHaveBeenCalledTimes(1)`
など、Vitest のモック API をそのまま使えます

書き方の見本
このリポジトリには、実際に動作するサンプルテストをいくつか用意しています。

テストコード例: `test/src/*.test.ts`

テスト対象のサンプルスクリプト: `src/*.ts`

`bfportal-vitest-mock` 用の生成ファイル例: `test-support/bfportal-vitest-mock.generated.ts`

具体的なテストの書き方や、`mod.stringkeys` のモック方法、`mod.Message` のオーバーロードをどう扱っているかなどは、
`test/src` 以下のファイルを参考にしてみてください。

## まとめ
`bfportal-vitest-mock` は BF Portal の mod を Vitest でモックしやすくするためのツールです。

SDK の `.d.ts` を渡して `generate` することで、バージョンごとに対応したモック環境を自動生成します。

テストセットアップで `setupBfPortalMock` を呼べば、あとは `mod` と `modMock` を使って普段どおりテストを書くだけです。

細かい使い方や拡張の仕方は、`test/src` のサンプルやソースコードを参考にしてください。