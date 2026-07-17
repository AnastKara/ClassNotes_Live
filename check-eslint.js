import { execSync } from "child_process";
import fs from "fs";
try {
  const result = execSync("npx eslint env.mjs 2>&1", { encoding: "utf8", stdio: "pipe" });
  fs.writeFileSync("eslint-output.txt", result);
} catch (e) {
  fs.writeFileSync("eslint-output.txt", e.stdout || e.message);
}
