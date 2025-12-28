import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const repoName = process.env.GITHUB_REPOSITORY
  ? process.env.GITHUB_REPOSITORY.split("/")[1]
  : "";

const deployTarget = process.env.DEPLOY_TARGET || "";
const isGitHubPagesBuild =
  process.env.GITHUB_ACTIONS === "true" &&
  repoName &&
  deployTarget === "github-pages";
const usingRootDomain =
  repoName !== "" && repoName.toLowerCase().endsWith(".github.io");

const explicitBase = process.env.VITE_BASE_PATH || "";
const basePath = explicitBase
  ? explicitBase
  : isGitHubPagesBuild && !usingRootDomain
    ? `/${repoName}/`
    : "/";
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
