import { TravelSuggestions } from '@/types';

export async function streamChatGPTResponse(
  response: Response,
  onChunk: (suggestions: Partial<TravelSuggestions>) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is null');

  const decoder = new TextDecoder();
  let buffer = '';
  let jsonBuffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            // Try to parse any remaining JSON in the buffer
            if (jsonBuffer) {
              try {
                const suggestions = JSON.parse(jsonBuffer);
                if (suggestions && typeof suggestions === 'object') {
                  onChunk(suggestions);
                }
              } catch (e: unknown) {
                if (e instanceof Error) {
                  console.error('Error parsing final JSON buffer:', e.message);
                }
                throw new Error('An unknown error occurred while parsing final JSON buffer');
              }
            }
            return;
          }

          try {
            const chunk = JSON.parse(jsonStr);
            const content = chunk.choices?.[0]?.delta?.content;
            
            if (content) {
              jsonBuffer += content;
              
              // Check if we have a complete JSON object
              const openBraces = (jsonBuffer.match(/{/g) || []).length;
              const closeBraces = (jsonBuffer.match(/}/g) || []).length;
              
              if (openBraces === closeBraces && openBraces > 0) {
                try {
                  const suggestions = JSON.parse(jsonBuffer);
                  if (suggestions && typeof suggestions === 'object') {
                    onChunk(suggestions);
                    jsonBuffer = ''; // Reset buffer after successful parse
                  }
                } catch (e: unknown) {
                  if (e instanceof Error) {
                    // Not a valid JSON yet, continue accumulating
                  } else {
                    throw new Error('An unknown error occurred while parsing JSON');
                  }
                }
              }
            }
          } catch (e: unknown) {
            if (e instanceof Error) {
              console.error('Error parsing SSE chunk:', e.message);
            }
            throw new Error('An unknown error occurred while parsing SSE chunk');
          }
        }
      }
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error('Stream reading error:', e.message);
      throw e;
    }
    throw new Error('An unknown error occurred while reading stream');
  } finally {
    reader.releaseLock();
  }
}