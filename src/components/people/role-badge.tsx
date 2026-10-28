import { CHURCH_ROLE_META, type ChurchRole } from "@/lib/members/church-role";

/** Small pill showing someone's role in the church. Regular members show nothing unless asked. */
export function RoleBadge({
  role,
  isAr = false,
  showMember = false,
}: {
  role?: ChurchRole;
  isAr?: boolean;
  showMember?: boolean;
}) {
  const r = role ?? "member";
  if (r === "member" && !showMember) return null;
  const meta = CHURCH_ROLE_META[r];
  return (
    <span className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 align-middle text-[9px] font-bold ${meta.classes}`}>
      <span aria-hidden="true">{meta.emoji}</span>
      {isAr ? meta.ar : meta.en}
    </span>
  );
}
