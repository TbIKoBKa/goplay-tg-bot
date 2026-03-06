import OpenAI from "openai";
import type { LLMProvider } from "../provider";

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  readonly available: boolean;
  private client: OpenAI | null;
  private model: string;

  constructor(apiKey: string | undefined, model: string) {
    this.available = !!apiKey && apiKey.length > 0;
    this.model = model;
    this.client = this.available ? new OpenAI({ apiKey }) : null;
  }

  async chat(system: string, user: string, maxTokens: number): Promise<string> {
    if (!this.client) throw new Error("OpenAI not configured");

    const res = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const text = res.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from OpenAI");
    return text;
  }
}
