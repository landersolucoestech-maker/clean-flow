export const ORIGIN_OPTIONS = [
  { value: "google_ads", label: "Google Ads" },
  { value: "google_local_services", label: "Google Local Services" },
  { value: "website", label: "Website" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "referral", label: "Referral" },
];

export const PIPELINE_STAGES = [
  { value: "new_lead", label: "New Lead" },
  { value: "qualification", label: "Qualification" },
  { value: "visit_scheduled", label: "Visit Scheduled" },
  { value: "estimate_completed", label: "Estimate Completed" },
  { value: "negotiation", label: "Negotiation" },
  { value: "active_customer", label: "Active Customer" },
  { value: "cold_follow_up", label: "Cold Follow-Up" },
  { value: "warm_follow_up", label: "Warm Follow-Up" },
  { value: "reactivation", label: "Reactivation" },
  { value: "disqualified", label: "Disqualified / Lost" },
];

export const PROPERTY_TYPES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "office", label: "Office" },
  { value: "condo", label: "Condo" },
  { value: "luxury_home", label: "Luxury Home" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
];

export const RESIDENCE_TYPES = [
  { value: "ranch", label: "Ranch" },
  { value: "two_story", label: "Two-story" },
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
  { value: "split_level", label: "Split Level" },
  { value: "multi_story", label: "Multi-story" },
  { value: "other", label: "Other" },
];

export const SERVICE_AREAS = [
  { 
    value: "kitchen", 
    label: "Kitchen",
    items: [
      "Clean major appliance exteriors (interior upon request)",
      "Dust window sills",
      "Clean table and chairs",
      "Clean microwave - interior & exterior",
      "Clean/disinfect/polish sinks & faucets",
      "Clean and disinfect counters & backsplash",
      "Clean floors (vacuum, sweep, mop)",
      "Wipe doors, handles & light switches",
      "Wipe outside cabinets & drawers",
      "Remove cobwebs",
      "Empty trash and replace liner",
      "Dust baseboards",
    ]
  },
  { 
    value: "bathroom", 
    label: "Bathroom",
    items: [
      "Clean tub shower door and inside of the shower",
      "Clean and polish countertop, sinks, and faucets",
      "Clean mirrors",
      "Dust window sills",
      "Clean and disinfect towel bars",
      "Dust picture frames",
      "Fold and hang towels neatly",
      "Empty trash and replace liner",
      "Remove cobwebs",
      "Clean & sanitize toilets in/out",
      "Wipe doors, handles & light switches",
      "Clean floors (vacuum, sweep, mop)",
      "Clean exterior of vanities",
      "Dust baseboards",
    ]
  },
  { 
    value: "bedroom", 
    label: "Bedroom",
    items: [
      "Clean floors (vacuum, sweep, mop)",
      "Dust baseboards",
      "Dust furniture within reach (top, front & underneath)",
      "Clean mirrors and glass surfaces",
      "Dust window sills",
      "Remove cobwebs",
      "Dust lamps and lamp shades",
      "Dust picture frames",
      "Wipe doors, handles & light switches",
      "Dust light fixtures, ceiling fans, and vents",
      "Empty trash and replace liner",
    ]
  },
  { 
    value: "living_dining", 
    label: "Living / Dining",
    items: [
      "Vacuum/dust upholstered furniture",
      "Dust lamps and lamp shades",
      "Dust furniture within reach (top, front & underneath)",
      "Dust picture frames",
      "Dust windowsills",
      "Clean counters & backsplash",
      "Clean mirrors and glass surfaces",
      "Empty trash and replace liner",
      "Clean floors (vacuum, sweep, mop)",
      "Remove cobwebs",
      "Wipe doors & light switches",
      "Dust baseboards",
    ]
  },
  { 
    value: "laundry_room", 
    label: "Laundry Room",
    items: [
      "Dust windowsill",
      "Wipe tops of washer and dryer",
      "Empty trash and replace liner",
      "Clean floors (vacuum, sweep, mop)",
      "Remove cobwebs",
      "Wipe doors, handles & light switches",
      "Wipe outside cabinets and drawers",
      "Dust baseboards",
    ]
  },
];

export const ADD_ON_SERVICES = [
  { 
    value: "inside_refrigerator", 
    label: "Inside Refrigerator",
    items: [
      "Remove all contents and shelves",
      "Clean interior walls and surfaces",
      "Clean and sanitize shelves and drawers",
      "Wipe door seals and handles",
      "Reorganize contents",
    ]
  },
  { 
    value: "inside_oven", 
    label: "Inside Oven",
    items: [
      "Remove racks and trays",
      "Apply oven cleaner",
      "Scrub interior surfaces",
      "Clean racks separately",
      "Wipe door glass inside and out",
    ]
  },
  { 
    value: "inside_cabinets", 
    label: "Inside Cabinets",
    items: [
      "Empty cabinet contents",
      "Wipe shelves and interior surfaces",
      "Clean cabinet doors inside",
      "Organize items back neatly",
      "Check for expired items (upon request)",
    ]
  },
  { 
    value: "garage", 
    label: "Garage",
    items: [
      "Sweep and mop floors",
      "Remove cobwebs from walls and ceiling",
      "Wipe down workbenches",
      "Organize storage areas",
      "Clean garage door tracks",
    ]
  },
  { 
    value: "others", 
    label: "Others (by request)",
    items: [
      "Custom cleaning requests",
      "Special surfaces or materials",
      "Additional rooms or areas",
      "Pet-related cleaning",
      "Post-event cleanup",
    ]
  },
];

export const PREFERRED_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const PREFERRED_TIMES = [
  { value: "morning", label: "Morning (8am-12pm)" },
  { value: "afternoon", label: "Afternoon (12pm-5pm)" },
  { value: "flexible", label: "Flexible" },
];

export const INTERACTION_TYPES = [
  { value: "call", label: "Phone Call" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "visit", label: "In-Person Visit" },
  { value: "estimate", label: "Estimate Visit" },
  { value: "follow_up", label: "Follow-up" },
  { value: "other", label: "Other" },
];

export const DEFAULT_TAGS = [
  "VIP",
  "Recurring",
  "Priority",
  "New Customer",
  "Referred",
  "Corporate",
  "Residential",
];
