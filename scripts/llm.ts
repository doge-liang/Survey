#!/usr/bin/env bun

import { loadConfig } from "./config.ts";
import type { LLMConfig } from "./types.ts";

type RetryableError = Error & { retryable?: boolean };

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }> | null;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: number | string;
  };
}

export class LLMClient {
  private config: LLMConfig;
  private lastCallTime = 0;
  private readonly minInterval = 1000;
  private readonly maxAttempts = 3;
  private readonly timeoutMs = 30_000;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async analyze(prompt: string): Promise<string> {
    const normalizedPrompt = prompt.trim();

    if (!normalizedPrompt) {
      throw new Error("Prompt must not be empty");
    }

    await this.waitForRateLimit();

    if (!this.config.apiKey) {
      throw new Error("KIMI_API_KEY not set");
    }

    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await this.makeRequest(normalizedPrompt);
      } catch (error) {
        lastError = error;

        if (attempt === this.maxAttempts || !this.shouldRetry(error)) {
          throw this.toAttemptError(error, attempt);
        }

        await this.sleep(1000 * 2 ** (attempt - 1));
      }
    }

    throw this.toAttemptError(lastError, this.maxAttempts);
  }

  private async makeRequest(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseURL.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
        signal: controller.signal,
      });

      const responseText = await response.text();
      const responseJson = this.parseResponse(responseText);

      if (!response.ok) {
        const responseMessage = responseJson?.error?.message || responseText || "Unknown error";
        throw this.createError(
          `Kimi API request failed (${response.status} ${response.statusText}): ${responseMessage}`,
          response.status === 408 || response.status === 429 || response.status >= 500,
        );
      }

      const content = this.extractContent(responseJson);
      if (!content) {
        throw this.createError("Kimi API response did not include a message content", false);
      }

      return content;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw this.createError(`Kimi API request timed out after ${this.timeoutMs / 1000} seconds`, true);
      }

      if (error instanceof TypeError) {
        throw this.createError(`Network error while calling Kimi API: ${error.message}`, true);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractContent(responseJson: ChatCompletionResponse | null): string {
    const content = responseJson?.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      return content.trim();
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => part.text?.trim())
        .filter((part): part is string => Boolean(part))
        .join("\n")
        .trim();
    }

    return "";
  }

  private parseResponse(responseText: string): ChatCompletionResponse | null {
    if (!responseText) {
      return null;
    }

    try {
      return JSON.parse(responseText) as ChatCompletionResponse;
    } catch {
      return null;
    }
  }

  private shouldRetry(error: unknown): boolean {
    return Boolean((error as RetryableError)?.retryable);
  }

  private toAttemptError(error: unknown, attempt: number): Error {
    const message = error instanceof Error ? error.message : String(error);
    return new Error(`LLM analyze failed on attempt ${attempt}: ${message}`);
  }

  private createError(message: string, retryable: boolean): RetryableError {
    const error = new Error(message) as RetryableError;
    error.retryable = retryable;
    return error;
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCallTime;

    if (elapsed < this.minInterval) {
      await this.sleep(this.minInterval - elapsed);
    }

    this.lastCallTime = Date.now();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

if (import.meta.main) {
  const config = loadConfig();
  const client = new LLMClient(config.llm);
  console.log(`LLM client initialized successfully for ${config.llm.model}`);
  console.log(`Base URL: ${config.llm.baseURL}`);
  if (!config.llm.apiKey) {
    console.log("KIMI_API_KEY is not set; analyze() will require it.");
  }
  void client;
}
