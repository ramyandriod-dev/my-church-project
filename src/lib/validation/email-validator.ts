/**
 * Robust Email Address & Domain Verification Utility
 *
 * Enforces strict church membership standards:
 * 1. Blocks domain typos (e.g. gmil.com -> gmail.com, hotmial.com -> hotmail.com).
 * 2. Only accepts real, correctly spelled domains (especially gmail.com).
 * 3. Disallows temporary / disposable / throwaway email addresses.
 * 4. Disallows fake / dummy / placeholder domains in production.
 * 5. Validates RFC local-part and TLD syntax rules.
 */

export const COMMON_DOMAIN_TYPOS: Record<string, string> = {
  // Gmail misspellings
  "gmil.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmeil.com": "gmail.com",
  "gmaik.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmaul.com": "gmail.com",
  "gmaol.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmaii.com": "gmail.com",
  "g-mail.com": "gmail.com",
  "g.mail.com": "gmail.com",
  "gmailc.om": "gmail.com",
  "gmai.co": "gmail.com",
  "gmaill.con": "gmail.com",
  "gmali.com": "gmail.com",
  "gmaill.co": "gmail.com",
  "gmeill.com": "gmail.com",
  "gmajl.com": "gmail.com",
  "gmaio.com": "gmail.com",
  "gmail.cmo": "gmail.com",
  "gmail.comm": "gmail.com",
  "gmail.coom": "gmail.com",
  "gmail.org": "gmail.com",
  "gmail.net": "gmail.com",
  "googlemail.con": "googlemail.com",

  // Yahoo misspellings
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yaho.co": "yahoo.com",
  "yaho.con": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "yaho.cm": "yahoo.com",
  "yahu.com": "yahoo.com",
  "yahou.com": "yahoo.com",
  "yahoo.cmo": "yahoo.com",
  "yahoo.comm": "yahoo.com",

  // Hotmail misspellings
  "hotmial.com": "hotmail.com",
  "hotmaill.com": "hotmail.com",
  "hotmali.com": "hotmail.com",
  "hotmeil.com": "hotmail.com",
  "hotmil.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.cmo": "hotmail.com",
  "hotmail.comm": "hotmail.com",

  // Outlook misspellings
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outluk.com": "outlook.com",
  "outlock.com": "outlook.com",
  "outlook.con": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.cmo": "outlook.com",

  // iCloud misspellings
  "iclud.com": "icloud.com",
  "iclou.com": "icloud.com",
  "icld.com": "icloud.com",
  "icloud.con": "icloud.com",
};

export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "10minutemail.net",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "yopmail.com",
  "yopmail.fr",
  "trashmail.com",
  "trashmail.net",
  "trashmail.org",
  "getairmail.com",
  "dispostable.com",
  "sharklasers.com",
  "fakeinbox.com",
  "throwawaymail.com",
  "mohmal.com",
  "mohmal.in",
  "burnermail.io",
  "crazymailing.com",
  "maildrop.cc",
  "mytemp.email",
  "nada.ltd",
  "inboxkitten.com",
  "emailondeck.com",
  "generator.email",
]);

export const FAKE_TEST_DOMAINS = new Set([
  "fake.com",
  "dummy.com",
  "invalid.com",
  "sample.com",
  "placeholder.com",
  "noemail.com",
  "nowhere.com",
]);

export const INVALID_TLD_TYPOS: Record<string, string> = {
  "con": "com",
  "cmo": "com",
  "comm": "com",
  "coom": "com",
  "cm": "com",
  "om": "com",
  "ogr": "org",
  "ent": "net",
};

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  errorAr?: string;
  suggestedEmail?: string;
}

/**
 * Validates that an email address uses a legitimate domain, is not a known typo
 * of a major provider (e.g. gmil.com -> gmail.com), and is not a disposable address.
 */
export function validateEmailAddress(
  email: string | undefined | null,
  options?: { allowTestDomains?: boolean }
): EmailValidationResult {
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!cleanEmail) {
    return {
      isValid: false,
      error: "Email address is mandatory",
      errorAr: "البريد الإلكتروني حقل إلزامي",
    };
  }

  // Basic RFC pattern
  const basicRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!basicRegex.test(cleanEmail)) {
    return {
      isValid: false,
      error: "Please enter a valid email format (e.g. name@gmail.com)",
      errorAr: "يرجى كتابة صيغة بريد إلكتروني صحيحة (مثال: name@gmail.com)",
    };
  }

  const parts = cleanEmail.split("@");
  if (parts.length !== 2) {
    return {
      isValid: false,
      error: "Invalid email address format",
      errorAr: "صيغة البريد الإلكتروني غير صحيحة",
    };
  }

  const [localPart, domain] = parts;

  if (localPart.length < 1 || localPart.length > 64) {
    return {
      isValid: false,
      error: "Email username is invalid",
      errorAr: "اسم المستخدم في البريد الإلكتروني غير صحيح",
    };
  }

  if (localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) {
    return {
      isValid: false,
      error: "Email username cannot start, end, or contain consecutive dots",
      errorAr: "لا يمكن أن يبدأ اسم المستخدم بنقطة أو ينتهي بها أو يحتوي على نقاط متتالية",
    };
  }

  // 1. Check known typo domains (e.g. gmil.com)
  if (COMMON_DOMAIN_TYPOS[domain]) {
    const correctedDomain = COMMON_DOMAIN_TYPOS[domain];
    const suggested = `${localPart}@${correctedDomain}`;
    return {
      isValid: false,
      error: `Invalid email domain '@${domain}'. Did you mean '@${correctedDomain}'? Only authentic, existing emails are accepted.`,
      errorAr: `نطاق البريد الإلكتروني غير صحيح (@${domain}). هل تقصد (@${correctedDomain})؟ يرجى إدخال بريد إلكتروني صحيح ومسجل.`,
      suggestedEmail: suggested,
    };
  }

  // 2. Check disposable email services
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      isValid: false,
      error: "Temporary and disposable email addresses are not allowed. Please enter your authentic personal email.",
      errorAr: "لا يُسمح باستخدام عناوين البريد المؤقتة أو الوهمية. يرجى إدخال بريدك الشخصي الحقيقي.",
    };
  }

  // 3. Check fake/dummy test domains
  if (!options?.allowTestDomains && FAKE_TEST_DOMAINS.has(domain)) {
    return {
      isValid: false,
      error: "Placeholder and fake email domains are not allowed. Please enter a real, existing email address.",
      errorAr: "لا يُسمح باستخدام نطاقات بريد تجريبية أو وهمية. يرجى إدخال بريد إلكتروني حقيقي.",
    };
  }

  // 4. Check top-level domain (TLD)
  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1];
  if (INVALID_TLD_TYPOS[tld]) {
    const suggestedDomain = [...domainParts.slice(0, -1), INVALID_TLD_TYPOS[tld]].join(".");
    return {
      isValid: false,
      error: `Invalid top-level domain '.${tld}'. Did you mean '.${INVALID_TLD_TYPOS[tld]}'?`,
      errorAr: `امتداد النطاق غير صحيح (.${tld}). هل تقصد (.${INVALID_TLD_TYPOS[tld]})؟`,
      suggestedEmail: `${localPart}@${suggestedDomain}`,
    };
  }

  if (tld.length < 2) {
    return {
      isValid: false,
      error: "Invalid email domain extension",
      errorAr: "امتداد نطاق البريد الإلكتروني غير صحيح",
    };
  }

  // 5. Gmail username rules
  if (domain === "gmail.com" || domain === "googlemail.com") {
    if (localPart.replace(/\./g, "").length < 3) {
      return {
        isValid: false,
        error: "Gmail usernames must be at least 3 characters",
        errorAr: "اسم مستخدم Gmail يجب أن يتكون من 3 أحرف على الأقل",
      };
    }
  }

  return { isValid: true };
}
