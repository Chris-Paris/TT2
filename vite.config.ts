import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import mcpFetchPlugin from './vite-mcp-plugin';
import express from 'express';
import { Request, Response } from 'express';
import fetch from 'node-fetch';

// MCP Fetch handler function
async function mcpFetchHandler(req: Request, res: any) {
  try {
    const { url, options = {} } = req.body;

    if (!url) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'URL is required' }));
      return;
    }

    console.log('Fetching URL:', url);

    // Default headers to mimic a browser request
    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
    };

    // Merge default headers with user-provided headers
    const mergedHeaders = {
      ...defaultHeaders,
      ...options.headers,
    };

    // Perform the fetch request
    const response = await fetch(url, {
      ...options,
      headers: mergedHeaders,
    });

    // Get response data
    const contentType = response.headers.get('content-type') || '';
    let data;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else if (contentType.includes('text/html') || contentType.includes('text/plain')) {
      data = await response.text();
    } else {
      // For binary data, convert to base64
      const buffer = await response.arrayBuffer();
      const arrayBuffer = Buffer.from(buffer);
      data = arrayBuffer.toString('base64');
    }

    console.log('Fetch successful, status:', response.status);

    // Return the response with metadata
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data,
    }));
  } catch (error) {
    console.error('Error in fetch API:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      error: 'Failed to fetch the requested URL',
      details: error instanceof Error ? error.message : String(error)
    }));
  }
}

// Create a custom middleware plugin
function customMiddlewarePlugin(): Plugin {
  return {
    name: 'custom-middleware-plugin',
    configureServer(server) {
      // Add middleware for API requests
      server.middlewares.use(express.json());
      
      // Log all requests
      server.middlewares.use((req, res, next) => {
        console.log(`Request: ${req.method} ${req.url}`);
        next();
      });
      
      // Handle API fetch requests
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url === '/api/fetch' && req.method === 'POST') {
          console.log('Handling /api/fetch request');
          return mcpFetchHandler(req, res);
        }
        
        // Handle CORS preflight requests
        if (req.url === '/api/fetch' && req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 204;
          res.end();
          return;
        }
        
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(), 
    mcpFetchPlugin(),
    customMiddlewarePlugin()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['pexels']
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  }
});