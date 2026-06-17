/**
 * 处理打包后的 zip
 */
import { description, version } from "../package.json";
import { r } from "./utils";
import archiver from "archiver";
import { createWriteStream, existsSync } from "fs";
import fs from "fs-extra";

const folderPath = r("dist");
const folderName = description + version;
const tmpFolder = r(`${folderName}.zip`);

(() => {
  if (existsSync(folderPath)) {
    fs.removeSync(tmpFolder);
    //  zip
    const output = createWriteStream(tmpFolder);

    output.on("close", function () {
      const destPath = folderPath + `/${folderName}.zip`;
      //  copy
      fs.removeSync(destPath);
      fs.moveSync(tmpFolder, destPath);
    });

    const archive = archiver("zip");
    archive.pipe(output);
    archive.directory(folderPath + "/", folderName);
    archive.finalize();
  }
})();

function getNumberStr(n) {
  if (n < 10) return "0" + n;
  return n + "";
}
function getDate() {
  let d = new Date();
  return `${getNumberStr(d.getMonth() + 1)}.${getNumberStr(d.getDate())}`;
}
