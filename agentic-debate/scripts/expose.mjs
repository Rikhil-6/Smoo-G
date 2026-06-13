import fs from "node:fs";
import path from "node:path";
import localtunnel from "localtunnel";

const port = Number(process.env.EXPOSE_PORT || 3000);
const subdomain = process.env.EXPOSE_SUBDOMAIN || undefined;
const dataDir = path.join(process.cwd(), ".data");
const configFile = path.join(dataDir, "runtime-config.json");

function saveRuntimeConfig(publicUrl) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const current = fs.existsSync(configFile)
    ? JSON.parse(fs.readFileSync(configFile, "utf8"))
    : {};
  const nextConfig = {
    ...current,
    publicUrl,
    updatedAt: Date.now(),
  };
  fs.writeFileSync(configFile, JSON.stringify(nextConfig), "utf8");
}

async function main() {
  const tunnel = await localtunnel({ port, subdomain });

  saveRuntimeConfig(tunnel.url);
  console.log(`Public tunnel active: ${tunnel.url}`);
  console.log("QR codes now use this URL via /api/network-url.");
  console.log("Press Ctrl+C to stop.");

  tunnel.on("close", () => {
    console.log("Tunnel closed.");
  });

  process.on("SIGINT", async () => {
    try {
      await tunnel.close();
    } finally {
      process.exit(0);
    }
  });
}

main().catch((error) => {
  console.error("Failed to start tunnel:", error);
  process.exit(1);
});

