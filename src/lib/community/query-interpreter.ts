/**
 * Community Query Interpreter
 *
 * Turns a question typed into a search box into structured criteria.
 *
 * ─── Privacy model ──────────────────────────────────────────────
 *
 * The interpreter is the only place a question meets an optional AI provider,
 * so it is deliberately narrow:
 *
 * - The provider receives the question the user typed, and nothing else. No
 *   member, no profile, no skill assignment, no contact detail is ever placed in
 *   a prompt. The provider cannot answer from data it never sees, and cannot
 *   leak the roster because the roster is not in the request.
 * - The tenant's skill, ministry and group NAMES are also not sent. They are
 *   resolved locally afterwards, which keeps the church's internal vocabulary on
 *   the server and means a provider is never told what this church's people can
 *   do.
 * - `discoverableOnly` is set here and is never read from the provider's output.
 *   A model cannot be talked into widening the opt-out, because the field is
 *   overwritten after parsing.
 *
 * ─── Trust model ────────────────────────────────────────────────
 *
 * A model is untrusted input. Its JSON is parsed, validated with a bounded Zod
 * schema, and then post-processed locally. Anything that fails validation, or
 * any provider error at all, falls through to the deterministic parser. There is
 * no path where an unvalidated model response reaches the repository.
 */

import { aiService } from "../backend/services/ai-service";
import type { AiContext } from "../backend/types";
import {
  ideaSearchCriteriaSchema,
  talentSearchCriteriaSchema,
  validate,
} from "../backend/validation";
import {
  IDEA_CATEGORIES,
  PROFESSION_CATEGORIES,
  TALENT_WILLINGNESS_LEVELS,
  type IdeaCategory,
  type IdeaSearchCriteria,
  type IdeaSearchInterpretation,
  type IdeaStatus,
  type ProfessionCategory,
  type TalentSearchCriteria,
  type TalentSearchInterpretation,
  type TalentWillingness,
} from "../backend/types";

/**
 * The tenant's own vocabulary, read from the database by the caller.
 *
 * Passing these in rather than querying inside the interpreter is what keeps this
 * module pure and unit-testable, and what keeps the names out of any prompt.
 */
export interface CommunityVocabulary {
  skills: string[];
  ministries: string[];
  groups: string[];
}

// ─── Text normalisation ───────────────────────────────────────

/**
 * Lowercase, strip punctuation to spaces, collapse runs of spaces.
 *
 * Questions arrive with apostrophes, question marks, commas and mixed case, and
 * matching has to survive all of it.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Naive singular form, enough to match "electricians" against "electrician". */
function singularize(token: string): string {
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

/**
 * Suffixes stripped to build a comparison stem.
 *
 * A church says "Electrician" and its people say "electrical"; it stores
 * "Graphic Design" and a member writes "designer". Without folding those
 * together, the commonest questions in the language return the whole directory
 * instead of the one person who can help. These are the endings that separate a
 * trade noun from its own modifiers.
 */
const STEM_SUFFIXES = [
  "ing", "ers", "er", "ian", "ist", "ion", "ors", "or", "ical", "ic", "ive", "ed", "es",
];

/**
 * Comparison stem for a name or token.
 *
 * Only the last word matters, so "Graphic Design" and "design" collapse together.
 * A suffix is only stripped when at least four characters would remain, which
 * keeps "Design" from becoming "Desig" and matching nothing.
 */
function stem(text: string): string {
  const words = normalize(text).split(" ").filter(Boolean);
  const last = words[words.length - 1] ?? "";
  const singular = singularize(last);
  for (const suffix of STEM_SUFFIXES) {
    if (singular.length - suffix.length >= 4 && singular.endsWith(suffix)) {
      return singular.slice(0, -suffix.length);
    }
  }
  return singular;
}

/** True when two stems are the same word wearing different endings. */
function stemsAgree(a: string, b: string): boolean {
  if (a.length < 4 || b.length < 4) return false;
  if (a === b) return true;
  return a.startsWith(b) || b.startsWith(a);
}

/**
 * Whole-phrase containment on token boundaries.
 *
 * Padding both sides with spaces means "art" does not match inside "party" and
 * "car" does not match "carpenter", which is the whole failure mode of naive
 * substring matching on a skill list.
 */
function containsPhrase(haystack: string, phrase: string): boolean {
  const h = normalize(haystack);
  const p = normalize(phrase);
  if (p.length === 0) return false;
  return ` ${h} `.includes(` ${p} `);
}

/** Whole-phrase containment after singularising the haystack's tokens. */
function containsPhraseLoose(haystack: string, phrase: string): boolean {
  if (containsPhrase(haystack, phrase)) return true;
  const h = normalize(haystack)
    .split(" ")
    .map(singularize)
    .join(" ");
  return ` ${h} `.includes(` ${normalize(phrase)} `);
}

// ─── Stopwords ────────────────────────────────────────────────

/**
 * Words that carry no filter meaning.
 *
 * Two jobs: they stop "who do we have" from becoming a search for the skills
 * "we" and "have", and they leave behind exactly the content words worth
 * inspecting against the tenant's vocabulary.
 */
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "am", "be", "been", "being",
  "do", "does", "did", "have", "has", "had", "can", "could", "should", "would",
  "will", "shall", "may", "might", "must", "we", "us", "our", "i", "me", "my",
  "you", "your", "they", "them", "their", "he", "she", "his", "her", "it", "its",
  "who", "whom", "whose", "what", "which", "where", "when", "why", "how",
  "there", "here", "that", "this", "these", "those", "and", "or", "but", "not",
  "any", "some", "all", "anybody", "anyone", "someone", "somebody", "people",
  "person", "member", "members", "church", "congregation", "know", "knows",
  "known", "knowing", "help", "helps", "helping", "with", "for", "about",
  "find", "show", "list", "search", "looking", "look", "want", "need", "needs",
  "get", "got", "give", "give", "able", "skill", "skills", "talent", "expert",
  "expertise", "available", "availability", "willing", "willingness", "please",
  "let", "us", "if", "of", "in", "on", "at", "to", "from", "by", "up", "so",
  "much", "many", "more", "most", "please", "thank", "thanks", "hi", "hello",
  // Category words: they say which bucket is wanted, never what to search for.
  "experience", "experienced", "years", "year", "yrs", "currently", "profession",
  "professional", "job", "work", "working", "speak", "speaks", "spoke",
]);

const CONTENT_TOKENS = (question: string): string[] =>
  normalize(question)
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));

// ─── Willingness ──────────────────────────────────────────────

/**
 * Read an availability intent out of the question.
 *
 * Absent any signal the answer is `any`, which is right for "who knows about
 * X": someone who declined to be contacted is still the person who knows.
 */
function detectWillingness(question: string): TalentWillingness | "any" {
  const q = normalize(question);
  if (/\b(not now|not currently|currently not|no longer|unavailable|not available)\b/.test(q)) {
    return "not_currently";
  }
  if (/\b(maybe|perhaps|might be able|possibly)\b/.test(q)) return "maybe";
  if (/\b(willing|happy to help|can help|able to help|available to|free to)\b/.test(q)) {
    return "yes";
  }
  return "any";
}

// ─── Experience ───────────────────────────────────────────────

const EXPERIENCE_PATTERNS: RegExp[] = [
  /\b(\d+)\s*\+?\s*(?:years?|yrs?)\b/,
  /\b(?:experienced|senior|seasoned|expert)\b/,
  /\bexperience\b/,
];

/** The experience terms worth matching against a profile's own words. */
function detectExperience(question: string): string[] {
  const out = new Set<string>();
  for (const pattern of EXPERIENCE_PATTERNS) {
    for (const match of question.matchAll(new RegExp(pattern.source, "gi"))) {
      if (match[0]) out.add(match[0].toLowerCase());
    }
  }
  // A bare "experience" with no qualifier is a category, not a phrase to match,
  // so it is dropped rather than sent as a literal search term.
  for (const term of [...out]) {
    if (term === "experience") out.delete(term);
  }
  return [...out];
}

// ─── Vocabulary matching ──────────────────────────────────────

/**
 * Find which of the tenant's known names the question actually mentions.
 *
 * Two passes, most precise first:
 *
 * 1. Whole-phrase match, longest name first, so "youth ministry" wins over
 *    "youth" and the result is the specific name rather than a substring of it.
 * 2. Stem match on whatever words are still unclaimed, which is what connects
 *    "electrical" to "Electrician" and "designer" to "Graphic Design".
 *
 * A name claimed by the first pass is never re-matched by the second.
 */
function matchVocabulary(question: string, names: string[]): string[] {
  const ordered = [...names].sort((a, b) => b.length - a.length);
  const matched: string[] = [];
  const claimed = new Set<string>();

  for (const name of ordered) {
    if (containsPhraseLoose(question, name)) {
      matched.push(name);
      for (const token of normalize(name).split(" ")) claimed.add(token);
    }
  }

  // Stem pass, over the whole vocabulary rather than an exact-key lookup: this
  // is what connects "electrical" to "Electrician", which differ by more than a
  // plural.
  const keyed = ordered.map((name) => ({ name, key: stem(name) }));
  for (const token of CONTENT_TOKENS(question)) {
    if (claimed.has(token)) continue;
    const key = stem(token);
    if (key.length < 4) continue;
    const hit = keyed.find((k) => stemsAgree(k.key, key));
    if (hit && !matched.includes(hit.name)) {
      matched.push(hit.name);
      claimed.add(token);
    }
  }

  return matched.slice(0, 10);
}

/**
 * Words that describe the ask rather than the answer.
 *
 * "work" is why the question mentions a profession, and "speaks" describes how
 * someone uses Arabic. Neither is a filter on its own, and letting them through
 * would search the database for members whose notes happen to contain them.
 */
const NOISE = new Set([
  "work", "works", "working", "worked", "job", "jobs", "career", "field",
  "speak", "speaks", "speaking", "spoke", "speakership",
  "player", "players", "play", "plays", "person", "folks", "folke",
  "area", "areas", "thing", "things", "kind", "kinds", "type", "types",
  "looking", "need", "needs", "want", "wants", "use", "used", "using",
]);

/**
 * Content words that match no already-matched name, kept as loose terms.
 *
 * `exclude` holds the names this parse already matched. Words inside them are
 * dropped so the same concept is not searched twice by two mechanisms, but a word
 * that merely *sounds* like a known skill is kept on purpose: it is carried into
 * the criteria and snapped onto the real skill name there, which is how
 * "accountant" becomes "Accounting" instead of disappearing.
 */
function looseTerms(
  question: string,
  exclude: string[] = [],
  limit = 8,
): string[] {
  // A word is "already covered" if it literally appears in a matched name, or if
  // it is the same word wearing a different ending ("electrical" for
  // "Electrician"). Both would otherwise be searched twice.
  const covered = (token: string): boolean =>
    exclude.some((name) => {
      const nameTokens = normalize(name).split(" ");
      if (nameTokens.includes(token)) return true;
      return stemsAgree(stem(name), stem(token));
    });

  const out: string[] = [];
  for (const token of CONTENT_TOKENS(question)) {
    if (token.length < 3 || NOISE.has(token)) continue;
    if (covered(token)) continue;
    if (out.includes(token)) continue;
    out.push(token);
  }
  return out.slice(0, limit);
}

// ─── Summary ──────────────────────────────────────────────────

/**
 * Describe the criteria in plain language, for the "I searched for..." line.
 *
 * Built from the criteria themselves rather than echoed from the question, so it
 * always states what was actually applied even when the wording differs.
 */
function summarizeTalent(criteria: TalentSearchCriteria): string {
  const parts: string[] = [];
  if (criteria.name) parts.push(`named ${criteria.name}`);
  if (criteria.skills.length > 0) parts.push(`with ${criteria.skills.join(", ")}`);
  if (criteria.profession) parts.push(`working as ${criteria.profession}`);
  if (criteria.experience.length > 0) parts.push(`matching ${criteria.experience.join(", ")}`);
  if (criteria.ministry) parts.push(`in ${criteria.ministry}`);
  if (criteria.group) parts.push(`in ${criteria.group}`);
  if (criteria.willingness === "yes") parts.push("and willing to help");
  else if (criteria.willingness === "maybe") parts.push("and maybe available");
  else if (criteria.willingness === "not_currently") parts.push("though not currently available");
  if (parts.length === 0) return "Showing everyone who has shared their skills";
  return `Showing people ${parts.join(", ")}`;
}

// ─── Deterministic parsing ────────────────────────────────────

/**
 * Interpret a question with no AI at all.
 *
 * This is not a degraded mode — it is the same code path used whenever no
 * provider is registered, and it covers the questions a church actually asks.
 * Anything it cannot turn into a filter results in empty criteria, which the UI
 * presents as the full directory rather than as a failed search.
 *
 * A leftover content word is treated as a *skill*, because that is what
 * "who can cook" means even when "cooking" is not in the vocabulary yet. It is
 * never treated as experience, and only becomes a profession when the question
 * explicitly asks about someone's work.
 */
export function parseTalentQuestionDeterministic(
  question: string,
  vocabulary: CommunityVocabulary,
): { criteria: TalentSearchCriteria; summary: string } {
  const skills = matchVocabulary(question, vocabulary.skills);
  const ministries = matchVocabulary(question, vocabulary.ministries);
  const groups = matchVocabulary(question, vocabulary.groups);
  const claimed = [...skills, ...ministries, ...groups];

  // Only an explicit question about someone's work makes a leftover word a
  // profession, and the word is taken from after the trigger so the trigger
  // itself ("work", "career") is never the answer.
  const professionTrigger = question.match(
    /\b(?:works?|working|worked)\s+(?:as|in)\b|\b(?:profession|job title|career|line of work)\b/i,
  );
  let profession: string | undefined;
  if (professionTrigger && professionTrigger.index !== undefined) {
    const after = question.slice(professionTrigger.index + professionTrigger[0].length);
    profession = looseTerms(after, claimed, 1)[0];
  }

  const experience = detectExperience(question);
  const leftovers = looseTerms(question, claimed, 3);

  // If the profession term is also a known skill, keep only the profession
  // filter. The repository ANDs different fields, so keeping both would demand a
  // member match their job title *and* their self-listed skills — which can hide
  // the very person the question is about when they titled the skill differently
  // ("Bookkeeping" for a job called "Accountant").
  const redundantSkill = profession
    ? (s: string) => stemsAgree(stem(s), stem(profession as string))
    : () => false;

  const criteria: TalentSearchCriteria = {
    // A question is never treated as a name filter unless the tenant has a
    // member actually called that, which is resolved by the caller.
    name: undefined,
    profession,
    skills: [...skills.filter((s) => !redundantSkill(s)), ...leftovers],
    experience,
    ministry: ministries[0],
    group: groups[0],
    willingness: detectWillingness(question),
    // The opt-out is applied here, unconditionally.
    discoverableOnly: true,
  };

  return { criteria, summary: summarizeTalent(criteria) };
}

// ─── Local post-processing ────────────────────────────────────

/**
 * Force the privacy and safety invariants onto whatever the interpreter produced.
 *
 * Runs on AI output and on deterministic output alike, so neither can be the
 * route by which `discoverableOnly` is turned off or a field is left unbounded.
 */
function hardenTalentCriteria(
  raw: TalentSearchCriteria,
  vocabulary: CommunityVocabulary,
): TalentSearchCriteria {
  const snap = (terms: string[], pool: string[]): string[] => {
    const out: string[] = [];
    for (const term of terms) {
      // Prefer a real name from the tenant's own vocabulary, so a question
      // worded in the member's own language still matches the stored spelling.
      // Phrase match first for precision, then stem match for "accountant" ->
      // "Accounting".
      const exact = pool.find((n) => containsPhrase(n, term) || containsPhrase(term, n));
      const byStem = exact
        ? undefined
        : pool.find((n) => stemsAgree(stem(n), stem(term)));
      const value = exact ?? byStem ?? term;
      const key = normalize(value);
      if (key && !out.some((o) => normalize(o) === key)) out.push(value);
    }
    return out.slice(0, 10);
  };

  return {
    name: raw.name?.trim() ? raw.name.trim().slice(0, 100) : undefined,
    profession: raw.profession?.trim() ? raw.profession.trim().slice(0, 150) : undefined,
    skills: snap(raw.skills ?? [], vocabulary.skills),
    experience: (raw.experience ?? []).map((t) => t.slice(0, 200)).slice(0, 10),
    ministry: raw.ministry?.trim() ? raw.ministry.trim().slice(0, 200) : undefined,
    group: raw.group?.trim() ? raw.group.trim().slice(0, 200) : undefined,
    willingness: TALENT_WILLINGNESS_LEVELS.includes(raw.willingness as TalentWillingness)
      ? (raw.willingness as TalentWillingness | "any")
      : "any",
    // Not derived from input. See the privacy model at the top of this file.
    discoverableOnly: true,
  };
}

// ─── AI prompts ───────────────────────────────────────────────

const TALENT_PROMPT = `You extract search filters from a question about a church's volunteers.

Return ONLY a JSON object, no prose, no markdown fence, with these keys:
{
  "name": string | null,          // a person's name, only if the question names someone
  "profession": string | null,     // a job or profession, only if the question asks about someone's work
  "skills": string[],              // abilities, trades, tools or topics the question asks about
  "experience": string[],          // phrases about experience or years of experience
  "ministry": string | null,       // a ministry the question mentions
  "group": string | null,          // a group the question mentions
  "willingness": "yes" | "maybe" | "not_currently" | "any"
}

Rules:
- Use only words from the question. Never invent a skill, ministry or group name.
- If the question asks nothing specific, return empty arrays and nulls.
- "willingness" defaults to "any". Only set it if the question asks about availability.
- "skills" holds the abilities being asked about, not the whole question.

Question: %QUESTION%`;

const IDEA_PROMPT = `You extract search filters from a question about a church's idea bank.

Return ONLY a JSON object, no prose, no markdown fence, with these keys:
{
  "text": string | null,           // keywords the question is about
  "category": string | null,       // one of the categories listed below, or null
  "status": string | string[] | null // one or more of the statuses listed below, or null
}

Categories: %CATEGORIES%
Statuses: %STATUSES%

Rules:
- Use only words from the question. Never invent a category or status.
- Use a category or status only when the question clearly refers to it.
- "text" holds the content keywords, not the entire question.

Question: %QUESTION%`;

function fillPrompt(template: string, question: string, extra: Record<string, string> = {}): string {
  let out = template.replace("%QUESTION%", question);
  for (const [key, value] of Object.entries(extra)) {
    out = out.replace(`%${key}%`, value);
  }
  return out;
}

/**
 * Pull a JSON object out of a model response.
 *
 * Tolerates the usual wrappers — a markdown fence, a sentence of preamble — but
 * nothing else. Anything that is not a single object is treated as a failure and
 * the deterministic parser takes over, because a half-understood question must
 * not become a half-applied filter.
 */
export function extractJsonObject(raw: string): unknown | null {
  const text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ─── Orchestration ────────────────────────────────────────────

export interface InterpretTalentOptions {
  /** Whether the caller holds `ai.use`. */
  allowAi: boolean;
  context: AiContext;
}

/**
 * Interpret a talent question, preferring AI and falling back cleanly.
 *
 * The returned `source` and `fallbackReason` are not diagnostics for a log: the
 * UI shows them, so a leader can tell the difference between "the AI read this"
 * and "we matched this on keywords" and know which answer they are looking at.
 */
export async function interpretTalentQuestion(
  question: string,
  vocabulary: CommunityVocabulary,
  options: InterpretTalentOptions,
): Promise<TalentSearchInterpretation> {
  const deterministic = (reason: string): TalentSearchInterpretation => {
    const parsed = parseTalentQuestionDeterministic(question, vocabulary);
    return {
      criteria: hardenTalentCriteria(parsed.criteria, vocabulary),
      source: "deterministic",
      summary: parsed.summary,
      fallbackReason: reason,
      aiUsed: false,
    };
  };

  if (!options.allowAi) return deterministic("AI interpretation is not enabled for your role");

  try {
    const response = await aiService.complete(fillPrompt(TALENT_PROMPT, question), {
      ...options.context,
      feature: "talent_search",
    });
    const parsedJson = extractJsonObject(response);
    if (parsedJson === null) return deterministic("The AI response was not readable as filters");

    const raw = validate(talentSearchCriteriaSchema, parsedJson);
    const criteria = hardenTalentCriteria(raw as TalentSearchCriteria, vocabulary);

    return {
      criteria,
      source: "ai",
      summary: summarizeTalent(criteria),
      aiUsed: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI interpretation was unavailable";
    return deterministic(message);
  }
}

export interface InterpretIdeaOptions {
  allowAi: boolean;
  context: AiContext;
}

/** Interpret an idea-bank question. Mirrors `interpretTalentQuestion`. */
export async function interpretIdeaQuestion(
  question: string,
  options: InterpretIdeaOptions,
): Promise<IdeaSearchInterpretation> {
  const categories = IDEA_CATEGORIES as readonly string[];
  const statuses = ["new", "under_review", "planned", "implemented", "declined"] as const;

  const deterministic = (reason: string): IdeaSearchInterpretation => {
    const q = normalize(question);
    const category = categories.find((c) => containsPhrase(q, c.replace(/_/g, " ")));
    const statusList = statuses.filter((s) => containsPhrase(q, s.replace(/_/g, " ")));

    const criteria: IdeaSearchCriteria = {
      text: CONTENT_TOKENS(question)
        .filter((t) => t.length > 2)
        .slice(0, 8)
        .join(" ") || undefined,
      category: category as IdeaCategory | undefined,
      status:
        statusList.length === 1
          ? (statusList[0] as IdeaStatus)
          : statusList.length > 1
            ? (statusList as IdeaStatus[])
            : undefined,
    };

    const parts: string[] = [];
    if (criteria.text) parts.push(`matching "${criteria.text}"`);
    if (criteria.category) parts.push(`in ${criteria.category.replace(/_/g, " ")}`);
    if (criteria.status) parts.push(`with status ${[criteria.status].flat().join(", ")}`);

    return {
      criteria,
      source: "deterministic",
      summary:
        parts.length === 0
          ? "Showing every idea"
          : `Showing ideas ${parts.join(", ")}`,
      fallbackReason: reason,
      aiUsed: false,
    };
  };

  if (!options.allowAi) return deterministic("AI interpretation is not enabled for your role");

  try {
    const response = await aiService.complete(
      fillPrompt(IDEA_PROMPT, question, {
        CATEGORIES: categories.join(", "),
        STATUSES: statuses.join(", "),
      }),
      { ...options.context, feature: "idea_search" },
    );
    const parsedJson = extractJsonObject(response);
    if (parsedJson === null) return deterministic("The AI response was not readable as filters");

    const raw = validate(ideaSearchCriteriaSchema, parsedJson);
    const category =
      raw.category && (IDEA_CATEGORIES as readonly string[]).includes(raw.category)
        ? raw.category
        : undefined;

    return {
      criteria: {
        text: raw.text?.trim() || undefined,
        category: category as IdeaCategory | undefined,
        status: raw.status as IdeaStatus | IdeaStatus[] | undefined,
      },
      source: "ai",
      summary: deterministic("").summary,
      aiUsed: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI interpretation was unavailable";
    return deterministic(message);
  }
}

export const __testing = {
  normalize,
  containsPhrase,
  containsPhraseLoose,
  matchVocabulary,
  looseTerms,
  detectWillingness,
  detectExperience,
  summarizeTalent,
  hardenTalentCriteria,
  singularize,
  stem,
  stemsAgree,
  NOISE,
  STOPWORDS,
  PROFESSION_CATEGORIES,
};
