import { AIApprovalOutcome, GreyAreaFlag, UserRole } from '../types';

// AI Content Moderation Rules
const MEDICAL_PRESCRIPTION_PATTERNS = [
  /give\s+\d+\s*(mg|ml|tablets?|drops?)/gi,
  /take\s+\d+\s*(mg|ml|tablets?)/gi,
  /dose\s+of\s+\d+/gi,
  /\d+\s*times?\s+a\s+day/gi,
];

const DIAGNOSIS_PATTERNS = [
  /sounds?\s+autistic/gi,
  /probably\s+has\s+adhd/gi,
  /might\s+be\s+dyslexic/gi,
  /i\s+think\s+you\s+have/gi,
  /sounds?\s+like\s+(autism|adhd|dyslexia|anxiety|ocd)/gi,
];

const PERSONAL_INFO_PATTERNS = [
  /\d{10,}/g,
  /[\w.-]+@[\w.-]+\.\w+/g,
  /\b\d{6}\b/g,
];

const PROMOTION_PATTERNS = [
  /buy\s+\w+\s+now/gi,
  /order\s+this\s+product/gi,
  /check\s+out\s+my\s+(shop|store|link)/gi,
  /click\s+here\s+to\s+(buy|purchase|order)/gi,
  /limited\s+time\s+offer/gi,
];

const SPAM_PATTERNS = [
  /(\w+\s+){5,}(?:http|www)/gi,
  /(?:http|www)[\w./?=&-]{50,}/gi,
];

const MISINFORMATION_PATTERNS = [
  /vaccines?\s+cause\s+autism/gi,
  /vaccines?\s+are\s+dangerous/gi,
  /don't\s+vaccinate/gi,
];

// Grey area detection (Section 6 — allow with care, not auto-remove)
const RELIGIOUS_CULTURAL_PATTERNS = [
  /namaz|puja|fasting|ramadan|ekadashi|jain\s+food|halal|kosher|caste|gotra|mundan|thread\s+ceremony|mundan|havan/gi,
  /religious|cultural\s+practice|tradition\s+in\s+our\s+family|in-laws\s+insist/gi,
];

const MENTAL_HEALTH_PATTERNS = [
  /postpartum|ppd|post\s+partum|anxiety|depression|burnout|overwhelmed|ppa|baby\s+blues|intrusive\s+thoughts/gi,
  /mental\s+health|therapy|counsell|psychiatr|therapist/gi,
];

const NEGATIVE_TUCO_PATTERNS = [
  /tuco\s+(is\s+)?(bad|terrible|worst|scam|fake|overpriced|doesn't\s+work|didn't\s+work)/gi,
  /hate\s+tuco|avoid\s+tuco|never\s+buy\s+tuco/gi,
];

export interface ModerationAnalysis {
  outcome: AIApprovalOutcome;
  greyAreaFlags: GreyAreaFlag[];
  civilityReminder?: string;
}

export function detectHinglish(text: string): boolean {
  const hinglishMarkers =
    /\b(kya|kaise|kaisa|nahi|nahin|bilkul|acha|accha|theek|thik|bhai|didi|mummy|papa|bachcha|baccha|bacha|zaroor|zyaada|jyada|bahut|bohot|matlab|shayad|abhi|kal|aaj|subah|raat|dawai|dawa|doctor\s+ko|ghar\s+pe|school\s+mein|problem\s+hai|help\s+chahiye)\b/gi;
  const devanagari = /[\u0900-\u097F]/;
  return hinglishMarkers.test(text) || devanagari.test(text);
}

export function detectGreyAreas(content: string): GreyAreaFlag[] {
  const flags: GreyAreaFlag[] = [];
  if (RELIGIOUS_CULTURAL_PATTERNS.some((p) => p.test(content))) {
    flags.push('religious_cultural');
  }
  if (MENTAL_HEALTH_PATTERNS.some((p) => p.test(content))) {
    flags.push('mental_health');
  }
  if (detectHinglish(content)) {
    flags.push('hinglish');
  }
  if (NEGATIVE_TUCO_PATTERNS.some((p) => p.test(content))) {
    flags.push('negative_tuco_review');
  }
  return flags;
}

export function getGreyAreaReminder(flags: GreyAreaFlag[]): string | undefined {
  const reminders: string[] = [];
  if (flags.includes('religious_cultural')) {
    reminders.push(
      'Religious and cultural parenting choices vary widely — please share respectfully and avoid judging other families\' practices.'
    );
  }
  if (flags.includes('mental_health')) {
    reminders.push(
      'Be kind. Mental health and postpartum topics are sensitive — share support, not judgment. This is not medical advice.'
    );
  }
  if (flags.includes('hinglish')) {
    reminders.push(
      'Hindi, Hinglish, and regional languages are welcome here. Posts in mixed languages will not be removed for language alone.'
    );
  }
  if (flags.includes('negative_tuco_review')) {
    reminders.push(
      'Honest product feedback is allowed. Tuco Team cannot remove negative reviews or close threads for criticism.'
    );
  }
  return reminders.length > 0 ? reminders.join(' ') : undefined;
}

export function aiModerationCheck(postContent: string, category: string): AIApprovalOutcome {
  return analyzeContent(postContent, category).outcome;
}

export function analyzeContent(postContent: string, category: string): ModerationAnalysis {
  const greyAreaFlags = detectGreyAreas(postContent);

  if (MEDICAL_PRESCRIPTION_PATTERNS.some((p) => p.test(postContent))) {
    return { outcome: 'CLEAR_VIOLATION', greyAreaFlags };
  }
  if (DIAGNOSIS_PATTERNS.some((p) => p.test(postContent))) {
    return { outcome: 'CLEAR_VIOLATION', greyAreaFlags };
  }
  if (PERSONAL_INFO_PATTERNS.some((p) => p.test(postContent))) {
    return { outcome: 'CLEAR_VIOLATION', greyAreaFlags };
  }
  if (MISINFORMATION_PATTERNS.some((p) => p.test(postContent))) {
    return { outcome: 'CLEAR_VIOLATION', greyAreaFlags };
  }

  if (category !== 'shop' && PROMOTION_PATTERNS.some((p) => p.test(postContent))) {
    return {
      outcome: 'UNCERTAIN',
      greyAreaFlags,
      civilityReminder: getGreyAreaReminder(greyAreaFlags),
    };
  }
  if (SPAM_PATTERNS.some((p) => p.test(postContent))) {
    return { outcome: 'UNCERTAIN', greyAreaFlags, civilityReminder: getGreyAreaReminder(greyAreaFlags) };
  }
  if (postContent.trim().length < 20) {
    return { outcome: 'UNCERTAIN', greyAreaFlags, civilityReminder: getGreyAreaReminder(greyAreaFlags) };
  }

  // Grey areas with Hinglish: allow, attach reminder only
  if (greyAreaFlags.length > 0) {
    return {
      outcome: 'CLEAN',
      greyAreaFlags,
      civilityReminder: getGreyAreaReminder(greyAreaFlags),
    };
  }

  return { outcome: 'CLEAN', greyAreaFlags: [] };
}

export function isSuspiciousNewAccount(accountAgeDays: number, postCount: number): boolean {
  if (accountAgeDays < 1 && postCount > 3) return true;
  if (accountAgeDays < 0.1 && postCount > 1) return true;
  return false;
}

export function shouldTriggerHumanReview(
  outcome: AIApprovalOutcome,
  userTrustScore: number,
  userRole?: UserRole
): boolean {
  if (outcome === 'CLEAR_VIOLATION') return false;
  if (userRole === 'trusted' && outcome === 'CLEAN') return false;
  if (outcome === 'CLEAN' && userTrustScore >= 0.85) return false;
  if (outcome === 'CLEAN' && userTrustScore > 0.7) return false;
  return true;
}

/** Lower number = reviewed sooner. Trusted members deprioritized (higher = back of queue). */
export function getReviewPriority(
  userRole: UserRole | undefined,
  trustScore: number,
  greyAreaFlags: GreyAreaFlag[]
): number {
  let priority = 50;
  if (userRole === 'trusted') priority += 40;
  else if (trustScore >= 0.85) priority += 30;
  else if (trustScore >= 0.7) priority += 15;
  if (greyAreaFlags.includes('negative_tuco_review')) priority -= 20;
  if (greyAreaFlags.includes('mental_health')) priority -= 5;
  return priority;
}

export function canTucoTeamPost(category: string, title: string, text: string): { allowed: boolean; reason?: string } {
  const combined = `${title} ${text}`.toLowerCase();
  const productRelevant =
    /tuco|sunscreen|moistur|bodywash|shampoo|spf|skincare|product|ingredient|formula|spf|kids\s+care/i.test(
      combined
    );
  const communityRelevant =
    category === 'shop' ||
    /safety\s+alert|recall|ingredient\s+update|community\s+update|parents\s+circle/i.test(combined);
  if (productRelevant || communityRelevant) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason:
      'Tuco Team posts are only allowed when directly and genuinely relevant to Tuco products, safety alerts, or community updates.',
  };
}

export function canTucoTeamModerateAction(action: 'close_thread' | 'remove_negative'): boolean {
  return false;
}

export const MODERATION_RULES = {
  RULES: [
    'Medical prescriptions or dosage advice',
    'Diagnosis statements (e.g., "sounds autistic")',
    'Brand promotion or spam',
    'Personal information (phone, address, school names)',
    'Photos without consent',
    'Medical misinformation (vaccines cause autism)',
    'Product delivery complaints',
    'Personal attacks on members',
  ],
  GREY_AREAS: {
    'Negative Tuco reviews': 'ALLOW — cannot remove or close threads for criticism',
    'Competitor product recommendations': 'ALLOW',
    'Religious/cultural parenting differences': 'ALLOW_WITH_CIVILITY',
    'Mental health discussions': 'ALLOW_WITH_CARE — be kind reminders',
    'Hinglish / Hindi / regional languages': 'ALLOW — never auto-remove for language',
  },
};
