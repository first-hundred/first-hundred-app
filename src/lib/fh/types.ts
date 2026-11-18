export type Env = { GEMINI_API_KEY?: string; GEMINI_MODEL?: string; COLDOPEN_URL?: string; COLDOPEN_API_KEY?: string };

export type CustomerProfile = {
  company_name: string;
  product_one_liner: string;
  ideal_customer: { role: string; company_type: string; company_size: string };
  top_pains: string[];
  trigger_events: string[];
  where_they_hang_out: string[];
  pain_keywords: string[];
  positioning_line: string;
  sender_name?: string;
  /** the founder's pitch, sent to coldopen as a sales profile */
  pitch?: Pitch;
  goal?: Goal;
};

export type Candidate = {
  id: string;
  source: "hackernews" | "reddit" | "event" | "network";
  author: string;
  title: string;
  excerpt: string;
  url: string;
  date: string; // ISO
  community?: string;
  keyword: string;
  avatar?: string;
  /** their company's website: the film is made for this site, in its brand */
  company_url?: string;
  company?: string;
  role?: string; // event people: host, judge, speaker, sponsor
};

export type Scored = { id: string; score: number; reason: string; why_now: string; company?: string; company_url?: string };

export type Goal = "customers" | "investors" | "hires";

export type Pitch = {
  offer: string; // one line, what you offer, in the buyer's terms (<=120)
  points: string[]; // 2-6 value props (<=120 each)
  proof: { value: string; label: string }[]; // 1-3 numbers stated on the founder's own site (value <=12, label <=60)
  cta_line: string; // e.g. "Worth a 15-minute look?" (<=60)
  contact: string; // email or booking link
  book?: string; // https booking link
};
