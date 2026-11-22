export const PROGRAM_NAME = "Neuro Mastery Program";
export const VENUE_SHORT = "Shadanga Kriya Centre, near Krida Chowk";
export const VENUE_FULL =
  "Shadanga Kriya Centre, 5th Floor, NCM Society Building, Pl. No. 434, Hanuman Nagar, Near Krida Chowk, Medical Road, Nagpur 440024, Maharashtra, India";
export const SESSION_TIME = "6:00 – 8:00 AM";
export const ARRIVE = "5:30 – 6:00 AM";
export const STARTS_AT = "6:00 AM";
export const LANGUAGE = "Hindi and English";
export const CAPACITY = 150;
export const CORE_FEE = 499;
export const FULL_FEE = 12499;
export const GST_RATE = 0.18;
export const CORE_DATES = "24 – 27 Nov";
export const FULL_DATES = "24 Nov – 23 Dec";
export const UPGRADE_DATES = "28 Nov – 23 Dec";
export const UPGRADE_HOLD = "27 Nov, 9 PM";
export const MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=Shadanga%20Kriya%20Centre%2C%205th%20Floor%2C%20NCM%20Society%20Building%2C%20Plot%20434%2C%20Hanuman%20Nagar%2C%20Near%20Krida%20Chowk%2C%20Medical%20Road%2C%20Nagpur";
export const INSTAGRAM_URL = "https://www.instagram.com/shadangakriya";
export const EMAIL = "hello@shadangakriya.com";
export const EMAIL_URL = "mailto:hello@shadangakriya.com";
export const RAZORPAY_URL = "https://razorpay.me/@shadangakriya";
export const SUPPORT_PHONE = "+91 89563 91919";
export const CALL_URL = "tel:+918956391919";
export const WHATSAPP_URL = "https://wa.me/918956391919";
export const CORE_GROUP_URL = "https://chat.whatsapp.com/CVnc7KRyWTt6JABkhMsdpg";
export const FULL_GROUP_URL = "https://chat.whatsapp.com/HxkAq8OevIy71A56a97rMS";
export const COMPANY = "PL Six Tele Pi Pvt. Ltd.";

export const GOALS = [
  "Concentration",
  "Awareness",
  "Calmness",
  "Confidence",
  "Emotional regulation",
  "Decisiveness",
  "Clarity about my way of life",
] as const;

export const ROLES = [
  "Student",
  "Working adult",
  "Parent",
  "Homemaker",
  "Senior citizen (60+)",
  "Other",
] as const;

export const RELATIONS = [
  "Spouse / partner",
  "Child",
  "Parent",
  "Guardian",
  "Sibling",
  "Grandparent",
  "Grandchild",
  "Relative",
  "Friend",
  "Other",
] as const;

export const CORE_POINTS = [
  "Breath and sound to settle toward the alpha state",
  "Steadier focus; thoughts and emotions seen clearly and balanced",
  "On Day 4, you choose whether to continue",
];

export const FULL_POINTS = [
  "Going deeper, from alpha toward theta, across all six dimensions",
  "Steady focus and attention, sharper senses, and easier recall of what you study and learn",
  "Break old patterns, build emotional independence and your personal blueprint",
  "30 mornings at the centre, 24 Nov to 23 Dec, with the Shadanga Kriya app",
  "Weekend sessions for doubt-clearing and community",
  "Weekly progress check by the team",
];
export const IOS_APP_URL = "https://apps.apple.com/us/app/shadanga-kriya/id6759166813";
export const ANDROID_APP_URL = "https://play.google.com/store/apps/details?id=com.shadangakriya.app";

export const SHIFTS: [string, string][] = [
  ["Attention that wanders", "Attention you can direct and hold"],
  ["Confusion", "Clarity"],
  ["Reacting at once", "A small pause, then a choice"],
  ["Emotions that sweep you away", "Noticing an emotion as it rises"],
  ["Self-doubt", "Self-observation"],
  ["Living on autopilot", "Living with awareness"],
];

export const FAQS: [string, string][] = [
  ["Do I need any experience?", "No. It is built for complete beginners. No yoga, meditation, Sanskrit or belief needed."],
  ["Is this religious?", "No ritual, attire or sect. It is open to every faith, or none."],
  ["Is this therapy?", "No. It is training for attention and awareness, not treatment, and it does not replace medical or psychological care."],
  ["Is it scientifically proven?", "Its parts (breathing, meditation, attention training) are widely researched. A formal study of Shadanga Kriya itself is under way."],
  ["I am under 18. Can I join?", "Yes, with a parent or guardian’s consent in the booking form."],
  ["Can parent & child join the programme together?", "Yes. Parents and children (Class 8 and above) can join the same batch and practise side by side. Book a seat for each person; a child under 18 needs a parent’s consent."],
  ["What happens after Day 4?", "You choose. Continue into the full program, or keep practising on your own with the routine you learned."],
  ["What if I miss a morning?", "The program works best daily, with no gap."],
  ["Where exactly is it?", "Shadanga Kriya Centre, 5th Floor, NCM Society Building, Pl. No. 434, Hanuman Nagar, Near Krida Chowk, Medical Road, Nagpur 440024, Maharashtra."],
];

function eachDay(start: Date, end: Date) {
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(cur.toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export const CORE_DAYS = eachDay(new Date(2026, 10, 24), new Date(2026, 10, 27));
export const FULL_DAYS = eachDay(new Date(2026, 10, 24), new Date(2026, 11, 23));

export const DISCLAIMER =
  "Shadanga Kriya is training for attention and awareness, not medical or psychological treatment. Results vary from person to person. If you're going through a hard time or having thoughts of harming yourself, please talk to a mental health professional, or call Tele-MANAS on 14416 (free, 24×7, India).";
