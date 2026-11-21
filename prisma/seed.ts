/**
 * Seed BrokerSodo with categories (and their attribute schemas), areas, settings,
 * staff, 45 sample listings with placeholder photos, testimonials, FAQs, pages
 * and some inbox items. Safe to re-run: it wipes sample content first.
 *
 *   npm run db:seed
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import blurMap from "./placeholder-blur.json";
import stockPhotos from "./placeholder-images.json";
import { photoType } from "./placeholder-type";
import { OFFICE_CATEGORY_NAME, extraDrafts, withExtraOptions } from "./sample-extra";
import { formatRefCode, listingSlug } from "../src/lib/ref-code";
import type { AttributeField } from "../src/lib/validators/attribute-schema";

const db = new PrismaClient();
const blur = blurMap as Record<string, string>;
const photos = stockPhotos as Record<string, string[]>;

// Deterministic PRNG so the seed is reproducible
let s = 42;
const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const int = (min: number, max: number) => Math.floor(min + rnd() * (max - min + 1));
const round = (n: number, step: number) => Math.round(n / step) * step;

const opt = (pairs: [string, string, string?][]) => pairs.map(([value, labelEn, labelAm]) => ({ value, labelEn, labelAm: labelAm ?? null }));

const F = (f: Partial<AttributeField> & Pick<AttributeField, "key" | "labelEn" | "type">): AttributeField => ({
  filterable: false,
  showOnCard: false,
  required: false,
  ...f,
});

const fuel = opt([["petrol", "Petrol", "ቤንዚን"], ["diesel", "Diesel", "ናፍጣ"], ["hybrid", "Hybrid", "ሃይብሪድ"], ["electric", "Electric", "ኤሌክትሪክ"]]);
const transmission = opt([["automatic", "Automatic", "አውቶማቲክ"], ["manual", "Manual", "ማንዋል"]]);
const colours = opt([["white", "White", "ነጭ"], ["silver", "Silver", "ብር"], ["black", "Black", "ጥቁር"], ["blue", "Blue", "ሰማያዊ"], ["red", "Red", "ቀይ"], ["grey", "Grey", "ግራጫ"]]);
const plateRegions = opt([["sidama", "Sidama"], ["swe", "South Ethiopia (SWE)"], ["aa", "Addis Ababa"], ["oromia", "Oromia"], ["et", "ET (Federal)"]]);
const water = opt([["24h", "24 hours", "24 ሰዓት"], ["shared", "Shared", "የጋራ"], ["tank", "Tank", "ታንከር"]]);
const electricity = opt([["private", "Private meter", "የግል ቆጣሪ"], ["shared", "Shared meter", "የጋራ ቆጣሪ"]]);

const vehicleSchema: AttributeField[] = [
  F({ key: "make", labelEn: "Make", labelAm: "ስሪት", type: "select", filterable: true, options: opt([["toyota", "Toyota"], ["suzuki", "Suzuki"], ["hyundai", "Hyundai"], ["isuzu", "Isuzu"], ["nissan", "Nissan"], ["volkswagen", "Volkswagen"], ["byd", "BYD"]]) }),
  F({ key: "model", labelEn: "Model", labelAm: "ሞዴል", type: "text" }),
  F({ key: "year", labelEn: "Year", labelAm: "ዓመት", type: "year", filterable: true, showOnCard: true }),
  F({ key: "mileage", labelEn: "Mileage", labelAm: "የተጓዘው", type: "number", unit: "km", filterable: true, showOnCard: true }),
  F({ key: "transmission", labelEn: "Transmission", labelAm: "ማርሽ", type: "select", options: transmission, filterable: true, showOnCard: true }),
  F({ key: "fuel", labelEn: "Fuel", labelAm: "ነዳጅ", type: "select", options: fuel, filterable: true }),
  F({ key: "colour", labelEn: "Colour", labelAm: "ቀለም", type: "select", options: colours }),
  F({ key: "plateRegion", labelEn: "Plate region", labelAm: "የሰሌዳ ክልል", type: "select", options: plateRegions }),
  F({ key: "libre", labelEn: "Libre available", labelAm: "ሊብሬ አለ", type: "boolean", filterable: true }),
];
const bikeSchema: AttributeField[] = [
  F({ key: "type", labelEn: "Type", labelAm: "ዓይነት", type: "select", filterable: true, showOnCard: true, options: opt([["bajaj", "Bajaj (3-wheeler)", "ባጃጅ"], ["motorbike", "Motorbike", "ሞተር ሳይክል"]]) }),
  F({ key: "make", labelEn: "Make", labelAm: "ስሪት", type: "select", options: opt([["bajaj", "Bajaj"], ["tvs", "TVS"], ["honda", "Honda"], ["yamaha", "Yamaha"], ["lifan", "Lifan"]]) }),
  F({ key: "year", labelEn: "Year", labelAm: "ዓመት", type: "year", filterable: true, showOnCard: true }),
  F({ key: "mileage", labelEn: "Mileage", labelAm: "የተጓዘው", type: "number", unit: "km", showOnCard: true }),
  F({ key: "plateRegion", labelEn: "Plate region", labelAm: "የሰሌዳ ክልል", type: "select", options: plateRegions }),
  F({ key: "libre", labelEn: "Libre available", labelAm: "ሊብሬ አለ", type: "boolean", filterable: true }),
];
const houseSchema: AttributeField[] = [
  F({ key: "bedrooms", labelEn: "Bedrooms", labelAm: "መኝታ ክፍሎች", type: "number", filterable: true, showOnCard: true }),
  F({ key: "bathrooms", labelEn: "Bathrooms", labelAm: "መታጠቢያ ቤቶች", type: "number", filterable: true, showOnCard: true }),
  F({ key: "areaM2", labelEn: "Floor area", labelAm: "ስፋት", type: "number", unit: "m²", filterable: true, showOnCard: true }),
  F({ key: "plotM2", labelEn: "Plot size", labelAm: "የቦታ ስፋት", type: "number", unit: "m²" }),
  F({ key: "floors", labelEn: "Floors", labelAm: "ወለሎች", type: "number" }),
  F({ key: "titleDeed", labelEn: "Title deed (carta)", labelAm: "ካርታ አለ", type: "boolean", filterable: true }),
  F({ key: "water", labelEn: "Water", labelAm: "ውሃ", type: "select", options: water }),
  F({ key: "parking", labelEn: "Parking", labelAm: "ፓርኪንግ", type: "boolean", filterable: true }),
];
const rentalSchema: AttributeField[] = [
  F({ key: "propertyType", labelEn: "Property type", labelAm: "የንብረት ዓይነት", type: "select", filterable: true, showOnCard: true, options: opt([["house", "House", "ቤት"], ["apartment", "Apartment", "አፓርትመንት"], ["shop", "Shop", "ሱቅ"], ["office", "Office", "ቢሮ"], ["warehouse", "Warehouse", "መጋዘን"], ["room", "Room", "ክፍል"]]) }),
  F({ key: "bedrooms", labelEn: "Bedrooms", labelAm: "መኝታ ክፍሎች", type: "number", filterable: true, showOnCard: true }),
  F({ key: "bathrooms", labelEn: "Bathrooms", labelAm: "መታጠቢያ ቤቶች", type: "number" }),
  F({ key: "areaM2", labelEn: "Area", labelAm: "ስፋት", type: "number", unit: "m²", showOnCard: true }),
  F({ key: "floor", labelEn: "Floor", labelAm: "ወለል", type: "text" }),
  F({ key: "furnished", labelEn: "Furnished", labelAm: "የተሟላ የቤት ዕቃ", type: "boolean", filterable: true }),
  F({ key: "water", labelEn: "Water", labelAm: "ውሃ", type: "select", options: water, filterable: true }),
  F({ key: "electricity", labelEn: "Electricity", labelAm: "መብራት", type: "select", options: electricity }),
  F({ key: "parking", labelEn: "Parking", labelAm: "ፓርኪንግ", type: "boolean", filterable: true }),
  F({ key: "depositMonths", labelEn: "Deposit", labelAm: "ቅድመ ክፍያ", type: "number", unit: "months" }),
];
const landSchema: AttributeField[] = [
  F({ key: "sizeM2", labelEn: "Size", labelAm: "ስፋት", type: "number", unit: "m²", filterable: true, showOnCard: true }),
  F({ key: "use", labelEn: "Zoning / use", labelAm: "አገልግሎት", type: "select", filterable: true, showOnCard: true, options: opt([["residential", "Residential", "ለመኖሪያ"], ["commercial", "Commercial", "ለንግድ"], ["agricultural", "Agricultural", "ለእርሻ"], ["mixed", "Mixed", "ድብልቅ"]]) }),
  F({ key: "titleDeed", labelEn: "Title deed available", labelAm: "ካርታ አለ", type: "boolean", filterable: true, showOnCard: true }),
  F({ key: "roadAccess", labelEn: "Road access", labelAm: "የመንገድ መዳረሻ", type: "boolean" }),
];
const electronicsSchema: AttributeField[] = [
  F({ key: "type", labelEn: "Type", labelAm: "ዓይነት", type: "select", filterable: true, showOnCard: true, options: opt([["phone", "Phone", "ስልክ"], ["laptop", "Laptop", "ላፕቶፕ"], ["tv", "TV", "ቴሌቪዥን"], ["fridge", "Fridge", "ፍሪጅ"], ["solar", "Solar system", "ሶላር"], ["other", "Other", "ሌላ"]]) }),
  F({ key: "brand", labelEn: "Brand", labelAm: "ብራንድ", type: "text", showOnCard: true }),
  F({ key: "model", labelEn: "Model", labelAm: "ሞዴል", type: "text" }),
  F({ key: "warranty", labelEn: "Warranty", labelAm: "ዋስትና", type: "number", unit: "months", filterable: true }),
];
const printerSchema: AttributeField[] = [
  F({ key: "brand", labelEn: "Brand", labelAm: "ብራንድ", type: "select", filterable: true, showOnCard: true, options: opt([["canon", "Canon"], ["hp", "HP"], ["epson", "Epson"], ["kyocera", "Kyocera"], ["ricoh", "Ricoh"]]) }),
  F({ key: "type", labelEn: "Type", labelAm: "ዓይነት", type: "select", filterable: true, showOnCard: true, options: opt([["laser", "Laser", "ሌዘር"], ["inkjet", "Inkjet", "ኢንክጄት"], ["copier", "Photocopier", "ፎቶ ኮፒ"], ["furniture", "Office furniture", "የቢሮ ዕቃ"]]) }),
  F({ key: "printVolume", labelEn: "Monthly print volume", labelAm: "ወርሃዊ የህትመት መጠን", type: "number", unit: "pages" }),
  F({ key: "colour", labelEn: "Colour printing", labelAm: "ባለቀለም ህትመት", type: "boolean", filterable: true }),
];
const machinerySchema: AttributeField[] = [
  F({ key: "type", labelEn: "Type", labelAm: "ዓይነት", type: "select", filterable: true, showOnCard: true, options: opt([["tractor", "Tractor", "ትራክተር"], ["excavator", "Excavator", "ኤክስካቫተር"], ["mill", "Grain mill", "ወፍጮ"], ["generator", "Generator", "ጀነሬተር"], ["mixer", "Concrete mixer", "ሚክሰር"], ["truck", "Truck", "ተሽከርካሪ"]]) }),
  F({ key: "brand", labelEn: "Brand", labelAm: "ብራንድ", type: "text", showOnCard: true }),
  F({ key: "hoursUsed", labelEn: "Hours used", labelAm: "የሰራበት ሰዓት", type: "number", unit: "h", filterable: true, showOnCard: true }),
  F({ key: "year", labelEn: "Year", labelAm: "ዓመት", type: "year", filterable: true }),
];
const otherSchema: AttributeField[] = [F({ key: "brand", labelEn: "Brand", labelAm: "ብራንድ", type: "text" })];

const CATEGORIES = [
  { slug: "vehicles", nameEn: "Cars & Vehicles", nameAm: "መኪናዎች", refPrefix: "V", icon: "car", schema: vehicleSchema, descriptionEn: "Cars, pickups and minibuses for sale in Wolaita Sodo." },
  { slug: "motorbikes-bajaj", nameEn: "Motorbikes & Bajaj", nameAm: "ሞተር ሳይክል እና ባጃጅ", refPrefix: "B", icon: "bajaj", schema: bikeSchema, descriptionEn: "Bajaj three-wheelers and motorbikes." },
  { slug: "houses", nameEn: "Houses for Sale", nameAm: "የሚሸጡ ቤቶች", refPrefix: "H", icon: "house", schema: houseSchema, descriptionEn: "Family homes and villas for sale." },
  { slug: "house-rent", nameEn: "Rentals", nameAm: "ኪራይ", refPrefix: "R", icon: "rentals", schema: rentalSchema, descriptionEn: "Houses, apartments, shops, offices and warehouses for rent." },
  { slug: "land", nameEn: "Land & Plots", nameAm: "መሬት", refPrefix: "L", icon: "land", schema: landSchema, descriptionEn: "Residential, commercial and farm land." },
  { slug: "machinery", nameEn: "Machinery", nameAm: "ማሽነሪ", refPrefix: "M", icon: "machinery", schema: machinerySchema, descriptionEn: "Tractors, mills, generators and construction equipment." },
  { slug: "electronics", nameEn: "Electronics", nameAm: "ኤሌክትሮኒክስ", refPrefix: "E", icon: "electronics", schema: electronicsSchema, descriptionEn: "Phones, laptops, TVs, fridges and solar systems." },
  { slug: "printers-office", nameEn: OFFICE_CATEGORY_NAME.nameEn, nameAm: OFFICE_CATEGORY_NAME.nameAm, refPrefix: "P", icon: "printer", schema: printerSchema, descriptionEn: "Printers, photocopiers and office equipment." },
  { slug: "other", nameEn: "Other", nameAm: "ሌሎች", refPrefix: "O", icon: "other", schema: otherSchema, descriptionEn: "Everything else we broker." },
] as const;

const AREAS = [
  ["Arada", "አራዳ", "arada"],
  ["Mehal Ketema", "መሃል ከተማ", "mehal-ketema"],
  ["Gebeya Sefer", "ገበያ ሰፈር", "gebeya-sefer"],
  ["Otona", "ኦቶና", "otona"],
  ["Wadu", "ዋዱ", "wadu"],
  ["Damota", "ዳሞታ", "damota"],
  ["University Area", "ዩኒቨርሲቲ አካባቢ", "university-area"],
  ["Bus Station Area", "መናኸሪያ አካባቢ", "bus-station"],
] as const;

type Draft = {
  cat: (typeof CATEGORIES)[number]["slug"];
  titleEn: string;
  titleAm?: string;
  dealType: "SALE" | "RENT";
  rentPeriod?: "DAY" | "MONTH" | "YEAR";
  price: number | null;
  condition?: "NEW" | "USED" | "REFURBISHED";
  attrs: Record<string, string | number | boolean>;
  desc: string;
  photo?: string;
};

function vehicles(): Draft[] {
  const list: [string, string, string, number, number][] = [
    ["toyota", "Vitz", "Toyota Vitz", 2012, 1_450_000],
    ["toyota", "Corolla", "Toyota Corolla", 2009, 1_900_000],
    ["suzuki", "Dzire", "Suzuki Dzire", 2019, 1_650_000],
    ["toyota", "Hilux", "Toyota Hilux Double Cab", 2015, 4_800_000],
    ["hyundai", "Atos", "Hyundai Atos", 2008, 820_000],
    ["isuzu", "NPR", "Isuzu NPR Truck", 2014, 3_900_000],
    ["toyota", "Land Cruiser", "Toyota Land Cruiser Prado", 2011, 7_500_000],
    ["byd", "Atto 3", "BYD Atto 3 (Electric)", 2024, 5_200_000],
  ];
  return list.map(([make, model, name, year, price]) => ({
    cat: "vehicles",
    titleEn: `${name} ${year}`,
    dealType: "SALE",
    price,
    condition: year >= 2024 ? "NEW" : "USED",
    attrs: {
      make,
      model,
      year,
      mileage: year >= 2024 ? int(0, 3000) : round(int(40_000, 210_000), 1000),
      transmission: make === "isuzu" ? "manual" : pick(["automatic", "manual", "automatic"]),
      fuel: make === "byd" ? "electric" : make === "isuzu" || model === "Hilux" ? "diesel" : "petrol",
      colour: pick(["white", "silver", "black", "blue", "grey"]),
      plateRegion: pick(["sidama", "swe", "aa"]),
      libre: rnd() > 0.15,
    },
    desc: `<p>Well-kept ${name}, ${year} model. Regularly serviced, clean interior and strong engine.</p><ul><li>Service history available</li><li>New tyres</li><li>Ready for inspection at the BrokerSodo office</li></ul>`,
  }));
}

function bikes(): Draft[] {
  return [
    ["bajaj", "bajaj", "Bajaj RE 4-stroke", 2021, 380_000],
    ["bajaj", "bajaj", "Bajaj RE Compact", 2019, 310_000],
    ["bajaj", "tvs", "TVS King Bajaj", 2022, 420_000],
    ["motorbike", "honda", "Honda CG125 Motorbike", 2020, 165_000],
    ["motorbike", "lifan", "Lifan 150cc Motorbike", 2023, 145_000],
  ].map(([type, make, name, year, price]) => ({
    cat: "motorbikes-bajaj" as const,
    titleEn: `${name} ${year}`,
    dealType: "SALE" as const,
    price: price as number,
    condition: "USED" as const,
    attrs: { type: type as string, make: make as string, year: year as number, mileage: round(int(8_000, 60_000), 500), plateRegion: "swe", libre: true },
    desc: `<p>${name} in good working condition. Libre and plate are ready. Ideal for business in Sodo.</p>`,
  }));
}

function houses(): Draft[] {
  return [3, 4, 5, 2, 6].map((bed, i) => ({
    cat: "houses" as const,
    titleEn: `${bed}-bedroom ${i === 4 ? "G+1 villa" : "house"} in ${AREAS[i][0]}`,
    titleAm: `ባለ ${bed} መኝታ ቤት በ${AREAS[i][1]}`,
    dealType: "SALE" as const,
    price: round(bed * int(1_400_000, 2_600_000), 50_000),
    attrs: { bedrooms: bed, bathrooms: Math.max(1, bed - 2), areaM2: bed * int(35, 50), plotM2: int(200, 500), floors: i === 4 ? 2 : 1, titleDeed: rnd() > 0.2, water: pick(["24h", "shared", "tank"]), parking: rnd() > 0.4 },
    desc: `<p>Spacious ${bed}-bedroom home on a quiet street. Fenced compound, separate kitchen and service quarters.</p><p>Title deed checked by BrokerSodo. Viewing by appointment.</p>`,
  }));
}

function rentals(): Draft[] {
  const items: [string, string, number | null, number, "DAY" | "MONTH" | "YEAR", boolean][] = [
    ["house", "3-bedroom house for rent", 3, 12_000, "MONTH", false],
    ["apartment", "Furnished 2-bedroom apartment", 2, 15_000, "MONTH", true],
    ["shop", "Ground-floor shop on main road", null, 9_500, "MONTH", false],
    ["office", "Office space near the bus station", null, 7_000, "MONTH", false],
    ["warehouse", "Large warehouse with truck access", null, 25_000, "MONTH", false],
    ["room", "Single room for students", 1, 2_500, "MONTH", false],
    ["apartment", "Guest apartment — daily rent", 1, 1_200, "DAY", true],
    ["house", "4-bedroom family house", 4, 18_000, "MONTH", false],
  ];
  return items.map(([pt, title, bed, price, period, furnished]) => ({
    cat: "house-rent" as const,
    titleEn: title,
    dealType: "RENT" as const,
    rentPeriod: period,
    price,
    attrs: {
      propertyType: pt,
      ...(bed ? { bedrooms: bed, bathrooms: Math.max(1, bed - 1) } : {}),
      areaM2: int(20, pt === "warehouse" ? 600 : 160),
      floor: pick(["Ground", "1st", "2nd"]),
      furnished,
      water: pick(["24h", "shared", "tank"]),
      electricity: pick(["private", "shared"]),
      parking: rnd() > 0.5,
      depositMonths: pick([1, 2, 3]),
    },
    desc: `<p>${title} in a safe, central location. Water and electricity available. Deposit and contract arranged through BrokerSodo.</p>`,
  }));
}

function land(): Draft[] {
  return [
    [250, "residential", 1_800_000],
    [500, "residential", 3_200_000],
    [1000, "commercial", 9_500_000],
    [5000, "agricultural", 4_000_000],
    [300, "mixed", 2_400_000],
  ].map(([size, use, price]) => ({
    cat: "land" as const,
    titleEn: `${size} m² ${use} plot`,
    titleAm: `${size} ካሬ ሜትር ቦታ`,
    dealType: "SALE" as const,
    price: price as number,
    attrs: { sizeM2: size as number, use: use as string, titleDeed: rnd() > 0.25, roadAccess: rnd() > 0.3 },
    desc: `<p>${size} m² ${use} land with clear boundaries. Document check by BrokerSodo before any payment.</p>`,
  }));
}

function machinery(): Draft[] {
  return [
    ["tractor", "Massey Ferguson", "Massey Ferguson 290 Tractor", 6_500_000, 4200],
    ["mill", "Local", "Grain mill (wefcho) with motor", 280_000, 1500],
    ["generator", "Perkins", "Perkins 60 kVA generator", 1_350_000, 3100],
    ["mixer", "Altrad", "Concrete mixer 350L", 210_000, 800],
  ].map(([type, brand, name, price, hours]) => ({
    cat: "machinery" as const,
    titleEn: name as string,
    dealType: "SALE" as const,
    price: price as number,
    condition: "USED" as const,
    attrs: { type: type as string, brand: brand as string, hoursUsed: hours as number, year: int(2010, 2021) },
    desc: `<p>${name} in working order. Can be tested on site. Serious buyers only.</p>`,
  }));
}

function electronics(): Draft[] {
  return [
    ["phone", "Samsung", "Galaxy A55 256GB", 58_000, "NEW", 12],
    ["laptop", "HP", "EliteBook 840 G6 (Core i5)", 42_000, "REFURBISHED", 3],
    ["tv", "LG", '55" Smart TV 4K', 65_000, "NEW", 12],
    ["solar", "Jinko", "Home solar system 1.5 kW", 120_000, "NEW", 24],
    ["fridge", "Hisense", "Double-door fridge 300L", 54_000, "USED", 0],
  ].map(([type, brand, model, price, cond, warranty]) => ({
    cat: "electronics" as const,
    titleEn: `${brand} ${model}`,
    dealType: "SALE" as const,
    price: price as number,
    condition: cond as "NEW" | "USED" | "REFURBISHED",
    attrs: { type: type as string, brand: brand as string, model: model as string, warranty: warranty as number },
    desc: `<p>${brand} ${model}. ${cond === "NEW" ? "Brand new in box with receipt." : "Tested and working perfectly."}</p>`,
  }));
}

function printers(): Draft[] {
  return [
    ["canon", "copier", "Canon iR 2525 photocopier", 145_000, 20000, false],
    ["hp", "laser", "HP LaserJet Pro M404", 45_000, 3000, false],
    ["epson", "inkjet", "Epson L3250 ink tank printer", 21_000, 1000, true],
    ["kyocera", "copier", "Kyocera TASKalfa 2553ci colour copier", 310_000, 30000, true],
  ].map(([brand, type, name, price, vol, colour]) => ({
    cat: "printers-office" as const,
    titleEn: name as string,
    dealType: "SALE" as const,
    price: price as number,
    condition: "USED" as const,
    attrs: { brand: brand as string, type: type as string, printVolume: vol as number, colour: colour as boolean },
    desc: `<p>${name}, serviced and ready for a busy office or print shop.</p>`,
  }));
}

function other(): Draft[] {
  return [
    { cat: "other", titleEn: "Wedding tent & 200 chairs", dealType: "RENT", rentPeriod: "DAY", price: 6_000, attrs: { brand: "—" }, desc: "<p>Large tent with 200 plastic chairs for weddings and events. Delivery available.</p>" },
    { cat: "other", titleEn: "Sofa set (7 seater)", dealType: "SALE", price: null, condition: "USED", attrs: { brand: "Local" }, desc: "<p>Comfortable 7-seater sofa set. Price on request.</p>" },
  ];
}

async function main() {
  console.log("Seeding BrokerSodo…");

  // Clear sample content (keeps users)
  await db.activityLog.deleteMany();
  await db.inquiry.deleteMany();
  await db.propertySubmission.deleteMany();
  await db.wantedRequest.deleteMany();
  await db.listingImage.deleteMany();
  await db.listing.deleteMany();
  await db.category.deleteMany();
  await db.area.deleteMany();
  await db.refCounter.deleteMany();
  await db.testimonial.deleteMany();
  await db.faq.deleteMany();
  await db.page.deleteMany();
  await db.listingView.deleteMany();

  /* Staff */
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@brokersodo.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 10) throw new Error("Set SEED_ADMIN_PASSWORD (10+ characters) in .env before seeding.");
  const admin = await db.user.upsert({
    where: { email },
    update: { role: "ADMIN", isActive: true },
    create: { email, name: process.env.SEED_ADMIN_NAME || "BrokerSodo Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
  });
  const brokerPw = await bcrypt.hash(`${password}-broker`, 12);
  const brokers = await Promise.all(
    [
      ["Abebe Tadesse", "abebe@brokersodo.local", "+251911000001"],
      ["Tigist Alemu", "tigist@brokersodo.local", "+251911000002"],
    ].map(([name, em, phone]) =>
      db.user.upsert({ where: { email: em }, update: {}, create: { name, email: em, phone, role: "BROKER", passwordHash: brokerPw, isActive: true } }),
    ),
  );
  const staff = [admin, ...brokers];

  /* Settings */
  await db.siteSettings.upsert({
    where: { id: "site" },
    update: {},
    create: {
      id: "site",
      businessName: "BrokerSodo",
      taglineEn: "Buy. Sell. Rent. — Sodo's Deal Spotters.",
      taglineAm: "በእምነት ይግዙ፣ ይሽጡ፣ ይከራዩ።",
      phonePrimary: "+251947565691",
      telegramUsername: "Sunagent01",
      whatsappNumber: "+251947565691",
      email: "hello@brokersodo.com",
      addressEn: "Main Road, Arada, Wolaita Sodo, Ethiopia",
      addressAm: "ዋና መንገድ፣ አራዳ፣ ወላይታ ሶዶ",
      hoursEn: "Mon–Sat: 8:00 – 18:00\nSun: by appointment",
      hoursAm: "ሰኞ–ቅዳሜ፦ 2:00 – 12:00\nእሁድ፦ በቀጠሮ",
      mapLat: 6.8556,
      mapLng: 37.7508,
      statYears: 5,
      statClients: 1200,
      facebookUrl: "https://facebook.com/",
      tiktokUrl: "https://www.tiktok.com/@BorkerSodo",
    },
  });

  /* Taxonomy */
  const cats = new Map<string, { id: string; refPrefix: string; icon: string }>();
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await db.category.create({
      data: {
        slug: c.slug,
        nameEn: c.nameEn,
        nameAm: c.nameAm,
        refPrefix: c.refPrefix,
        icon: c.icon,
        descriptionEn: c.descriptionEn,
        sortOrder: i,
        attributeSchema: withExtraOptions(c.slug, c.schema) as unknown as Prisma.InputJsonValue,
      },
    });
    cats.set(c.slug, row);
  }
  const areas = [];
  for (const [i, [en, am, slug]] of AREAS.entries()) {
    areas.push(await db.area.create({ data: { nameEn: en, nameAm: am, slug, sortOrder: i } }));
  }

  /* Listings */
  const drafts = [...vehicles(), ...bikes(), ...houses(), ...rentals(), ...land(), ...machinery(), ...electronics(), ...printers(), ...other(), ...extraDrafts];
  const counters: Record<string, number> = {};
  const now = Date.now();
  const listingIds: string[] = [];
  for (const [i, d] of drafts.entries()) {
    const cat = cats.get(d.cat)!;
    counters[cat.refPrefix] = (counters[cat.refPrefix] ?? 0) + 1;
    const refCode = formatRefCode(cat.refPrefix, counters[cat.refPrefix] + 100);
    const area = areas[i % areas.length];
    const status = i % 11 === 5 ? (d.dealType === "RENT" ? "RENTED" : "SOLD") : i % 13 === 7 ? "RESERVED" : i === drafts.length - 1 ? "DRAFT" : "PUBLISHED";
    const publishedAt = new Date(now - i * 1000 * 60 * 60 * int(5, 30));
    const pool = photos[d.photo ?? photoType(d.cat, d.titleEn, d.attrs)] ?? photos.house;
    const nImg = Math.min(int(2, 4), pool.length);
    const imgs = Array.from({ length: nImg }, (_, k) => {
      const name = pool[(i + k) % pool.length];
      return { url: `/placeholders/${name}`, width: 960, height: 720, alt: d.titleEn, sortOrder: k, isCover: k === 0, blurData: blur[name] ?? null };
    });
    const l = await db.listing.create({
      data: {
        refCode,
        slug: listingSlug(d.titleEn, refCode),
        titleEn: d.titleEn,
        titleAm: d.titleAm ?? null,
        descriptionEn: d.desc,
        categoryId: cat.id,
        dealType: d.dealType,
        rentPeriod: d.dealType === "RENT" ? (d.rentPeriod ?? "MONTH") : null,
        price: d.price,
        priceOnRequest: d.price === null,
        isNegotiable: rnd() > 0.5,
        condition: d.condition ?? null,
        areaId: area.id,
        addressHint: `Near ${area.nameEn}, Wolaita Sodo`,
        lat: 6.8556 + (rnd() - 0.5) * 0.04,
        lng: 37.7508 + (rnd() - 0.5) * 0.04,
        attributes: d.attrs,
        status,
        isVerified: rnd() > 0.35,
        isInspected: rnd() > 0.6,
        featured: i % 6 === 0 && status === "PUBLISHED",
        assignedBrokerId: staff[i % staff.length].id,
        ownerName: `Owner ${i + 1}`,
        ownerPhone: `+2519${String(10000000 + i * 7919).slice(0, 8)}`,
        ownerNotes: "Prefers calls after 5pm. (Private sample note)",
        viewCount: int(5, 900),
        publishedAt: status === "DRAFT" ? null : publishedAt,
        soldAt: status === "SOLD" || status === "RENTED" ? new Date(publishedAt.getTime() + 1000 * 60 * 60 * 24 * 6) : null,
        images: { create: imgs },
      },
    });
    listingIds.push(l.id);
  }
  for (const [prefix, value] of Object.entries(counters)) {
    await db.refCounter.create({ data: { prefix, value: value + 100 } });
  }

  /* Content */
  await db.testimonial.createMany({
    data: [
      { name: "Meseret K.", role: "Sold a Toyota Vitz", quoteEn: "BrokerSodo sold my car in nine days. I never had to deal with strangers calling me at night.", quoteAm: "ብሮከርሶዶ መኪናዬን በዘጠኝ ቀን ሸጠልኝ።", rating: 5, sortOrder: 0 },
      { name: "Dawit A.", role: "Rented an office", quoteEn: "They showed me three offices in one afternoon and handled the contract. Very professional.", rating: 5, sortOrder: 1 },
      { name: "Selamawit T.", role: "Bought land", quoteEn: "The title deed check gave me peace of mind. Honest brokers in Sodo — finally!", rating: 5, sortOrder: 2 },
      { name: "Yonas B.", role: "Bajaj owner", quoteEn: "Fair price, fast sale, and they kept my number private. Recommended.", rating: 4, sortOrder: 3 },
    ],
  });
  await db.faq.createMany({
    data: [
      { sortOrder: 0, questionEn: "Can I contact the owner directly?", questionAm: "ባለቤቱን በቀጥታ ማግኘት እችላለሁ?", answerEn: "No. Every listing is managed by BrokerSodo. Call or message us and quote the reference code (for example BS-V-0142) — a broker will answer your questions and arrange a viewing.", answerAm: "አይችሉም። እያንዳንዱ ዝርዝር በብሮከርሶዶ ይመራል። ይደውሉልን እና የማጣቀሻ ቁጥሩን ይጥቀሱ።" },
      { sortOrder: 1, questionEn: "How do I sell or rent out my property?", answerEn: "Use the “Sell with us” form or visit our office. We verify the property, take photos if needed, and publish the listing. Your phone number is never shown publicly." },
      { sortOrder: 2, questionEn: "What does “Verified” mean?", answerEn: "A BrokerSodo broker has checked the owner's identity and the key documents (for example the libre for vehicles or the title deed for land)." },
      { sortOrder: 3, questionEn: "Do you charge buyers?", answerEn: "Our commission depends on the deal type. Ask your broker — we always agree on it in writing before a viewing." },
      { sortOrder: 4, questionEn: "Can you find something that isn't listed?", answerEn: "Yes. Post a Wanted request with your budget and area, and our brokers will look for a match." },
      { sortOrder: 5, questionEn: "Is the map location exact?", answerEn: "No. For privacy we show an approximate circle. The exact location is shared when you book a viewing." },
    ],
  });
  await db.page.createMany({
    data: [
      {
        slug: "about",
        titleEn: "About BrokerSodo",
        titleAm: "ስለ ብሮከርሶዶ",
        bodyEn:
          "<p><strong>BrokerSodo</strong> is a brokerage in Wolaita Sodo that helps people buy, sell and rent vehicles, houses, land, rentals, machinery, electronics and more.</p><p>Unlike open classifieds, every listing on BrokerSodo is managed by our staff. We check the property and the owner, keep the owner's details private, and guide buyers and tenants all the way to a safe deal.</p><h2>Our promise</h2><ul><li>Verified listings with clear reference codes</li><li>Privacy for owners</li><li>Honest, local advice</li></ul>",
      },
      { slug: "terms", titleEn: "Terms of use", bodyEn: "<p>These are placeholder terms. Replace them in Admin → Content → Pages before launch.</p><p>Listings are provided by BrokerSodo for information. Prices and availability may change. All deals are concluded through BrokerSodo.</p>" },
      { slug: "privacy", titleEn: "Privacy policy", bodyEn: "<p>These are placeholder privacy terms. Replace them in Admin → Content → Pages before launch.</p><p>We collect your name and phone number only to respond to your inquiry or submission. We never publish owners' contact details. Saved listings are stored only on your device.</p>" },
    ],
  });

  /* Inbox samples */
  const published = await db.listing.findMany({ where: { status: "PUBLISHED" }, select: { id: true }, take: 12 });
  const statuses = ["NEW", "NEW", "CONTACTED", "VIEWING_SCHEDULED", "NEGOTIATING", "CLOSED_WON", "CLOSED_LOST"] as const;
  for (let i = 0; i < 14; i++) {
    await db.inquiry.create({
      data: {
        listingId: published[i % published.length]?.id,
        name: pick(["Kebede", "Almaz", "Samuel", "Hanna", "Bereket", "Martha", "Eyob"]),
        phone: `+2519${int(10000000, 99999999)}`,
        message: pick(["Is it still available?", "Can I see it tomorrow?", "Is the price negotiable?", "Please call me after 5pm."]),
        preferredContact: pick(["CALL", "TELEGRAM", "WHATSAPP"] as const),
        status: statuses[i % statuses.length],
        assignedBrokerId: i % 3 === 0 ? null : staff[i % staff.length].id,
        createdAt: new Date(now - i * 1000 * 60 * 60 * 20),
      },
    });
  }
  await db.propertySubmission.createMany({
    data: [
      { name: "Tesfaye M.", phone: "+251916123456", categoryId: cats.get("vehicles")!.id, dealType: "SALE", title: "Suzuki Alto 2016", details: "Manual, 95,000 km, libre ready.", attributes: { make: "suzuki", year: 2016, mileage: 95000, transmission: "manual" }, expectedPrice: 950000, areaId: areas[1].id, photos: [{ url: "/placeholders/hatchback-1.webp", width: 960, height: 720 }] },
      { name: "Aster G.", phone: "+251917654321", categoryId: cats.get("house-rent")!.id, dealType: "RENT", rentPeriod: "MONTH", title: "2-bedroom house near Wadu", details: "Water 24h, own meter.", attributes: { propertyType: "house", bedrooms: 2 }, expectedPrice: 9000, areaId: areas[4].id, photos: [{ url: "/placeholders/house-2.webp", width: 960, height: 720 }] },
    ],
  });
  await db.wantedRequest.createMany({
    data: [
      { name: "Mulugeta", phone: "+251912345678", categoryId: cats.get("house-rent")!.id, dealType: "RENT", description: "2-bedroom house near Sodo University with water and parking.", budgetMin: 6000, budgetMax: 10000, areaId: areas[6].id },
      { name: "Rahel", phone: "+251913456789", categoryId: cats.get("vehicles")!.id, dealType: "SALE", description: "Automatic Toyota Vitz or Yaris, 2010 or newer.", budgetMax: 1600000 },
    ],
  });
  await db.activityLog.create({ data: { userId: admin.id, action: "seed", entityType: "System", summary: "Database seeded with sample data" } });

  console.log(`✔ ${drafts.length} listings, ${CATEGORIES.length} categories, ${AREAS.length} areas`);
  console.log(`✔ Admin: ${email} (password from SEED_ADMIN_PASSWORD)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
