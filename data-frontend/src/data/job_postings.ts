export type SharedJobPosting = {
  id: string;
  title: string;
  companyName: string;
  companyInitials: string;
  description: string;
  category: string;
  type: string;
  location: string;
  setup: string;
  vacancies: number;
  salary: string;
  disabilityFit: string;
  postedDate: string;
  status: "open" | "closed";
  preferredAgeRange: string;
  languages: string[];
  companyRating: number;
  companyRatingCount: number;
  qualifications: string[];
  responsibilities: string[];
};

export const JOB_POSTINGS: SharedJobPosting[] = [
  {
    id: "job-1",
    title: "Data Encoder",
    companyName: "Inclusive Business Solutions",
    companyInitials: "IB",
    description:
      "Encode and validate records, prepare reports, and support admin tasks using accessible office tools and clear workflows.",
    category: "Administrative",
    type: "Full-time",
    location: "Dasmarinas, Cavite",
    setup: "On-site / Hybrid",
    vacancies: 3,
    salary: "PHP 12,000 - PHP 15,000",
    disabilityFit: "Hearing-Friendly Communication Support",
    postedDate: "Posted: Feb 24, 2026",
    status: "open",
    preferredAgeRange: "21 - 40 years old",
    languages: ["Filipino", "English"],
    companyRating: 4.6,
    companyRatingCount: 128,
    qualifications: [
      "Basic computer literacy and typing skills",
      "Attention to detail in data checking",
      "Can follow written instructions and task lists",
    ],
    responsibilities: [
      "Encode and verify daily records",
      "Organize files and update tracking sheets",
      "Coordinate with admin team",
    ],
  },
  {
    id: "job-2",
    title: "Customer Support (Chat)",
    companyName: "CareConnect BPO",
    companyInitials: "CC",
    description:
      "Handle chat-based customer concerns, document tickets, and coordinate with team leads through text-first communication channels.",
    category: "Customer Service",
    type: "Full-time",
    location: "Imus / Dasmarinas",
    setup: "Hybrid",
    vacancies: 5,
    salary: "PHP 16,000 - PHP 21,000",
    disabilityFit: "Mobility-Friendly Workspace",
    postedDate: "Posted: Feb 22, 2026",
    status: "open",
    preferredAgeRange: "20 - 35 years old",
    languages: ["English", "Filipino"],
    companyRating: 4.4,
    companyRatingCount: 94,
    qualifications: [
      "Good written communication skills",
      "Basic customer service experience is a plus",
      "Can use chat or ticketing tools",
    ],
    responsibilities: [
      "Respond to concerns through chat",
      "Create ticket notes and updates",
      "Escalate urgent issues to supervisors",
    ],
  },
  {
    id: "job-3",
    title: "QA Tester Assistant",
    companyName: "BrightPath Tech",
    companyInitials: "BT",
    description:
      "Test website features, report bugs, and support regression checks. Screen-reader compatible tools can be provided when needed.",
    category: "IT / Software",
    type: "Full-time",
    location: "Remote / Cavite",
    setup: "Remote",
    vacancies: 2,
    salary: "PHP 18,000 - PHP 24,000",
    disabilityFit: "Visual Accessibility Support",
    postedDate: "Posted: Feb 20, 2026",
    status: "open",
    preferredAgeRange: "22 - 38 years old",
    languages: ["English"],
    companyRating: 4.8,
    companyRatingCount: 71,
    qualifications: [
      "Basic understanding of web/app testing",
      "Detail-oriented in checking outputs",
      "Can document bugs clearly",
    ],
    responsibilities: [
      "Run test cases and report defects",
      "Record expected vs actual results",
      "Support regression tests before release",
    ],
  },
  {
    id: "job-4",
    title: "Office Clerk Assistant",
    companyName: "GreenLeaf Cooperative",
    companyInitials: "GC",
    description:
      "Support document filing, inventory logs, and front-desk coordination with clear checklists and accessible office workflows.",
    category: "Administrative",
    type: "Full-time",
    location: "Dasmarinas City",
    setup: "On-site",
    vacancies: 4,
    salary: "PHP 13,000 - PHP 16,000",
    disabilityFit: "Mobility / Hearing Inclusive Setup",
    postedDate: "Posted: Feb 18, 2026",
    status: "open",
    preferredAgeRange: "20 - 40 years old",
    languages: ["Filipino", "English"],
    companyRating: 4.3,
    companyRatingCount: 63,
    qualifications: [
      "Can organize files and records",
      "Basic spreadsheet knowledge",
      "Can follow task schedules",
    ],
    responsibilities: [
      "Sort documents and encode updates",
      "Track supply logs and requests",
      "Assist admin staff in daily operations",
    ],
  },
  {
    id: "job-5",
    title: "Social Media Content Assistant",
    companyName: "SparkReach Media",
    companyInitials: "SM",
    description:
      "Prepare captions, organize content calendars, and monitor inbox messages with text-based collaboration tools.",
    category: "Marketing",
    type: "Full-time",
    location: "Remote / NCR-Cavite",
    setup: "Remote",
    vacancies: 3,
    salary: "PHP 17,000 - PHP 22,000",
    disabilityFit: "Speech-Friendly Text-First Workflow",
    postedDate: "Posted: Feb 17, 2026",
    status: "open",
    preferredAgeRange: "19 - 35 years old",
    languages: ["English", "Filipino"],
    companyRating: 4.5,
    companyRatingCount: 88,
    qualifications: [
      "Good written communication",
      "Familiar with social media platforms",
      "Basic Canva or design experience is a plus",
    ],
    responsibilities: [
      "Draft content captions and hashtags",
      "Schedule posts using approved tools",
      "Report weekly engagement summaries",
    ],
  },
  {
    id: "job-6",
    title: "Inventory Data Assistant",
    companyName: "Metro Retail Hub",
    companyInitials: "MR",
    description:
      "Update stock records, reconcile item counts, and flag discrepancies while working with barcode and spreadsheet systems.",
    category: "Operations",
    type: "Full-time",
    location: "Imus, Cavite",
    setup: "Hybrid",
    vacancies: 6,
    salary: "PHP 14,000 - PHP 18,000",
    disabilityFit: "Learning Support-Friendly Workflow",
    postedDate: "Posted: Feb 15, 2026",
    status: "open",
    preferredAgeRange: "21 - 42 years old",
    languages: ["Filipino"],
    companyRating: 4.2,
    companyRatingCount: 112,
    qualifications: [
      "Basic inventory or warehouse experience is a plus",
      "Attention to detail in counting and encoding",
      "Can use spreadsheets for reporting",
    ],
    responsibilities: [
      "Encode stock movement updates",
      "Reconcile count sheets and logs",
      "Coordinate discrepancies with supervisors",
    ],
  },
];
