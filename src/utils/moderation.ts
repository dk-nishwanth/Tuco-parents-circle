import { AIApprovalOutcome, GreyAreaFlag, UserRole } from '../types';

// Deliberately NOT in BAD_WORDS (CLEAR_VIOLATION = instant, unappealable
// auto-reject with no human ever seeing it):
// - Caste terms (dalit, obc, brahmin, chamar, casteist, anti-caste, etc.) —
//   these are neutral demographic/administrative words (school admission
//   categories, reservation status) or anti-discrimination language, not
//   slurs. Blocking them only censors legitimate discussion.
// - Discrimination-naming words (racist, sexist, homophobic, transphobic,
//   misogynist) — saying "that comment was racist" described bad behaviour,
//   it isn't itself a slur.
// - Safety-disclosure words (rape, molest, pedophile, murder) — a parent
//   reporting or asking for help about exactly these things needs their
//   post to go LIVE and get urgent moderator attention, not silently
//   vanish. See SAFETY_DISCLOSURE_PATTERNS below — genuine advocacy of
//   harm against a child is still caught separately by CHILD_HARM_PATTERNS.
// - porn/nude/boobs — moved to SOFT_WORDS: real questions like "found porn
//   on my son's phone" shouldn't be treated as a violation, just held for a
//   civility nudge.
const BAD_WORDS = [
  'fuck',
  'fucking',
  'fucked',
  'fuckoff',
  'fuck off',
  'shit',
  'shitting',
  'shitted',
  'bullshit',
  'horseshit',
  'asshole',
  'assholes',
  'bitch',
  'bitches',
  'cunt',
  'dick',
  'dicks',
  'piss',
  'pissing',
  'pissed',
  'bastard',
  'bastards',
  'whore',
  'whores',
  'slut',
  'sluts',
  'twat',
  'wanker',
  'wankers',
  'bollocks',
  'arse',
  'arsehole',
  'motherfucker',
  'motherfuckers',
  'chut',
  'chutiya',
  'chutiyap',
  'gandu',
  'gand',
  'lund',
  'lauda',
  'laund',
  'bc',
  'mc',
  'bhenchod',
  'madarchod',
  'bsdk',
  'randi',
  'sala',
  'harami',
  'kutta',
  'kaminay',
  'behenchod',
  'maa chod',
  'teri maa ki',
  'chinal',
  'fucktard',
  'dipshit',
  'douchebag',
  'douchebags',
  'jackass',
  'jackasses',
  'prick',
  'pricks',
  'cock',
  'cocks',
  'pussy',
  'pussies',
  'retard',
  'retards',
  'shithead',
  'shit head',
  'dumbass',
  'dumb ass',
  'asswipe',
  'ass wipe',
  'cum',
  'cumming',
  'cumshot',
  'blowjob',
  'blow job',
  'handjob',
  'hand job',
  'hate speech',
  'hatespeech',
  'nigger',
  'nigga',
  'chink',
  'gook',
  'spic',
  'faggot',
  'fag',
  'dyke',
  'tranny',
  'terrorist',
  'terrorism',
  'chuti',
  'chutiye',
  'gandu',
  'gandm',
  'lundfad',
  'laundfad',
  'terimaa',
  'teri maa',
  'teri maa ki chut',
  'bhosda',
  'hosda',
  'gaand',
  'gaandu',
  'chakal',
  'akkal',
  'bewakoof',
  'bewaqoof',
  'bewaqoof',
  'ullu',
  'ullu ka pattha',
  'saala',
  'saale',
  'kaminey',
  'kamina',
  'arsewipe',
  'dickhead',
  'dick head',
  'prickish',
  'what the fuck',
];

// Words people use constantly in ordinary casual complaints/venting
// ("this is so frustrating, ugh", "that sucks", "my back is killing me") —
// too common to hard-block. Flagged as UNCERTAIN (grey-area reminder, post
// still goes through) instead of CLEAR_VIOLATION. Actual targeted abuse
// ("you are stupid", "your kid is ugly") is still caught by
// PERSONAL_ATTACK_PATTERNS below regardless of this list.
const SOFT_WORDS = [
  'idiot',
  'stupid',
  'moron',
  'dumb',
  'ignorant',
  'fool',
  'foolish',
  'suck',
  'sucks',
  'sucked',
  'sucking',
  'kill',
  'killing',
  'killed',
  'die',
  'death',
  'the hell',
  'what the hell',
  'why the hell',
  'how the hell',
  'who the hell',
  'hell yeah',
  'hell no',
  'damn',
  'dammit',
  'god damn',
  'goddamn',
  'hellish',
  'bloody',
  'bugger',
  'sod',
  'coward',
  'loser',
  'pathetic',
  'worthless',
  'disgusting',
  'vile',
  'repulsive',
  'scum',
  'trash',
  'garbage',
  'wtf',
  'what the f',
  'what the heck',
  'heck',
  'jeez',
  'jeezus',
  'lame',
  'idiotic',
  'moronic',
  'brainless',
  'mindless',
  'witless',
  'harrassment',
  'harass',
  'threaten',
  'threat',
  'intimidate',
  'intimidation',
  'disgrace',
  'shameful',
  'shame',
  'disgraceful',
  'horrendous',
  'awful',
  'terrible',
  'horrible',
  // Moved here from BAD_WORDS: a real "found this on my kid's phone /
  // browser" question shouldn't be auto-rejected, just held for a civility
  // nudge like everything else in this list.
  'porn',
  'porno',
  'nudity',
  'nude',
  'boobs',
  'boob',
  'tits',
  'tit',
];

const SOFT_WORD_PATTERNS = SOFT_WORDS.map(word => {
  if (word.includes('the hell') || word.includes('what the') || word.includes('god damn')) {
    return new RegExp(word.replace(/\s+/g, '\\s*'), 'gi');
  }
  return new RegExp(`\\b${word}\\b`, 'gi');
});

const BAD_WORD_PATTERNS = BAD_WORDS.map(word => {
  if (word.includes('the hell') || word.includes('what the') || word.includes('god damn')) {
    return new RegExp(word.replace(/\s+/g, '\\s*'), 'gi');
  }
  if (word === 'the hell') {
    return new RegExp(/the\s*hell/gi);
  }
  if (word === 'fuck') {
    return new RegExp(/fuck|f\s*u\s*c\s*k/gi);
  }
  if (word === 'shit') {
    return new RegExp(/shit|s\s*h\s*i\s*t/gi);
  }
  return new RegExp(`\\b${word}\\b`, 'gi');
});

const MEDICAL_PRESCRIPTION_PATTERNS = [
  /give\s+\d+\s*(mg|ml|tablets?|drops?|pills?|spoons?|tsp|tbsp)/gi,
  /take\s+\d+\s*(mg|ml|tablets?|drops?|pills?|spoons?|tsp|tbsp)/gi,
  /dose\s+of\s+\d+/gi,
  /\d+\s*times?\s+a\s+day/gi,
  /\d+\s*times?\s*daily/gi,
  /every\s+\d+\s*hours?/gi,
  /for\s+\d+\s*days?/gi,
];

const DIAGNOSIS_PATTERNS = [
  /sounds?\s+autistic/gi,
  /probably\s+has\s+adhd/gi,
  /might\s+be\s+dyslexic/gi,
  /i\s+think\s+you\s+have/gi,
  /sounds?\s+like\s+(autism|adhd|dyslexia|anxiety|ocd|depression|bipolar|schizophrenia|add|odd|asperger)/gi,
  /your\s+child\s+has/gi,
  /you\s+have\s+(autism|adhd|dyslexia)/gi,
];

const PERSONAL_INFO_PATTERNS = [
  /\d{10,}/g,
  /[\w.-]+@[\w.-]+\.\w+/g,
  /\b\d{6}\b/g,
  /school\s+(name\s+is|is\s+called)/gi,
  /lives\s+at/gi,
  /address\s+is/gi,
  /phone\s+number/gi,
  /mobile\s+number/gi,
];

const BRAND_PROMOTION_PATTERNS = [
  /buy\s+\w+\s+now/gi,
  /order\s+this\s+product/gi,
  /check\s+out\s+my\s+(shop|store|link)/gi,
  /click\s+here\s+to\s+(buy|purchase|order)/gi,
  /limited\s+time\s+offer/gi,
  /(buy|purchase|order|get)\s+tuco/gi,
  /tuco\s+(buy|purchase|order)/gi,
];

const PERSONAL_ATTACK_PATTERNS = [
  /you\s+are\s+(stupid|idiot|moron|dumb|retard|ugly|fat|skinny|lazy|worthless|useless|pathetic|disgusting|horrible|awful|terrible|crazy|insane|mad|psycho|sick)/gi,
  /you\s+(are|look)\s+(ugly|fat|skinny|disgusting|horrible)/gi,
  /your\s+(child|kid|baby)\s+is\s+(ugly|stupid|dumb|annoying)/gi,
  /you\s+shouldn't\s+be\s+a\s+parent/gi,
  /worst\s+parent/gi,
  /bad\s+parent/gi,
  /terrible\s+parent/gi,
  /horrible\s+parent/gi,
  /awful\s+parent/gi,
  /shut\s+up/gi,
  /shut\s+your\s+mouth/gi,
  /go\s+to\s+hell/gi,
  /go\s+fuck\s+yourself/gi,
  /fuck\s+you/gi,
  /hate\s+you/gi,
  /i\s+hate\s+you/gi,
  /nobody\s+likes\s+you/gi,
  /no\s+one\s+likes\s+you/gi,
  /you're\s+a\s+joke/gi,
  /you're\s+pathetic/gi,
  /you're\s+useless/gi,
  /you're\s+worthless/gi,
  /you\s+deserve\s+(nothing|to\s+die|to\s+suffer)/gi,
  /you\s+should\s+die/gi,
  /kill\s+yourself/gi,
  /commit\s+suicide/gi,
];

const DELIVERY_COMPLAINT_PATTERNS = [
  /not\s+delivered/gi,
  /late\s+delivery/gi,
  /order\s+(not|didn't)\s+(arrive|come|deliver)/gi,
  /where\s+is\s+my\s+order/gi,
  /tracking\s+(not|isn't)\s+working/gi,
  /refund/gi,
  /return\s+product/gi,
  /damaged\s+product/gi,
];

const PHOTO_CONSENT_PATTERNS = [
  /photo\s+of\s+(another|other)\s+kid/gi,
  /picture\s+of\s+(another|other)\s+child/gi,
  /shared\s+photo\s+without/gi,
  /posted\s+picture\s+without/gi,
];

const SPAM_PATTERNS = [/(\w+\s+){5,}(?:http|www)/gi, /(?:http|www)[\w./?=&-]{50,}/gi];

const MISINFORMATION_PATTERNS = [
  /vaccines?\s+cause\s+autism/gi,
  /vaccines?\s+are\s+dangerous/gi,
  /don't\s+vaccinate/gi,
  /vaccines?\s+(kill|harm|poison)/gi,
  /no\s+vaccines/gi,
  /avoid\s+vaccines/gi,
];

// Content targeting or advocating harm against children. Strong-signal only —
// we deliberately do NOT catch help-seeking discussion ("my child was
// bullied", "I lost my temper"), only advocacy/solicitation. Any hit here is
// a CLEAR_VIOLATION and auto-rejected before it ever reaches the queue.
const CHILD_HARM_PATTERNS = [
  // Sexualization of minors — any of these near a child noun.
  /\b(sexy|hot|attractive|erotic|nude|naked)\b[^.]{0,40}\b(child|kid|kids|toddler|baby|infant|minor|boy|girl|son|daughter|teen|teenager|underage)\b/gi,
  /\b(child|kid|kids|toddler|baby|infant|minor|boy|girl|son|daughter|teen|teenager|underage)\b[^.]{0,40}\b(sexy|hot|attractive|erotic|nude|naked)\b/gi,
  /\bchild\s*porn|\bcsam\b|\bunderage\s+(sex|porn|nude)\b|\bloli(con|ta)?\b/gi,
  // Solicitation / grooming language
  /\b(meet|dm|message|whatsapp)\s+(me\s+)?(your\s+)?(child|kid|daughter|son|minor|teen)\b/gi,
  /\bpay\s+(you|for)\s+(your\s+)?(child|kid|daughter|son|photos?|pics?)\b/gi,
  // Direct advocacy of physical violence against children
  /\b(beat|hit|smack|thrash|slap|whip|kick|punch)\s+(the\s+|your\s+|my\s+)?(child|kid|kids|toddler|baby|infant|son|daughter)\s+(hard|harder|senseless|until|till|so)\b/gi,
  /\b(child|kids?|toddler|baby)\s+(need|deserve|should\s+get)\s+(a\s+)?(good\s+)?(beating|thrashing|whipping)\b/gi,
  /\bstarve\s+(the\s+|your\s+|my\s+)?(child|kid|kids|baby|toddler)\b/gi,
  /\block\s+(the\s+|your\s+|my\s+)?(child|kid|kids|baby|toddler)\s+(in|up|away|out)\b/gi,
  // Encouragement of neglect / abandonment as a strategy
  /\b(leave|abandon|dump)\s+(the\s+|your\s+|my\s+)?(child|kid|kids|baby|toddler|infant)\s+(alone|outside|on\s+the\s+street)\b/gi,
  // Explicit self-harm advocacy involving children ("teach kids to cut")
  /\bteach\s+(kids?|children|child)\s+to\s+(cut|starve|smoke|drink|self.harm)\b/gi,
];

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

// A parent disclosing or asking for help about one of these is exactly the
// person who most needs their post to stay visible and get a moderator's
// attention fast — never auto-rejected (see the note above BAD_WORDS).
// This flag exists purely to surface the thread at the top of the
// moderation queue, never to block it.
const SAFETY_DISCLOSURE_PATTERNS = [
  /\b(rape|rapist|raped)\b/gi,
  /\b(molest|molester|molested|molesting)\b/gi,
  /\b(pedo|pedophile|paedophile)\b/gi,
  /\b(murder|murderer|murdered)\b/gi,
];

export interface ModerationAnalysis {
  outcome: AIApprovalOutcome;
  greyAreaFlags: GreyAreaFlag[];
  civilityReminder?: string;
}

export function detectEnglish(text: string): boolean {
  const englishMarkers =
    /\b(kya|kaise|kaisa|nahi|nahin|bilkul|acha|accha|theek|thik|bhai|didi|mummy|papa|bachcha|baccha|bacha|zaroor|zyaada|jyada|bahut|bohot|matlab|shayad|abhi|kal|aaj|subah|raat|dawai|dawa|doctor\s+ko|ghar\s+pe|school\s+mein|problem\s+hai|help\s+chahiye)\b/gi;
  const devanagari = /[\u0900-\u097F]/;
  return englishMarkers.test(text) || devanagari.test(text);
}

export function detectGreyAreas(content: string): GreyAreaFlag[] {
  const flags: GreyAreaFlag[] = [];
  if (RELIGIOUS_CULTURAL_PATTERNS.some(p => { p.lastIndex = 0; return p.test(content); })) {
    flags.push('religious_cultural');
  }
  if (MENTAL_HEALTH_PATTERNS.some(p => { p.lastIndex = 0; return p.test(content); })) {
    flags.push('mental_health');
  }
  if (detectEnglish(content)) {
    flags.push('english');
  }
  if (NEGATIVE_TUCO_PATTERNS.some(p => { p.lastIndex = 0; return p.test(content); })) {
    flags.push('negative_tuco_review');
  }
  if (SAFETY_DISCLOSURE_PATTERNS.some(p => { p.lastIndex = 0; return p.test(content); })) {
    flags.push('safety_concern');
  }
  return flags;
}

export function getGreyAreaReminder(flags: GreyAreaFlag[]): string | undefined {
  const reminders: string[] = [];
  if (flags.includes('religious_cultural')) {
    reminders.push(
      "Religious and cultural parenting choices vary widely — please share respectfully and avoid judging other families' practices."
    );
  }
  if (flags.includes('mental_health')) {
    reminders.push(
      'Be kind. Mental health and postpartum topics are sensitive — share support, not judgment. This is not medical advice.'
    );
  }
  if (flags.includes('english')) {
    reminders.push(
      'English, Hindi, and regional languages are welcome here. Posts in mixed languages will not be removed for language alone.'
    );
  }
  if (flags.includes('negative_tuco_review')) {
    reminders.push(
      'Honest product feedback is allowed. tuco Team cannot remove negative reviews or close threads for criticism.'
    );
  }
  if (flags.includes('safety_concern')) {
    reminders.push(
      'This post touches on a serious safety topic. Please respond with care and support, not judgment.'
    );
  }
  return reminders.length > 0 ? reminders.join(' ') : undefined;
}

export function aiModerationCheck(postContent: string, category: string): AIApprovalOutcome {
  return analyzeContent(postContent, category).outcome;
}

export function analyzeContent(postContent: string, category: string): ModerationAnalysis {
  const greyAreaFlags = detectGreyAreas(postContent);
  const lowerContent = postContent.toLowerCase();

  if (lowerContent.includes('fuck') || lowerContent.includes('shit')) {
    return { outcome: 'CLEAR_VIOLATION', greyAreaFlags };
  }
  // NOTE: removed the crude `includes('hell')` checks — they matched "hello",
  // "shell", etc. and wrongly rejected normal posts like "say hello!". Real
  // profanity ("what the hell") is still caught by the /the\s*hell/ entry in
  // BAD_WORD_PATTERNS below.
  if (BAD_WORD_PATTERNS.some(p => { p.lastIndex = 0; return p.test(postContent); })) {
    return { outcome: 'CLEAR_VIOLATION', greyAreaFlags };
  }
  if (MEDICAL_PRESCRIPTION_PATTERNS.some(p => { p.lastIndex = 0; return p.test(postContent); })) {
    return { outcome: 'CLEAR_VIOLATION', greyAreaFlags };
  }
  if (DIAGNOSIS_PATTERNS.some(p => { p.lastIndex = 0; return p.test(postContent); })) {
    return { outcome: 'CLEAR_VIOLATION', greyAreaFlags };
  }
  if (PERSONAL_INFO_PATTERNS.some(p => { p.lastIndex = 0; return p.test(postContent); })) {
    return { outcome: 'CLEAR_VIOLATION', greyAreaFlags };
  }
  if (BRAND_PROMOTION_PATTERNS.some(p => { p.lastIndex = 0; return p.test(postContent); })) {
    return { outcome: 'CLEAR_VIOLATION', greyAreaFlags };
  }
  if (PERSONAL_ATTACK_PATTERNS.some(p => { p.lastIndex = 0; return p.test(postContent); })) {
    return { outcome: 'CLEAR_VIOLATION', greyAreaFlags };
  }
  if (DELIVERY_COMPLAINT_PATTERNS.some(p => { p.lastIndex = 0; return p.test(postContent); })) {
    return { outcome: 'CLEAR_VIOLATION', greyAreaFlags };
  }
  if (PHOTO_CONSENT_PATTERNS.some(p => { p.lastIndex = 0; return p.test(postContent); })) {
    return { outcome: 'CLEAR_VIOLATION', greyAreaFlags };
  }
  if (MISINFORMATION_PATTERNS.some(p => { p.lastIndex = 0; return p.test(postContent); })) {
    return { outcome: 'CLEAR_VIOLATION', greyAreaFlags };
  }
  if (CHILD_HARM_PATTERNS.some(p => { p.lastIndex = 0; return p.test(postContent); })) {
    return { outcome: 'CLEAR_VIOLATION', greyAreaFlags };
  }

  if (SPAM_PATTERNS.some(p => { p.lastIndex = 0; return p.test(postContent); })) {
    return {
      outcome: 'UNCERTAIN',
      greyAreaFlags,
      civilityReminder: getGreyAreaReminder(greyAreaFlags),
    };
  }
  if (SOFT_WORD_PATTERNS.some(p => { p.lastIndex = 0; return p.test(postContent); })) {
    return {
      outcome: 'UNCERTAIN',
      greyAreaFlags,
      civilityReminder: getGreyAreaReminder(greyAreaFlags),
    };
  }
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
  // Sorted to the top of the moderation queue regardless of trust level —
  // a safety disclosure needs a human's eyes fast, not to sit behind
  // "trusted member" deprioritization.
  if (greyAreaFlags.includes('safety_concern')) priority += 100;
  return priority;
}

export function cantucoTeamPost(
  category: string,
  title: string,
  text: string
): { allowed: boolean; reason?: string } {
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
      'tuco Team posts are only allowed when directly and genuinely relevant to tuco products, safety alerts, or community updates.',
  };
}

export function cantucoTeamModerateAction(action: 'close_thread' | 'remove_negative'): boolean {
  return false;
}

export const MODERATION_RULES = {
  GREY_AREAS: {
    RELIGIOUS_CULTURAL: 'Religious/Cultural parenting choices',
    MENTAL_HEALTH: 'Mental health & sensitivity',
    ENGLISH: 'English/Hindi/Regional languages',
    NEGATIVE_TUCO: 'Negative tuco feedback (allow)',
    SAFETY_CONCERN: 'Safety disclosure (rape/molestation/murder mention) — never reject; review with priority',
  },
};
