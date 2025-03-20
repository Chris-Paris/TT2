const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client with server-side keys
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize the Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse the request body
    const data = JSON.parse(event.body);
    const { action, payload } = data;

    if (!action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false,
          error: { message: 'Missing required action parameter' } 
        }),
      };
    }

    let result;

    // Handle different Supabase actions
    switch (action) {
      case 'select':
        const { table, query } = payload;
        if (!table) {
          throw new Error('Table name is required for select operations');
        }
        
        let queryBuilder = supabase.from(table).select(query.select || '*');
        
        // Apply filters if provided
        if (query.filters) {
          for (const filter of query.filters) {
            queryBuilder = queryBuilder.filter(filter.column, filter.operator, filter.value);
          }
        }
        
        // Apply limit if provided
        if (query.limit) {
          queryBuilder = queryBuilder.limit(query.limit);
        }
        
        result = await queryBuilder;
        break;
        
      case 'insert':
        const { table: insertTable, records } = payload;
        if (!insertTable || !records) {
          throw new Error('Table name and records are required for insert operations');
        }
        result = await supabase.from(insertTable).insert(records);
        break;
        
      case 'update':
        const { table: updateTable, match, updates } = payload;
        if (!updateTable || !match || !updates) {
          throw new Error('Table name, match criteria, and updates are required for update operations');
        }
        result = await supabase.from(updateTable).update(updates).match(match);
        break;
        
      case 'delete':
        const { table: deleteTable, match: deleteMatch } = payload;
        if (!deleteTable || !deleteMatch) {
          throw new Error('Table name and match criteria are required for delete operations');
        }
        result = await supabase.from(deleteTable).delete().match(deleteMatch);
        break;
        
      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        data: result,
      }),
    };
  } catch (error) {
    console.error('Error in Supabase API function:', error.message);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: {
          message: error.message || 'An unknown error occurred',
          details: error.details || null,
        },
      }),
    };
  }
};
