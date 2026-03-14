import { defineConfig } from "vite";
import { netlifyEdgeAdapter } from "@builder.io/qwik-city/adapters/netlify-edge/vite";
import { extendConfig } from "@builder.io/qwik-city/vite";
import baseConfig from "../../vite.config";

export default extendConfig(baseConfig, () => {
  return defineConfig({
    build: {
      ssr: true,
      rollupOptions: {
        input: ["src/entry.netlify-edge.tsx", "@qwik-city-plan"],
      },
    },
    plugins: [netlifyEdgeAdapter()],  // <-- this generates the missing file
  });
});