/**
 * Session Guard Rules
 *
 * The pure decision behind the dashboard auth guard: given what the server said
 * about the session, should the browser end the session and send the user to the
 * login page?
 *
 * Kept separate from the component so the rule can be tested directly. It is a
 * deliberately narrow rule, because the failure mode of a too-eager guard is
 * exactly the bug this replaces: signing people out at the wrong moment.
 */

export const LOGIN_PATH = "/login";

/**
 * Only an explicit "your session is not valid" answer ends the session.
 *
 * Notably absent:
 *   - 5xx and other unexpected statuses. A server hiccup is not a logout.
 *   - 404. The route answering oddly does not mean the session died.
 *   - Any network failure, which never reaches this function at all.
 */
export function shouldEndSession(responseStatus: number): boolean {
  return responseStatus === 401 || responseStatus === 403;
}

/**
 * Build the login URL, preserving where the user was headed so they land back
 * there after signing in.
 */
export function buildLoginRedirect(currentPath: string): string {
  const from = currentPath.startsWith("/") ? currentPath : "/dashboard";
  return `${LOGIN_PATH}?from=${encodeURIComponent(from)}`;
}
