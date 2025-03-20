/**
 * Utility functions for securely accessing APIs through Netlify functions
 * This prevents API keys from being exposed in the client-side code
 */

/**
 * Securely interact with Supabase through Netlify functions
 */
export const secureSupabase = {
  /**
   * Perform a select query on a Supabase table
   * @param table The table name to query
   * @param options Query options (select, filters, limit)
   */
  select: async (table: string, options: {
    select?: string,
    filters?: Array<{column: string, operator: string, value: any}>,
    limit?: number
  } = {}) => {
    const response = await fetch('/.netlify/functions/supabase-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'select',
        payload: {
          table,
          query: options
        }
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Unknown error in Supabase select operation');
    }

    return result.data;
  },

  /**
   * Insert records into a Supabase table
   * @param table The table name to insert into
   * @param records The records to insert
   */
  insert: async (table: string, records: any | any[]) => {
    const response = await fetch('/.netlify/functions/supabase-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'insert',
        payload: {
          table,
          records: Array.isArray(records) ? records : [records]
        }
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Unknown error in Supabase insert operation');
    }

    return result.data;
  },

  /**
   * Update records in a Supabase table
   * @param table The table name to update
   * @param match The criteria to match records for updating
   * @param updates The updates to apply
   */
  update: async (table: string, match: Record<string, any>, updates: Record<string, any>) => {
    const response = await fetch('/.netlify/functions/supabase-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'update',
        payload: {
          table,
          match,
          updates
        }
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Unknown error in Supabase update operation');
    }

    return result.data;
  },

  /**
   * Delete records from a Supabase table
   * @param table The table name to delete from
   * @param match The criteria to match records for deletion
   */
  delete: async (table: string, match: Record<string, any>) => {
    const response = await fetch('/.netlify/functions/supabase-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete',
        payload: {
          table,
          match
        }
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Unknown error in Supabase delete operation');
    }

    return result.data;
  }
};

/**
 * Securely interact with Gemini AI through Netlify functions
 */
export const secureGemini = {
  /**
   * Generate content using Gemini AI
   * @param prompt The prompt to send to Gemini
   * @param options Additional options for the Gemini API
   */
  generateContent: async (prompt: string, options: {
    model?: string,
    temperature?: number,
    topK?: number,
    topP?: number,
    maxOutputTokens?: number,
  } = {}) => {
    const response = await fetch('/.netlify/functions/gemini-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        model: options.model,
        options: {
          generationConfig: {
            temperature: options.temperature,
            topK: options.topK,
            topP: options.topP,
            maxOutputTokens: options.maxOutputTokens,
          }
        }
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Unknown error in Gemini API operation');
    }

    return result.data;
  }
};
