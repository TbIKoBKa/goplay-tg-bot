export interface LLMProvider {
  readonly name: string;
  readonly available: boolean;
  chat(system: string, user: string, maxTokens: number): Promise<string>;
}
