import { Shell } from "@/components/layout/shell";
import { DashboardProvider } from "@/lib/dashboard-context";
import { AttendanceDemoProvider } from "@/components/dashboard/attendance-demo-provider";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardProvider>
        <AttendanceDemoProvider>
          <Shell>{children}</Shell>
        </AttendanceDemoProvider>
      </DashboardProvider>
    </AuthGuard>
  );
}
