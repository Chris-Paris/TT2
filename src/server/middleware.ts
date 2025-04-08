import { Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';

/**
 * MCP Fetch Server middleware
 * Based on https://github.com/modelcontextprotocol/servers/tree/main/src/fetch
 */
export async function mcpFetchHandler(req: Request, res: Response, next: NextFunction) {
  if (req.path !== '/api/fetch') {
    return next();
  }

  if (req.method === 'OPTIONS') {
    // Handle preflight requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, options = {} } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Add CORS headers to allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
      data = Buffer.from(buffer).toString('base64');
    }

    // Return the response with metadata
    return res.status(200).json({
      url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data,
    });
  } catch (error) {
    console.error('Error in fetch API:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch the requested URL',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
