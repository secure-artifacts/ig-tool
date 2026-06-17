import { r } from "./utils";
import fs from "fs-extra";
import icongen from "icon-gen";

const logoPath = r("public/assets/logo.png");
const outputPath = r("public/assets/");
fs.ensureDirSync(outputPath);

icongen(logoPath, outputPath, {
  report: false,
  favicon: {
    name: "logo-",
    pngSizes: [16, 19, 32, 38, 48, 128],
    icoSizes: [16, 19, 32, 38, 48, 128],
  },
});

console.log("logo sets built done!");
