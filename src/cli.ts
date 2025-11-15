#!/usr/bin/env node
import { generateModSupport } from "./generate.js";

function printHelp() {
    console.log(
        `bfportal-vitest-mock CLI

Usage:
  bfportal-vitest-mock generate --sdk <path/to/index.d.ts> [--out <output.ts>] [--namespace mod]

Options:
  --sdk        Path to BF Portal SDK .d.ts file (required)
  --out        Output .ts file path (default: ./test-support/bfportal-vitest-mock.generated.ts)
  --namespace  Namespace name for SDK (default: mod)
`,
    );
}

function main() {
    const args = process.argv.splice(2);
    const cmd = args.at(0);

    if (!cmd || cmd === "--help" || cmd === "-h") {
        printHelp();
        process.exit(0);
    }

    if (cmd !== "generate") {
        console.error(`Unknown command: ${cmd}`);
        printHelp();
        process.exit(1);
    }

    let sdkPath: string | undefined;
    let outPath = "./test-support/bfportal-vitest-mock.generated.ts";
    let namespaceName = "mod";

    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--sdk") {
            sdkPath = args[++i];
        } else if (arg === "--out") {
            outPath = args[++i];
        } else if (arg === "--namespace") {
            namespaceName = args[++i];
        } else {
            console.warn(`Unknown option: ${arg}`);
        }
    }

    if (!sdkPath) {
        console.error("Error: --sdk <path/to/index.d.ts> is required.");
        printHelp();
        process.exit(1);
    }

    generateModSupport({
        sdkPath,
        outPath,
        namespaceName,
    });
}

main();
