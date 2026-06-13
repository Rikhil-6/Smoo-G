import fs from "fs";
import path from "path";

export interface RuntimeConfig {
  publicUrl?: string;
  apiBaseUrl?: string;
  updatedAt?: number;
}

const dataDir = path.join(process.cwd(), ".data");
const configFile = path.join(dataDir, "runtime-config.json");

function ensureConfigFile(): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, "{}", "utf8");
  }
}

export function readRuntimeConfig(): RuntimeConfig {
  ensureConfigFile();
  try {
    const raw = fs.readFileSync(configFile, "utf8");
    const parsed = JSON.parse(raw) as RuntimeConfig;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeRuntimeConfig(config: RuntimeConfig): RuntimeConfig {
  ensureConfigFile();
  const normalized: RuntimeConfig = {
    ...config,
    updatedAt: Date.now(),
  };
  fs.writeFileSync(configFile, JSON.stringify(normalized), "utf8");
  return normalized;
}

