import { OpenRouter } from '@openrouter/sdk';

import { Vulnerability } from '../constants/model';
import { prompts } from '../prompts/prompts';
import inlineaiSummarySchema from '../prompts/schemas/inlineai-summary-schema.json';
import vulnerabilitySummarySchema from '../prompts/schemas/vulnerability-summary-schema.json';
import { AIUtils } from '../utils/ai_utils';

class AiService {
  private ai: OpenRouter;
  private defaultModel: string;

  constructor(model?: string, apiKey?: string) {
    const key = apiKey ?? process.env.OPEN_ROUTER_KEY;
    if (!key) {
      throw new Error('OPEN_ROUTER_KEY is not set and no API key provided');
    }
    this.ai = new OpenRouter({
      apiKey: key,
    });
    this.defaultModel =
      model ?? process.env.DEFAULT_MODEL ?? 'mistralai/devstral-2512:free';
  }

  generateVulnerabilitySummary(
    vulnerabilities: Vulnerability[],
    model?: string,
  ): Promise<string> {
    const prompt = prompts.VULNERABILITIES_SUMMARIZATION;
    const systemPrompt = `${prompt.system}\n\nConstraints:\n${prompt.constraints.join('\n')}`;
    const userPrompt = prompt.template.replace(
      '{{vulnerabilities}}',
      JSON.stringify(vulnerabilities),
    );
    console.log(
      'Generating vulnerability summary with model:',
      model ?? this.defaultModel,
    );
    return AIUtils.callAI(
      this.ai,
      systemPrompt,
      userPrompt,
      vulnerabilitySummarySchema,
      {
        model: model ?? this.defaultModel,
        schemaName: 'vulnerability_summary',
        returnString: true,
        plugins: [{ id: 'response-healing' }],
      },
    );
  }

  generateInlineResponse(
    userPrompt: string,
    context: string,
    selectedText: string,
    model?: string,
  ): Promise<string> {
    if (!userPrompt || !selectedText || !context) {
      throw new Error('Missing required fields for inline AI response');
    }

    const systemPrompt = prompts.INLINE_AI_RESPONSE.system;
    const fullUserPrompt = `${prompts.INLINE_AI_RESPONSE.template.replace('{{selectedText}}', selectedText)}\n\nContext: ${prompts.INLINE_AI_RESPONSE.context.replace('{{context}}', context)}\n\nUser Query: ${userPrompt}`;
    console.log(
      'Generating inline response with model:',
      model ?? this.defaultModel,
    );
    return AIUtils.callAI(
      this.ai,
      systemPrompt,
      fullUserPrompt,
      inlineaiSummarySchema,
      {
        model: model ?? this.defaultModel,
        schemaName: 'inline_ai_response',
        returnString: true,
        plugins: [{ id: 'response-healing' }],
      },
    );
  }
}

export default AiService;
