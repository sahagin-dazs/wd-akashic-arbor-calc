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

export default defineConfig({
  plugins: [vue()],
  base: basePath,
  build: {
    outDir: "dist"
  }
});
