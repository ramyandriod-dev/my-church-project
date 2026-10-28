// ─── Live Check-In Data ────────────────────────────────────────

export interface CheckInEvent {
  id: string;
  personId: string;
  personName: string;
  type: "member" | "visitor";
  ministry?: string;
  group?: string;
  timestamp: string;
  serviceId: string;
  avatar: string;
}

export const mockCheckIns: CheckInEvent[] = [
  { id: "1", personId: "20", personName: "Tyler Hill", type: "member", ministry: "Admin", group: "Facilities", timestamp: "10:42:18 AM", serviceId: "1", avatar: "https://i.pravatar.cc/150?img=61" },
  { id: "2", personId: "2", personName: "Michael Chen", type: "member", ministry: "Youth", group: "Youth Leadership", timestamp: "10:42:12 AM", serviceId: "1", avatar: "https://i.pravatar.cc/150?img=53" },
  { id: "3", personId: "10", personName: "Robert Lee", type: "visitor", timestamp: "10:41:58 AM", serviceId: "1", avatar: "https://i.pravatar.cc/150?img=51" },
  { id: "4", personId: "3", personName: "Emily Williams", type: "member", ministry: "Children", group: "Children's Team", timestamp: "10:41:45 AM", serviceId: "1", avatar: "https://i.pravatar.cc/150?img=45" },
  { id: "5", personId: "4", personName: "David Brown", type: "member", ministry: "Outreach", group: "Community Service", timestamp: "10:41:32 AM", serviceId: "1", avatar: "https://i.pravatar.cc/150?img=59" },
  { id: "6", personId: "18", personName: "Brian Wright", type: "visitor", timestamp: "10:41:20 AM", serviceId: "1", avatar: "https://i.pravatar.cc/150?img=52" },
  { id: "7", personId: "5", personName: "Lisa Martinez", type: "member", ministry: "Worship", group: "Choir", timestamp: "10:41:08 AM", serviceId: "1", avatar: "https://i.pravatar.cc/150?img=43" },
  { id: "8", personId: "11", personName: "Jennifer Clark", type: "member", ministry: "Children", group: "Nursery Team", timestamp: "10:40:55 AM", serviceId: "1", avatar: "https://i.pravatar.cc/150?img=46" },
  { id: "9", personId: "12", personName: "Daniel Lewis", type: "member", ministry: "Admin", group: "Tech Team", timestamp: "10:40:42 AM", serviceId: "1", avatar: "https://i.pravatar.cc/150?img=57" },
  { id: "10", personId: "7", personName: "Rachel Taylor", type: "member", ministry: "Youth", group: "Youth Mentors", timestamp: "10:40:30 AM", serviceId: "1", avatar: "https://i.pravatar.cc/150?img=49" },
  { id: "11", personId: "8", personName: "Kevin Thomas", type: "member", ministry: "Outreach", group: "Mission Trip", timestamp: "10:40:18 AM", serviceId: "1", avatar: "https://i.pravatar.cc/150?img=55" },
  { id: "12", personId: "19", personName: "Lauren Lopez", type: "member", ministry: "Outreach", group: "Community Service", timestamp: "10:40:05 AM", serviceId: "1", avatar: "https://i.pravatar.cc/150?img=42" },
];

const simulatedNames = [
  { name: "Mark George", type: "visitor" as const, avatar: "https://i.pravatar.cc/150?img=60" },
  { name: "Nicole King", type: "member" as const, ministry: "Worship", group: "Small Group A", avatar: "https://i.pravatar.cc/150?img=41" },
  { name: "Tyler Hill", type: "member" as const, ministry: "Admin", group: "Facilities", avatar: "https://i.pravatar.cc/150?img=61" },
  { name: "Samantha Scott", type: "member" as const, ministry: "Worship", group: "Choir", avatar: "https://i.pravatar.cc/150?img=40" },
  { name: "Justin Baker", type: "member" as const, ministry: "Outreach", group: "Mission Trip", avatar: "https://i.pravatar.cc/150?img=54" },
  { name: "Ashley Nelson", type: "member" as const, ministry: "Worship", group: "Worship Team", avatar: "https://i.pravatar.cc/150?img=39" },
];

let simulatedIndex = 0;

export function generateSimulatedCheckIn(serviceId: string): CheckInEvent {
  const template = simulatedNames[simulatedIndex % simulatedNames.length];
  simulatedIndex++;
  const now = new Date();
  return {
    id: `sim-${Date.now()}`,
    personId: `sim-${simulatedIndex}`,
    personName: template.name,
    type: template.type,
    ministry: template.ministry,
    group: template.group,
    timestamp: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }),
    serviceId,
    avatar: template.avatar,
  };
}
