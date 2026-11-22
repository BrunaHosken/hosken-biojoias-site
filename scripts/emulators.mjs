import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { javaEnvironment } from "./java.mjs";
const test = process.argv.includes("--test");
const args = test
  ? [
      "emulators:exec",
      "--project",
      "demo-hosken",
      "--only",
      "firestore",
      "node --test tests/firestore.test.mjs",
    ]
  : [
      "emulators:start",
      "--project",
      "demo-hosken",
      "--only",
      "auth,firestore,functions,storage",
      "--export-on-exit=.emulator-data",
    ];
if (!test && existsSync(".emulator-data/firebase-export-metadata.json"))
  args.push("--import=.emulator-data");
const child = spawn(
  process.execPath,
  ["node_modules/firebase-tools/lib/bin/firebase.js", ...args],
  {
    stdio: "inherit",
    env: javaEnvironment(),
    detached: process.platform !== "win32",
  },
);
// Encaminhar sinais de encerramento ao CLI para que exporte os dados antes de sair.
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "SIGQUIT"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
