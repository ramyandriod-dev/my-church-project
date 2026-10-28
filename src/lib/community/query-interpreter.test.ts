/**
 * Community Query Interpreter
 *
 * These tests exist because the deterministic parser is the *only* search path
 * when no AI provider is registered, which is the default state of this
 * deployment. If it quietly stopped matching, the feature would still return
 * results — just the whole directory — and nothing else would fail.
 *
 * The privacy invariants are tested here too, because they live in this file:
 * `discoverableOnly` must hold no matter what the interpreter was handed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  interpretTalentQuestion,
  interpretIdeaQuestion,
  parseTalentQuestionDeterministic,
  extractJsonObject,
  __testing,
} from "./query-interpreter";
import { aiService } from "../backend/services/ai-service";
import type { CommunityVocabulary } from "./query-interpreter";

const {
  stem,
  stemsAgree,
  containsPhrase,
  containsPhraseLoose,
  detectWillingness,
  matchVocabulary,
} = __testing;

const VOCAB: CommunityVocabulary = {
  skills: [
    "Electrician",
    "Plumbing",
    "Graphic Design",
    "Guitar",
    "Arabic",
    "Accounting",
    "Photography",
  ],
  ministries: ["Youth Ministry", "Children", "Worship"],
  groups: ["Young Adults", "Seniors Group"],
};

const CTX = { tenantId: "t-1", userId: "u-1", feature: "talent_search" };

function parse(question: string) {
  return parseTalentQuestionDeterministic(question, VOCAB).criteria;
}

describe("normalisation and phrase matching", () => {
  it("matches a phrase the member actually wrote", () => {
    expect(containsPhrase("who does graphic design here", "graphic design")).toBe(true);
    expect(containsPhrase("Who's an electrician?", "electrician")).toBe(true);
  });

  it("refuses to match a name inside a longer word", () => {
    // These are the cases naive substring matching gets wrong. "art" must not
    // match inside "party", "car" must not match "carpentry", and the skill
    // "design" must not match the word "designer" — that connection is the
    // stemmer's job, and conflating the two would match "designed" by accident.
    expect(containsPhrase("the party is on friday", "art")).toBe(false);
    expect(containsPhrase("carpentry", "car")).toBe(false);
    expect(containsPhrase("who is a graphic designer", "design")).toBe(false);
  });

  it("folds plurals only in the loose matcher", () => {
    expect(containsPhrase("we need electricians", "electrician")).toBe(false);
    expect(containsPhraseLoose("we need electricians", "electrician")).toBe(true);
    expect(containsPhraseLoose("Who's an electrician?", "electrician")).toBe(true);
  });
});

describe("stemming", () => {
  it("folds a trade noun and its modifier together", () => {
    expect(stemsAgree(stem("electrical"), stem("Electrician"))).toBe(true);
    expect(stemsAgree(stem("designer"), stem("Graphic Design"))).toBe(true);
    expect(stemsAgree(stem("accountant"), stem("Accounting"))).toBe(true);
  });

  it("does not collapse unrelated words", () => {
    expect(stemsAgree(stem("guitar"), stem("Plumbing"))).toBe(false);
    expect(stemsAgree(stem("youth"), stem("Worship"))).toBe(false);
  });

  it("keeps short words intact rather than over-stripping", () => {
    // "Design" must not become "Desig" and match nothing. Normalisation
    // lowercases, so the stem is "design" and not "Desig".
    expect(stem("Design")).toBe("design");
    expect(stem("Design").length).toBeGreaterThanOrEqual(4);
  });
});

describe("vocabulary matching", () => {
  it("prefers the most specific name", () => {
    expect(matchVocabulary("youth ministry helpers", VOCAB.ministries)).toEqual([
      "Youth Ministry",
    ]);
  });
});

describe("parseTalentQuestionDeterministic", () => {
  it("reads a plain question as a skill search", () => {
    const criteria = parse("Anyone who can help with plumbing?");
    expect(criteria.skills).toContain("Plumbing");
  });

  it("connects everyday wording to the stored skill name", () => {
    expect(parse("Who knows about electrical work?").skills).toContain("Electrician");
    expect(parse("who is a graphic designer").skills).toContain("Graphic Design");
  });

  it("reads a ministry and a willingness out of the same sentence", () => {
    const criteria = parse("do we have an electrician in the youth ministry who is willing to help");
    expect(criteria.skills).toContain("Electrician");
    expect(criteria.ministry).toBe("Youth Ministry");
    expect(criteria.willingness).toBe("yes");
  });

  it("does not search on words that describe the ask rather than the answer", () => {
    // "speaks" describes how someone uses Arabic; searching member records for
    // the literal word "speaks" would return noise.
    const criteria = parse("someone who speaks Arabic and is willing to help");
    expect(criteria.skills).toEqual(["Arabic"]);
    expect(criteria.experience).toEqual([]);
  });

  it("never returns a concept twice", () => {
    const criteria = parse("Who knows about electrical work?");
    expect(criteria.skills).toEqual(["Electrician"]);
  });

  it("reads an availability question", () => {
    expect(parse("who is not currently available").willingness).toBe("not_currently");
    expect(detectWillingness("who is free to help")).toBe("yes");
    expect(detectWillingness("who knows about X")).toBe("any");
  });

  it("reads a years-of-experience phrase as experience, not as a skill", () => {
    const criteria = parse("find people with 5+ years experience");
    expect(criteria.experience).toEqual(["5+ years"]);
    expect(criteria.skills).toEqual([]);
  });

  it("keeps an unknown ability as a loose skill rather than dropping it", () => {
    // "Cooking" is not in the church's vocabulary yet, but the member who can
    // cook is still the answer.
    expect(parse("who can cook for events").skills).toContain("cook");
  });

  it("falls back to the whole directory rather than a failed search", () => {
    const criteria = parse("hello");
    expect(criteria.skills).toEqual([]);
    expect(criteria.discoverableOnly).toBe(true);
  });

  it("always applies the discoverability opt-out", () => {
    for (const q of ["who knows plumbing", "hello", "who is an electrician"]) {
      expect(parse(q).discoverableOnly).toBe(true);
    }
  });
});

describe("extractJsonObject", () => {
  it("reads a bare object", () => {
    expect(extractJsonObject('{"skills":["Guitar"]}')).toEqual({ skills: ["Guitar"] });
  });

  it("tolerates a fence and surrounding prose", () => {
    expect(extractJsonObject('```json\n{"skills":["Guitar"]}\n```')).toEqual({
      skills: ["Guitar"],
    });
    expect(extractJsonObject('Sure! {"skills":["Guitar"]} Hope that helps.')).toEqual({
      skills: ["Guitar"],
    });
  });

  it("rejects anything that is not a single object", () => {
    expect(extractJsonObject("no json here")).toBeNull();
    expect(extractJsonObject("[1,2,3]")).toBeNull();
    expect(extractJsonObject("{broken")).toBeNull();
  });
});

describe("interpretTalentQuestion with the AI provider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the provider's criteria when it answers cleanly", async () => {
    vi.spyOn(aiService, "complete").mockResolvedValue(
      JSON.stringify({
        skills: ["Plumbing"],
        experience: [],
        willingness: "yes",
        discoverableOnly: true,
      }),
    );

    const result = await interpretTalentQuestion("who can help with plumbing", VOCAB, {
      allowAi: true,
      context: CTX,
    });

    expect(result.source).toBe("ai");
    expect(result.aiUsed).toBe(true);
    expect(result.criteria.skills).toEqual(["Plumbing"]);
  });

  it("overrides discoverableOnly even when the provider turns it off", async () => {
    // The single most important invariant here: a model must not be able to
    // widen the opt-out, because the field is set locally after parsing.
    vi.spyOn(aiService, "complete").mockResolvedValue(
      JSON.stringify({
        skills: ["Plumbing"],
        experience: [],
        willingness: "any",
        discoverableOnly: false,
      }),
    );

    const result = await interpretTalentQuestion("who can help with plumbing", VOCAB, {
      allowAi: true,
      context: CTX,
    });

    expect(result.criteria.discoverableOnly).toBe(true);
  });

  it("clamps values the schema cannot accept", async () => {
    vi.spyOn(aiService, "complete").mockResolvedValue(
      JSON.stringify({
        skills: "not-an-array",
        experience: [],
        willingness: "extremely-willing",
        discoverableOnly: true,
      }),
    );

    const result = await interpretTalentQuestion("who can help with plumbing", VOCAB, {
      allowAi: true,
      context: CTX,
    });

    // Invalid shape fails validation, so this must have fallen back rather than
    // reached the repository.
    expect(result.source).toBe("deterministic");
    expect(result.aiUsed).toBe(false);
  });

  it("falls back when the provider throws", async () => {
    vi.spyOn(aiService, "complete").mockRejectedValue(new Error("provider is down"));

    const result = await interpretTalentQuestion("who knows about plumbing", VOCAB, {
      allowAi: true,
      context: CTX,
    });

    expect(result.source).toBe("deterministic");
    expect(result.aiUsed).toBe(false);
    expect(result.fallbackReason).toContain("provider is down");
    // The deterministic path must still produce a usable answer.
    expect(result.criteria.skills).toContain("Plumbing");
  });

  it("falls back when the response is prose rather than JSON", async () => {
    vi.spyOn(aiService, "complete").mockResolvedValue(
      "I think you might be looking for a plumber who is free on Saturdays.",
    );

    const result = await interpretTalentQuestion("who knows about plumbing", VOCAB, {
      allowAi: true,
      context: CTX,
    });

    expect(result.source).toBe("deterministic");
    expect(result.aiUsed).toBe(false);
  });

  it("never calls the provider when the caller lacks ai.use", async () => {
    const spy = vi.spyOn(aiService, "complete");

    const result = await interpretTalentQuestion("who knows about plumbing", VOCAB, {
      allowAi: false,
      context: CTX,
    });

    expect(spy).not.toHaveBeenCalled();
    expect(result.aiUsed).toBe(false);
    expect(result.fallbackReason).toContain("not enabled");
  });

  it("sends the provider the question and nothing else", async () => {
    const spy = vi.spyOn(aiService, "complete").mockResolvedValue('{"skills":[]}');

    await interpretTalentQuestion("who knows about electrical work", VOCAB, {
      allowAi: true,
      context: CTX,
    });

    const prompt = spy.mock.calls[0][0];
    // The church's own skill and ministry names must stay on the server, so the
    // provider is never told what this church's people can do.
    for (const name of [...VOCAB.skills, ...VOCAB.ministries, ...VOCAB.groups]) {
      expect(prompt).not.toContain(name);
    }
  });
});

describe("interpretIdeaQuestion", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("reads a category from the question without any AI", async () => {
    const result = await interpretIdeaQuestion("what ideas have we had about children", {
      allowAi: false,
      context: CTX,
    });
    expect(result.criteria.category).toBe("children");
    expect(result.aiUsed).toBe(false);
  });

  it("falls back when the provider is unavailable", async () => {
    vi.spyOn(aiService, "complete").mockRejectedValue(new Error("no provider"));
    const result = await interpretIdeaQuestion("implemented ideas about worship", {
      allowAi: true,
      context: CTX,
    });
    expect(result.source).toBe("deterministic");
    expect(result.criteria.status).toBe("implemented");
  });
});
