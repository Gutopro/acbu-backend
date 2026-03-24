import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { config } from "./env";
import { logger } from "./logger";

const useAccelerate = Boolean(config.prismaAccelerateUrl);
const databaseUrl = useAccelerate
  ? config.prismaAccelerateUrl!
  : config.databaseUrl;

const basePrisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
  log: [
    { level: "query", emit: "event" },
    { level: "error", emit: "stdout" },
    { level: "warn", emit: "stdout" },
  ],
});

export const prisma = useAccelerate
  ? basePrisma.$extends(withAccelerate())
  : basePrisma;

// Log queries in development ($on exists only on base client, not on extended proxy)
if (config.nodeEnv === "development") {
  basePrisma.$on(
    "query" as never,
    (e: { query: string; params: string; duration: number }) => {
      logger.debug("Query", {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
      });
    },
  );
}

// Handle graceful shutdown
process.on("beforeExit", async () => {
  await basePrisma.$disconnect();
});

export default prisma;
