/**
 * The owner's demo accounts: one list for the login dropdown and for the server's
 * private-password rule. Kept free of server code so the login screens can import it.
 *
 * `scripts/seed-absent-demo-members.mjs` creates the "away" members; a test checks
 * that its emails match this list.
 */

export interface DemoAccount {
  email: string;
  en: string;
  ar: string;
  /** "core" = the standard demo logins; "away" = members who have been away for weeks. */
  group: "core" | "away";
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { email: "leader@grace.community", en: "Sarah, Leader", ar: "سارة (قائد)", group: "core" },
  { email: "admin@grace.community", en: "Grace, Admin", ar: "جريس (مدير)", group: "core" },
  { email: "member@grace.community", en: "Grace, Member", ar: "عضو تجريبي", group: "core" },
  // Last attended 4, 7 and 12 weeks ago: each triggers the golden "welcome back" banner when they check in.
  { email: "mina.samir@grace.community", en: "Mina Samir, away 4 weeks", ar: "مينا سمير (غائب ٤ أسابيع)", group: "away" },
  { email: "nadia.girgis@grace.community", en: "Nadia Girgis, away 7 weeks", ar: "نادية جرجس (غائبة ٧ أسابيع)", group: "away" },
  { email: "peter.wahba@grace.community", en: "Peter Wahba, away 12 weeks", ar: "بيتر وهبة (غائب ١٢ أسبوعًا)", group: "away" },
];

export const DEMO_ACCOUNT_EMAILS: ReadonlySet<string> = new Set(DEMO_ACCOUNTS.map((a) => a.email));
