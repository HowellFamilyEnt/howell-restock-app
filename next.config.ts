import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default Server Action body limit is 1MB, which a single phone camera
    // photo already exceeds - notes allow multiple photos per submission.
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
