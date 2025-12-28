import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const repoName = process.env.GITHUB_REPOSITORY
  ? process.env.GITHUB_REPOSITORY.split("/")[1]
  : "";

const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === "true" && repoName;
const usingRootDomain =
  repoName !== "" && repoName.toLowerCase().endsWith(".github.io");

const basePath =
  isGitHubPagesBuild && !usingRootDomain ? `/${repoName}/` : "/";
const appVersion = process.env.npm_package_version || "0.0.0";

export default defineConfig({
  plugins: [vue()],
  base: basePath,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  build: {
    outDir: "dist"
  }
});
