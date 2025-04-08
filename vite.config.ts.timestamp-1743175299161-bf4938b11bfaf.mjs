// vite.config.ts
import { defineConfig } from "file:///C:/Users/Christophe/Downloads/project-bolt-github-zbnkjxct/project/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Christophe/Downloads/project-bolt-github-zbnkjxct/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";

// vite-mcp-plugin.ts
import express from "file:///C:/Users/Christophe/Downloads/project-bolt-github-zbnkjxct/project/node_modules/express/index.js";
import fetch from "file:///C:/Users/Christophe/Downloads/project-bolt-github-zbnkjxct/project/node_modules/node-fetch/lib/index.js";
async function mcpFetchHandler(req, res, next) {
  console.log("MCP Fetch handler called:", req.path, req.method);
  if (req.path !== "/api/fetch") {
    return next();
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { url, options = {} } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    console.log("Fetching URL:", url);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    const defaultHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "max-age=0"
    };
    const mergedHeaders = {
      ...defaultHeaders,
      ...options.headers
    };
    const response = await fetch(url, {
      ...options,
      headers: mergedHeaders
    });
    const contentType = response.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else if (contentType.includes("text/html") || contentType.includes("text/plain")) {
      data = await response.text();
    } else {
      const buffer = await response.arrayBuffer();
      const arrayBuffer = Buffer.from(buffer);
      data = arrayBuffer.toString("base64");
    }
    console.log("Fetch successful, status:", response.status);
    return res.status(200).json({
      url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data
    });
  } catch (error) {
    console.error("Error in fetch API:", error);
    return res.status(500).json({
      error: "Failed to fetch the requested URL",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
function mcpFetchPlugin() {
  return {
    name: "vite-plugin-mcp-fetch",
    configureServer(server) {
      server.middlewares.use(express.json());
      server.middlewares.use(mcpFetchHandler);
      server.middlewares.use((req, res, next) => {
        console.log(`Request: ${req.method} ${req.url}`);
        next();
      });
      console.log("\u{1F680} MCP Fetch Server middleware initialized");
    }
  };
}

// vite.config.ts
import express2 from "file:///C:/Users/Christophe/Downloads/project-bolt-github-zbnkjxct/project/node_modules/express/index.js";
import fetch2 from "file:///C:/Users/Christophe/Downloads/project-bolt-github-zbnkjxct/project/node_modules/node-fetch/lib/index.js";
var __vite_injected_original_dirname = "C:\\Users\\Christophe\\Downloads\\project-bolt-github-zbnkjxct\\project";
async function mcpFetchHandler2(req, res) {
  try {
    const { url, options = {} } = req.body;
    if (!url) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "URL is required" }));
      return;
    }
    console.log("Fetching URL:", url);
    const defaultHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "max-age=0"
    };
    const mergedHeaders = {
      ...defaultHeaders,
      ...options.headers
    };
    const response = await fetch2(url, {
      ...options,
      headers: mergedHeaders
    });
    const contentType = response.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else if (contentType.includes("text/html") || contentType.includes("text/plain")) {
      data = await response.text();
    } else {
      const buffer = await response.arrayBuffer();
      const arrayBuffer = Buffer.from(buffer);
      data = arrayBuffer.toString("base64");
    }
    console.log("Fetch successful, status:", response.status);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data
    }));
  } catch (error) {
    console.error("Error in fetch API:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      error: "Failed to fetch the requested URL",
      details: error instanceof Error ? error.message : String(error)
    }));
  }
}
function customMiddlewarePlugin() {
  return {
    name: "custom-middleware-plugin",
    configureServer(server) {
      server.middlewares.use(express2.json());
      server.middlewares.use((req, res, next) => {
        console.log(`Request: ${req.method} ${req.url}`);
        next();
      });
      server.middlewares.use((req, res, next) => {
        if (req.url === "/api/fetch" && req.method === "POST") {
          console.log("Handling /api/fetch request");
          return mcpFetchHandler2(req, res);
        }
        if (req.url === "/api/fetch" && req.method === "OPTIONS") {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");
          res.statusCode = 204;
          res.end();
          return;
        }
        next();
      });
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [
    react(),
    mcpFetchPlugin(),
    customMiddlewarePlugin()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  optimizeDeps: {
    include: ["pexels"]
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAidml0ZS1tY3AtcGx1Z2luLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQ2hyaXN0b3BoZVxcXFxEb3dubG9hZHNcXFxccHJvamVjdC1ib2x0LWdpdGh1Yi16Ym5ranhjdFxcXFxwcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxDaHJpc3RvcGhlXFxcXERvd25sb2Fkc1xcXFxwcm9qZWN0LWJvbHQtZ2l0aHViLXpibmtqeGN0XFxcXHByb2plY3RcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0NocmlzdG9waGUvRG93bmxvYWRzL3Byb2plY3QtYm9sdC1naXRodWItemJua2p4Y3QvcHJvamVjdC92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZywgUGx1Z2luIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgbWNwRmV0Y2hQbHVnaW4gZnJvbSAnLi92aXRlLW1jcC1wbHVnaW4nO1xuaW1wb3J0IGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgeyBSZXF1ZXN0LCBSZXNwb25zZSB9IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IGZldGNoIGZyb20gJ25vZGUtZmV0Y2gnO1xuXG4vLyBNQ1AgRmV0Y2ggaGFuZGxlciBmdW5jdGlvblxuYXN5bmMgZnVuY3Rpb24gbWNwRmV0Y2hIYW5kbGVyKHJlcTogUmVxdWVzdCwgcmVzOiBhbnkpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IHVybCwgb3B0aW9ucyA9IHt9IH0gPSByZXEuYm9keTtcblxuICAgIGlmICghdXJsKSB7XG4gICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMDtcbiAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdVUkwgaXMgcmVxdWlyZWQnIH0pKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZygnRmV0Y2hpbmcgVVJMOicsIHVybCk7XG5cbiAgICAvLyBEZWZhdWx0IGhlYWRlcnMgdG8gbWltaWMgYSBicm93c2VyIHJlcXVlc3RcbiAgICBjb25zdCBkZWZhdWx0SGVhZGVycyA9IHtcbiAgICAgICdVc2VyLUFnZW50JzogJ01vemlsbGEvNS4wIChXaW5kb3dzIE5UIDEwLjA7IFdpbjY0OyB4NjQpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS85MS4wLjQ0NzIuMTI0IFNhZmFyaS81MzcuMzYnLFxuICAgICAgJ0FjY2VwdCc6ICd0ZXh0L2h0bWwsYXBwbGljYXRpb24veGh0bWwreG1sLGFwcGxpY2F0aW9uL3htbDtxPTAuOSxpbWFnZS93ZWJwLCovKjtxPTAuOCcsXG4gICAgICAnQWNjZXB0LUxhbmd1YWdlJzogJ2VuLVVTLGVuO3E9MC41JyxcbiAgICAgICdDb25uZWN0aW9uJzogJ2tlZXAtYWxpdmUnLFxuICAgICAgJ1VwZ3JhZGUtSW5zZWN1cmUtUmVxdWVzdHMnOiAnMScsXG4gICAgICAnQ2FjaGUtQ29udHJvbCc6ICdtYXgtYWdlPTAnLFxuICAgIH07XG5cbiAgICAvLyBNZXJnZSBkZWZhdWx0IGhlYWRlcnMgd2l0aCB1c2VyLXByb3ZpZGVkIGhlYWRlcnNcbiAgICBjb25zdCBtZXJnZWRIZWFkZXJzID0ge1xuICAgICAgLi4uZGVmYXVsdEhlYWRlcnMsXG4gICAgICAuLi5vcHRpb25zLmhlYWRlcnMsXG4gICAgfTtcblxuICAgIC8vIFBlcmZvcm0gdGhlIGZldGNoIHJlcXVlc3RcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgLi4ub3B0aW9ucyxcbiAgICAgIGhlYWRlcnM6IG1lcmdlZEhlYWRlcnMsXG4gICAgfSk7XG5cbiAgICAvLyBHZXQgcmVzcG9uc2UgZGF0YVxuICAgIGNvbnN0IGNvbnRlbnRUeXBlID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpIHx8ICcnO1xuICAgIGxldCBkYXRhO1xuXG4gICAgaWYgKGNvbnRlbnRUeXBlLmluY2x1ZGVzKCdhcHBsaWNhdGlvbi9qc29uJykpIHtcbiAgICAgIGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgfSBlbHNlIGlmIChjb250ZW50VHlwZS5pbmNsdWRlcygndGV4dC9odG1sJykgfHwgY29udGVudFR5cGUuaW5jbHVkZXMoJ3RleHQvcGxhaW4nKSkge1xuICAgICAgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRm9yIGJpbmFyeSBkYXRhLCBjb252ZXJ0IHRvIGJhc2U2NFxuICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgcmVzcG9uc2UuYXJyYXlCdWZmZXIoKTtcbiAgICAgIGNvbnN0IGFycmF5QnVmZmVyID0gQnVmZmVyLmZyb20oYnVmZmVyKTtcbiAgICAgIGRhdGEgPSBhcnJheUJ1ZmZlci50b1N0cmluZygnYmFzZTY0Jyk7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coJ0ZldGNoIHN1Y2Nlc3NmdWwsIHN0YXR1czonLCByZXNwb25zZS5zdGF0dXMpO1xuXG4gICAgLy8gUmV0dXJuIHRoZSByZXNwb25zZSB3aXRoIG1ldGFkYXRhXG4gICAgcmVzLnN0YXR1c0NvZGUgPSAyMDA7XG4gICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIHVybCxcbiAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogcmVzcG9uc2Uuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IE9iamVjdC5mcm9tRW50cmllcyhyZXNwb25zZS5oZWFkZXJzLmVudHJpZXMoKSksXG4gICAgICBkYXRhLFxuICAgIH0pKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiBmZXRjaCBBUEk6JywgZXJyb3IpO1xuICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xuICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gZmV0Y2ggdGhlIHJlcXVlc3RlZCBVUkwnLFxuICAgICAgZGV0YWlsczogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXG4gICAgfSkpO1xuICB9XG59XG5cbi8vIENyZWF0ZSBhIGN1c3RvbSBtaWRkbGV3YXJlIHBsdWdpblxuZnVuY3Rpb24gY3VzdG9tTWlkZGxld2FyZVBsdWdpbigpOiBQbHVnaW4ge1xuICByZXR1cm4ge1xuICAgIG5hbWU6ICdjdXN0b20tbWlkZGxld2FyZS1wbHVnaW4nLFxuICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcbiAgICAgIC8vIEFkZCBtaWRkbGV3YXJlIGZvciBBUEkgcmVxdWVzdHNcbiAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoZXhwcmVzcy5qc29uKCkpO1xuICAgICAgXG4gICAgICAvLyBMb2cgYWxsIHJlcXVlc3RzXG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhgUmVxdWVzdDogJHtyZXEubWV0aG9kfSAke3JlcS51cmx9YCk7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBIYW5kbGUgQVBJIGZldGNoIHJlcXVlc3RzXG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKChyZXE6IGFueSwgcmVzOiBhbnksIG5leHQ6IGFueSkgPT4ge1xuICAgICAgICBpZiAocmVxLnVybCA9PT0gJy9hcGkvZmV0Y2gnICYmIHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdIYW5kbGluZyAvYXBpL2ZldGNoIHJlcXVlc3QnKTtcbiAgICAgICAgICByZXR1cm4gbWNwRmV0Y2hIYW5kbGVyKHJlcSwgcmVzKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIENPUlMgcHJlZmxpZ2h0IHJlcXVlc3RzXG4gICAgICAgIGlmIChyZXEudXJsID09PSAnL2FwaS9mZXRjaCcgJiYgcmVxLm1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XG4gICAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcbiAgICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ1BPU1QsIE9QVElPTlMnKTtcbiAgICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJywgJ0NvbnRlbnQtVHlwZScpO1xuICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMjA0O1xuICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksIFxuICAgIG1jcEZldGNoUGx1Z2luKCksXG4gICAgY3VzdG9tTWlkZGxld2FyZVBsdWdpbigpXG4gIF0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICB9LFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbJ3BleGVscyddXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgY29tbW9uanNPcHRpb25zOiB7XG4gICAgICBpbmNsdWRlOiBbL25vZGVfbW9kdWxlcy9dLFxuICAgICAgdHJhbnNmb3JtTWl4ZWRFc01vZHVsZXM6IHRydWVcbiAgICB9XG4gIH1cbn0pOyIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQ2hyaXN0b3BoZVxcXFxEb3dubG9hZHNcXFxccHJvamVjdC1ib2x0LWdpdGh1Yi16Ym5ranhjdFxcXFxwcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxDaHJpc3RvcGhlXFxcXERvd25sb2Fkc1xcXFxwcm9qZWN0LWJvbHQtZ2l0aHViLXpibmtqeGN0XFxcXHByb2plY3RcXFxcdml0ZS1tY3AtcGx1Z2luLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9DaHJpc3RvcGhlL0Rvd25sb2Fkcy9wcm9qZWN0LWJvbHQtZ2l0aHViLXpibmtqeGN0L3Byb2plY3Qvdml0ZS1tY3AtcGx1Z2luLnRzXCI7aW1wb3J0IHsgUGx1Z2luIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcbmltcG9ydCBmZXRjaCBmcm9tICdub2RlLWZldGNoJztcblxuLy8gRGVmaW5lIHRoZSBNQ1AgRmV0Y2ggaGFuZGxlciBkaXJlY3RseSBpbiB0aGlzIGZpbGUgdG8gYXZvaWQgdHlwZSBpc3N1ZXNcbmFzeW5jIGZ1bmN0aW9uIG1jcEZldGNoSGFuZGxlcihyZXE6IGFueSwgcmVzOiBhbnksIG5leHQ6IGFueSkge1xuICBjb25zb2xlLmxvZygnTUNQIEZldGNoIGhhbmRsZXIgY2FsbGVkOicsIHJlcS5wYXRoLCByZXEubWV0aG9kKTtcbiAgXG4gIGlmIChyZXEucGF0aCAhPT0gJy9hcGkvZmV0Y2gnKSB7XG4gICAgcmV0dXJuIG5leHQoKTtcbiAgfVxuXG4gIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcbiAgICAvLyBIYW5kbGUgcHJlZmxpZ2h0IHJlcXVlc3RzXG4gICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcbiAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ1BPU1QsIE9QVElPTlMnKTtcbiAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJywgJ0NvbnRlbnQtVHlwZScpO1xuICAgIHJldHVybiByZXMuc3RhdHVzKDIwNCkuZW5kKCk7XG4gIH1cblxuICBpZiAocmVxLm1ldGhvZCAhPT0gJ1BPU1QnKSB7XG4gICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA1KS5qc29uKHsgZXJyb3I6ICdNZXRob2Qgbm90IGFsbG93ZWQnIH0pO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IHVybCwgb3B0aW9ucyA9IHt9IH0gPSByZXEuYm9keTtcblxuICAgIGlmICghdXJsKSB7XG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oeyBlcnJvcjogJ1VSTCBpcyByZXF1aXJlZCcgfSk7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coJ0ZldGNoaW5nIFVSTDonLCB1cmwpO1xuXG4gICAgLy8gQWRkIENPUlMgaGVhZGVycyB0byBhbGxvdyBjcm9zcy1vcmlnaW4gcmVxdWVzdHNcbiAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpO1xuICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnUE9TVCwgT1BUSU9OUycpO1xuICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLCAnQ29udGVudC1UeXBlJyk7XG5cbiAgICAvLyBEZWZhdWx0IGhlYWRlcnMgdG8gbWltaWMgYSBicm93c2VyIHJlcXVlc3RcbiAgICBjb25zdCBkZWZhdWx0SGVhZGVycyA9IHtcbiAgICAgICdVc2VyLUFnZW50JzogJ01vemlsbGEvNS4wIChXaW5kb3dzIE5UIDEwLjA7IFdpbjY0OyB4NjQpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS85MS4wLjQ0NzIuMTI0IFNhZmFyaS81MzcuMzYnLFxuICAgICAgJ0FjY2VwdCc6ICd0ZXh0L2h0bWwsYXBwbGljYXRpb24veGh0bWwreG1sLGFwcGxpY2F0aW9uL3htbDtxPTAuOSxpbWFnZS93ZWJwLCovKjtxPTAuOCcsXG4gICAgICAnQWNjZXB0LUxhbmd1YWdlJzogJ2VuLVVTLGVuO3E9MC41JyxcbiAgICAgICdDb25uZWN0aW9uJzogJ2tlZXAtYWxpdmUnLFxuICAgICAgJ1VwZ3JhZGUtSW5zZWN1cmUtUmVxdWVzdHMnOiAnMScsXG4gICAgICAnQ2FjaGUtQ29udHJvbCc6ICdtYXgtYWdlPTAnLFxuICAgIH07XG5cbiAgICAvLyBNZXJnZSBkZWZhdWx0IGhlYWRlcnMgd2l0aCB1c2VyLXByb3ZpZGVkIGhlYWRlcnNcbiAgICBjb25zdCBtZXJnZWRIZWFkZXJzID0ge1xuICAgICAgLi4uZGVmYXVsdEhlYWRlcnMsXG4gICAgICAuLi5vcHRpb25zLmhlYWRlcnMsXG4gICAgfTtcblxuICAgIC8vIFBlcmZvcm0gdGhlIGZldGNoIHJlcXVlc3RcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgLi4ub3B0aW9ucyxcbiAgICAgIGhlYWRlcnM6IG1lcmdlZEhlYWRlcnMsXG4gICAgfSk7XG5cbiAgICAvLyBHZXQgcmVzcG9uc2UgZGF0YVxuICAgIGNvbnN0IGNvbnRlbnRUeXBlID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpIHx8ICcnO1xuICAgIGxldCBkYXRhO1xuXG4gICAgaWYgKGNvbnRlbnRUeXBlLmluY2x1ZGVzKCdhcHBsaWNhdGlvbi9qc29uJykpIHtcbiAgICAgIGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgfSBlbHNlIGlmIChjb250ZW50VHlwZS5pbmNsdWRlcygndGV4dC9odG1sJykgfHwgY29udGVudFR5cGUuaW5jbHVkZXMoJ3RleHQvcGxhaW4nKSkge1xuICAgICAgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRm9yIGJpbmFyeSBkYXRhLCBjb252ZXJ0IHRvIGJhc2U2NFxuICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgcmVzcG9uc2UuYXJyYXlCdWZmZXIoKTtcbiAgICAgIGNvbnN0IGFycmF5QnVmZmVyID0gQnVmZmVyLmZyb20oYnVmZmVyKTtcbiAgICAgIGRhdGEgPSBhcnJheUJ1ZmZlci50b1N0cmluZygnYmFzZTY0Jyk7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coJ0ZldGNoIHN1Y2Nlc3NmdWwsIHN0YXR1czonLCByZXNwb25zZS5zdGF0dXMpO1xuXG4gICAgLy8gUmV0dXJuIHRoZSByZXNwb25zZSB3aXRoIG1ldGFkYXRhXG4gICAgcmV0dXJuIHJlcy5zdGF0dXMoMjAwKS5qc29uKHtcbiAgICAgIHVybCxcbiAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogcmVzcG9uc2Uuc3RhdHVzVGV4dCxcbiAgICAgIGhlYWRlcnM6IE9iamVjdC5mcm9tRW50cmllcyhyZXNwb25zZS5oZWFkZXJzLmVudHJpZXMoKSksXG4gICAgICBkYXRhLFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIGZldGNoIEFQSTonLCBlcnJvcik7XG4gICAgcmV0dXJuIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgXG4gICAgICBlcnJvcjogJ0ZhaWxlZCB0byBmZXRjaCB0aGUgcmVxdWVzdGVkIFVSTCcsXG4gICAgICBkZXRhaWxzOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBtY3BGZXRjaFBsdWdpbigpOiBQbHVnaW4ge1xuICByZXR1cm4ge1xuICAgIG5hbWU6ICd2aXRlLXBsdWdpbi1tY3AtZmV0Y2gnLFxuICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcbiAgICAgIC8vIEFkZCBtaWRkbGV3YXJlIGJlZm9yZSBWaXRlJ3MgbWlkZGxld2FyZVxuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShleHByZXNzLmpzb24oKSk7XG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKG1jcEZldGNoSGFuZGxlcik7XG4gICAgICBcbiAgICAgIC8vIExvZyBhbGwgcm91dGVzXG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhgUmVxdWVzdDogJHtyZXEubWV0aG9kfSAke3JlcS51cmx9YCk7XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBjb25zb2xlLmxvZygnXHVEODNEXHVERTgwIE1DUCBGZXRjaCBTZXJ2ZXIgbWlkZGxld2FyZSBpbml0aWFsaXplZCcpO1xuICAgIH0sXG4gIH07XG59XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9ZLFNBQVMsb0JBQTRCO0FBQ3phLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7OztBQ0RqQixPQUFPLGFBQWE7QUFDcEIsT0FBTyxXQUFXO0FBR2xCLGVBQWUsZ0JBQWdCLEtBQVUsS0FBVSxNQUFXO0FBQzVELFVBQVEsSUFBSSw2QkFBNkIs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QUFlO0FBQzdELGNBQUksVUFBVSxnQ0FBZ0MsY0FBYztBQUM1RCxjQUFJLGFBQWE7QUFDakIsY0FBSSxJQUFJO0FBQ1I7QUFBQSxRQUNGO0FBRUEsYUFBSztBQUFBLE1BQ1AsQ0FBQztBQUFBLElBQ0g7QUFBQSxFQUNGO0FBQ0Y7QUFFQSxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixlQUFlO0FBQUEsSUFDZix1QkFBdUI7QUFBQSxFQUN6QjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLFFBQVE7QUFBQSxFQUNwQjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsaUJBQWlCO0FBQUEsTUFDZixTQUFTLENBQUMsY0FBYztBQUFBLE1BQ3hCLHlCQUF5QjtBQUFBLElBQzNCO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbImV4cHJlc3MiLCAiZmV0Y2giLCAibWNwRmV0Y2hIYW5kbGVyIiwgImZldGNoIiwgImV4cHJlc3MiXQp9Cg==
