/**
 * Mock portraits for the CRM while members have no uploaded photo.
 *
 * Everything here is generated locally and deterministically from a seed (a name
 * or id): the same person always gets the same face, nothing is fetched from an
 * outside service, and nothing is stored. A real `avatarUrl` always wins; these
 * are only the fallback. They are illustrations, not photographs of anyone.
 */

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small seeded PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKIN = ["#F1C9A5", "#E8B88F", "#D49A6A", "#B9784C", "#8D5A3B", "#6B4128"];
const HAIR = ["#1C1410", "#2B1B12", "#4A2E1E", "#6B4A2F", "#8A8A8A", "#C9A66B"];
const CLOTH = ["#132F4C", "#2A5580", "#8A6A35", "#4B6B57", "#7A4B78", "#8C3B3B", "#3E3E3E", "#B08D57"];
const BACKDROPS: Array<[string, string]> = [
  ["#DCE6F2", "#B9CBE3"],
  ["#F3E7CF", "#E3C98F"],
  ["#E3EFE6", "#BFD9C6"],
  ["#F1E3EA", "#DFC0CE"],
  ["#E6E3F3", "#C9C3E4"],
  ["#F6E4D8", "#E8C3A6"],
];

function pick<T>(r: () => number, list: T[]): T {
  return list[Math.floor(r() * list.length)];
}

/** One person (head and shoulders) drawn in a 96 x 96 box, as SVG markup. */
function person(seed: string, opts: { scale?: number; x?: number; y?: number } = {}): string {
  const r = rng(hashSeed(seed));
  const skin = pick(r, SKIN);
  const hair = pick(r, HAIR);
  const cloth = pick(r, CLOTH);
  const style = Math.floor(r() * 5);
  const scale = opts.scale ?? 1;
  const x = opts.x ?? 0;
  const y = opts.y ?? 0;

  const behind =
    style === 1
      ? `<path d="M28 44 C24 20 38 14 48 14 C60 14 72 22 68 46 L71 74 L25 74 Z" fill="${hair}"/>`
      : "";
  const top =
    style === 0
      ? `<path d="M30 40 C29 22 40 16 48 16 C58 16 67 23 66 40 C62 31 56 28 48 28 C40 28 34 31 30 40 Z" fill="${hair}"/>`
      : style === 1
      ? `<path d="M30 40 C30 24 40 18 48 18 C58 18 66 25 66 40 C60 30 38 28 30 40 Z" fill="${hair}"/>`
      : style === 2
      ? `<circle cx="48" cy="13" r="8" fill="${hair}"/><path d="M30 40 C29 22 40 17 48 17 C58 17 67 23 66 40 C62 31 56 28 48 28 C40 28 34 31 30 40 Z" fill="${hair}"/>`
      : style === 3
      ? `<path d="M31 36 C32 24 40 21 48 21 C56 21 64 24 65 36 C60 30 36 30 31 36 Z" fill="${hair}"/>`
      : `<circle cx="34" cy="26" r="9" fill="${hair}"/><circle cx="48" cy="21" r="10" fill="${hair}"/><circle cx="62" cy="26" r="9" fill="${hair}"/><circle cx="30" cy="38" r="6" fill="${hair}"/><circle cx="66" cy="38" r="6" fill="${hair}"/>`;

  return `<g transform="translate(${x} ${y}) scale(${scale})">
${behind}
<path d="M10 96 C10 74 28 66 48 66 C68 66 86 74 86 96 Z" fill="${cloth}"/>
<rect x="41" y="54" width="14" height="16" rx="6" fill="${skin}" opacity="0.92"/>
<ellipse cx="48" cy="42" rx="17" ry="20" fill="${skin}"/>
${top}
<circle cx="41.5" cy="43" r="1.7" fill="#2B2118"/>
<circle cx="54.5" cy="43" r="1.7" fill="#2B2118"/>
<path d="M43 51 Q48 55 53 51" stroke="#8C4B3A" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</g>`;
}

function backdrop(seed: string, w: number, h: number): string {
  const [a, b] = BACKDROPS[hashSeed(seed + "#bg") % BACKDROPS.length];
  return `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>`;
}

function toDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** A single mock portrait (96 x 96) for a person. */
export function mockAvatar(seed: string): string {
  const key = seed.trim() || "member";
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">${backdrop(key, 96, 96)}${person(key)}</svg>`
  );
}

/**
 * A mock group portrait: several people side by side on a soft backdrop.
 * `seeds` are the people to draw (up to `max`); with none, a few anonymous
 * faces are drawn from the group's own seed so every group still gets a photo.
 */
export function mockPortrait(seed: string, seeds: string[] = [], max = 6): string {
  const key = seed.trim() || "group";
  const people = (seeds.length > 0 ? seeds : [key + "-1", key + "-2", key + "-3", key + "-4"]).slice(0, max);
  const W = 320;
  const H = 180;
  const n = people.length;
  const size = n <= 2 ? 96 : n <= 4 ? 84 : 72;
  const step = n > 1 ? Math.min(size * 0.78, (W - size - 24) / (n - 1)) : 0;
  const start = (W - (size + step * (n - 1))) / 2;
  // Back-to-front so the middle people sit in front.
  const order = people.map((p, i) => i).sort((a, b) => Math.abs(b - (n - 1) / 2) - Math.abs(a - (n - 1) / 2));
  const drawn = order
    .map((i) => {
      const lift = i % 2 === 0 ? 0 : 6; // gentle stagger so it reads as a group
      return person(people[i], { scale: size / 96, x: start + step * i, y: H - size - 4 + lift });
    })
    .join("\n");
  return toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${backdrop(key, W, H)}${drawn}</svg>`
  );
}
