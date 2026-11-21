import type { AttributeField, AttributeOption } from "../src/lib/validators/attribute-schema";

/** Extra sample listings: small items through to big properties. Prices are illustrative. */
export type ExtraDraft = {
  cat: "vehicles" | "motorbikes-bajaj" | "houses" | "house-rent" | "land" | "machinery" | "electronics" | "printers-office" | "other";
  titleEn: string;
  titleAm?: string;
  dealType: "SALE" | "RENT";
  rentPeriod?: "DAY" | "MONTH" | "YEAR";
  price: number | null;
  condition?: "NEW" | "USED" | "REFURBISHED";
  attrs: Record<string, string | number | boolean>;
  desc: string;
  photo: string;
};

type Cond = ExtraDraft["condition"];
const p = (text: string) => `<p>${text}</p><p>Viewing and paperwork are arranged through BrokerSodo.</p>`;

const electronic = (type: string, brand: string, model: string, price: number, photo: string, condition: Cond, warranty: number, note: string): ExtraDraft => ({
  cat: "electronics", titleEn: `${brand} ${model}`, dealType: "SALE", price, condition, photo, attrs: { type, brand, model, warranty }, desc: p(note),
});
const office = (brand: string, type: string, titleEn: string, price: number, photo: string, condition: Cond, note: string, extra: Record<string, number | boolean> = {}): ExtraDraft => ({
  cat: "printers-office", titleEn, dealType: "SALE", price, condition, photo, attrs: { brand, type, ...extra }, desc: p(note),
});
const house = (titleEn: string, price: number, bedrooms: number, bathrooms: number, areaM2: number, plotM2: number, floors: number, photo = "house"): ExtraDraft => ({
  cat: "houses", titleEn, dealType: "SALE", price, photo,
  attrs: { bedrooms, bathrooms, areaM2, plotM2, floors, titleDeed: true, water: "24h", parking: plotM2 > 200 },
  desc: p(`${bedrooms}-bedroom home with ${areaM2} m² of living space on a ${plotM2} m² plot. Title deed checked by our team.`),
});
const rental = (titleEn: string, propertyType: string, price: number, areaM2: number, bedrooms: number, furnished: boolean, photo = propertyType, rentPeriod: ExtraDraft["rentPeriod"] = "MONTH"): ExtraDraft => ({
  cat: "house-rent", titleEn, dealType: "RENT", rentPeriod, price, photo,
  attrs: { propertyType, ...(bedrooms ? { bedrooms, bathrooms: Math.max(1, bedrooms - 1) } : {}), areaM2, floor: "Ground", furnished, water: "24h", electricity: "private", parking: areaM2 > 80, depositMonths: 2 },
  desc: p(`${titleEn} with water and electricity in a convenient part of Sodo.`),
});
const plot = (sizeM2: number, use: string, price: number, where: string): ExtraDraft => ({
  cat: "land", titleEn: `${sizeM2.toLocaleString("en-US")} m² ${use} land ${where}`, dealType: "SALE", price, photo: use === "agricultural" ? "farmland" : "land",
  attrs: { sizeM2, use, titleDeed: true, roadAccess: true },
  desc: p(`${sizeM2.toLocaleString("en-US")} m² ${use} land ${where}, with road access. Documents are checked before any payment.`),
});
const machine = (type: string, brand: string, titleEn: string, price: number, photo: string, hoursUsed: number, year: number, condition: Cond = "USED"): ExtraDraft => ({
  cat: "machinery", titleEn, dealType: "SALE", price, condition, photo, attrs: { type, brand, hoursUsed, year }, desc: p(`${titleEn} in working order. It can be tested on site before you buy.`),
});
const other = (titleEn: string, price: number, photo: string, brand: string, note: string, condition: Cond = "USED", deal: Pick<ExtraDraft, "dealType" | "rentPeriod"> = { dealType: "SALE" }): ExtraDraft => ({
  cat: "other", titleEn, ...deal, price, condition, photo, attrs: { brand }, desc: p(note),
});
const car = (make: string, model: string, year: number, price: number, photo: string, mileage: number, transmission: string, fuel: string): ExtraDraft => ({
  cat: "vehicles", titleEn: `${make[0].toUpperCase()}${make.slice(1)} ${model} ${year}`, dealType: "SALE", price, condition: "USED", photo,
  attrs: { make, model, year, mileage, transmission, fuel, colour: "white", plateRegion: "swe", libre: true },
  desc: p(`Clean ${model}, ${year} model, with ${mileage.toLocaleString("en-US")} km. Libre ready for inspection.`),
});

export const extraDrafts: ExtraDraft[] = [
  electronic("phone", "Samsung", "Galaxy S23 128GB", 72000, "phone", "USED", 3, "Clean phone with charger and original box."),
  electronic("phone", "iPhone", "13 128GB", 85000, "phone", "USED", 3, "Good battery health and no screen damage."),
  electronic("phone", "Tecno", "Spark 20 Pro", 21500, "phone", "NEW", 12, "New in box with shop warranty."),
  electronic("tablet", "Samsung", "Galaxy Tab A9", 29000, "tablet", "NEW", 12, "Light tablet for study, work and video."),
  electronic("laptop", "Dell", "Latitude 5420 Core i7", 58000, "laptop", "REFURBISHED", 3, "16 GB RAM and 512 GB SSD. Ready for office work."),
  electronic("laptop", "Lenovo", "ThinkPad T480 Core i5", 39500, "laptop", "REFURBISHED", 3, "Strong business laptop with a new battery."),
  electronic("tv", "Samsung", '43" Full HD Smart TV', 36000, "tv", "NEW", 12, "Smart TV with built-in apps and wall mount."),
  electronic("fridge", "LG", "Single-door fridge 190L", 38500, "fridge", "USED", 0, "Quiet, cools well and suits a small home or shop."),
  electronic("washer", "Samsung", "Front-load washing machine 7kg", 62000, "washer", "USED", 3, "Works well on all programmes."),
  electronic("microwave", "Hisense", "Microwave oven 20L", 11500, "microwave", "NEW", 12, "Compact microwave for home or office."),
  electronic("camera", "Canon", "EOS 200D with 18-55mm lens", 49000, "camera", "USED", 0, "Good for photos, events and video."),
  electronic("solar", "Felicity", "Solar kit 3 kW with batteries", 245000, "solar", "NEW", 24, "Panels, inverter and batteries for a family home."),

  office("dell", "computer", "Dell OptiPlex desktop Core i5", 32000, "desktop", "REFURBISHED", "Complete desktop with keyboard and mouse."),
  office("hp", "computer", "HP ProDesk desktop Core i7", 46000, "desktop", "REFURBISHED", "Fast office desktop with 16 GB RAM."),
  office("lenovo", "computer", "Computer lab set of 10 desktops", 265000, "desktop", "REFURBISHED", "Ten matching desktops for a school or training centre."),
  office("samsung", "monitor", 'Samsung 24" Full HD monitor', 13500, "monitor", "USED", "Clear display with HDMI input."),
  office("dell", "monitor", 'Dell 27" office monitor', 22000, "monitor", "USED", "Large screen with an adjustable stand."),
  office("benq", "projector", "BenQ classroom projector", 41000, "projector", "USED", "Bright projector for meetings and classes."),
  office("tplink", "network", "TP-Link office router and switch kit", 9500, "router", "NEW", "Wi-Fi router with an 8-port switch."),
  office("hp", "laser", "HP LaserJet M428 all-in-one", 68000, "printer", "USED", "Print, copy and scan for a busy office.", { printVolume: 5000, colour: false }),
  office("canon", "inkjet", "Canon PIXMA G3420 printer", 24500, "printer", "NEW", "Refillable ink tanks for low-cost printing.", { printVolume: 1000, colour: true }),
  office("ricoh", "copier", "Ricoh MP 3055 photocopier", 185000, "copier", "USED", "Heavy-duty copier for print shops.", { printVolume: 30000, colour: false }),
  office("local", "furniture", "Executive office desk", 18500, "desk", "NEW", "Solid desk with drawers."),
  office("local", "furniture", "Set of 6 office chairs", 21000, "chair", "NEW", "Comfortable chairs for an office or meeting room."),
  office("local", "furniture", "Meeting table for 8 people", 34000, "desk", "USED", "Large table for a boardroom or training room."),

  house("Modern 3-bedroom house near Sodo University", 5800000, 3, 2, 140, 250, 1),
  house("Family home with garden in Arada", 7200000, 4, 3, 190, 320, 1),
  house("Affordable 2-bedroom starter home", 2950000, 2, 1, 85, 150, 1),
  house("G+1 house with parking in Mehal Ketema", 11500000, 5, 4, 300, 350, 2, "villa"),
  house("New G+2 villa with city view", 18500000, 6, 5, 480, 500, 3, "villa"),
  house("Corner house on a main road", 8900000, 4, 2, 210, 300, 1),
  house("Compound with 2 houses in Otona", 9600000, 5, 3, 260, 450, 1),

  rental("Studio apartment near the market", "apartment", 6500, 35, 1, true),
  rental("Modern 2-bedroom apartment", "apartment", 14500, 85, 2, false),
  rental("Furnished 3-bedroom apartment", "apartment", 26000, 120, 3, true),
  rental("2-bedroom house with compound", "house", 11000, 90, 2, false),
  rental("5-bedroom house for office or guest house", "house", 35000, 280, 5, false),
  rental("Student room near Sodo University", "room", 3000, 16, 1, false),
  rental("Small shop in Gebeya Sefer", "shop", 6000, 20, 0, false),
  rental("Large showroom on the main road", "shop", 42000, 150, 0, false),
  rental("Furnished office suite", "office", 18000, 70, 0, true),
  rental("Small office for a startup", "office", 5500, 22, 0, false),
  rental("Storage warehouse 200 m²", "warehouse", 22000, 200, 0, false),
  rental("Restaurant space with kitchen", "shop", 30000, 130, 0, false, "cafe"),

  plot(150, "residential", 1250000, "near Wadu"),
  plot(200, "residential", 1700000, "in Otona"),
  plot(400, "residential", 3300000, "near Sodo University"),
  plot(600, "mixed", 5600000, "beside the asphalt road"),
  plot(800, "commercial", 8800000, "near the bus station"),
  plot(2000, "commercial", 19000000, "on the Hawassa road"),
  plot(10000, "agricultural", 7500000, "in Damot area"),
  plot(20000, "agricultural", 13500000, "with river access"),

  machine("excavator", "Caterpillar", "Caterpillar 320 excavator", 14500000, "excavator", 7800, 2014),
  machine("excavator", "Komatsu", "Komatsu PC200 excavator", 12800000, "excavator", 9200, 2012),
  machine("tractor", "New Holland", "New Holland TT75 tractor", 4900000, "tractor", 3100, 2017),
  machine("forklift", "Toyota", "Toyota 3-ton forklift", 2100000, "forklift", 5200, 2015),
  machine("pump", "Pedrollo", "Pedrollo irrigation water pump", 68000, "pump", 300, 2022),
  machine("welder", "Lincoln", "Lincoln industrial welding machine", 54000, "welder", 900, 2020),
  machine("sewing", "Juki", "Juki industrial sewing machine", 42000, "sewing", 1200, 2019),
  machine("sewing", "Singer", "Singer home sewing machine", 16500, "sewing", 150, 2023, "NEW"),
  machine("mixer", "Altrad", "Concrete mixer 500L with engine", 295000, "mixer", 1100, 2019),

  car("toyota", "Yaris", 2014, 1750000, "hatchback", 88000, "automatic", "petrol"),
  car("toyota", "RAV4", 2013, 4300000, "suv", 121000, "automatic", "petrol"),
  car("hyundai", "Tucson", 2016, 3950000, "suv", 94000, "automatic", "diesel"),
  car("nissan", "Navara", 2015, 4650000, "pickup", 132000, "manual", "diesel"),
  { cat: "motorbikes-bajaj", titleEn: "Bajaj Boxer 150 Motorbike 2022", dealType: "SALE", price: 138000, condition: "USED", photo: "motorbike", attrs: { type: "motorbike", make: "bajaj", year: 2022, mileage: 14500, plateRegion: "swe", libre: true }, desc: p("Fuel-saving motorbike, ready for daily work.") },
  { cat: "motorbikes-bajaj", titleEn: "Bajaj RE Maxima 2023", dealType: "SALE", price: 465000, condition: "USED", photo: "bajaj", attrs: { type: "bajaj", make: "bajaj", year: 2023, mileage: 9000, plateRegion: "swe", libre: true }, desc: p("Nearly new three-wheeler with libre and plate.") },

  other("City bicycle with basket", 9500, "bicycle", "Phoenix", "Simple, strong bicycle for town."),
  other("Mountain bike 26 inch", 16500, "bicycle", "Giant", "Geared bike that handles Sodo's hills."),
  other("6-seat dining table set", 32000, "dining", "Local", "Wooden table with six chairs."),
  other("Queen bed with wardrobe", 45000, "bed", "Local", "Bed frame, mattress and matching wardrobe."),
  other("L-shaped living room sofa", 58000, "sofa", "Local", "Large sofa in good condition."),
  other("Home gym equipment set", 88000, "gym", "Technogym", "Weights and machines for a home or small gym."),
  other("Café furniture and equipment", 390000, "cafe", "Local", "Tables, chairs and counter for a ready-to-open café."),
  other("Event chairs and tables", 4500, "tent", "Local", "Chairs and tables for weddings and events, delivered in Sodo.", "USED", { dealType: "RENT", rentPeriod: "DAY" }),
];

const opt = (value: string, labelEn: string, labelAm?: string): AttributeOption => ({ value, labelEn, labelAm: labelAm ?? null });

const EXTRA_OPTIONS: Record<string, Record<string, AttributeOption[]>> = {
  electronics: {
    type: [opt("tablet", "Tablet", "ታብሌት"), opt("camera", "Camera", "ካሜራ"), opt("washer", "Washing machine", "ልብስ ማጠቢያ"), opt("microwave", "Microwave", "ማይክሮዌቭ")],
  },
  "printers-office": {
    type: [opt("computer", "Desktop computer", "ዴስክቶፕ ኮምፒውተር"), opt("monitor", "Monitor", "ሞኒተር"), opt("projector", "Projector", "ፕሮጀክተር"), opt("network", "Network equipment", "የኔትወርክ ዕቃ")],
    brand: [opt("dell", "Dell"), opt("lenovo", "Lenovo"), opt("samsung", "Samsung"), opt("benq", "BenQ"), opt("tplink", "TP-Link"), opt("local", "Local / other", "ሀገር ውስጥ / ሌላ")],
  },
  machinery: {
    type: [opt("forklift", "Forklift", "ፎርክሊፍት"), opt("pump", "Water pump", "የውሃ ፓምፕ"), opt("welder", "Welding machine", "የብየዳ ማሽን"), opt("sewing", "Sewing machine", "የልብስ ስፌት ማሽን")],
  },
};

export const OFFICE_CATEGORY_NAME = { nameEn: "Computers & Office", nameAm: "ኮምፒውተር እና ቢሮ", descriptionEn: "Computers, printers, projectors and office furniture." };

/** Adds the new dropdown options to a category's fields. Safe to run repeatedly. */
export function withExtraOptions(slug: string, fields: readonly AttributeField[]): AttributeField[] {
  const extra = EXTRA_OPTIONS[slug] ?? {};
  return fields.map((f) => {
    const add = extra[f.key];
    if (!add) return f;
    const have = new Set((f.options ?? []).map((o) => o.value));
    return { ...f, options: [...(f.options ?? []), ...add.filter((o) => !have.has(o.value))] };
  });
}
