/**
 * AI Service Abstraction
 *
 * Provides a clean boundary for future AI features.
 * AI never has unrestricted direct database access.
 *
 * Architecture:
 *   AI Feature
 *      ↓
 *   AiService (this file)
 *      ↓
 *   Context Builder (permission-scoped data)
 *      ↓
 *   Provider Adapter (OpenAI, Anthropic, etc.)
 *      ↓
 *   AI Provider API
 */

import type { AiContext, AiProviderAdapter } from "../types";

// ─── Provider Registry ───────────────────────────────────────

const providers = new Map<string, AiProviderAdapter>();

/**
 * Register an AI provider adapter.
 */
export function registerAiProvider(adapter: AiProviderAdapter) {
  providers.set(adapter.name, adapter);
}

/**
 * Get a registered AI provider.
 */
function getProvider(name?: string): AiProviderAdapter {
  const providerName = name || process.env.AI_PROVIDER || "openai";
  const adapter = providers.get(providerName);
  if (!adapter) {
    throw new Error(`AI provider '${providerName}' not registered`);
  }
  return adapter;
}

// ─── AI Service ──────────────────────────────────────────────

export class AiService {
  /**
   * Get AI completion with permission-scoped context.
   * The AI only sees data it's authorized to access.
   */
  async complete(
    prompt: string,
    context: AiContext,
    options?: { provider?: string; maxTokens?: number }
  ): Promise<string> {
    // In production:
    // 1. Build context from database (scoped to tenant + user permissions)
    // 2. Check user's AI feature permissions
    // 3. Call provider adapter
    // 4. Log usage for billing/monitoring

    const provider = getProvider(options?.provider);

    if (!(await provider.isAvailable())) {
      throw new Error("AI provider is not available");
    }

    return provider.complete(prompt, context);
  }

  /**
   * Generate a pastoral care summary for a member.
   * Future feature: AI-powered member insights.
   */
  async generateMemberSummary(
    context: AiContext,
    memberId: string
  ): Promise<string> {
    // In production:
    // 1. Gather member data (attendance, follow-ups, groups) — scoped to tenant
    // 2. Build permission-scoped prompt
    // 3. Call AI provider
    // 4. Return summary

    return this.complete(
      `Generate a pastoral care summary for member ${memberId}`,
      { ...context, feature: "member_summary" }
    );
  }

  /**
   * Suggest follow-up actions for a member.
   * Future feature: AI-powered follow-up recommendations.
   */
  async suggestFollowUps(
    context: AiContext,
    memberId: string
  ): Promise<string[]> {
    // In production:
    // 1. Gather member history — scoped to tenant
    // 2. Analyze patterns
    // 3. Generate suggestions
    // 4. Return as array

    return [];
  }

  /**
   * Analyze attendance trends.
   * Future feature: AI-powered analytics insights.
   */
  async analyzeAttendanceTrends(
    context: AiContext,
    options?: { period?: string }
  ): Promise<string> {
    return this.complete(
      `Analyze attendance trends for period: ${options?.period || "this month"}`,
      { ...context, feature: "attendance_analysis" }
    );
  }
}

export const aiService = new AiService();
