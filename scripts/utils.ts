import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

//  __dirname is not defined in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const r = (...args: string[]) =>
  resolve(__dirname, "..", ...args).replace(/\\/g, "/");
