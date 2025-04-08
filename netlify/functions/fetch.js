// Serverless function to proxy requests to Booking.com
// This helps avoid CORS issues when fetching from external domains

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parse the request body
    const { url } = JSON.parse(event.body);
    
    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    console.log(`Fetching data from: ${url}`);

    // Add headers to make the request look like it's coming from a browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Referer': 'https://www.booking.com/',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Cookie': 'cors_js=1; bkng_sso_ses=e30; bkng_sso_session=e30'
    };

    // Fetch the data from the provided URL
    const response = await fetch(url, { 
      headers,
      redirect: 'follow',
      follow: 10,
      timeout: 30000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Get the response as text (HTML)
    const data = await response.text();
    
    console.log(`Received ${data.length} bytes of data`);
    
    // Check if we got a proper HTML response
    if (data.length < 1000 || !data.includes('<html')) {
      console.log('Received incomplete or non-HTML response');
      console.log('Response preview:', data.substring(0, 200));
      
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Invalid response from Booking.com',
          preview: data.substring(0, 200)
        })
      };
    }
    
    // Return the data
    return {
      statusCode: 200,
      body: JSON.stringify({ data })
    };
  } catch (error) {
    console.error('Proxy error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error fetching data',
        message: error.message 
      })
    };
  }
};
