import fs from "fs";
import YAML from "yaml";
export function loadPolicy(path) {
    const raw = fs.readFileSync(path, "utf8");
    return YAML.parse(raw);
}
//# sourceMappingURL=load.js.map