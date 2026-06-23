/**
 * Tops up each existing seeded conversation with additional replies.
 *
 * Behaviour:
 *   1. Appends new replies to prisma/seed-data.json (idempotent — skips replies
 *      whose author+text already exists on the conversation).
 *   2. Inserts the same replies into the live DB, matching conversations by
 *      title. Idempotent on the DB too.
 *
 * Run from project root:
 *   node prisma/top-up-replies.js
 */

import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SEED_PATH = join(__dirname, './seed-data.json');

const prisma = new PrismaClient();
const SYSTEM_USER_EMAIL = 'seed@tucokids.internal';

function r(author, city, time, text, likes = 0) {
  return { author, city, time, text, likes };
}

// Keyed by conversation id from seed-data.json
const SUPPLEMENT = {
  1: [
    r('GauriShah', 'Ahmedabad', '1 day ago', "Adding to this — keep a small hand towel handy and have him wipe sweat (not rub!) before reapplying. Rubbing pulls sunscreen off; patting and reapplying actually works.", 6),
    r('NandiniK', 'Coimbatore', '20 hours ago', "We use a stick sunscreen for the face (nose, ears, cheeks) and lotion for arms and legs. Less mess and the stick goes on even when he's sweaty.", 4),
    r('RituKapoor', 'Chandigarh', '14 hours ago', "Don't skip the back of the legs and the nape — that's where most cricket-kid tan lines come from. Also a wide-brim cap for fielding sessions does more than people think.", 3),
    r('ShwetaIyer', 'Hyderabad', '6 hours ago', "Coach tip from our academy: hydration matters too. A well-hydrated kid sweats less and sunscreen lasts longer. Cold electrolyte water between overs is non-negotiable.", 5)
  ],
  2: [
    r('VandanaMehra', 'Lucknow', '2 days ago', "Look at the bath products too — many 'baby' brands still contain SLS which is harsh on eczema-prone skin. Switching cleanser made a bigger difference for us than the moisturiser did.", 9),
    r('ArchanaPillai', 'Trivandrum', '1 day ago', "Humidifier in her room overnight if you're running AC or fans. The dryness from constant air movement is sneaky and makes eczema flare without obvious trigger.", 7),
    r('GauriShah', 'Ahmedabad', '18 hours ago', "Our dermat said avoid wet wipes on her face entirely — even 'sensitive' ones have preservatives that irritate compromised skin. Plain lukewarm water on a soft muslin works fine.", 6)
  ],
  3: [
    r('MeghaSinha', 'Patna', '2 days ago', "Mini idlis with a little ghee + veggie chutney — stays soft, no sogginess. We do batch cooking on Sunday and freeze portions.", 13),
    r('KritikaArora', 'Gurgaon', '1 day ago', "Stuffed thepla rolled with grated paneer/veggies inside, cut into pinwheels. Looks fun, eats in 4 bites, no curry mess.", 11),
    r('SonalDesai', 'Pune', '20 hours ago', "Sabudana khichdi with peanuts (if allergy-free) is filling and stays good. We add finely chopped carrot for colour. Hot tip: pack a tiny ice pack to keep curd-based tiffins safe till lunch.", 8),
    r('RashmiNair', 'Mumbai', '8 hours ago', "Whole wheat pasta with hidden veggie sauce (beetroot + tomato blended) — looks like 'regular' pasta to the kids, but full of nutrients. They have no idea.", 10)
  ],
  4: [
    r('SonalDesai', 'Pune', '3 days ago', "Munnar over Coorg if you want cooler weather in peak summer — temperatures drop nicely in the evenings and there are good kid-friendly resorts near Tata Tea museum.", 11),
    r('VandanaMehra', 'Lucknow', '2 days ago', "Andaman (Havelock specifically) is underrated for young kids — clean water, shallow beaches, very low population density. Took our 4 and 7 year old, both loved it.", 8),
    r('IshaPandey', 'Indore', '1 day ago', "If you don't want to fly, the Konkan coast (Tarkarli, Malvan) is gorgeous and quieter than Goa. Fewer crowds, great seafood, and the beaches are gentle.", 6),
    r('RituKapoor', 'Chandigarh', '10 hours ago', "Bhutan! Easy visa, very kid-friendly culture, cool weather, and clean food everywhere. Best decision we made for a family trip with a 3 and 6 year old.", 9)
  ],
  5: [
    r('NandiniK', 'Coimbatore', '5 days ago', "Times Tables Rock Stars app — we were skeptical because we limit screens but it genuinely worked. He went from struggling with 7s to confident in 3 weeks.", 14),
    r('PreetiKaur', 'Amritsar', '4 days ago', "Skip the rote completely. Show the pattern visually using arrays — 4×3 is literally 4 rows of 3 dots. Once they SEE it, they stop forgetting. Worked beautifully for both my kids.", 18),
    r('GauriShah', 'Ahmedabad', '3 days ago', "Bedtime tables — last 5 mins before sleep, we'd say one table back and forth. Sleep apparently helps memory consolidation. Sounds woo but it stuck for us.", 9),
    r('BhavanaRao', 'Bangalore', '1 day ago', "Snake-and-ladder style board game where each move = answer a tables question correctly. Free printables online. My 7yo now begs to play 'maths snakes'.", 11)
  ],
  6: [
    r('KritikaArora', 'Gurgaon', '12 days ago', "Adding to this — uniform check the night before too. Found out about missing belt/ID card at 7:45am one too many times.", 16),
    r('SonalDesai', 'Pune', '10 days ago', "We made a giant printed checklist by the door. Kids tick it off themselves now — homework copy, water bottle, lunch, ID card. Eliminated 'I forgot' completely.", 13),
    r('RashmiNair', 'Mumbai', '8 days ago', "Wake yourself up 15 mins before kids. That alone changed everything. Mornings where parents are still half-asleep are guaranteed chaos.", 19),
    r('VandanaMehra', 'Lucknow', '4 days ago', "Breakfast prep is the killer. We do overnight oats Sun-Thurs and dosa/idli batter on weekends. No cooking before 8am.", 12)
  ],
  7: [
    r('IshaPandey', 'Indore', '2 days ago', "Naming worked for us — 'farmer kale', 'superhero spinach'. Sounds silly but a 4yo accepted broccoli after we called it 'tiny trees'. The framing matters.", 12),
    r('NandiniK', 'Coimbatore', '1 day ago', "We started a 'rainbow plate' challenge — try to get 5 colours on his plate. He treats it like a game. Three weeks in he asks for purple cabbage by name.", 17),
    r('AnitaSrivastava', 'Noida', '16 hours ago', "Don't underestimate hunger as a teacher. We stopped offering snacks between meals. By lunch he was hungry enough to try things he'd refused for months.", 14),
    r('GauriShah', 'Ahmedabad', '6 hours ago', "Eating with cousins or friends — peer pressure works in both directions. My picky eater watched her cousin eat carrots and ate them too. Group meals more often.", 9)
  ],
  8: [
    r('MeghaSinha', 'Patna', '4 days ago', "We started our daughter at 18 months — pure water play, blowing bubbles, getting comfortable. By 4 she could swim independently. Early exposure builds zero fear.", 11),
    r('SonalDesai', 'Pune', '3 days ago', "In Chennai look at Y Sport in Anna Nagar — they have a graded toddler programme and the pool is heated which makes a huge difference for hesitant kids.", 7),
    r('RituKapoor', 'Chandigarh', '2 days ago', "More important than age: instructor-to-child ratio. For toddlers anything over 1:3 is a no. They need eyes on them constantly.", 10),
    r('VandanaMehra', 'Lucknow', '14 hours ago', "Avoid lessons after a heavy lunch — toddlers shiver fast and the digestion + cold combo causes meltdowns. Mid-morning slots worked best for us.", 5)
  ],
  9: [
    r('NandiniK', 'Coimbatore', '4 days ago', "We made the switch in Grade 6 and it took our son 6 months to adjust. He is now in Grade 9, IB, and his analytical writing is leagues ahead of his CBSE cousins. Worth it.", 15),
    r('IshaPandey', 'Indore', '3 days ago', "College admissions in India — most IB-recognised universities now exist (Ashoka, Krea, Plaksha) but if you're aiming for IIT/JEE route, IB makes that path harder. Be clear on the long game.", 18),
    r('BhavanaRao', 'Bangalore', '2 days ago', "Cost. Don't underestimate the financial commitment — IB schools are 3-5x the fees. If you can sustain it through Grade 12, great. Mid-stream pullouts are tough.", 13),
    r('GauriShah', 'Ahmedabad', '20 hours ago', "Visit and sit in on classes if the school allows. The teaching style is so different that some kids thrive immediately and others wilt. You'll know within 30 minutes of observation.", 9)
  ],
  10: [
    r('KritikaArora', 'Gurgaon', '3 days ago', "Pre-portioned, frozen marinated paneer is our weeknight saviour. 15 min defrost, 5 min on the tawa, dinner done.", 12),
    r('PreetiKaur', 'Amritsar', '2 days ago', "I do a 'base + variation' approach: one batch of onion-tomato masala in the fridge becomes butter masala / palak gravy / dal makhani / curry — just add the protein.", 17),
    r('RashmiNair', 'Mumbai', '1 day ago', "Roti dough is my secret — I make for the whole week and freeze in portions. Fresh rotis nightly in 10 mins flat. Game changer for working parents.", 14),
    r('MeghaSinha', 'Patna', '12 hours ago', "Pre-cut veggies in airtight glass containers — 30 mins on Sunday saves an hour every weekday. The trick is glass, not plastic — they actually last till Friday.", 10)
  ],
  11: [
    r('AnitaSrivastava', 'Noida', '3 days ago', "Once we switched to a kid-specific moisturiser the dryness we hadn't even noticed cleared up. Adult lotions are formulated for skin that's already done growing — the difference shows up months later.", 8),
    r('ArchanaPillai', 'Trivandrum', '2 days ago', "If you're in a pinch, plain coconut oil works better than adult lotion. No fragrance, no preservatives, easily absorbed.", 11),
    r('IshaPandey', 'Indore', '14 hours ago', "Read the ingredient list — if 'fragrance/parfum' is in the top 5 ingredients, don't use it on kid skin. That single rule eliminates 90% of unsuitable products.", 7)
  ],
  12: [
    r('NandiniK', 'Coimbatore', '2 days ago', "Coconut oil under the folds (literally just a film) acts as a barrier and the rash cleared in 4 days for us. Anti-fungal too, helpful when intertrigo gets a yeast component.", 12),
    r('PreetiKaur', 'Amritsar', '1 day ago', "Air drying is underrated. After bath, 5 minutes of just lying in cool air, gentle fan, before clothing on. We started doing this and the rash stopped recurring.", 9),
    r('MeghaSinha', 'Patna', '10 hours ago', "If it persists more than a week with all the moisture control, get it checked — fungal intertrigo needs antifungal cream, not just barrier cream.", 6)
  ],
  13: [
    r('VandanaMehra', 'Lucknow', '5 days ago', "We had a vit D and B12 test done — both were low in my son and supplementation visibly improved his under-eye colour in 3 months. Worth checking beyond just basic iron.", 16),
    r('SonalDesai', 'Pune', '4 days ago', "Eye rubbing from screen strain — even adult-level screens at age 10 can cause this. We cut screen time before bed and the circles softened noticeably.", 11),
    r('GauriShah', 'Ahmedabad', '2 days ago', "Hydration. Sounds basic but most kids are mildly dehydrated and don't show it anywhere except dark eye circles. We measured 1.2L water/day for our 10yo and the change was real.", 8)
  ],
  14: [
    r('AnitaSrivastava', 'Noida', '10 days ago', "We figured out the licking was a sensory thing — gave her a chewy necklace for daytime and the lip licking dropped 80%. The mouth was looking for input.", 17),
    r('ArchanaPillai', 'Trivandrum', '8 days ago', "Ghee. Just plain ghee at night. Heals overnight and is the safest possible ingredient if licked. Old school but it works.", 13),
    r('IshaPandey', 'Indore', '5 days ago', "Watch out for the lick-then-it-dries-worse cycle — chronic lip licking can develop into 'lip lick dermatitis' which is a proper condition. Don't dismiss it as a habit.", 9)
  ],
  15: [
    r('BhavanaRao', 'Bangalore', '2 days ago', "Korean kids' sunscreens (Cosrx, Beauty of Joseon) blend beautifully on Indian skin tones and are reasonably priced now on Amazon. We've been using them for a year.", 15),
    r('RashmiNair', 'Mumbai', '1 day ago', "Tinted mineral sunscreens are the answer. Even the kids' versions now come in 1–2 shade options. Worth the slightly higher price to actually get her to wear it.", 18),
    r('GauriShah', 'Ahmedabad', '12 hours ago', "Apply, wait 5 minutes, then dust a tiny bit of your foundation powder over the top — adult hack that works for kids too. Cuts the white cast completely.", 7),
    r('NandiniK', 'Coimbatore', '6 hours ago', "Don't go pure chemical to avoid the cast — many chemical sunscreens are not approved for under-12s in EU/Korea standards. Hybrid is the safer middle ground.", 9)
  ],
  16: [
    r('MeghaSinha', 'Patna', '5 days ago', "Tinea capitis spreads — wash his pillowcase, hat, and any combs in hot water immediately and don't let siblings share these. We missed this and the brother got it next.", 15),
    r('SonalDesai', 'Pune', '4 days ago', "Topical antifungals alone often don't reach the hair follicle. Oral griseofulvin or terbinafine is usually needed for scalp ringworm. Don't accept just a topical from a GP — push for a dermat referral.", 13),
    r('KritikaArora', 'Gurgaon', '12 hours ago', "Also check the family pet if you have one — cats especially carry tinea and re-infect kids in a cycle. Vet check is part of the treatment.", 7)
  ],
  17: [
    r('PreetiKaur', 'Amritsar', '4 days ago', "Bowl of water in the room — old desi trick that genuinely helps. Add a few before sleep. The AC water collection trays are also useful indicators of how dry the air actually is.", 11),
    r('VandanaMehra', 'Lucknow', '3 days ago', "Switch to gentle oil massage 2x a week — coconut or almond oil. Locks in moisture better than lotion alone for very dry skin. 10-min massage before bath works best.", 14),
    r('ArchanaPillai', 'Trivandrum', '14 hours ago', "Watch the AC temperature — anything below 24°C dries skin disproportionately. We set ours to 25 and the difference in everyone's skin was noticeable in a week.", 8)
  ],
  18: [
    r('GauriShah', 'Ahmedabad', '3 days ago', "Cotton vests under regular clothes — wick away sweat from the skin. We swapped polyester school t-shirts for cotton-only and the back rash disappeared.", 12),
    r('IshaPandey', 'Indore', '2 days ago', "Multani mitti paste applied for 10 mins, then washed off — cools the skin and reduces inflammation. Don't use daily but useful as a once-a-week summer treatment.", 9),
    r('NandiniK', 'Coimbatore', '14 hours ago', "Aloe vera gel (the pure kind, no fragrance) cools the area instantly. We keep a tube refrigerated for summer flare-ups.", 6)
  ],
  19: [
    r('AnitaSrivastava', 'Noida', '5 days ago', "Bhringraj is too strong for 1-year-olds — wait till 3+. Stick to coconut or almond oil till then. MIL had us using bhringraj early and it caused dandruff.", 10),
    r('BhavanaRao', 'Bangalore', '4 days ago', "Use very little — most parents over-oil. A pea-sized amount for the whole scalp is enough. Excess oil clogs pores and can cause cradle cap rebound.", 13),
    r('RashmiNair', 'Mumbai', '12 hours ago', "Lukewarm, not hot oil. Hot oil can scald the delicate scalp. Test on your inner wrist first — should feel barely warm.", 8)
  ],
  20: [
    r('SonalDesai', 'Pune', '2 days ago', "We use BabyOrgano patches as a backup but our main protection is mesh window screens + door screens. Source control matters far more than personal repellent for dengue.", 12),
    r('MeghaSinha', 'Patna', '1 day ago', "Plug-in vapourisers (Goodknight, AllOut) — modern formulations are safe for kids' rooms but use them in well-ventilated spaces. Old continuous-use ones are not great.", 7),
    r('KritikaArora', 'Gurgaon', '10 hours ago', "Lemon eucalyptus oil (OLE — not the same as plain eucalyptus) is the only natural repellent shown to work as well as low-DEET. Look for products with 30% OLE for kids over 3.", 9)
  ],
  21: [
    r('VandanaMehra', 'Lucknow', '7 days ago', "Lie-back position — head over the edge of the bath with your hand cradling. The water runs back, not into the eyes. Works for our 3yo even with the strong shampoos.", 19),
    r('IshaPandey', 'Indore', '6 days ago', "Hair washing only twice a week. Most parents wash daily out of habit but it isn't needed for toddlers and the daily exposure to shampoo is the bigger irritant.", 11),
    r('PreetiKaur', 'Amritsar', '4 days ago', "Tangle Teezer hair-wash visor — looks like a sun hat. Buy on Amazon, life-changing. We went from screaming bath to actually-fun bath.", 14)
  ],
  22: [
    r('ArchanaPillai', 'Trivandrum', '6 days ago', "Dettol is too harsh — kills good and bad bacteria, dries the wound. Saline (just dissolve salt in boiled water) is gentler and equally effective for cleaning.", 16),
    r('NandiniK', 'Coimbatore', '5 days ago', "We keep liquid bandage (Nexcare) in the kit — better for active kids than fabric plasters that peel off in 20 mins. One application stays on through play and bath.", 12),
    r('GauriShah', 'Ahmedabad', '14 hours ago', "Tetanus check — if his last booster was more than 5 years ago and the wound is deep or dirty, the paed may want to do a booster. Worth knowing for parents of active kids.", 8)
  ],
  23: [
    r('AnitaSrivastava', 'Noida', '12 days ago', "We used Mustela's cradle cap shampoo — 2 weeks of consistent use cleared it. Pricier than coconut oil method but faster.", 9),
    r('SonalDesai', 'Pune', '10 days ago', "Don't panic if it lingers — some babies have it until 6-8 months and it's completely harmless. As long as it isn't red, weepy, or spreading, you're not doing anything wrong.", 13),
    r('MeghaSinha', 'Patna', '6 days ago', "A soft toothbrush works better than baby brushes for the gentle scrubbing — bristles are softer and more precise. Worked beautifully for us after coconut oil soak.", 7)
  ],
  24: [
    r('BhavanaRao', 'Bangalore', '5 days ago', "Make it a routine like brushing teeth — same time, same place, no negotiation. Once it becomes 'just a thing we do' the morning drama stops. Took 3 weeks to lock in.", 14),
    r('RashmiNair', 'Mumbai', '4 days ago', "Give them ownership: let your 7yo apply his own on arms and legs while you do the face. Buying him 'his sunscreen' in a fun bottle also helped — kids love ownership.", 11),
    r('KritikaArora', 'Gurgaon', '2 days ago', "Lotion at home (cooler hands, more controlled application), stick in the school bag for reapplication. Two formats serve different purposes.", 8)
  ],
  25: [
    r('VandanaMehra', 'Lucknow', '7 days ago', "Bio-Oil and Mederma have some clinical evidence for fading. Daily application for 3-6 months, not a quick fix. But for an anxious teen the act of doing something itself helps.", 13),
    r('PreetiKaur', 'Amritsar', '5 days ago', "Conversation matters more than products at this age. Reassure her that stretch marks are markers of growth, not flaws. Show her your own if you have them — normalisation is powerful.", 22),
    r('IshaPandey', 'Indore', '2 days ago', "Hydration from inside (water + healthy fats — avocado, ghee, nuts) does more for skin elasticity than topical products. Long game though, not visible in days.", 9)
  ],
  26: [
    r('ArchanaPillai', 'Trivandrum', '3 days ago', "Dates and figs — high iron, sweet, and kids accept them as 'treats'. We blend them into a milkshake when she refuses outright. Soaked overnight increases iron availability.", 14),
    r('NandiniK', 'Coimbatore', '2 days ago', "Iron-fortified cereals can help bridge the gap — look for ones with ferrous sulphate, the most bioavailable form. Don't pair with milk (calcium blocks absorption); pair with citrus.", 11),
    r('GauriShah', 'Ahmedabad', '12 hours ago', "Cast iron cookware actually adds iron to the food cooked in it. Sounds folksy but there's good evidence. We switched our dal/sabzi pan to cast iron and her levels came up.", 10)
  ],
  27: [
    r('SonalDesai', 'Pune', '1 day ago', "We were in the same boat — bilingual household, son spoke late. He's now 7 and articulate in both languages. The 'silent gathering' period is real and bilingual kids often jump straight to sentences once they start.", 22),
    r('MeghaSinha', 'Patna', '20 hours ago', "Speech delay vs language delay are different — if he understands, the receptive language is fine. Expressive delay is much more often developmental and resolves on its own.", 14),
    r('KritikaArora', 'Gurgaon', '6 hours ago', "If you do go for evaluation, look for a bilingual speech-language pathologist. Monolingual evaluators often pathologise bilingual development that's actually normal.", 11)
  ],
  28: [
    r('RashmiNair', 'Mumbai', '4 days ago', "Til-jaggery laddoos — calcium + iron, kids love them as 'sweets'. Make a batch fortnightly. Old grandma recipe with serious nutritional firepower.", 17),
    r('PreetiKaur', 'Amritsar', '3 days ago', "Ragi malt with cardamom — looks and tastes nothing like plain milk. Our milk-refuser drinks 2 cups a day of this. Ragi alone has 350mg calcium per 100g.", 14),
    r('VandanaMehra', 'Lucknow', '1 day ago', "Cheese-loving kids do well — a single cube of cheddar is ~200mg calcium. Used as topping, in sandwiches, melted on rotis. Many milk-refusers accept cheese happily.", 9)
  ],
  29: [
    r('BhavanaRao', 'Bangalore', '2 days ago', "Snack in the car on pickup — protein-based not sugar. Hangry meltdowns are physiological, not behavioural. A boiled egg or peanut butter sandwich on the drive home stopped 70% of ours.", 31),
    r('NandiniK', 'Coimbatore', '1 day ago', "After-school activities are too much at 5 even if they look 'fun'. We cut all weekday classes and only kept weekends. Meltdowns dropped within a week.", 25),
    r('IshaPandey', 'Indore', '10 hours ago', "We let our 5yo wear pyjamas as soon as he got home — physical cue that 'school is over, you can relax now'. Sounds odd but it worked as a transition ritual.", 18),
    r('AnitaSrivastava', 'Noida', '4 hours ago', "Don't try to talk about the day right away — questions overwhelm them. We do 'no talking time' for 15 mins, then he naturally starts sharing once he's decompressed.", 14)
  ],
  30: [
    r('ArchanaPillai', 'Trivandrum', '5 days ago', "Get the whole family active together — weekend hikes, evening walks, cycling. Don't make it 'exercise for the child'. Our paed told us this and it transformed the household.", 26),
    r('GauriShah', 'Ahmedabad', '3 days ago', "Replace, don't restrict. If you remove fried snacks, the freezer should have a tasty alternative he chose. Restriction-only approaches usually backfire by 9-10.", 22),
    r('MeghaSinha', 'Patna', '1 day ago', "Talk about food in terms of how it makes the body feel — 'fuel for cricket', 'helps you concentrate' — not weight or body. The language shapes their internal narrative.", 19)
  ],
  31: [
    r('SonalDesai', 'Pune', '6 days ago', "She might be hitting a 'fat-loading' phase — toddlers naturally crave more fat than protein for brain development. Pair this with curd and milk and you're often covering protein too.", 18),
    r('KritikaArora', 'Gurgaon', '4 days ago', "Hidden protein: add besan to atta rotis (~15% by weight), use moong dal flour in dosas, peanut butter on apple. You can boost protein 30-40% without changing what she eats.", 14),
    r('PreetiKaur', 'Amritsar', '1 day ago', "If you're stressed, get a paed-supervised blood test rather than guessing. Knowing the actual numbers stops the anxiety loop and tells you exactly what to address.", 9)
  ],
  32: [
    r('RashmiNair', 'Mumbai', '4 days ago', "Cutting fruit with a butter knife — supervised. The grip + control + concentration builds exactly what we want. Kids feel grown-up doing it. Win-win.", 22),
    r('VandanaMehra', 'Lucknow', '3 days ago', "Lacing cards (or just an old cardboard with holes and a shoelace) — cheap and effective. We did 10 mins a day before bed for a month and the OT noticed real improvement.", 17),
    r('BhavanaRao', 'Bangalore', '1 day ago', "Tongs and tweezers for everything — picking pom-poms, transferring beans between bowls. The pincer-grip practice translates directly to pencil control.", 11)
  ],
  33: [
    r('IshaPandey', 'Indore', '8 days ago', "Tiffin format matters at 9 — kids self-conscious about smelly curries, things that need utensils. Switching to dry/hand-eatable tiffins helped our son. Wraps, sandwiches, idli.", 19),
    r('NandiniK', 'Coimbatore', '7 days ago', "Ask him to help pack his own tiffin. Ownership transforms eating. Even one item he chose makes a huge difference.", 13),
    r('ArchanaPillai', 'Trivandrum', '3 days ago', "If he's eating a huge dinner and growing well, the body is regulating itself. Some kids just aren't lunch-eaters. Worth not making it a battle if everything else is fine.", 10)
  ],
  34: [
    r('GauriShah', 'Ahmedabad', '3 days ago', "We did a 3-month trial of algae DHA on our 7yo at the paed's suggestion — honestly we saw no notable difference in focus. Anecdotally, lots of kids show no effect. Save your money for the food sources.", 17),
    r('MeghaSinha', 'Patna', '2 days ago', "Quality varies wildly. If you do supplement, choose third-party tested (look for IFOS or USP certifications). Cheap supplements can have rancid oils which are worse than none.", 11),
    r('AnitaSrivastava', 'Noida', '14 hours ago', "Two walnuts a day from age 4 — Ayurvedic 'brain food' recommendation with modern science behind it. Whole walnuts beat pills nutritionally.", 8)
  ],
  35: [
    r('SonalDesai', 'Pune', '5 days ago', "Disclosing-tablets (you chew them after brushing and they turn missed plaque pink) — bought a pack on Amazon and they ended every brushing debate. The 'check' became objective.", 24),
    r('KritikaArora', 'Gurgaon', '4 days ago', "Electric brush with a 2-min timer + music — removed the 'are we done yet' negotiation. Built-in time = built-in compliance.", 17),
    r('PreetiKaur', 'Amritsar', '1 day ago', "Brush together — model the technique while doing your own. Kids mirror what they see, and they want to be 'like us'. We brush side-by-side every morning.", 13)
  ],
  36: [
    r('VandanaMehra', 'Lucknow', '3 days ago', "Not all 8yo are equally affected. Some kids' melatonin systems handle blue light easily, others don't. If sleep onset, duration, and morning wake are all good — your kid is likely fine.", 22),
    r('BhavanaRao', 'Bangalore', '2 days ago', "We switched to audiobooks for the bedtime wind-down. Same screen-free benefit, satisfies the 'just one more story' urge, no blue light. He listens to 30 min and naturally drifts off.", 16),
    r('RashmiNair', 'Mumbai', '10 hours ago', "The content matters more than the screen — Bluey or nature documentaries have very different arousal effects than gaming content. Audit what he's actually watching for 30 mins.", 14)
  ],
  37: [
    r('NandiniK', 'Coimbatore', '2 days ago', "'I'll Always Love You' by Hans Wilhelm — beautiful picture book about a pet dying. We read it through tears together. Helped my daughter find words for her grief.", 28),
    r('IshaPandey', 'Indore', '1 day ago', "Create a memory ritual — we made a small box with Bruno's collar, a photo, and a drawing. She visits it when she misses him. Concrete objects help young children process abstract loss.", 22),
    r('ArchanaPillai', 'Trivandrum', '14 hours ago', "Be prepared for the questions to recurse for weeks — same questions, same answers. That's normal grief processing, not malice. Patience > information.", 17)
  ],
  38: [
    r('MeghaSinha', 'Patna', '6 days ago', "The 18-24 month food refusal phase is brutal but temporary. We just kept offering 1 new food alongside familiar ones, no pressure. By 30 months she was eating broadly again.", 19),
    r('GauriShah', 'Ahmedabad', '4 days ago', "Don't replace with what they will eat — that reinforces the refusal. Serve the family meal in toddler form. They eat or don't eat, no separate kids' menu.", 14),
    r('PreetiKaur', 'Amritsar', '1 day ago', "Smoothies were our bridge — banana + spinach + curd + dates. Looked normal, tasted sweet, smuggled in nutrition while she was in the 'I only eat rice' phase.", 11)
  ],
  39: [
    r('SonalDesai', 'Pune', '6 days ago', "Audiobooks were our gateway — she listened first, got hooked on Harry Potter, then asked for the books to 'see what they look like'. Listening counts as reading at this age.", 18),
    r('AnitaSrivastava', 'Noida', '4 days ago', "Visible reading time for adults. Kids who see parents read books for pleasure are 4x more likely to become readers themselves. Phones don't count.", 21),
    r('KritikaArora', 'Gurgaon', '1 day ago', "Let her pick — even if it's 'bad' books. Captain Underpants is not literature but it converts non-readers to readers. The habit matters more than the title at 7.", 15)
  ],
  40: [
    r('VandanaMehra', 'Lucknow', '3 days ago', "Sometimes biting at 4 is sensory-seeking or related to a speech limitation — child can't verbalise frustration so bites. An occupational therapy eval can be revealing.", 14),
    r('IshaPandey', 'Indore', '2 days ago', "Don't shame him after — it doesn't deter the biting and damages your relationship. Focus on the trigger and the alternative behaviour: 'words first, hands second'.", 12),
    r('BhavanaRao', 'Bangalore', '14 hours ago', "Same situation here at 4 — turned out he was being repeatedly pushed by a specific kid and didn't have language to escalate. Once we identified that and adults intervened, biting stopped.", 9)
  ],
  41: [
    r('NandiniK', 'Coimbatore', '5 days ago', "Rock climbing! Genuinely changed my 'non-sporty' daughter. It's individual progress, no team politics, builds strength + confidence. Most cities have indoor walls now with kid sessions.", 22),
    r('RashmiNair', 'Mumbai', '4 days ago', "Skating (roller or ice) — solo activity, very visible progress, and the kids 'compete' against themselves. Built confidence for our risk-averse daughter.", 16),
    r('GauriShah', 'Ahmedabad', '2 days ago', "Swimming. The water is the leveller — strength matters less than technique, and every kid improves at their own pace without comparison.", 13)
  ],
  42: [
    r('ArchanaPillai', 'Trivandrum', '3 days ago', "Pillow forts and cushion 'mountains' — sounds basic but young kids will play in a giant indoor fort for HOURS. Move all the living room cushions, declare a fort day.", 25),
    r('MeghaSinha', 'Patna', '2 days ago', "Bowling pins from empty water bottles + soft ball = indoor bowling. Our hallway became a bowling alley for an entire monsoon.", 14),
    r('PreetiKaur', 'Amritsar', '1 day ago', "We bought a small indoor swing (suction-mount, holds up to 50kg) — best ₹3000 spent. Kids swing daily, burns physical energy, packs away.", 19)
  ],
  43: [
    r('SonalDesai', 'Pune', '5 days ago', "Make it part of school transit if possible — cycling to school, walking, parking further. Lifestyle activity beats 'exercise time' at this age.", 19),
    r('KritikaArora', 'Gurgaon', '4 days ago', "Fitness tracker gamification works at 10! We got our son a basic Fitbit and he chases his step goal obsessively. Sounds wrong but the result is real activity.", 16),
    r('VandanaMehra', 'Lucknow', '14 hours ago', "Pickleball is the new family activity — easier than tennis, all ages can play, my 10yo loves it because she can actually compete with adults.", 11)
  ],
  44: [
    r('BhavanaRao', 'Bangalore', '6 days ago', "Bannerghatta Road on Sunday mornings has a designated cycling stretch (5-9am). Closed to vehicles, lots of families. Best place we found for safe child cycling.", 14),
    r('IshaPandey', 'Indore', '5 days ago', "Decathlon Sarjapur has a beginner cycle track on weekends — free, supervised, and they rent bikes if you don't want to lug yours. Great for first 'real ride'.", 11),
    r('NandiniK', 'Coimbatore', '14 hours ago', "Whitefield's CV Raman Nagar quiet inner roads work well early mornings — wide, flat, low traffic before 8am.", 8)
  ],
  45: [
    r('AnitaSrivastava', 'Noida', '7 days ago', "Our daughter does taekwondo — what hooked her was the discipline rituals (bowing, belt ceremonies). The structure built confidence faster than the techniques. Visit a class first; if the dojo doesn't feel right she'll quit in 2 weeks.", 22),
    r('GauriShah', 'Ahmedabad', '6 days ago', "Kalaripayattu! Indigenous, beautiful art, more rounded than karate/TKD. Hard to find good schools though — Kerala has the best teachers. Worth exploring if you're nearby.", 14),
    r('MeghaSinha', 'Patna', '2 days ago', "Look at the female instructor ratio. A martial art with female instructors at higher levels reinforces 'this is for you too' for daughters. Made a real difference for ours.", 11)
  ],
  46: [
    r('PreetiKaur', 'Amritsar', '12 days ago', "Pune FC academy at Balewadi Stadium is excellent for 6-10 age group. Real coaches, FIFA-aligned curriculum, fun-first approach. Tryout day is monthly.", 13),
    r('RashmiNair', 'Mumbai', '10 days ago', "Reliance Foundation Young Champs runs trials in Pune annually — if your son is serious it's worth the trial. Even if not selected the experience is valuable.", 9),
    r('ArchanaPillai', 'Trivandrum', '5 days ago', "Watch a session before enrolling. Coach-to-kid ratio + the body language of kids on the field tells you everything. Happy kids playing = right academy.", 12)
  ],
  47: [
    r('VandanaMehra', 'Lucknow', '4 days ago', "Activity 'snacks' through the day work better than one big block. 10 mins of running before school, 10 mins of cycling after, 30 mins of free play — adds to 50+ comfortably.", 14),
    r('SonalDesai', 'Pune', '3 days ago', "If school recess is genuinely active (not standing around chatting), it can cover 40+ mins. Ask the teacher how recess looks. We were surprised at the variability.", 11),
    r('NandiniK', 'Coimbatore', '1 day ago', "Don't count screen-based 'movement' (like Switch Sports). Real outdoor unstructured play is qualitatively different. Sun exposure + variable terrain matters at this age.", 9)
  ],
  48: [
    r('BhavanaRao', 'Bangalore', '7 days ago', "Find a teacher who specialises in water-anxious kids — many do. Group classes don't work for this kid. 1:1 for 3-4 sessions, then transition to group.", 21),
    r('KritikaArora', 'Gurgaon', '5 days ago', "Goggles are game-changing. Many fears are about water in eyes specifically. Once she has goggles she trusts, the panic drops sharply.", 18),
    r('IshaPandey', 'Indore', '1 day ago', "Swimming earplugs too — water in ears can cause vertigo which deepens the fear. Cheap fix that helped our anxious swimmer enormously.", 12)
  ],
  49: [
    r('GauriShah', 'Ahmedabad', '5 days ago', "'Throw Throw Burrito' — combines dodgeball with cards. Hilarious, gets kids running around the living room, ages 6+. Most-played family game in our house.", 17),
    r('MeghaSinha', 'Patna', '4 days ago', "Story Cubes + 'act out' rules — roll dice, but you have to physically act out the story. Adds movement to a calm game. Free hack for any creative game.", 11),
    r('PreetiKaur', 'Amritsar', '14 hours ago', "Charades, Simon Says, and the indoor classics still beat most modern games. Sometimes the old ones are the best.", 8)
  ],
  50: [
    r('ArchanaPillai', 'Trivandrum', '11 days ago', "Find a coach who is also left-handed if possible. The instincts are mirrored — explanation comes naturally rather than mentally flipping every cue.", 10),
    r('NandiniK', 'Coimbatore', '9 days ago', "Don't let anyone try to convert him to right-handed batting. Older coaches sometimes still do this. Left-handed cricketers like Gambhir, Pant, Ganguly are proof — keep him a leftie.", 14),
    r('SonalDesai', 'Pune', '3 days ago', "Equipment: gloves and pads are right-hand specific. Ensure the academy provides correct left-hand gear. Many kits at lower levels are right-only.", 9)
  ],
  51: [
    r('AnitaSrivastava', 'Noida', '4 days ago', "Cosmic Kids Yoga on YouTube — free, story-based, perfectly pitched at 4-7. We did it daily for a year before enrolling in an actual class. Great way to test interest.", 16),
    r('RashmiNair', 'Mumbai', '3 days ago', "Avoid classes that mix adults and kids. Kids' yoga is a completely different discipline — story-led, no holds, lots of laughter. Adult-style classes are inappropriate for 5yo.", 11),
    r('VandanaMehra', 'Lucknow', '12 hours ago', "Look for classes with breathwork — even at 5, simple belly breathing has clear emotional regulation benefits. That's the real long-term gift.", 9)
  ],
  52: [
    r('BhavanaRao', 'Bangalore', '3 days ago', "Strider/balance bike from age 3-5 first, then transition. We did this for our second kid and she went pedalling without training wheels in one afternoon at age 5. The balance is pre-built.", 26),
    r('KritikaArora', 'Gurgaon', '2 days ago', "Lower the seat dramatically so feet are flat on the ground. Removes the fear of falling. Once balance is found, raise it back. Game changer for fearful kids.", 19),
    r('GauriShah', 'Ahmedabad', '14 hours ago', "Don't hold the seat — they feel the support is the only thing keeping them upright. Light hand on the back of the t-shirt, let go for 2 seconds, hold, repeat.", 14)
  ],
  53: [
    r('IshaPandey', 'Indore', '5 days ago', "I'm an orthopaedic surgeon — wrist fractures from trampoline parks are the #1 paediatric ortho injury in summer holidays now. Manageable if rules are followed, devastating if not. No flips. Ever. Solo on each pad.", 28),
    r('MeghaSinha', 'Patna', '4 days ago', "Don't let two kids of very different sizes share a trampoline — the smaller one bounces uncontrollably. We saw a nasty broken arm from this combination at Sky Jumper.", 17),
    r('PreetiKaur', 'Amritsar', '1 day ago', "Grip socks are mandatory at most parks but make sure they actually fit. Loose socks = sliding = injuries. Worth taking time to size correctly.", 11)
  ],
  54: [
    r('SonalDesai', 'Pune', '3 days ago', "Document specific instances with dates before talking to school. 'On Tuesday, X happened' is concrete; 'she always favours' invites defensive denial. We took 2 weeks of notes and the meeting went very differently.", 22),
    r('ArchanaPillai', 'Trivandrum', '2 days ago', "Don't go in adversarially — frame it as 'I want to understand the classroom dynamic so I can support my son better.' Teachers respond very differently to curious vs accusatory parents.", 18),
    r('NandiniK', 'Coimbatore', '14 hours ago', "Sometimes 'favourites' are kids who reply more enthusiastically — teacher might not realise. Subtly coaching your son to engage more in class can shift the dynamic without confrontation.", 13)
  ],
  55: [
    r('RashmiNair', 'Mumbai', '4 days ago', "It's not normal at Grade 3 — research-backed homework recommendations are 30 mins. Parents collectively writing to the school principal (not the teacher) is the most effective channel.", 26),
    r('VandanaMehra', 'Lucknow', '3 days ago', "Stop helping. Seriously. If she takes 2 hours alone but you'd 'finish' in 40 mins together, let the school see what she actually does in her own time. Teacher will adjust if real outcomes are visible.", 21),
    r('AnitaSrivastava', 'Noida', '1 day ago', "Time her — 20 minutes per subject, hard stop. Send a note: 'completed work in allotted time'. Some teachers respect this; some don't, but it's reasonable boundary-setting.", 14)
  ],
  56: [
    r('GauriShah', 'Ahmedabad', '2 days ago', "Read 'Queen Bees and Wannabes' (Rosalind Wiseman) — old but timeless on female social dynamics. Helped me support my daughter through near-identical issues with concrete language.", 24),
    r('IshaPandey', 'Indore', '1 day ago', "Don't try to fix who her friends are. Help her develop independence — hobbies, solo activities, confidence in her own company. The hardest skill at this age is not needing the friend group, which paradoxically makes other kids want to befriend her.", 28),
    r('BhavanaRao', 'Bangalore', '14 hours ago', "We took our daughter to a child therapist for 4 sessions just for tools to handle the social pain. Best decision. Some emotional skills are easier to learn from a neutral expert than from a worried parent.", 17)
  ],
  57: [
    r('KritikaArora', 'Gurgaon', '6 days ago', "NTSE selection rate is ~0.3% — incredibly competitive. Don't go in expecting selection; go in for the exam-practice and depth-of-study benefits. Take the pressure off.", 16),
    r('PreetiKaur', 'Amritsar', '5 days ago', "Self-study with NCERT + Arihant NTSE book + previous year papers is sufficient for Stage 1. The marginal benefit of coaching is small relative to time cost. Coaching is helpful only for Stage 2 prep.", 13),
    r('MeghaSinha', 'Patna', '1 day ago', "Even 'not selected' kids often do significantly better in boards because the prep raises the level. Treat it as enrichment, not a target.", 9)
  ],
  58: [
    r('SonalDesai', 'Pune', '5 days ago', "Don't underestimate the local home tutor route — a single subject tutor at home who works 1:1 with him often outperforms both online platforms and big offline centres. Look for a postgrad student or junior college teacher.", 18),
    r('NandiniK', 'Coimbatore', '4 days ago', "Trial a free demo of both before paying anything. The 'right format' depends on the child's attention style. Some kids drift on video, some thrive on it.", 14),
    r('ArchanaPillai', 'Trivandrum', '12 hours ago', "Watch out for online platforms that 'gamify' — short attention bursts that feel productive but don't build deep concept mastery. The chocolate-flavoured medicine analogy applies.", 11)
  ],
  59: [
    r('AnitaSrivastava', 'Noida', '3 days ago', "Read 'When Children Refuse School' by Christopher Kearney — gave us a framework to identify the actual cause (avoidance, attention-seeking, fear, etc.). Solutions are very different by cause.", 21),
    r('RashmiNair', 'Mumbai', '2 days ago', "Have the school give him a small responsibility — class monitor, plant watering, library helper. Sense of purpose can completely reframe school for an anxious child.", 18),
    r('VandanaMehra', 'Lucknow', '12 hours ago', "Talk to the teacher about his social map at school. Sometimes it's one specific kid making things miserable, sometimes it's not having a best friend. Specific intel changes the strategy.", 13)
  ],
  60: [
    r('BhavanaRao', 'Bangalore', '6 days ago', "Visible parent involvement embarrasses the kid at this age. We do the 'helping' on a separate sheet first — discuss ideas, then he transcribes onto the project. The thinking is his, the output is his handwriting.", 21),
    r('GauriShah', 'Ahmedabad', '5 days ago', "Set a timer on YOUR involvement — 30 mins of brainstorming with him, that's it. The rest is his. This prevents the slow drift into 'doing it for him'.", 16),
    r('KritikaArora', 'Gurgaon', '1 day ago', "Imperfection is the goal. A child-made project that looks like a child made it is the WIN. Parents who do projects send kids the message 'you can't do it' — that's the real damage.", 13)
  ],
  61: [
    r('IshaPandey', 'Indore', '6 days ago', "Grade 9 is where students who later become toppers build conceptual mastery, not those who 'start preparing' for boards. The shift in mindset she needs is 'understand deeply' not 'cover quickly'.", 17),
    r('NandiniK', 'Coimbatore', '5 days ago', "Don't start board-style mock tests until Aug-Sept of Grade 10. Too early and they become rote attempts. Build the foundation first.", 14),
    r('ArchanaPillai', 'Trivandrum', '1 day ago', "Health basics this year matter most — sleep schedule, screen routine, exercise. Grade 10 stress is real and a kid going in with poor health habits crashes early.", 11)
  ],
  62: [
    r('MeghaSinha', 'Patna', '4 days ago', "Share your own failure stories with him. Hearing that you also failed at things, recovered, and grew — destigmatises failure faster than any pep talk.", 31),
    r('PreetiKaur', 'Amritsar', '3 days ago', "Don't go straight to fixing/analysing. Give it a day or two — let the disappointment sit. Premature problem-solving signals 'the feeling is the problem' rather than 'the feeling is valid'.", 23),
    r('SonalDesai', 'Pune', '14 hours ago', "Watch your own face when he tells you results. Kids read disappointment in micro-expressions and store it as 'I let mom down'. Your composure is half the conversation.", 19)
  ],
  63: [
    r('VandanaMehra', 'Lucknow', '5 days ago', "Spanish is the fastest to gain conversational fluency and opens Latin America — a region with major growth in trade with India. Often overlooked.", 14),
    r('GauriShah', 'Ahmedabad', '4 days ago', "Sanskrit if she's curious — counterintuitive but it builds an extraordinary grammar foundation and several school boards offer scoring advantage. Often overlooked.", 12),
    r('AnitaSrivastava', 'Noida', '1 day ago', "More important: pick a language she can use weekly. A language without immersion fades by adulthood regardless of which one it is.", 16)
  ],
  64: [
    r('BhavanaRao', 'Bangalore', '2 days ago', "Read Jonathan Haidt's 'The Anxious Generation' if you haven't — exhaustive research on smartphone-school link to teen mental health. After reading it, my opposition to bans evaporated.", 33),
    r('IshaPandey', 'Indore', '1 day ago', "Many phone-ban schools allow GPS-only smartwatches for pickup coordination. A reasonable compromise. Apple Watch with cellular-only-on-school-app would work too.", 18),
    r('NandiniK', 'Coimbatore', '12 hours ago', "The kids adapt within 2-3 weeks — they always do. Adults panic more than kids do about phone bans. Trust the data: 14yo brains genuinely don't benefit from in-school phone access.", 14)
  ],
  65: [
    r('ArchanaPillai', 'Trivandrum', '6 days ago', "Don't force visual art if he's not interested but introduce 'maker' classes — robotics, woodworking, simple engineering kits. Creative output without the drawing pressure.", 19),
    r('SonalDesai', 'Pune', '5 days ago', "Music or theatre might appeal more than visual art. The 'creative outlet' need not be drawing. Listen to what he gravitates toward naturally.", 15),
    r('KritikaArora', 'Gurgaon', '1 day ago', "Art as therapy and art as career are different things. Some art exposure is good for any child but pushing 'classes' on a disinterested 8yo is usually counterproductive.", 11)
  ],
  66: [
    r('PreetiKaur', 'Amritsar', '2 days ago', "Cut the day's last meal earlier — heavy dinner too close to bed sabotages everything. We moved dinner from 8pm to 7pm and the routine compressed by 30 mins overnight.", 28),
    r('MeghaSinha', 'Patna', '1 day ago', "Lights low / yellow only 1 hour before bed. Blue/white overhead lights signal 'morning' to the brain. We changed all bulbs in the kids' areas to warm dimmable LEDs.", 22),
    r('RashmiNair', 'Mumbai', '14 hours ago', "Reduce choices the closer to bed it gets. Pajama choice at 7pm = no problem. Story choice at 8:30pm = power struggle. The brain decides better when fresh.", 19),
    r('NandiniK', 'Coimbatore', '4 hours ago', "Consistency on weekends too. Sleep schedule that swings 2 hours on Sat/Sun resets the work week badly. Hard but worth it.", 14)
  ],
  67: [
    r('GauriShah', 'Ahmedabad', '3 days ago', "Window companion! Each kid gets a notepad and pencil — count cars by colour, draw things they see, alphabet hunt on number plates. Engaged + quiet + educational.", 21),
    r('IshaPandey', 'Indore', '2 days ago', "Snack curation matters — sticky/sugary snacks = high energy = fights. Plain crackers, fruit, nuts (allergy permitting) = calm energy. Made a real difference for us.", 14),
    r('BhavanaRao', 'Bangalore', '1 day ago', "Audiobook the whole family listens to together — Roald Dahl, Geronimo Stilton, the Tinkle podcast. Shared listening turns the drive into a positive bonding time.", 17)
  ],
  68: [
    r('VandanaMehra', 'Lucknow', '4 days ago', "We made savings visible — old pickle jar, coins pile up, kids see growth. Abstract bank balances mean nothing to 8yo. Physical jar with a goal label works.", 26),
    r('KritikaArora', 'Gurgaon', '3 days ago', "Don't bail out 'oops I spent it all' moments. The whole point is learning consequences. Hold the line for one cycle and the lesson lasts forever.", 22),
    r('ArchanaPillai', 'Trivandrum', '14 hours ago', "Add a 'match' on savings — for every ₹100 saved, we add ₹50. Teaches the magic of compounding informally. Even small kids understand 'free money for saving'.", 14)
  ],
  69: [
    r('SonalDesai', 'Pune', '3 days ago', "We tried a chores chart with stickers — flopped. What worked: family meeting once a week, kids choose which 3 chores they own that week. Ownership > assignment.", 27),
    r('NandiniK', 'Coimbatore', '2 days ago', "'Reset time' at 8pm — 10 min where the whole family puts away their own stuff. No talking, just doing. Makes evening tidy-up communal, not nag-driven.", 21),
    r('MeghaSinha', 'Patna', '14 hours ago', "Natural consequences > reminders. Didn't put plate away? Then no snack on it later. Once is usually enough for the lesson to land.", 16)
  ],
  70: [
    r('AnitaSrivastava', 'Noida', '2 days ago', "Big sibling 'job' — let him be the one who hands you the diaper, picks the baby's outfit, sings to her. Inclusion turns rival into helper. We saw a complete shift in 6 weeks.", 27),
    r('PreetiKaur', 'Amritsar', '1 day ago', "Visitors who bring gifts should bring something for the older sibling too. Tell relatives explicitly — most do this once asked. Eliminates a major jealousy trigger.", 22),
    r('RashmiNair', 'Mumbai', '14 hours ago', "Bedwetting is a stress signal, not naughtiness. Wake him for a pee at 11pm for a few weeks (called 'lifting') — physiological fix while emotional adjustment happens.", 16)
  ],
  71: [
    r('GauriShah', 'Ahmedabad', '4 days ago', "Reduce situations that incentivise lying. 'Did you brush your teeth?' invites a lie. 'Show me your brush — wet?' is a check. Designing situations matters more than moral lessons.", 23),
    r('IshaPandey', 'Indore', '3 days ago', "When you do catch him, make truth-telling safer than lying. 'I'd rather you tell me and we figure it out together than hide it' — repeat it often. Otherwise lies get more sophisticated, not less.", 19),
    r('BhavanaRao', 'Bangalore', '14 hours ago', "Don't trap him into lying. If you already know the answer, don't ask — just state it. 'I see you didn't brush. Let's go do it now.' Less drama, no escalation.", 15)
  ],
  72: [
    r('VandanaMehra', 'Lucknow', '5 days ago', "Family activities that compete with screens: board games (Catan, Codenames), cooking together, a household project (gardening, organising a room). Replace the entertainment, don't just remove it.", 22),
    r('KritikaArora', 'Gurgaon', '4 days ago', "The adults have to do it too. If your phone is in your hand during 'no screen evening', the kids see the lie. Hardest part is parent compliance, honestly.", 25),
    r('NandiniK', 'Coimbatore', '1 day ago', "Start small — 90 min tech-free, not the whole evening. Compounding success works better than ambitious failure at any age.", 14)
  ],
  73: [
    r('ArchanaPillai', 'Trivandrum', '2 days ago', "Engage the kids in the boundary directly: 'Dadi loves you SO much, but cookies before dinner make tummy aches. Can you politely say no thank you?' Empowers them to set the limit.", 26),
    r('SonalDesai', 'Pune', '1 day ago', "Time the visits differently. Right after dinner is safer than 30 mins before. Schedule manipulation is sometimes easier than confrontation.", 18),
    r('MeghaSinha', 'Patna', '14 hours ago', "Pick your battles — let grandparents 'win' on weekend treats, hold the line on weekdays. Some indulgence from grandparents is genuinely valuable to children. Total bans damage family relationships.", 21)
  ],
  74: [
    r('PreetiKaur', 'Amritsar', '4 days ago', "Two options to start — not 'what do you want for breakfast' (overwhelming) but 'idli or poha?' Builds decision muscle without paralysis. Expand options as the muscle grows.", 19),
    r('GauriShah', 'Ahmedabad', '3 days ago', "Let her experience the consequence of small bad decisions. Wore the wrong shoes for the park? Sore feet for an hour. That hour teaches more than 100 lectures.", 23),
    r('AnitaSrivastava', 'Noida', '1 day ago', "Praise the process of deciding, not the choice. 'I like how you thought about that' teaches her decision-making is a skill. The choice being 'good' is secondary.", 14)
  ],
  75: [
    r('RashmiNair', 'Mumbai', '6 days ago', "Make-your-own-comic kits, photography projects, podcast making (free apps), pen-pal exchanges with cousins. The 10-12 sweet spot loves 'real adult' creative tools.", 20),
    r('IshaPandey', 'Indore', '5 days ago', "Magic kits! Genuinely held my 11yo for months. Performance ambition + manual dexterity + presentation skills. Underrated for tweens.", 16),
    r('BhavanaRao', 'Bangalore', '1 day ago', "Lego still works at 11 if you upgrade — Technic, Architecture, mechanical kits. Adult-level Lego is a different category. Hours of focused build time.", 13)
  ],
  76: [
    r('KritikaArora', 'Gurgaon', '2 days ago', "Read 'Amazing You' by Gail Saltz — perfect first book for 4-6 about body awareness. Picture-based and gentle. Read it together a few times — repetition normalises the language.", 35),
    r('VandanaMehra', 'Lucknow', '1 day ago', "Use correct anatomical names from the start. Studies show kids who know correct names are more likely to disclose abuse and be believed. Euphemisms create barriers.", 41),
    r('NandiniK', 'Coimbatore', '12 hours ago', "Teach 'safe surprises' (good news to share later) vs 'secrets' (must hide). The distinction is critical and easy for young children to grasp.", 27),
    r('SonalDesai', 'Pune', '4 hours ago', "Repeat conversations, not one big talk. Drip-feed over months, not a 30-min sit-down. The drip approach is age-appropriate and feels natural.", 19)
  ],
  77: [
    r('MeghaSinha', 'Patna', '3 days ago', "I had to actively work on this for years and the therapist's reframe stuck: 'good mothers feel guilt; perfect mothers (don't exist) wouldn't'. Guilt is often a sign you care, not that you've failed.", 44),
    r('ArchanaPillai', 'Trivandrum', '2 days ago', "Lower the bar. Aim for 'good enough' not 'great' parent. Donald Winnicott's idea of the 'good enough mother' — research shows children thrive with imperfect, loving parents.", 37),
    r('GauriShah', 'Ahmedabad', '14 hours ago', "Find one other honest mum friend you can confess to. Suffering in private amplifies guilt. Hearing 'me too' diffuses 70% of it.", 28)
  ],
  78: [
    r('PreetiKaur', 'Amritsar', '4 days ago', "Bedrock rule: when the timer ends, the device goes in the parent's drawer. Removing the object from the room removes the negotiation possibility.", 24),
    r('AnitaSrivastava', 'Noida', '3 days ago', "Front-load — let him pick his 1 hour. Choosing when he uses it (without changing the total) shifts the power dynamic and reduces complaints.", 19),
    r('RashmiNair', 'Mumbai', '1 day ago', "We do 'no screens after dinner' as a household rule. Predictable boundary, no daily negotiation. Once it's a rule for everyone, the kid stops asking.", 16)
  ],
  79: [
    r('IshaPandey', 'Indore', '5 days ago', "Don't ask 'do you need to go' — at 3 the answer is always no. Take her to the toilet every 90 min as routine. Removes the decision from her brain.", 22),
    r('BhavanaRao', 'Bangalore', '4 days ago', "Add an extra 30 mins of one-on-one time in her old routine spot if you can. Regression from disruption resolves with 'home base' restored.", 17),
    r('NandiniK', 'Coimbatore', '1 day ago', "Special undies (let her pick) — kids don't want to soil their favourites. Tiny psychological tool that works disproportionately well.", 13)
  ],
  80: [
    r('KritikaArora', 'Gurgaon', '3 days ago', "Show, don't tell, with percentages: 'About 40% goes to home, 30% to school and food, 20% to savings, 10% to fun.' Kids grasp percentages of a whole better than rupee figures.", 21),
    r('VandanaMehra', 'Lucknow', '2 days ago', "Beware the comparison conversations. 'Do they earn more than us?' is the next question. Pre-empt: 'every family has different jobs and earnings, and what matters is how we use what we have.'", 17),
    r('GauriShah', 'Ahmedabad', '14 hours ago', "Involve them in family financial decisions — choosing between two vacation options based on cost, deciding whether to repair vs buy new. Real-world financial reasoning.", 13)
  ],
  81: [
    r('SonalDesai', 'Pune', '4 days ago', "Hands off her face! Most prepubescent acne worsens because kids touch/pick. We taped a 'don't touch' note on her bathroom mirror for a month.", 16),
    r('ArchanaPillai', 'Trivandrum', '3 days ago', "Don't introduce makeup yet. Foundation/concealer at 10 makes acne worse and embeds adult skincare anxiety early. The 'leave it alone, it'll pass' approach is medically correct here.", 13),
    r('MeghaSinha', 'Patna', '14 hours ago', "Skincare is also self-image work — frame it as care, not correction. 'We're keeping our skin happy', not 'we're fixing your pimples'. The language matters at this age.", 11)
  ],
  82: [
    r('PreetiKaur', 'Amritsar', '3 days ago', "Add: hydrocortisone 1% (for bug bites and rashes), saline eye wash, dispenser-pack oral rehydration powder, calamine lotion, and a small ice pack in the freezer.", 28),
    r('IshaPandey', 'Indore', '2 days ago', "Take a paediatric first aid course — most cities have weekend ones for ₹2-3k. The kit is useless without the skill to use it. Best money I've spent as a parent.", 33),
    r('NandiniK', 'Coimbatore', '14 hours ago', "Keep a laminated card with: paed's number, nearest 24hr hospital, blood group of each family member, and any allergies. In an emergency you don't want to be looking up phone numbers.", 25)
  ],
  83: [
    r('BhavanaRao', 'Bangalore', '2 days ago', "Channel the passion: real architecture/design books, real-world model-building (Lego architecture, woodwork). Minecraft skills translate beautifully to design careers. Don't fight it; broaden it.", 28),
    r('RashmiNair', 'Mumbai', '1 day ago', "Look up MinecraftEdu — there are paid versions used in schools globally. Curriculum-linked Minecraft activities feel like play but are genuinely educational.", 19),
    r('VandanaMehra', 'Lucknow', '14 hours ago', "What you're describing sounds healthy — deep interest, creative output. Concerning would be: refuses to do anything else, melts down when stopped, sleep/eating disrupted. Your son sounds fine.", 22)
  ],
  84: [
    r('AnitaSrivastava', 'Noida', '2 days ago', "Use WhatsApp's 'pin chat' feature for the actually-important groups (class teacher direct, real homework group). Pin them at top, mute everything else. Quick scan = important info found.", 29),
    r('KritikaArora', 'Gurgaon', '1 day ago', "Class parent rep system — designate ONE rep per class who relays urgent updates only. Avoids 40 parents commenting on the same announcement. Worth pitching to school.", 23),
    r('GauriShah', 'Ahmedabad', '12 hours ago', "Set boundaries — 'I don't respond to school WhatsApp after 8pm' as your bio status. Most parents secretly want this norm but no one wants to be first.", 18)
  ],
  85: [
    r('MeghaSinha', 'Patna', '6 days ago', "Acquire Junior, Settlers of Catan Junior — both teach resource management without explicit money mechanics. Stealth financial literacy.", 17),
    r('ArchanaPillai', 'Trivandrum', '5 days ago', "Wingspan Junior (if available) for older kids in the 9-12 range — engine-building thinking. Or Stardew Valley on console — surprisingly money-focused gameplay.", 13),
    r('SonalDesai', 'Pune', '14 hours ago', "Real-world: give kids ₹500 for a family grocery trip with a list. Watching them prioritise, weigh trade-offs, deal with budget overruns is the best 'game' there is.", 22)
  ],
  86: [
    r('PreetiKaur', 'Amritsar', '4 days ago', "Don't redo their chores in front of them — if the bed is wonky, leave it. Redoing kills motivation faster than anything. Imperfection is part of the learning.", 27),
    r('VandanaMehra', 'Lucknow', '3 days ago', "Visual chore wheel that rotates weekly — kids don't get bored of the same chores, and 'this week is your dusting week' frames it as turn-taking, not assigned work.", 19),
    r('IshaPandey', 'Indore', '14 hours ago', "Teach the 4yo first by 'helping you', not by assigning. 'Want to help me sort socks?' is irresistible. Real assignment can wait till 5-6.", 16)
  ],
  87: [
    r('BhavanaRao', 'Bangalore', '4 days ago', "Pack double the diapers you think you need. Sounds excessive. You'll need them. Pressurised cabin = unpredictable bowel timing.", 19),
    r('NandiniK', 'Coimbatore', '3 days ago', "Book the bulkhead row for the bassinet — for many long-haul carriers, under-2 toddlers up to certain weight can use it. She'll sleep, you'll be free-handed.", 24),
    r('GauriShah', 'Ahmedabad', '1 day ago', "Lower expectations dramatically. The flight will not be great. Aim for 'survived, no injuries, no one cried for more than 30 mins'. Anything more is bonus.", 27)
  ],
  88: [
    r('RashmiNair', 'Mumbai', '3 days ago', "5-year gap parent here — the bonus is that the older child is genuinely emotionally regulated and helpful. The minus is they don't play together at all until the little one is 4+. Different relationship arc.", 18),
    r('KritikaArora', 'Gurgaon', '2 days ago', "Closer gap pros are real but the first year is gruelling — two in nappies, two non-sleepers, two needing constant attention. Plan for 18 months of survival mode.", 23),
    r('AnitaSrivastava', 'Noida', '14 hours ago', "Don't optimise on 'ideal gap'. Conception isn't always controllable, and 'spacing' decisions can frustrate couples for years. Whatever happens, you'll make it work.", 19)
  ],
  89: [
    r('SonalDesai', 'Pune', '2 days ago', "Wait, Wait Wait. Read 'The Anxious Generation' or watch Jonathan Haidt's interviews. The mental health evidence on smartphones before 13-14 is genuinely alarming. Peer pressure passes; brain damage from early social media doesn't.", 39),
    r('MeghaSinha', 'Patna', '1 day ago', "We gave a 'dumb phone' at 11 (Nokia 105) for calls and SMS. Solved the peer-pressure 'I don't have a phone' problem without the smartphone. Worked beautifully for 2 years.", 28),
    r('ArchanaPillai', 'Trivandrum', '14 hours ago', "If you do give it: 'wait until 8th' pledge (lots of parent groups online) — coordinating with other parents removes the social-isolation argument completely.", 22)
  ],
  90: [
    r('PreetiKaur', 'Amritsar', '3 days ago', "Watch a YouTube video together that has comments — show her how strangers comment. The visceral 'these are not your friends' realisation lands stronger than explanation.", 26),
    r('IshaPandey', 'Indore', '2 days ago', "Set up YouTube Kids (not regular YouTube) with content review enabled. Algorithm gets very dark very fast on regular YouTube. Worth the slightly limited library.", 21),
    r('GauriShah', 'Ahmedabad', '14 hours ago', "Talk about deepfakes and AI-generated content. Kids today need to understand 'real vs fake' as a constant question, not a one-time lesson.", 17)
  ],
  91: [
    r('VandanaMehra', 'Lucknow', '6 days ago', "Eye check is critical at 7-8 — undetected vision issues are mistaken for learning issues regularly. Many kids labelled 'inattentive' just need glasses.", 18),
    r('BhavanaRao', 'Bangalore', '5 days ago', "If your child is athletic, ask for a baseline ECG once. Cardiac screening pre-sports activity catches rare but serious conditions. Sports-academy doctors recommend this.", 14),
    r('NandiniK', 'Coimbatore', '1 day ago', "Posture and spine check — phone/tablet kids increasingly have early postural issues. Most paeds don't check unless asked.", 11)
  ],
  92: [
    r('KritikaArora', 'Gurgaon', '5 days ago', "Earthquake drills in our flat: 'drop, cover, hold under the dining table' — kids treat it as a game during practice. We do it twice a year. Took 30 mins to teach.", 22),
    r('ArchanaPillai', 'Trivandrum', '4 days ago', "Pack an emergency 'go bag' together as a family activity — water, torch, whistle, photocopies of IDs. Kids participate in packing, learn the contents.", 17),
    r('AnitaSrivastava', 'Noida', '14 hours ago', "Memorise one adult's number — not the parent's, ideally a grandparent or aunt in a different city. In a disaster local lines fail; out-of-town numbers often connect.", 15)
  ],
  93: [
    r('GauriShah', 'Ahmedabad', '2 days ago', "Block out one 2-hour 'us' slot per fortnight — non-negotiable. Babysitter, even if it's the cousins or grandparents. The relationship needs investment, not just leftover time.", 42),
    r('RashmiNair', 'Mumbai', '1 day ago', "Couples counselling early, not late. The 'we're not that bad yet' stage is the easiest to fix. 4-5 sessions can shift dynamics that 5 years of drift created.", 38),
    r('IshaPandey', 'Indore', '14 hours ago', "Audit your division of labour. Resentment often disguises itself as 'lost spark'. If one partner does 70% of the kid load, no romance survives that imbalance.", 36),
    r('MeghaSinha', 'Patna', '4 hours ago', "Touch — not sexual, just affection. Hugs, hand-holding, a kiss when you pass in the hallway. Physical reconnection ladders up to emotional reconnection. Often forgotten with young kids.", 29)
  ],
  94: [
    r('SonalDesai', 'Pune', '4 days ago', "American Academy of Pediatrics endorses strength training from age 7-8 with proper form. The 'no weights for kids' belief is outdated by ~20 years.", 16),
    r('BhavanaRao', 'Bangalore', '3 days ago', "Find a strength coach with paediatric/youth certification. Not 'gym bro'. The form-teaching at 11 sets up safety for life. Worth the investment.", 13),
    r('NandiniK', 'Coimbatore', '14 hours ago', "Bodyweight + light resistance bands for the first 6 months — no barbells, no max efforts. Once technique is grooved, the actual loads can come.", 11)
  ],
  95: [
    r('PreetiKaur', 'Amritsar', '3 days ago', "Show him videos of male dancers — Hrithik, Tiger Shroff, Prabhu Deva, BTS members. Visibility neutralises 'not for boys' instantly. He needs role models he can see.", 31),
    r('IshaPandey', 'Indore', '2 days ago', "Hip-hop or contemporary classes tend to have more boys than ballet/Bharatanatyam if the family is the concern. Same skill building, different framing.", 19),
    r('AnitaSrivastava', 'Noida', '14 hours ago', "The family pushback usually softens once they see a recital. Recorded video of him performing is more persuasive than any argument.", 22)
  ],
  96: [
    r('VandanaMehra', 'Lucknow', '3 days ago', "Have her teach the topic to you — explaining out loud locks it deeply and the safety of teaching mum eliminates evaluation pressure. Highly effective for high-IQ anxious kids.", 28),
    r('GauriShah', 'Ahmedabad', '2 days ago', "Pre-exam routine matters: solid breakfast (no sugar crash), 10 mins of stretching, no last-minute revision. The cortisol pattern shapes performance more than content knowledge.", 22),
    r('KritikaArora', 'Gurgaon', '14 hours ago', "If panic hits during exam, teach her 'reverse breathing' (slow exhale longer than inhale). Activates the parasympathetic nervous system in under 60 seconds.", 17)
  ],
  97: [
    r('ArchanaPillai', 'Trivandrum', '4 days ago', "Saline nasal drops + a cool-mist humidifier in the room overnight = better than 80% of OTC remedies for under-6s. Both inexpensive and evidence-backed.", 21),
    r('MeghaSinha', 'Patna', '3 days ago', "Honey + warm water + a pinch of cinnamon — cough suppressant for 1+yo with research support. Avoid honey under 1 (botulism risk).", 18),
    r('SonalDesai', 'Pune', '14 hours ago', "Steam bath — boil water, take to bathroom, sit with the child for 5 mins (safe distance). Clears stuffy nose faster than any spray. Old technique, still works.", 14)
  ],
  98: [
    r('NandiniK', 'Coimbatore', '5 days ago', "Korg B2 and Casio CDP-S160 are also solid beginner weighted keyboards at lower price than Yamaha. Same teaching value if you're on a budget.", 11),
    r('RashmiNair', 'Mumbai', '4 days ago', "Get a real piano teacher who's okay with keyboard students — some teachers refuse, others are fine. Teacher attitude matters more than equipment.", 14),
    r('BhavanaRao', 'Bangalore', '1 day ago', "Stick the sustain pedal — many cheap keyboards skip this and the playing technique never develops correctly. Pedal is non-negotiable for serious learning.", 9)
  ],
  99: [
    r('IshaPandey', 'Indore', '4 days ago', "Take him to volunteer at an NGO that supports kids with less. Direct exposure to gratitude beats any conversation. Has shifted my son's framing of 'lack' permanently.", 27),
    r('PreetiKaur', 'Amritsar', '3 days ago', "Talk about 'wants vs needs' as an ongoing conversation, not a one-time lecture. Use real-life moments: 'is this a need or a want?' Builds the language naturally.", 22),
    r('GauriShah', 'Ahmedabad', '14 hours ago', "Don't punish materialism — it's age-appropriate. Just don't reward it either. The neutral 'that's interesting that they have it' response defuses without preaching.", 18)
  ],
  100: [
    r('AnitaSrivastava', 'Noida', '2 days ago', "We let our daughter make her first video (about her dog) — she scripted, filmed, edited (iMovie). The project itself was educational; she lost interest in 3 weeks but the skills stuck.", 32),
    r('VandanaMehra', 'Lucknow', '1 day ago', "Don't make any of it public. 9-year-olds online is a safety issue, not just a discipline one. Family-only audience until 13+.", 41),
    r('KritikaArora', 'Gurgaon', '14 hours ago', "Frame it as her 'broadcasting hobby', not 'becoming famous'. Career-ifying early kills creative joy. Most kid YouTubers shown publicly are damaged by it.", 26)
  ],
  101: [
    r('BhavanaRao', 'Bangalore', '5 days ago', "Anti-fungal foot powder in shoes — feet sweat more in monsoon and athlete's foot in kids is common. Sprinkle before shoes go on, especially school shoes.", 14),
    r('SonalDesai', 'Pune', '4 days ago', "Body acne can flare in monsoon — sweat + humidity. Switch body wash to one with 2% salicylic acid (for 8+yo) once a week.", 11),
    r('NandiniK', 'Coimbatore', '14 hours ago', "Don't skip moisturiser — humidity surface-level doesn't mean skin is hydrated. Use a lighter gel formula but still daily.", 8)
  ],
  102: [
    r('ArchanaPillai', 'Trivandrum', '2 days ago', "Join an ADHD parent support group — online ones like 'ADHD India' (Facebook) saved my sanity. Other parents will normalise the journey faster than any book.", 38),
    r('GauriShah', 'Ahmedabad', '1 day ago', "Read 'Driven to Distraction' by Edward Hallowell — written by a paed psychiatrist who has ADHD himself. Best book to understand the inside experience and help your child reframe it positively.", 32),
    r('MeghaSinha', 'Patna', '14 hours ago', "Medication is a tool, not a treatment. Behavioural therapy + school accommodations + (sometimes) medication is the comprehensive approach. Don't let anyone push you toward or away from meds — it's a careful clinical decision.", 27)
  ],
  103: [
    r('SonalDesai', 'Pune', '5 days ago', "We tried this with our 9yo and discovered through her drawings that she'd been worried about something at school for weeks she hadn't mentioned. Art journaling literally surfaces unspoken feelings.", 24),
    r('IshaPandey', 'Indore', '4 days ago', "Don't analyse or 'interpret' her drawings. The privacy is the safety. If she chooses to share, listen. If she doesn't, that's also okay.", 19),
    r('KritikaArora', 'Gurgaon', '14 hours ago', "A high-quality sketchbook (not flimsy paper) signals 'this matters'. Quality of materials = quality of investment. We gave a Moleskine and the daily use jumped 3x.", 12)
  ],
  104: [
    r('PreetiKaur', 'Amritsar', '4 days ago', "Dairy and eggs are worth the premium for organic if you can swing it — pesticides and hormones concentrate in animal products. Vegetables less so.", 18),
    r('VandanaMehra', 'Lucknow', '3 days ago', "Wash conventional produce in baking soda water (1 tsp/L for 15 min) — clinical studies show this removes ~80% of pesticide residue. Cheaper than buying organic.", 22),
    r('NandiniK', 'Coimbatore', '1 day ago', "Local farmer market produce is often organic-by-default without the label or price premium. Build a relationship with one farmer — they tell you which crops they spray and which they don't.", 16)
  ],
  105: [
    r('BhavanaRao', 'Bangalore', '6 days ago', "Don't try home removal (string, OTC freeze kits) on children — risk of scarring or infection. Wait till he's older if it doesn't bother him.", 12),
    r('AnitaSrivastava', 'Noida', '5 days ago', "If it gets caught on clothing or jewellery and tears, that's when it becomes urgent. Otherwise leave it. We've left our son's for 4 years with zero issues.", 9),
    r('RashmiNair', 'Mumbai', '14 hours ago', "Make sure it IS a skin tag — moles can look similar in early stages. Dermatologist confirmation first, then decide on action.", 7)
  ],
  106: [
    r('MeghaSinha', 'Patna', '3 days ago', "Make a 'Sunday menu' list with the kids on Friday — give them activity ideas in advance. The 'I'm bored' moments drop dramatically with a pre-planned set of options.", 21),
    r('ArchanaPillai', 'Trivandrum', '2 days ago', "Have a Sunday tradition — a family meal you cook together, a place you go (park, beach, grandparents). Anchor activities make the screen absence feel like presence of something.", 18),
    r('IshaPandey', 'Indore', '14 hours ago', "Adults need this more than kids. We discovered our irritability was the screen withdrawal, not the kids'. Our quality of presence on screen-free days completely changed how the kids responded.", 26)
  ],
  107: [
    r('GauriShah', 'Ahmedabad', '5 days ago', "Look for 'mixed-age' activities — Sunday school, library story hour, sports classes. Only-children benefit from regularly being in groups they weren't born into.", 19),
    r('SonalDesai', 'Pune', '4 days ago', "Sleepovers when she's a bit older — sharing toys, sharing space, sharing parents' attention for a night. We started at 6yo and the social maturation was visible.", 14),
    r('KritikaArora', 'Gurgaon', '14 hours ago', "Don't compensate for 'only child' with overstimulation. Quiet, alone, focused play IS one of the gifts of being an only child. Don't apologise for it.", 12)
  ],
  108: [
    r('PreetiKaur', 'Amritsar', '4 days ago', "'The Invisible String' by Patrice Karst — not divorce-specific but powerful for any separation. We read it on hard days. Beautiful concept of connection across distance.", 22),
    r('VandanaMehra', 'Lucknow', '3 days ago', "Children's book of feelings (Todd Parr's work especially) — open-ended feeling vocabulary helps her name what she's experiencing. Naming is half of healing.", 18),
    r('IshaPandey', 'Indore', '1 day ago', "Family therapy for 4-5 sessions once the dust settles — even children who 'seem fine' benefit. A neutral adult who isn't either parent is a unique gift to a child of divorce.", 24)
  ],
  109: [
    r('BhavanaRao', 'Bangalore', '6 days ago', "Take a colouring book and crayons — dilation eye drops take 30-45 min to kick in and the waiting room can be tedious. Reduces test anxiety too.", 14),
    r('NandiniK', 'Coimbatore', '5 days ago', "Dilated pupils make light sensitivity rough for 4-6 hours after. Bring sunglasses (cap with brim works too). Reading and screens are uncomfortable for a few hours post-test.", 17),
    r('GauriShah', 'Ahmedabad', '14 hours ago', "Vision changes are sneaky — kids adapt and don't realise they can't see well. School screenings often pick this up before any 'symptom' appears. Trust the school's flag.", 11)
  ],
  110: [
    r('NandiniK', 'Coimbatore', '20 hours ago', "Letting my kid 'win' at everything to keep her happy. By 7 she couldn't tolerate losing in the simplest games. We had to actively re-teach losing. Started by losing to her with grace, then started winning sometimes.", 38),
    r('KritikaArora', 'Gurgaon', '14 hours ago', "Believing 'good parents have rule-following kids'. Spent his early years controlling everything. He grew into a teen who couldn't make decisions because I'd made them all. Painful realisation.", 41),
    r('SonalDesai', 'Pune', '12 hours ago', "Putting my career growth on hold for 'the kids'. They didn't need me 24/7; I needed me. The resentment leaked into parenting more than my absence ever would have. Back at work, much better mom.", 35),
    r('ArchanaPillai', 'Trivandrum', '8 hours ago', "Public correction of small things. Tying his shoes the 'right way' in front of his friends at 6. He still flinches at unsolicited help today at 11. Tiny moments compound.", 33),
    r('IshaPandey', 'Indore', '4 hours ago', "Speaking about another parent (school dad we disagreed with) negatively in front of my kids. They internalised the dismissiveness. Took years to undo.", 28)
  ]
};

async function topUpJsonFile() {
  const raw = readFileSync(SEED_PATH, 'utf8');
  const conversations = JSON.parse(raw);
  let added = 0;
  let skipped = 0;

  for (const conv of conversations) {
    const extras = SUPPLEMENT[conv.id];
    if (!extras || extras.length === 0) continue;

    if (!Array.isArray(conv.replies)) conv.replies = [];

    const existingKeys = new Set(
      conv.replies.map(r => `${(r.author || '').trim()}|${(r.text || '').trim()}`)
    );

    let nextId = conv.replies.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1;

    for (const extra of extras) {
      const key = `${extra.author.trim()}|${extra.text.trim()}`;
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }
      conv.replies.push({
        id: nextId++,
        author: extra.author,
        city: extra.city,
        time: extra.time,
        text: extra.text,
        likes: extra.likes || 0
      });
      added++;
    }
  }

  writeFileSync(SEED_PATH, JSON.stringify(conversations, null, 2) + '\n', 'utf8');
  console.log(`seed-data.json: appended ${added} new replies (skipped ${skipped} duplicates).`);
  return conversations;
}

async function topUpDatabase(conversations) {
  const seedUser = await prisma.user.findUnique({ where: { email: SYSTEM_USER_EMAIL } });
  if (!seedUser) {
    console.log('No seed user found — skipping DB top-up. Run seed.js first.');
    return;
  }

  let added = 0;
  let skipped = 0;
  let convsMissing = 0;

  for (const conv of conversations) {
    const extras = SUPPLEMENT[conv.id];
    if (!extras || extras.length === 0) continue;

    const dbConv = await prisma.conversation.findFirst({ where: { title: conv.title } });
    if (!dbConv) {
      convsMissing++;
      continue;
    }

    const existing = await prisma.reply.findMany({
      where: { conversationId: dbConv.id },
      select: { author: true, text: true }
    });
    const existingKeys = new Set(existing.map(r => `${(r.author || '').trim()}|${(r.text || '').trim()}`));

    for (const extra of extras) {
      const key = `${extra.author.trim()}|${extra.text.trim()}`;
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }
      try {
        await prisma.reply.create({
          data: {
            conversationId: dbConv.id,
            author: extra.author,
            authorId: seedUser.id,
            city: extra.city,
            time: extra.time,
            text: extra.text,
            likes: extra.likes || 0,
            authorRole: 'MEMBER',
            authorBadges: [],
            moderationStatus: 'APPROVED'
          }
        });
        added++;
      } catch (err) {
        console.error(`Failed insert for conv "${conv.title}":`, err.message);
      }
    }
  }

  console.log(`DB: inserted ${added} new replies (skipped ${skipped} duplicates, ${convsMissing} conversations not found).`);
}

async function main() {
  console.log('\nTopping up replies…\n');
  const conversations = await topUpJsonFile();
  await topUpDatabase(conversations);
  console.log('\nDone.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
