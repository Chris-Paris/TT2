# Netlify Functions for Secure API Access

This directory contains Netlify serverless functions that securely handle API keys for:
- Supabase
- Gemini AI

## Purpose

These functions allow your application to access APIs without exposing sensitive API keys in the frontend code. When deployed to Netlify, these functions will use environment variables that are securely stored in your Netlify project settings.

## Available Functions

### 1. `supabase-api.js`

Provides secure access to Supabase using the service role key, which should never be exposed to the client.

**Supported Operations:**
- `select`: Query data from Supabase tables
- `insert`: Insert records into Supabase tables
- `update`: Update records in Supabase tables
- `delete`: Delete records from Supabase tables

### 2. `gemini-api.js`

Provides secure access to Google's Gemini AI API without exposing the API key in the frontend.

**Supported Operations:**
- `generateContent`: Generate content using Gemini AI models

## How to Use

In your frontend code, instead of directly using the Supabase or Gemini clients with API keys, use the utility functions provided in `src/utils/secureApi.ts`.

Example:

```typescript
import { secureSupabase, secureGemini } from '../utils/secureApi';

// Securely query Supabase
const getUserData = async (userId) => {
  const result = await secureSupabase.select('users', {
    filters: [{ column: 'id', operator: 'eq', value: userId }]
  });
  return result.data;
};

// Securely use Gemini AI
const generateTripSuggestion = async (prompt) => {
  const result = await secureGemini.generateContent(
    `Suggest a travel itinerary for: ${prompt}`,
    { temperature: 0.7 }
  );
  return result.text;
};
```

## Environment Variables

When deploying to Netlify, make sure to set the following environment variables in your Netlify project settings:

- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `GEMINI_API_KEY`: Your Google Gemini API key
- `VITE_SUPABASE_URL`: Your Supabase project URL (also needed for the functions)

## Local Development

For local development, you'll need to:

1. Create a `.env.development.local` file with the necessary environment variables
2. Use Netlify CLI to run your development server with the functions:

```bash
netlify dev
```

This will allow you to test the functions locally before deploying to production.
