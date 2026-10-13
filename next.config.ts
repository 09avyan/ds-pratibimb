import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: { useTypeScriptCli: false },
};

export default config;
