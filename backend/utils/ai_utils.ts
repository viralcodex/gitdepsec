import { OpenRouter } from '@openrouter/sdk';

/**
 * Shared AI utility for making OpenRouter API calls with consistent error handling
 */
export class AIUtils {
  /**
   * Make an OpenRouter API call with JSON schema validation
   * @param ai OpenRouter instance
   * @param systemPrompt System instruction for the model
   * @param userPrompt User prompt/content
   * @param jsonSchema JSON schema for structured response validation
   * @param options Additional options
   * @returns Parsed JSON response (as object or string based on returnString option)
   */
  static async callAI<T = Record<string, unknown>>(
    ai: OpenRouter,
    systemPrompt: string,
    userPrompt: string,
    jsonSchema: Record<string, unknown>,
    options: {
      model: string;
      schemaName?: string;
      returnString?: boolean;
      plugins?: [{ id: 'response-healing' }];
    },
  ): Promise<T> {
    console.log('Sending AI request with model:', options.model);
    const response = await ai.chat.send({
      model: options.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: {
        type: 'json_schema',
        jsonSchema: {
          name: options.schemaName ?? 'response',
          strict: true,
          schema: jsonSchema,
        },
      },
      stream: false,
      ...(options.plugins && { plugins: options.plugins }),
    });

    if (!response?.choices?.[0]?.message?.content) {
      throw new Error('No response from AI model');
    }

    const content = response.choices[0].message.content;
    console.log('AI Response:', content);

    try {
      const contentStr =
        typeof content === 'string' ? content : JSON.stringify(content);
      const parsed = JSON.parse(contentStr);

      return (options.returnString ? JSON.stringify(parsed) : parsed) as T;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Invalid JSON response from AI model');
    }
  }

  /**
   * Retry wrapper for AI API calls with exponential backoff
   * Handles transient failures (rate limits, network issues)
   * @param callback Function that returns a Promise (typically an AIUtils.callAI call)
   * @param maxRetries Maximum number of retry attempts
   * @param baseDelay Base delay in milliseconds for exponential backoff
   */
  static async callAIWithRetry<T>(
    callback: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000,
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await callback();
      } catch (error) {
        const isLastAttempt = i === maxRetries - 1;
        if (isLastAttempt) {
          console.error(`AI call failed after ${maxRetries} attempts:`, error);
          throw error;
        }
        const delay = baseDelay * Math.pow(2, i);
        console.warn(
          `AI call attempt ${i + 1} failed, retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }
}
