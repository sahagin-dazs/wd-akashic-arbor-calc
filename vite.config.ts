import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const basePath =
  process.env.GITHUB_PAGES === "true" ? "/wd-akashic-arbor-calc/" : "/";

export default defineConfig({
  plugins: [vue()],
  base: basePath,
  build: {
    outDir: "dist"
  }
});
