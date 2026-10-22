import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import { categories, cities } from './schema';

const provinceNames = [
  'Adana|أضنة', 'Adıyaman|أديامان', 'Afyonkarahisar|أفيون قره حصار', 'Ağrı|أغري', 'Aksaray|أق سراي', 'Amasya|أماصيا',
  'Ankara|أنقرة', 'Antalya|أنطاليا', 'Ardahan|أردهان', 'Artvin|أرتوين', 'Aydın|آيدن', 'Balıkesir|باليكسير',
  'Bartın|بارتين', 'Batman|باتمان', 'Bayburt|بايبورت', 'Bilecik|بيليجيك', 'Bingöl|بينغول', 'Bitlis|بدليس',
  'Bolu|بولو', 'Burdur|بوردور', 'Bursa|بورصة', 'Çanakkale|جناق قلعة', 'Çankırı|جنقري', 'Çorum|جوروم',
  'Denizli|دنيزلي', 'Diyarbakır|دياربكر', 'Düzce|دوزجه', 'Edirne|أدرنة', 'Elazığ|إلازيغ', 'Erzincan|أرزنجان',
  'Erzurum|أرضروم', 'Eskişehir|إسكي شهير', 'Gaziantep|غازي عنتاب', 'Giresun|غيرسون', 'Gümüşhane|غوموش خانة',
  'Hakkari|هاكاري', 'Hatay|هاتاي', 'Iğdır|إغدير', 'Isparta|إسبرطة', 'İstanbul|إسطنبول', 'İzmir|إزمير',
  'Kahramanmaraş|كهرمان مرعش', 'Karabük|قره بوك', 'Karaman|قره مان', 'Kars|قارص', 'Kastamonu|قسطموني',
  'Kayseri|قيصري', 'Kilis|كيليس', 'Kırıkkale|قرق قلعة', 'Kırklareli|قرقلار إيلي', 'Kırşehir|قرشهير',
  'Kocaeli|كوجالي', 'Konya|قونية', 'Kütahya|كوتاهية', 'Malatya|ملاطية', 'Manisa|مانيسا', 'Mardin|ماردين',
  'Mersin|مرسين', 'Muğla|موغلا', 'Muş|موش', 'Nevşehir|نوشهر', 'Niğde|نيغدة', 'Ordu|أوردو', 'Osmaniye|عثمانية',
  'Rize|ريزه', 'Sakarya|سكاريا', 'Samsun|سامسون', 'Şanlıurfa|شانلي أورفا', 'Siirt|سعرد', 'Sinop|سينوب',
  'Sivas|سيواس', 'Şırnak|شرناق', 'Tekirdağ|تكيرداغ', 'Tokat|توقات', 'Trabzon|طرابزون', 'Tunceli|تونجلي',
  'Uşak|أوشاك', 'Van|وان', 'Yalova|يالوفا', 'Yozgat|يوزغات', 'Zonguldak|زونغولداك',
].map((entry) => {
  const [nameTr, nameAr] = entry.split('|');
  const id = nameTr!.toLocaleLowerCase('tr-TR').replaceAll('ı', 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll('ç', 'c').replaceAll('ğ', 'g').replaceAll('ş', 's').replaceAll('ü', 'u').replaceAll('ö', 'o').replaceAll(' ', '-');
  return { id, nameTr: nameTr!, nameAr: nameAr!, nameEn: nameTr!.replace('İ', 'I').replace('ı', 'i') };
});

const categorySeed = [
  { id: 'education', nameTr: 'Eğitim', nameAr: 'تعليم', nameEn: 'Education' },
  { id: 'culture', nameTr: 'Kültür', nameAr: 'ثقافة', nameEn: 'Culture' },
  { id: 'sports', nameTr: 'Spor', nameAr: 'رياضة', nameEn: 'Sports' },
];

async function run(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('Development reference seeds are disabled in production.');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required to seed development data.');
  const pool = new Pool({ connectionString });
  const database = drizzle(pool);
  try {
    await database.insert(cities).values(provinceNames).onConflictDoUpdate({
      target: cities.id,
      set: { nameTr: sql`excluded.name_tr`, nameAr: sql`excluded.name_ar`, nameEn: sql`excluded.name_en` },
    });
    await database.insert(categories).values(categorySeed).onConflictDoUpdate({
      target: categories.id,
      set: { nameTr: sql`excluded.name_tr`, nameAr: sql`excluded.name_ar`, nameEn: sql`excluded.name_en` },
    });
  } finally {
    await pool.end();
  }
}

void run();
