/**
 * Loads every member, page by page.
 *
 * `/api/members` returns at most 100 per page. Screens that look names up by id
 * (the family pages) used to ask for one page only, so once the church passed
 * 100 members, anyone beyond the first page showed up as a raw id. This walks
 * `meta.totalPages` instead.
 */

const PAGE_SIZE = 100;
/** Safety stop: 50 pages is 5,000 members, far beyond a single church. */
const MAX_PAGES = 50;

export async function fetchAllMembers<T = any>(fetcher: typeof fetch = fetch): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetcher(`/api/members?limit=${PAGE_SIZE}&page=${page}`);
    if (!res.ok) {
      if (page === 1) throw Object.assign(new Error(`Members request failed (${res.status})`), { status: res.status });
      break;
    }
    const json = await res.json();
    const items: T[] = Array.isArray(json?.data) ? json.data : [];
    all.push(...items);
    const totalPages = Number(json?.meta?.totalPages ?? 1);
    if (items.length < PAGE_SIZE || page >= totalPages) break;
  }
  return all;
}
