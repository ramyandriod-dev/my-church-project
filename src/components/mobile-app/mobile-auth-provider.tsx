"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  mobileApiFetch,
  setMobileAuthToken,
  onUnauthorized,
  MobileApiError,
} from "@/lib/mobile-app/api-client";

export interface MobileAuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  tenantId?: string;
  tenantName?: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
  memberId?: string | null;
}

export interface MobileMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status: string;
  ministry?: string | null;
  joinedAt?: string;
  familyId?: string | null;
  familyName?: string | null;
  familyRelationship?: string | null;
  talentProfile?: {
    skills?: any[] | null;
    interests?: any[] | null;
    profession?: string | null;
  } | null;
  group?: {
    id: string;
    name: string;
  } | null;
  familyMembers?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    relationship?: string | null;
    isSelf?: boolean;
  }> | null;
}

interface MobileAuthContextType {
  user: MobileAuthUser | null;
  member: MobileMember | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const MobileAuthContext = createContext<MobileAuthContextType | undefined>(undefined);

export function MobileAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MobileAuthUser | null>(null);
  const [member, setMember] = useState<MobileMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const refreshProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Verify current authenticated session via /api/auth/me
      const authData = await mobileApiFetch<{
        user: MobileAuthUser & { member?: MobileMember | null };
      }>("/api/auth/me");

      if (authData?.user) {
        setUser(authData.user);

        // Fetch detailed, enriched member profile via /api/members/me
        try {
          const memberData = await mobileApiFetch<MobileMember>("/api/members/me");
          if (memberData) {
            setMember(memberData);
          } else if (authData.user.member) {
            setMember(authData.user.member);
          }
        } catch {
          // Fall back to member from auth/me if /api/members/me is unavailable
          setMember(authData.user.member || null);
        }
      } else {
        setUser(null);
        setMember(null);
      }
    } catch (err: any) {
      // 401 or network failure
      setUser(null);
      setMember(null);
      if (err instanceof MobileApiError && err.status !== 401) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        setIsLoading(true);
        setError(null);

        const loginRes = await mobileApiFetch<{
          accessToken: string;
          tokenType: string;
          expiresIn: number;
          user: MobileAuthUser & { member?: MobileMember | null };
        }>("/api/auth/mobile/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        if (loginRes?.accessToken) {
          setMobileAuthToken(loginRes.accessToken);
        }

        if (loginRes?.user) {
          setUser(loginRes.user);
          if (loginRes.user.member) {
            setMember(loginRes.user.member);
          } else {
            // Secondary fetch to ensure full profile if needed
            try {
              const memberData = await mobileApiFetch<MobileMember>("/api/members/me");
              setMember(memberData);
            } catch {
              setMember(null);
            }
          }
        }

        return true;
      } catch (err: any) {
        let message =
          err instanceof MobileApiError
            ? err.message
            : "Login failed. Please check your credentials.";
        if (err instanceof MobileApiError && err.status >= 500) {
          message = "Connection timeout or service initializing. Please tap Sign In again.";
        }
        setError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await mobileApiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    } finally {
      setMobileAuthToken(null);
      setUser(null);
      setMember(null);
      setError(null);
    }
  }, []);

  useEffect(() => {
    // Opening the Android app from scratch always starts signed out, so the person
    // picks their account again (Google asks "Choose an account"). Switching away
    // and back keeps the session: the marker below lives only as long as the app's
    // process. The website in a normal browser is unaffected.
    let freshAppLaunch = false;
    try {
      const inApk = typeof (window as any).AndroidAuthBridge !== "undefined";
      if (inApk && !sessionStorage.getItem("cmp:app-launched")) {
        sessionStorage.setItem("cmp:app-launched", "1");
        freshAppLaunch = true;
      }
    } catch {
      // Storage blocked: fall through to the normal behaviour.
    }

    if (freshAppLaunch) {
      void (async () => {
        try {
          await mobileApiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        } finally {
          setMobileAuthToken(null);
          setUser(null);
          setMember(null);
          setIsLoading(false);
        }
      })();
    } else {
      // Initial profile resolution on mount
      void refreshProfile();
    }

    // Listen for unauthorized events to clear session state immediately
    const unsubscribe = onUnauthorized(() => {
      setUser(null);
      setMember(null);
    });

    return () => {
      unsubscribe();
    };
  }, [refreshProfile]);

  return (
    <MobileAuthContext.Provider
      value={{
        user,
        member,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        logout,
        refreshProfile,
        clearError,
      }}
    >
      {children}
    </MobileAuthContext.Provider>
  );
}

export function useMobileAuth() {
  const context = useContext(MobileAuthContext);
  if (!context) {
    throw new Error("useMobileAuth must be used within a MobileAuthProvider");
  }
  return context;
}
