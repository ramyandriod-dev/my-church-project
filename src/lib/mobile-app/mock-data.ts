/**
 * Deterministic Mock Data for Mobile UI (New Heliopolis Evangelical Church)
 *
 * Source of truth: MOBILE-UX-UI-BLUEPRINT-V1.1-BALANCED.md
 * Tailored specifically for New Heliopolis Evangelical Church (كنيسة مصر الجديدة الإنجيلية).
 * Compliant with Evangelical church terminology:
 * - Friday Morning Meeting (اجتماع صباح الجمعة)
 * - Sunday Morning Meeting (اجتماع صباح الأحد)
 * - Sunday Evening Meeting (اجتماع مساء الأحد)
 * - Youth Meeting (اجتماع الشباب)
 * - Sunday School (اجتماع مدارس الأحد)
 * Does not hit the database or mutate state.
 */

export interface MobileMemberProfile {
  id: string;
  name: { en: string; ar: string };
  email: string;
  phone: string;
  avatarUrl?: string;
  memberSince: { en: string; ar: string };
  churchName: { en: string; ar: string };
  ministry: {
    name: { en: string; ar: string };
    role: { en: string; ar: string };
    nextDutyDate: { en: string; ar: string };
    teamLeader: { en: string; ar: string };
  };
  household: {
    id: string;
    name: { en: string; ar: string };
    relationship: { en: string; ar: string };
    subgroup: { en: string; ar: string };
  }[];
  groups: {
    id: string;
    name: { en: string; ar: string };
    role: "leader" | "member";
    meetingTime: { en: string; ar: string };
    location: { en: string; ar: string };
    membersCount: number;
  }[];
  talent: {
    skills: { en: string; ar: string }[];
    interests: { en: string; ar: string }[];
    isDiscoverable: boolean;
    lastUpdated: { en: string; ar: string };
  };
  submittedIdeas: {
    id: string;
    title: { en: string; ar: string };
    category: { en: string; ar: string };
    submittedDate: { en: string; ar: string };
    status: "under_review" | "approved";
  }[];
  attendanceHistory: {
    id: string;
    serviceName: { en: string; ar: string };
    date: { en: string; ar: string };
    status: "attended" | "excused";
  }[];
  recentActivities: {
    id: string;
    title: { en: string; ar: string };
    timeAgo: { en: string; ar: string };
    type: "checkin" | "ministry" | "idea" | "care";
  }[];
}

export interface MobileNextService {
  id: string;
  title: { en: string; ar: string };
  date: { en: string; ar: string };
  time: { en: string; ar: string };
  location: { en: string; ar: string };
  isCheckInOpen: boolean;
  memberRoleToday?: { en: string; ar: string };
}

export interface MobileEventItem {
  id: string;
  title: { en: string; ar: string };
  category: "spiritual" | "fellowship" | "youth" | "serviceOutreach";
  date: { en: string; ar: string };
  time: { en: string; ar: string };
  location: { en: string; ar: string };
  description: { en: string; ar: string };
  isRegistered?: boolean;
}

export const MOCK_MEMBER_PROFILE: MobileMemberProfile = {
  id: "mem_sam_001",
  name: {
    en: "Sam Youssef",
    ar: "رامي يوسف",
  },
  email: "sam.youssef@example.com",
  phone: "+20 100 123 4567",
  memberSince: {
    en: "September 2021",
    ar: "سبتمبر ٢٠٢١",
  },
  churchName: {
    en: "New Heliopolis Evangelical Church",
    ar: "كنيسة مصر الجديدة الإنجيلية",
  },
  ministry: {
    name: {
      en: "Worship & Multimedia Ministry",
      ar: "خدمة التسبيح والوسائط",
    },
    role: {
      en: "Audio & Media Coordinator",
      ar: "منسق الصوتيات والوسائط",
    },
    nextDutyDate: {
      en: "This Friday • 9:30 AM",
      ar: "الجمعة القادم • ٩:٣٠ ص",
    },
    teamLeader: {
      en: "David Nabil",
      ar: "ديفيد نبيل",
    },
  },
  household: [
    {
      id: "fam_001",
      name: { en: "Mary Youssef", ar: "ماري يوسف" },
      relationship: { en: "Spouse", ar: "الزوجة" },
      subgroup: { en: "Sunday School Ministry", ar: "خدمة مدارس الأحد" },
    },
    {
      id: "fam_002",
      name: { en: "Mark Youssef", ar: "مارك يوسف" },
      relationship: { en: "Son", ar: "الابن" },
      subgroup: { en: "Youth Meeting", ar: "اجتماع الشباب" },
    },
  ],
  groups: [
    {
      id: "grp_001",
      name: {
        en: "Friday Morning Bible Study",
        ar: "مجموعة دراسة الكتاب - صباح الجمعة",
      },
      role: "leader",
      meetingTime: {
        en: "Fridays • 9:00 AM",
        ar: "الجمعة • ٩:٠٠ صباحاً",
      },
      location: {
        en: "Fellowship Hall (Room 102)",
        ar: "قاعة الشركة (غرفة ١٠٢)",
      },
      membersCount: 16,
    },
    {
      id: "grp_002",
      name: {
        en: "Young Couples Fellowship",
        ar: "أسرة المتزوجين حديثاً",
      },
      role: "member",
      meetingTime: {
        en: "Every 2nd Tuesday • 7:30 PM",
        ar: "الثلاثاء الثاني شهرياً • ٧:٣٠ م",
      },
      location: {
        en: "Upper Fellowship Hall",
        ar: "القاعة العلوية",
      },
      membersCount: 24,
    },
  ],
  talent: {
    skills: [
      { en: "Software Engineering & Web Apps", ar: "هندسة البرمجيات وتطبيقات الويب" },
      { en: "Live Sound & Acoustic Engineering", ar: "هندسة الصوت الحي والمكساج" },
      { en: "Broadcast Video & Streaming", ar: "البث المرئي والمباشر" },
    ],
    interests: [
      { en: "Youth Mentorship & Discipleship", ar: "تلمذة ورعاية الشباب" },
      { en: "Community Outreach & Technology", ar: "التقنية لخدمة المجتمع" },
    ],
    isDiscoverable: true,
    lastUpdated: {
      en: "Updated 2 weeks ago",
      ar: "تم التحديث منذ أسبوعين",
    },
  },
  submittedIdeas: [
    {
      id: "idea_001",
      title: {
        en: "Interactive Digital Hymns & Praise Lyrics Catalog",
        ar: "فهرس الترانيم الرقمي التفاعلي لخدمة التسبيح والعبادة",
      },
      category: { en: "Worship & Technology", ar: "التسبيح والتقنية" },
      submittedDate: { en: "10 days ago", ar: "منذ ١٠ أيام" },
      status: "under_review",
    },
  ],
  attendanceHistory: [
    {
      id: "att_001",
      serviceName: { en: "Friday Morning Meeting", ar: "اجتماع صباح الجمعة" },
      date: { en: "Sep 26, 2026", ar: "٢٦ سبتمبر ٢٠٢٦" },
      status: "attended",
    },
    {
      id: "att_002",
      serviceName: { en: "Sunday Evening Meeting", ar: "اجتماع مساء الأحد" },
      date: { en: "Sep 21, 2026", ar: "٢١ سبتمبر ٢٠٢٦" },
      status: "attended",
    },
    {
      id: "att_003",
      serviceName: { en: "Friday Morning Meeting", ar: "اجتماع صباح الجمعة" },
      date: { en: "Sep 19, 2026", ar: "١٩ سبتمبر ٢٠٢٦" },
      status: "attended",
    },
    {
      id: "att_004",
      serviceName: { en: "Sunday Morning Meeting", ar: "اجتماع صباح الأحد" },
      date: { en: "Sep 14, 2026", ar: "١٤ سبتمبر ٢٠٢٦" },
      status: "attended",
    },
  ],
  recentActivities: [
    {
      id: "act_001",
      title: {
        en: "Checked in to Friday Morning Meeting",
        ar: "سجّل حضور في اجتماع صباح الجمعة",
      },
      timeAgo: { en: "4 days ago", ar: "منذ ٤ أيام" },
      type: "checkin",
    },
    {
      id: "act_002",
      title: {
        en: "Scheduled for Audio Ministry roster",
        ar: "تم تعيين دور الخدمة في جدول هندسة الصوت",
      },
      timeAgo: { en: "1 week ago", ar: "منذ أسبوع" },
      type: "ministry",
    },
    {
      id: "act_003",
      title: {
        en: "Shared suggestion for Hymns Digital Catalog",
        ar: "شارك مقترح فهرس الترانيم الرقمي التفاعلي",
      },
      timeAgo: { en: "2 weeks ago", ar: "منذ أسبوعين" },
      type: "idea",
    },
  ],
};

export const MOCK_NEXT_SERVICE: MobileNextService = {
  id: "srv_fri_meeting",
  title: {
    en: "Friday Morning Meeting",
    ar: "اجتماع صباح الجمعة",
  },
  date: {
    en: "Friday, October 2",
    ar: "الجمعة، ٢ أكتوبر",
  },
  time: {
    en: "10:00 AM – 12:30 PM",
    ar: "١٠:٠٠ ص – ١٢:٣٠ م",
  },
  location: {
    en: "Main Auditorium • Ground Floor",
    ar: "القاعة الرئيسية الكبرى • الطابق الأرضي",
  },
  isCheckInOpen: true,
  memberRoleToday: {
    en: "Sound & Multimedia Team",
    ar: "فريق هندسة الصوت والوسائط",
  },
};

export const MOCK_EVENTS: MobileEventItem[] = [
  {
    id: "evt_001",
    title: {
      en: "Friday Morning Meeting & Agape Fellowship",
      ar: "اجتماع صباح الجمعة وشركة المحبة",
    },
    category: "spiritual",
    date: { en: "Friday, Oct 2", ar: "الجمعة، ٢ أكتوبر" },
    time: { en: "10:00 AM – 12:30 PM", ar: "١٠:٠٠ ص – ١٢:٣٠ م" },
    location: { en: "Main Auditorium", ar: "القاعة الرئيسية الكبرى" },
    description: {
      en: "Weekly worship service with praise, congregational prayer, and biblical teaching followed by fellowship coffee.",
      ar: "الاجتماع الأسبوعي العام مع ترانيم العبادة، الصلاة المشتركة، ورسالة الكلمة، يعقبه وقت شركة.",
    },
    isRegistered: true,
  },
  {
    id: "evt_002",
    title: {
      en: "Weekly Youth Meeting: 'Faith That Works'",
      ar: "اجتماع الشباب الأسبوعي: 'إيمان عامل بالمحبة'",
    },
    category: "youth",
    date: { en: "Saturday, Oct 3", ar: "السبت، ٣ أكتوبر" },
    time: { en: "7:00 PM – 9:00 PM", ar: "٧:٠٠ م – ٩:٠٠ م" },
    location: { en: "Youth Hall", ar: "قاعة الشباب" },
    description: {
      en: "Dynamic worship, relevant discussion, and small group fellowship for university and young professionals.",
      ar: "تسبيح، نقاش عملي وشركة مجموعات لشباب الجامعة والخريجين.",
    },
    isRegistered: false,
  },
  {
    id: "evt_003",
    title: {
      en: "Sunday Morning Meeting",
      ar: "اجتماع صباح الأحد",
    },
    category: "spiritual",
    date: { en: "Sunday, Oct 4", ar: "الأحد، ٤ أكتوبر" },
    time: { en: "10:30 AM – 12:30 PM", ar: "١٠:٣٠ ص – ١٢:٣٠ م" },
    location: { en: "Main Auditorium", ar: "القاعة الكبرى" },
    description: {
      en: "Sunday morning celebration with worship songs, scripture reading, and sermon message.",
      ar: "خدمة صباح الأحد مع ترانيم التسبيح، قراءة الكلمة، والرسالة الروحية.",
    },
    isRegistered: true,
  },
  {
    id: "evt_004",
    title: {
      en: "Sunday Evening Meeting & Prayer",
      ar: "اجتماع مساء الأحد والصلاة",
    },
    category: "spiritual",
    date: { en: "Sunday, Oct 4", ar: "الأحد، ٤ أكتوبر" },
    time: { en: "6:30 PM – 8:30 PM", ar: "٦:٣٠ م – ٨:٣٠ م" },
    location: { en: "Main Auditorium", ar: "القاعة الكبرى" },
    description: {
      en: "Evening worship, intercessory prayer for families and the community, and inspiring message.",
      ar: "عبادة مسائية، صلوات شفاعية لأجل العائلات واحتياجات المجتمع، ورسالة مشجعة.",
    },
    isRegistered: false,
  },
  {
    id: "evt_005",
    title: {
      en: "Midweek Bible Study & Community Care",
      ar: "اجتماع دراسة الكتاب وخدمة المحبة المجتمعية",
    },
    category: "serviceOutreach",
    date: { en: "Wednesday, Oct 7", ar: "الأربعاء، ٧ أكتوبر" },
    time: { en: "7:00 PM – 8:30 PM", ar: "٧:٠٠ م – ٨:٣٠ م" },
    location: { en: "Fellowship Hall", ar: "قاعة الشركة" },
    description: {
      en: "In-depth chapter Bible study and organizing monthly community support parcels.",
      ar: "دراسة متأنية في سفر الكتاب المقدس وتنسيق سلال الدعم للرعاية المجتمعية.",
    },
    isRegistered: false,
  },
];
