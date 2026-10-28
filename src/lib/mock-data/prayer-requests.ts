// ─── Prayer Requests Mock Data ─────────────────────────────────

export interface PrayerRequest {
  id: string;
  personName: string;
  avatar: string;
  category: "family" | "health" | "work" | "relationships" | "spiritual" | "other";
  request: string;
  submittedAt: string;
  submittedDate: string;
  status: "new" | "in-prayer" | "prayed" | "follow-up-needed";
  assignedShepherd?: string;
}

export const prayerRequests: PrayerRequest[] = [
  { id: "1", personName: "Sarah Johnson", avatar: "https://i.pravatar.cc/150?img=47", category: "family", request: "Please pray for my mother who is recovering from surgery. She needs strength and healing during this time.", submittedAt: "10:32 AM", submittedDate: "Sep 16, 2026", status: "new", assignedShepherd: "Pastor David Brown" },
  { id: "2", personName: "Michael Chen", avatar: "https://i.pravatar.cc/150?img=53", category: "work", request: "Job interview next week. Praying for God's guidance and favor in the process.", submittedAt: "10:15 AM", submittedDate: "Sep 16, 2026", status: "new" },
  { id: "3", personName: "Emily Williams", avatar: "https://i.pravatar.cc/150?img=45", category: "health", request: "Dealing with chronic pain. Praying for relief and wisdom for doctors.", submittedAt: "9:48 AM", submittedDate: "Sep 16, 2026", status: "in-prayer", assignedShepherd: "Pastor David Brown" },
  { id: "4", personName: "David Brown", avatar: "https://i.pravatar.cc/150?img=59", category: "spiritual", request: "Seeking deeper walk with God. Want to grow in faith and understanding.", submittedAt: "9:30 AM", submittedDate: "Sep 16, 2026", status: "prayed" },
  { id: "5", personName: "Lisa Martinez", avatar: "https://i.pravatar.cc/150?img=43", category: "relationships", request: "Going through a difficult season in marriage. Need prayer for restoration and unity.", submittedAt: "9:15 AM", submittedDate: "Sep 16, 2026", status: "in-prayer", assignedShepherd: "Rachel Taylor" },
  { id: "6", personName: "James Anderson", avatar: "https://i.pravatar.cc/150?img=60", category: "family", request: "Son is struggling in school. Praying for focus, discipline, and good influences.", submittedAt: "Yesterday", submittedDate: "Sep 15, 2026", status: "follow-up-needed", assignedShepherd: "Pastor David Brown" },
  { id: "7", personName: "Michelle Walker", avatar: "https://i.pravatar.cc/150?img=48", category: "health", request: "Upcoming medical test. Praying for good results and peace of mind.", submittedAt: "Yesterday", submittedDate: "Sep 15, 2026", status: "new" },
  { id: "8", personName: "Robert Lee", avatar: "https://i.pravatar.cc/150?img=51", category: "other", request: "New to the city. Praying for connection and finding community.", submittedAt: "Yesterday", submittedDate: "Sep 15, 2026", status: "new" },
  { id: "9", personName: "Jennifer Clark", avatar: "https://i.pravatar.cc/150?img=46", category: "work", request: "Feeling burned out at work. Praying for renewal and clarity about next steps.", submittedAt: "Sep 14", submittedDate: "Sep 14, 2026", status: "prayed" },
  { id: "10", personName: "Kevin Thomas", avatar: "https://i.pravatar.cc/150?img=55", category: "spiritual", request: "Struggling with forgiveness. Need prayer for healing and release.", submittedAt: "Sep 14", submittedDate: "Sep 14, 2026", status: "in-prayer", assignedShepherd: "Pastor David Brown" },
  { id: "11", personName: "Brian Wright", avatar: "https://i.pravatar.cc/150?img=52", category: "relationships", request: "Reconnecting with estranged family member. Praying for reconciliation.", submittedAt: "Sep 13", submittedDate: "Sep 13, 2026", status: "follow-up-needed" },
  { id: "12", personName: "Rachel Taylor", avatar: "https://i.pravatar.cc/150?img=49", category: "family", request: "Expecting first child. Praying for healthy pregnancy and safe delivery.", submittedAt: "Sep 13", submittedDate: "Sep 13, 2026", status: "prayed" },
];

export function getPrayerRequestStats() {
  const today = new Date().toDateString();
  const total = prayerRequests.length;
  const todayCount = prayerRequests.filter(r => {
    const submitted = new Date(r.submittedDate);
    return submitted.toDateString() === today;
  }).length;
  const newCount = prayerRequests.filter(r => r.status === "new").length;
  const inPrayerCount = prayerRequests.filter(r => r.status === "in-prayer").length;
  const prayedCount = prayerRequests.filter(r => r.status === "prayed").length;
  const followUpCount = prayerRequests.filter(r => r.status === "follow-up-needed").length;
  return { total, todayCount, newCount, inPrayerCount, prayedCount, followUpCount };
}
