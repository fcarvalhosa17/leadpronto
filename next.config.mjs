import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 15 movido de experimental.serverComponentsExternalPackages
  serverExternalPackages: ["@prisma/client", "playwright"],
  // Existe outro lockfile em D:\CLaude\package-lock.json (ambiente do usuario);
  // ancoramos o tracing aqui para o build nao escolher pasta errada.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
