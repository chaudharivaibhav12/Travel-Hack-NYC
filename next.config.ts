import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Next 16 writes its own AGENTS.md and a CLAUDE.md stub on dev/build.
   * MasterPrompt §0 reserves CLAUDE.md for a copy of the MasterPrompt itself,
   * so leaving this on would silently overwrite the team's agent rules with
   * Next's boilerplate on every run.
   */
  agentRules: false,
};

export default nextConfig;
