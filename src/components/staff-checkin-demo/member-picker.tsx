"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { DemoMember, SignInUser } from "@/lib/staff-checkin-demo/types";
import { fetchDemoMembers, signInAsMember } from "@/lib/staff-checkin-demo/api";

interface MemberPickerProps {
  signedIn: SignInUser | null;
  onSignedIn: (user: SignInUser) => void;
}

/**
 * "Sign in as a member" — the demo's deterministic identity step.
 * The password is dev-skipped; identity resolution on check-in always comes
 * from this authenticated session, never from the QR or the client.
 */
export function MemberPicker({ signedIn, onSignedIn }: MemberPickerProps) {
  const [members, setMembers] = React.useState<DemoMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [signingIn, setSigningIn] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    fetchDemoMembers()
      .then((data) => {
        if (!active) return;
        setMembers(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load members"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function handleSignIn(member: DemoMember) {
    setSigningIn(member.id);
    setError(null);
    try {
      const user = await signInAsMember(member);
      onSignedIn(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setSigningIn(null);
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-base font-bold text-gray-900 mb-1">Who is checking in?</h2>
      <p className="text-xs text-gray-500 mb-4">
        Pick a member to open this simulator as. This creates the authenticated
        session that resolves the check-in server-side.
      </p>

      {error && (
        <div className="rounded-xl bg-coral-50 border border-coral-200 text-coral-700 text-xs px-3 py-2.5 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl bg-gray-100 text-gray-500 text-sm text-center py-8">
          No members found in this organization.
        </div>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => {
            const isActive = signedIn?.email === member.email;
            return (
              <li
                key={member.id}
                className={
                  (isActive ? "ring-2 ring-mint-400 border-transparent " : "border-gray-200 ") +
                  "rounded-2xl bg-white border p-3 flex items-center gap-3"
                }
              >
                <Avatar
                  src={member.avatarUrl ?? undefined}
                  initials={`${member.firstName[0]}${member.lastName[0]}`}
                  size="md"
                  status={isActive ? "online" : "offline"}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{member.email}</p>
                </div>
                <Button
                  size="sm"
                  variant={isActive ? "secondary" : "primary"}
                  onClick={() => handleSignIn(member)}
                  disabled={loading || !!signingIn}
                  isLoading={signingIn === member.id}
                >
                  {isActive ? "Current" : "Sign in"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {signedIn && (
        <div data-testid="signed-in-banner" className="mt-4 rounded-xl bg-mint-50 border border-mint-200 px-3 py-2.5 text-xs text-mint-700">
          Signed in as{" "}
          <span className="font-semibold">
            {signedIn.name} ({signedIn.email})
          </span>{" "}
          · {signedIn.tenantName}
        </div>
      )}
    </div>
  );
}