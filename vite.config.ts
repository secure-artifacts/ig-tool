import { r } from "./scripts/utils";
import { extId } from "./src/const";
import manifest from "./src/manifest";
import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { ViteWebExtKits } from "@webextkits/vite-plugins";
import getPort from "get-port";
import { defineConfig, PluginOption} from "vite";

const port = await getPort();

export default defineConfig({
  //  https://github.com/crxjs/chrome-extension-tools/issues/746
  server: {
    strictPort: true,
    port: port,
    hmr: {
      clientPort: port,
    },
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization",
    },
  },
  resolve: {
    alias: [
      {
        find: "@",
        replacement: r("src"),
      },
    ],
  },
  build: {
    rollupOptions: {
      output: {
        // 禁用自动代码拆分，保持文件结构稳定
        manualChunks: undefined,
      },
    },
  },
  plugins: [
    ViteWebExtKits({
      extensionId: extId,
      externals: ["antd/locale/zh_CN"],
    }) as PluginOption,
    crx({ manifest }),
    react({
      jsxRuntime: "automatic",
    }),
  ],
});
