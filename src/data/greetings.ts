import type { GiftSurprise, GreetingPreset, HolidayDatePreset } from '../types/studio';

export const GREETING_PRESETS: readonly GreetingPreset[] = [
  {
    id: 'merry-christmas',
    tag: 'Classic Holiday',
    eyebrow: "SEASON'S GREETINGS",
    title: 'Merry Christmas',
    subtitle: 'ขอให้ความสุขและความอบอุ่นอยู่เคียงข้างคุณตลอดปีใหม่นี้',
  },
  {
    id: 'happy-new-year',
    tag: 'New Year Wish',
    eyebrow: 'CHEERS TO NEW BEGINNINGS',
    title: 'Happy New Year',
    subtitle: 'สวัสดีปีใหม่ ขอให้ทุกวันเต็มไปด้วยรอยยิ้ม พลังใจ และความสำเร็จ',
  },
  {
    id: 'seasons-greetings',
    tag: 'Warm Vocabulary',
    eyebrow: 'FESTIVE BLESSINGS',
    title: "Season's Greetings",
    subtitle: 'คำอวยพรแสนอบอุ่นประจำเทศกาล มอบให้คนสำคัญในช่วงเวลาส่งท้ายปีเก่าต้อนรับปีใหม่',
  },
  {
    id: 'joy-prosperity',
    tag: 'New Year Blessing',
    eyebrow: 'PEACE & ABUNDANCE',
    title: 'Joy & Prosperity',
    subtitle: 'ขอให้ปีใหม่นี้เปี่ยมด้วยความปิติยินดี สุขภาพแข็งแรง และความมั่งคั่งรุ่งเรือง',
  },
  {
    id: 'auld-lang-syne',
    tag: 'Classic Tradition',
    eyebrow: 'TIMELESS MEMORIES',
    title: 'Auld Lang Syne',
    subtitle: 'บทเพลงแห่งความทรงจำอันงดงาม เพื่อระลึกถึงมิตรภาพและการก้าวสู่ปีใหม่อย่างมีความหมาย',
  },
  {
    id: 'warmest-wishes',
    tag: 'Heartfelt Phrase',
    eyebrow: 'FROM THE HEART',
    title: 'Warmest Wishes',
    subtitle: 'ส่งความปรารถนาดีอันแสนอบอุ่น ท่ามกลางลมหนาวและแสงไฟแห่งเทศกาล',
  },
  {
    id: 'peace-on-earth',
    tag: 'Winter Serenity',
    eyebrow: 'STILLNESS & LIGHT',
    title: 'Peace & Wonder',
    subtitle: 'ขอให้หัวใจสงบงดงามเหมือนค่ำคืนหิมะโปรย และสว่างไสวด้วยแสงดาวแห่งความหวัง',
  },
  {
    id: 'bright-new-year',
    tag: 'Sparkling Hope',
    eyebrow: 'RADIANT CHAPTER',
    title: 'Sparkle & Shine',
    subtitle: 'ขอให้ปีที่กำลังจะมาถึงเป็นปีที่คุณได้เปล่งประกายและค้นพบสิ่งดี ๆ ในทุกก้าว',
  },
];

export function getGiftSurprises(upcomingYear: number): readonly GiftSurprise[] {
  return [
    {
      emoji: '🎁',
      title: 'Warmest Wishes',
      meaning: 'ความปรารถนาดีอันแสนอบอุ่น',
      quote: 'ขอให้ช่วงเวลาส่งท้ายปีนี้โอบกอดคุณด้วยความสบายใจ และรอยยิ้มจากคนรอบข้าง',
    },
    {
      emoji: '🌟',
      title: 'New Horizons',
      meaning: 'ขอบฟ้าใหม่และโอกาสที่สดใส',
      quote: 'ปีใหม่กำลังนำพาประตูบานใหม่และเรื่องราวน่าประทับใจเข้ามาในชีวิตของคุณ',
    },
    {
      emoji: '🎄',
      title: 'Evergreen Joy',
      meaning: 'ความสุขที่ผลิบานไม่รู้จบ',
      quote: 'เหมือนต้นสนที่ไม่เคยทิ้งใบในฤดูหนาว ขอให้กำลังใจของคุณมั่นคงตลอดทั้งปี',
    },
    {
      emoji: '❄️',
      title: 'Serendipity',
      meaning: 'ความบังเอิญที่แสนวิเศษ',
      quote: 'ขอให้ได้พบเรื่องดี ๆ ที่ไม่ได้คาดฝัน เหมือนเกล็ดหิมะแรกที่ตกลงมาอย่างงดงาม',
    },
    {
      emoji: '🥂',
      title: `Cheers to ${upcomingYear}`,
      meaning: 'ฉลองให้กับการเริ่มต้นใหม่อันงดงาม',
      quote: 'ทิ้งความเหนื่อยล้าไว้ในปีเก่า แล้วก้าวเข้าสู่ปีใหม่ด้วยหัวใจที่เบาสบายและสดใส',
    },
  ];
}

export const GIFT_COLORS = [
  { box: '#d95338', side: '#b03c25', ribbon: '#f6d56f', tag: '#fffdf7' },
  { box: '#1f6e52', side: '#154d39', ribbon: '#f4b942', tag: '#fffdf7' },
  { box: '#2e86ab', side: '#20627e', ribbon: '#fffdf7', tag: '#f4b942' },
  { box: '#e58ca2', side: '#be667c', ribbon: '#fffdf7', tag: '#f6d56f' },
  { box: '#e9a83a', side: '#c2831d', ribbon: '#1f6e52', tag: '#fffdf7' },
] as const;

// Upcoming Lunar New Year dates (2025-2032) for accurate preset selection
const LUNAR_NEW_YEAR_DATES: readonly string[] = [
  '2025-01-29',
  '2026-02-17',
  '2027-02-06',
  '2028-01-26',
  '2029-02-13',
  '2030-02-03',
  '2031-01-23',
  '2032-02-11',
];

function formatLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getUpcomingHolidayPresets(now: Date = new Date()): readonly HolidayDatePreset[] {
  const todayIso = formatLocalIsoDate(now);
  const nextLunar =
    LUNAR_NEW_YEAR_DATES.find((d) => d >= todayIso) ?? `${now.getFullYear() + 1}-02-01`;
  const lunarYear = nextLunar.slice(0, 4);

  const thisYear = now.getFullYear();
  const songkranThisYear = `${thisYear}-04-13`;
  const songkranIso = songkranThisYear >= todayIso ? songkranThisYear : `${thisYear + 1}-04-13`;
  const songkranYear = songkranIso.slice(0, 4);

  const valentinesThisYear = `${thisYear}-02-14`;
  const valentinesIso =
    valentinesThisYear >= todayIso ? valentinesThisYear : `${thisYear + 1}-02-14`;
  const valentinesYear = valentinesIso.slice(0, 4);

  return [
    {
      id: 'lunar-new-year',
      label: 'ตรุษจีน',
      displayLabel: `Lunar New Year ${lunarYear}`,
      isoDate: nextLunar,
    },
    {
      id: 'songkran',
      label: 'สงกรานต์',
      displayLabel: `Songkran ${songkranYear}`,
      isoDate: songkranIso,
    },
    {
      id: 'valentines',
      label: 'วาเลนไทน์',
      displayLabel: `Valentine's Day ${valentinesYear}`,
      isoDate: valentinesIso,
    },
  ];
}
