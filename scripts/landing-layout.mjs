// After npm run build:landing: the pages at the addresses GitHub Pages serves, landing.html as the site's index.html
// and practice.html as practice/index.html (so the address is .../practice/).
import { mkdirSync, renameSync } from "node:fs";

renameSync("dist-landing/landing.html", "dist-landing/index.html");
mkdirSync("dist-landing/practice", { recursive: true });
renameSync("dist-landing/practice.html", "dist-landing/practice/index.html");
