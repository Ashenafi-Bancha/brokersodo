/**
 * Adds sample jobs and tutors to a LOCAL database so the pages can be shown
 * and tested. Every sample is marked "(sample)" and uses made-up details.
 * Never run this against production.
 *
 *   npm run db:add-job-samples           add samples (skips ones already added)
 *   npm run db:add-job-samples -- --remove   delete them again
 */
import { PrismaClient } from "@prisma/client";
import { listingSlug, nextRefCode } from "../src/lib/ref-code";
import { deadlineFromDate, dateFromDeadline } from "../src/lib/jobs-catalog";

const db = new PrismaClient();
const MARK = "(sample)";
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(process.env.DATABASE_URL ?? "");

const inDays = (n: number) => deadlineFromDate(dateFromDeadline(new Date(Date.now() + n * 86_400_000)));

type J = {
  title: string;
  employer: string;
  sector: string;
  jobType: string;
  audience: string;
  education: string;
  exp: number;
  vac: number;
  min?: number;
  max?: number;
  per?: string;
  days: number;
  area?: string;
  featured?: boolean;
  confidential?: boolean;
  desc: string;
  req: string;
};

const JOBS: J[] = [
  { title: "Junior Accountant", employer: "Sodo Trading PLC", sector: "FINANCE", jobType: "FULL_TIME", audience: "GRADUATE", education: "DEGREE", exp: 0, vac: 2, min: 9000, max: 12000, days: 14, featured: true, desc: "Record daily sales and expenses, prepare monthly reports and help with tax filing.\nWorking hours: Monday to Saturday, 8:30 to 5:30.", req: "BA in Accounting. Good with Excel and Peachtree. Fresh graduates are welcome." },
  { title: "Graduate Trainee: Sales and Marketing", employer: "Wolaita Agro Supplies", sector: "SALES", jobType: "INTERNSHIP", audience: "GRADUATE", education: "DIPLOMA", exp: 0, vac: 4, min: 5000, max: 5000, days: 10, desc: "Six-month paid trainee programme. Visit farmers and shops, explain products and record orders.", req: "Diploma or degree in any field. Speaks Wolaittatto and Amharic. Ready to travel in Wolaita." },
  { title: "Electrician", employer: "Abela Construction", sector: "TRADES", jobType: "CONTRACT", audience: "SKILLED", education: "TVET", exp: 3, vac: 3, min: 900, max: 1200, per: "DAY", days: 7, featured: true, desc: "House and building wiring for a new apartment project near the stadium. Three-month contract.", req: "TVET level III or IV in electrical installation. At least 3 years of site experience." },
  { title: "Driver (Isuzu truck)", employer: "Confidential", sector: "DRIVING", jobType: "FULL_TIME", audience: "SKILLED", education: "GRADE_10", exp: 4, vac: 1, min: 14000, max: 16000, days: 12, confidential: true, desc: "Deliver goods between Sodo, Hawassa and Arba Minch. Overnight trips twice a week.", req: "Valid 4th grade licence (Public 2). Clean driving record. 4 years of truck experience." },
  { title: "Nurse", employer: "Sample Community Clinic", sector: "HEALTH", jobType: "FULL_TIME", audience: "ANY", education: "DIPLOMA", exp: 1, vac: 2, min: 11000, max: 14000, days: 20, desc: "Patient care, injections and dressing in a busy outpatient clinic. Shift work.", req: "Diploma or BSc in Nursing with a valid licence. One year of experience preferred." },
  { title: "Waiter and Waitress", employer: "Lewi Hotel and Cafe", sector: "HOTEL", jobType: "FULL_TIME", audience: "ANY", education: "GRADE_10", exp: 0, vac: 5, min: 4500, max: 6000, days: 9, desc: "Serve guests in the restaurant and cafe. Meals and tips included.", req: "Friendly and clean. Experience is a plus but not required." },
  { title: "IT Support Officer", employer: "Sodo Microfinance (sample)", sector: "IT", jobType: "FULL_TIME", audience: "GRADUATE", education: "DEGREE", exp: 0, vac: 1, min: 13000, max: 15000, days: 15, desc: "Look after computers, printers and the office network for three branches.", req: "BSc in Computer Science or IT. Knows Windows, networking basics and MS Office." },
  { title: "Mathematics Teacher (Grades 9-12)", employer: "Bright Future Private School", sector: "EDUCATION", jobType: "FULL_TIME", audience: "ANY", education: "DEGREE", exp: 2, vac: 1, min: 12000, max: 15000, days: 18, desc: "Teach mathematics for grades 9 to 12 and help prepare students for the national exam.", req: "BEd or BSc in Mathematics. Two years of teaching experience." },
  { title: "Construction Labourer (daily)", employer: "Abela Construction", sector: "CONSTRUCTION", jobType: "DAILY", audience: "SKILLED", education: "NONE", exp: 0, vac: 10, min: 450, max: 550, per: "DAY", days: 5, desc: "Daily work on a building site in Sodo. Payment every Saturday.", req: "Physically fit. Safety boots provided." },
  { title: "Field Officer", employer: "Sample Development NGO", sector: "NGO", jobType: "CONTRACT", audience: "ANY", education: "DEGREE", exp: 2, vac: 2, days: 21, desc: "Support a farming and nutrition project in Boloso Sore and Damot Gale. One-year contract.", req: "Degree in Agriculture, Rural Development or Public Health. Motorbike licence is an advantage." },
  { title: "Security Guard", employer: "Confidential", sector: "SECURITY", jobType: "FULL_TIME", audience: "ANY", education: "GRADE_10", exp: 1, vac: 3, min: 5000, max: 5500, days: 8, confidential: true, desc: "Night and day shifts at a warehouse in Sodo.", req: "Grade 10 complete. Previous guard experience preferred." },
  { title: "Office Secretary", employer: "Sample Law Office", sector: "OFFICE", jobType: "PART_TIME", audience: "GRADUATE", education: "DIPLOMA", exp: 0, vac: 1, min: 4000, max: 4000, days: 11, desc: "Answer calls, type letters and keep files in order. Mornings only.", req: "Diploma in Secretarial Science or Office Management. Fast typing in Amharic and English." },
];

type T = { name: string; subjects: string[]; levels: string[]; modes: string[]; education: string; field: string; exp: number; rate?: number; verified?: boolean; featured?: boolean; avail: string; bio: string };

const TUTORS: T[] = [
  { name: "Abebe", subjects: ["MATHS", "PHYSICS"], levels: ["SECONDARY", "PREPARATORY"], modes: ["HOME", "ONLINE"], education: "DEGREE", field: "Mathematics", exp: 6, rate: 250, verified: true, featured: true, avail: "Weekdays after 5 pm, Saturday", bio: "High school maths teacher for six years. I explain each step slowly and give practice papers from past national exams." },
  { name: "Selam", subjects: ["ENGLISH", "AMHARIC"], levels: ["PRIMARY", "MIDDLE"], modes: ["HOME"], education: "DEGREE", field: "English Language", exp: 4, rate: 180, verified: true, avail: "Evenings and Sunday", bio: "Patient English and Amharic tutor for young children. Reading, writing and homework help." },
  { name: "Dawit", subjects: ["CHEMISTRY", "BIOLOGY"], levels: ["SECONDARY", "PREPARATORY"], modes: ["HOME", "CENTER"], education: "MASTERS", field: "Chemistry", exp: 9, rate: 300, verified: true, avail: "Saturday and Sunday", bio: "University lecturer. I help grade 11 and 12 students understand chemistry and biology and prepare for the entrance exam." },
  { name: "Martha", subjects: ["ALL_SUBJECTS"], levels: ["KG", "PRIMARY"], modes: ["HOME"], education: "DIPLOMA", field: "Early Childhood Education", exp: 5, rate: 150, avail: "Weekdays 4 to 7 pm", bio: "KG and primary teacher. Homework help in all subjects, reading and good study habits." },
  { name: "Yonas", subjects: ["ICT", "MATHS"], levels: ["SECONDARY", "UNIVERSITY"], modes: ["ONLINE", "HOME"], education: "DEGREE", field: "Computer Science", exp: 3, rate: 220, verified: true, avail: "Flexible", bio: "Computer science graduate. Basic computer skills, programming, Excel and maths for university students." },
  { name: "Tigist", subjects: ["EXAM_PREP", "ENGLISH"], levels: ["PREPARATORY"], modes: ["CENTER", "ONLINE"], education: "DEGREE", field: "English", exp: 7, avail: "Weekends", bio: "Grade 12 national exam preparation in small groups, with timed practice and feedback." },
  { name: "Mesfin", subjects: ["ACCOUNTING"], levels: ["UNIVERSITY"], modes: ["HOME", "ONLINE"], education: "DEGREE", field: "Accounting", exp: 4, rate: 260, avail: "Evenings", bio: "Accounting tutor for TVET and university students: financial accounting, costing and Peachtree." },
  { name: "Hana", subjects: ["WOLAITTATTO", "AMHARIC"], levels: ["PRIMARY", "MIDDLE", "SECONDARY"], modes: ["HOME"], education: "DEGREE", field: "Wolaita Language and Literature", exp: 5, rate: 170, verified: true, avail: "Weekdays after school", bio: "Wolaittatto and Amharic language tutor. Grammar, reading and writing for school students." },
];

async function remove() {
  const jobs = await db.jobPost.deleteMany({ where: { employerName: { contains: MARK } } });
  const tutors = await db.tutor.deleteMany({ where: { fullName: { contains: MARK } } });
  console.log(`Removed ${jobs.count} sample jobs and ${tutors.count} sample tutors.`);
}

async function main() {
  if (!isLocal && process.env.ALLOW_SAMPLE_DATA !== "yes") throw new Error("Refusing to add sample jobs and tutors to a non-local database.");
  if (process.argv.includes("--remove")) return remove();
  const areas = await db.area.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true } });
  const area = (i: number) => areas[i % Math.max(1, areas.length)]?.id ?? null;
  const haveJobs = new Set((await db.jobPost.findMany({ where: { employerName: { contains: MARK } }, select: { title: true } })).map((j) => j.title));
  const haveTutors = new Set((await db.tutor.findMany({ where: { fullName: { contains: MARK } }, select: { displayName: true } })).map((t) => t.displayName));
  let jobs = 0;
  let tutors = 0;
  for (const [i, j] of JOBS.entries()) {
    if (haveJobs.has(j.title)) continue;
    await db.$transaction(async (tx) => {
      const refCode = await nextRefCode(tx, "J");
      await tx.jobPost.create({
        data: {
          refCode,
          slug: listingSlug(j.title, refCode),
          title: j.title,
          employerName: `${j.employer.replace(" (sample)", "")} ${MARK}`,
          showEmployer: !j.confidential,
          employerVerified: !j.confidential && i % 2 === 0,
          sector: j.sector,
          jobType: j.jobType,
          audience: j.audience,
          education: j.education,
          minExperience: j.exp,
          vacancies: j.vac,
          salaryMin: j.min ?? null,
          salaryMax: j.max ?? null,
          salaryPeriod: j.per ?? "MONTH",
          areaId: area(i),
          description: j.desc,
          requirements: j.req,
          deadline: inDays(j.days),
          status: "PUBLISHED",
          featured: !!j.featured,
          contactName: `Sample contact ${MARK}`,
          contactPhone: "+251900000000",
          publishedAt: new Date(Date.now() - i * 6 * 3_600_000),
        },
      });
    });
    jobs++;
  }
  for (const [i, t] of TUTORS.entries()) {
    if (haveTutors.has(t.name)) continue;
    await db.$transaction(async (tx) => {
      const refCode = await nextRefCode(tx, "T");
      await tx.tutor.create({
        data: {
          refCode,
          slug: listingSlug(`${t.name} tutor`, refCode),
          displayName: t.name,
          fullName: `${t.name} ${MARK}`,
          phone: "+251900000000",
          subjects: t.subjects,
          levels: t.levels,
          modes: t.modes,
          education: t.education,
          field: t.field,
          experienceYears: t.exp,
          bio: t.bio,
          availability: t.avail,
          hourlyRate: t.rate ?? null,
          areaId: area(i + 1),
          isVerified: !!t.verified,
          featured: !!t.featured,
          status: "ACTIVE",
          publishedAt: new Date(Date.now() - i * 8 * 3_600_000),
        },
      });
    });
    tutors++;
  }
  console.log(`Added ${jobs} sample jobs and ${tutors} sample tutors. Remove them with: npm run db:add-job-samples -- --remove`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
