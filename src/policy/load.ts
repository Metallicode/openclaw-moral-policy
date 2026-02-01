import fs from "fs";
import YAML from "yaml";

export function loadPolicy(path: string): any {
  const raw = fs.readFileSync(path, "utf8");
  return YAML.parse(raw);
}
