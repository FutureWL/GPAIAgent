import type { NextConfig } from "next";

class DuplicateServerChunkPlugin {
  apply(compiler: any) {
    compiler.hooks.thisCompilation.tap('DuplicateServerChunkPlugin', (compilation: any) => {
      const stage = compiler.webpack?.Compilation?.PROCESS_ASSETS_STAGE_ADDITIONAL ?? 0;
      compilation.hooks.processAssets.tap({ name: 'DuplicateServerChunkPlugin', stage }, (assets: any) => {
        for (const name of Object.keys(assets)) {
          const match = name.match(/^chunks\/(\d+)\.js$/);
          if (!match) continue;
          const target = `${match[1]}.js`;
          if (!assets[target]) {
            compilation.emitAsset(target, assets[name]);
          }
        }
      });
    });
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = config.plugins ?? [];
      config.plugins.push(new DuplicateServerChunkPlugin());
    }
    return config;
  },
};

export default nextConfig;
