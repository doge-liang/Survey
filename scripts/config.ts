import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { Config, LLMConfig } from "./types";

const defaultLLMConfig: LLMConfig = {
  provider: "openai",
  baseURL: "https://api.moonshot.cn/v1",
  model: "moonshot-v1-8k",
  maxTokens: 2000,
  temperature: 0.3,
};

const defaultConfig: Config = {
  llm: defaultLLMConfig,
  githubDir: "./github",
  outputFile: "./github/metadata.json",
};

export function loadConfig(): Config {
  const configPath = join(process.cwd(), "github-index.config.json");

  let config = { ...defaultConfig };

  if (existsSync(configPath)) {
    const fileContent = readFileSync(configPath, "utf-8");
    const fileConfig = JSON.parse(fileContent);
    config = { ...config, ...fileConfig };
  }

  // Override with environment variable
  if (process.env.KIMI_API_KEY) {
    config.llm.apiKey = process.env.KIMI_API_KEY;
  }

  return config;
}

export { defaultConfig };

// CLI test
if (import.meta.main) {
  const config = loadConfig();
  console.log(JSON.stringify(config, null, 2));
}
