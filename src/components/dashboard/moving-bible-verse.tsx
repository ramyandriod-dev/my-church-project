"use client";

import * as React from "react";
import { useTranslation } from "@/lib/i18n";

export interface BibleVerse {
  id: string;
  category: "praise" | "worship" | "service" | "fellowship" | "shepherding";
  ar: {
    text: string;
    reference: string;
  };
  en: {
    text: string;
    reference: string;
  };
}

export const BIBLE_VERSES: BibleVerse[] = [
  {
    id: "psalm-100-2",
    category: "worship",
    ar: {
      text: "اعْبُدُوا الرَّبَّ بِفَرَحٍ. ادْخُلُوا إِلَى حَضْرَتِهِ بِتَرَنُّمٍ.",
      reference: "مزمور 100: 2",
    },
    en: {
      text: "Serve the Lord with gladness; come before His presence with singing.",
      reference: "Psalm 100:2",
    },
  },
  {
    id: "psalm-23-1",
    category: "shepherding",
    ar: {
      text: "الرَّبُّ رَاعِيَّ فَلاَ يُعْوِزُنِي شَيْءٌ.",
      reference: "مزمور 23: 1",
    },
    en: {
      text: "The Lord is my shepherd; I shall not want.",
      reference: "Psalm 23:1",
    },
  },
  {
    id: "psalm-34-1",
    category: "praise",
    ar: {
      text: "أُبَارِكُ الرَّبَّ فِي كُلِّ حِينٍ. دَائِمًا تَسْبِيحُهُ فِي فَمِي.",
      reference: "مزمور 34: 1",
    },
    en: {
      text: "I will bless the Lord at all times; His praise shall continually be in my mouth.",
      reference: "Psalm 34:1",
    },
  },
  {
    id: "psalm-133-1",
    category: "fellowship",
    ar: {
      text: "هُوَذَا مَا أَحْسَنَ وَمَا أَجْمَلَ أَنْ يَسْكُنَ الإِخْوَةُ مَعًا!",
      reference: "مزمور 133: 1",
    },
    en: {
      text: "Behold, how good and how pleasant it is for brethren to dwell together in unity!",
      reference: "Psalm 133:1",
    },
  },
  {
    id: "psalm-95-6",
    category: "worship",
    ar: {
      text: "هَلُمَّ نَسْجُدُ وَنَرْكَعُ وَنَجْثُو أَمَامَ الرَّبِّ صَانِعِنَا.",
      reference: "مزمور 95: 6",
    },
    en: {
      text: "Oh come, let us worship and bow down; let us kneel before the Lord our Maker.",
      reference: "Psalm 95:6",
    },
  },
  {
    id: "psalm-122-1",
    category: "fellowship",
    ar: {
      text: "فَرِحْتُ بِالْقَائِلِينَ لِي: «إِلَى بَيْتِ الرَّبِّ نَذْهَبُ».",
      reference: "مزمور 122: 1",
    },
    en: {
      text: "I was glad when they said to me, 'Let us go into the house of the Lord.'",
      reference: "Psalm 122:1",
    },
  },
  {
    id: "joshua-24-15",
    category: "service",
    ar: {
      text: "أَمَّا أَنَا وَبَيْتِي فَنَعْبُدُ الرَّبَّ.",
      reference: "يشوع 24: 15",
    },
    en: {
      text: "As for me and my house, we will serve the Lord.",
      reference: "Joshua 24:15",
    },
  },
  {
    id: "1pet-5-2",
    category: "shepherding",
    ar: {
      text: "ارْعَوْا رَعِيَّةَ اللهِ الَّتِي بَيْنَكُمْ نُظَّارًا بِطَوْعِيَّةٍ.",
      reference: "1 بطرس 5: 2",
    },
    en: {
      text: "Shepherd the flock of God which is among you, serving as overseers willingly.",
      reference: "1 Peter 5:2",
    },
  },
  {
    id: "psalm-150-6",
    category: "praise",
    ar: {
      text: "كُلُّ نَسَمَةٍ فَلْتُسَبِّحِ الرَّبَّ. هَلْلُويَا.",
      reference: "مزمور 150: 6",
    },
    en: {
      text: "Let everything that has breath praise the Lord. Praise the Lord!",
      reference: "Psalm 150:6",
    },
  },
  {
    id: "heb-10-24",
    category: "fellowship",
    ar: {
      text: "وَلْنُلاَحِظْ بَعْضُنَا بَعْضًا لِلتَّحْرِيضِ عَلَى الْمَحَبَّةِ وَالأَعْمَالِ الْحَسَنَةِ.",
      reference: "عبرانيين 10: 24",
    },
    en: {
      text: "And let us consider one another in order to stir up love and good works.",
      reference: "Hebrews 10:24",
    },
  },
];

interface MovingBibleVerseProps {
  className?: string;
  compact?: boolean;
  /** "chip" (default) for light backgrounds; "onDark" is a quiet serif line for the dashboard photo banner. */
  variant?: "chip" | "onDark";
}

export function MovingBibleVerse({ className = "", compact = false, variant = "chip" }: MovingBibleVerseProps) {
  const { locale, isRTL } = useTranslation();
  const [index, setIndex] = React.useState(0);
  const [isFading, setIsFading] = React.useState(false);

  // Initialize with a pseudo-random index on mount/refresh
  React.useEffect(() => {
    const randomIndex = Math.floor(Math.random() * BIBLE_VERSES.length);
    setIndex(randomIndex);
  }, []);

  // Cycle to next verse smoothly every 12 seconds
  React.useEffect(() => {
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % BIBLE_VERSES.length);
        setIsFading(false);
      }, 400);
    }, 12000);

    return () => clearInterval(timer);
  }, []);

  const current = BIBLE_VERSES[index] || BIBLE_VERSES[0];
  const primaryText = locale === "ar" ? current.ar.text : current.en.text;
  const primaryRef = locale === "ar" ? current.ar.reference : current.en.reference;
  const secondaryText = locale === "ar" ? current.en.text : current.ar.text;
  const secondaryRef = locale === "ar" ? current.en.reference : current.ar.reference;

  const next = () => {
    setIsFading(true);
    setTimeout(() => {
      setIndex((prev) => (prev + 1) % BIBLE_VERSES.length);
      setIsFading(false);
    }, 250);
  };

  if (variant === "onDark") {
    return (
      <div
        className={`flex min-w-0 items-center gap-3 transition-opacity duration-300 ${isFading ? "opacity-30" : "opacity-100"} ${className}`}
        title={`${primaryText} (${primaryRef}) — ${secondaryText} (${secondaryRef})`}
      >
        <p className="min-w-0 truncate font-serif text-[15px] italic text-[#EDE6D6] sm:text-base">“{primaryText}”</p>
        <span className="shrink-0 text-xs font-semibold tracking-wide text-[#E3C98F]">{primaryRef}</span>
        <button
          type="button"
          onClick={next}
          className="shrink-0 rounded-full p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          title={isRTL ? "الآية التالية" : "Next verse"}
          aria-label={isRTL ? "الآية التالية" : "Next verse"}
        >
          <svg className="h-3.5 w-3.5 rtl:-scale-x-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 border border-blue-200/70 shadow-xs backdrop-blur-xs transition-opacity duration-300 text-sm text-blue-900 ${
        isFading ? "opacity-30" : "opacity-100"
      } ${className}`}
      title={`${primaryText} (${primaryRef}) — ${secondaryText} (${secondaryRef})`}
    >
      <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] shadow-xs">
        ✝
      </span>

      <div className="flex items-center gap-2 overflow-hidden text-start">
        <span className="text-[13px] sm:text-sm font-semibold text-blue-950 truncate max-w-[280px] sm:max-w-[420px] md:max-w-[540px]">
          “{primaryText}”
        </span>
        <span className="shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-blue-200/60 text-blue-800">
          {primaryRef}
        </span>
      </div>

      <button
        type="button"
        onClick={() => {
          setIsFading(true);
          setTimeout(() => {
            setIndex((prev) => (prev + 1) % BIBLE_VERSES.length);
            setIsFading(false);
          }, 250);
        }}
        className="shrink-0 p-1 text-blue-400 hover:text-blue-700 transition-colors rounded-full hover:bg-blue-100/60 cursor-pointer"
        title={isRTL ? "الآية التالية" : "Next verse"}
        aria-label="Next verse"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
