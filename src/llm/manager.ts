import type { Config, Env } from "../config";
import type { LLMProvider } from "./provider";
import { GroqProvider } from "./providers/groq";
import { OpenAIProvider } from "./providers/openai";

const PROVIDER_FACTORIES: Record<
  string,
  (env: Env, model: string) => LLMProvider
> = {
  groq: (env, model) => new GroqProvider(env.GROQ_API_KEY, model),
  openai: (env, model) => new OpenAIProvider(env.OPENAI_API_KEY, model),
};

const FALLBACK_MESSAGE =
  "Извините, все AI-провайдеры временно недоступны. Попробуйте позже.";

export class LLMManager {
  private providers: LLMProvider[] = [];
  private maxTokens: number;

  constructor(llmConfig: Config["llm"], env: Env) {
    this.maxTokens = llmConfig.max_tokens;

    for (const name of llmConfig.priority) {
      const providerConfig = llmConfig.providers[name];
      const factory = PROVIDER_FACTORIES[name];
      if (!factory || !providerConfig) {
        console.warn(`[llm] unknown provider "${name}", skipping`);
        continue;
      }

      const provider = factory(env, providerConfig.model);
      if (provider.available) {
        this.providers.push(provider);
        console.log(`[llm] provider "${name}" loaded (model: ${providerConfig.model})`);
      } else {
        console.log(`[llm] provider "${name}" skipped (no API key)`);
      }
    }

    if (this.providers.length === 0) {
      console.warn("[llm] no providers available!");
    }
  }

  async chat(system: string, user: string): Promise<string> {
    for (const provider of this.providers) {
      try {
        return await provider.chat(system, user, this.maxTokens);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[llm] ${provider.name} failed: ${msg}`);
      }
    }
    return FALLBACK_MESSAGE;
  }
}
