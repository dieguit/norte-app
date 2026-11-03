import { Logger } from '@nestjs/common';
import { Agent } from '@mastra/core/agent';
import { type LlmEnv, resolveModel, roles } from '../config/llm.config';

export type Transcribe = (audio: Uint8Array | ArrayBuffer) => Promise<string>;

export function createTranscriber(env: LlmEnv): Transcribe | undefined {
  let resolved: ReturnType<typeof resolveModel>;
  try {
    resolved = resolveModel(roles.transcriber, env);
  } catch (error) {
    // Voice notes are optional; deployments without the transcriber's provider still start and keep audio as-is.
    new Logger('Transcriber').warn(`Voice notes disabled: ${String(error)}`);
    return undefined;
  }
  const { model, providerOptions } = resolved;
  const agent = new Agent({
    id: 'transcriber',
    name: 'Transcriber',
    instructions:
      'Transcribí literalmente el audio, en su idioma original. Respondé sólo con la transcripción, sin comillas ni comentarios. Si no hay habla, respondé vacío.',
    model,
  });
  return async (audio) => {
    const { text } = await agent.generate(
      [
        {
          role: 'user',
          content: [
            {
              type: 'file',
              data: audio,
              // shortcut: WhatsApp sends ogg/opus, which the OpenAI-compatible converter rejects; Gemini sniffs the real format. Transcode if the model changes away from Gemini.
              mediaType: 'audio/mpeg',
            },
          ],
        },
      ],
      { providerOptions },
    );
    return text.trim();
  };
}
