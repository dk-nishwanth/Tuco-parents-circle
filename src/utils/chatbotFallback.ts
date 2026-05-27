
interface FallbackRule {
  pattern: RegExp;
  responses: string[];
}

const fallbackRules: FallbackRule[] = [
  // GREETINGS & SMALL TALK (10)
  {
    pattern: /hi|hello|hey|greetings|good morning|good afternoon|good evening/i,
    responses: [
      "Hello! 👋 I'm your Tuco Parenting Assistant. How can I help you today?",
      "Hi there! How are you and your little one doing today? 😊",
      "Greetings! I'm here to help with any parenting questions you have."
    ]
  },
  {
    pattern: /how are you|how's it going/i,
    responses: [
      "I'm doing great, thank you for asking! Ready to help you with some parenting tips. How about you?",
      "I'm wonderful! Just here, waiting to assist amazing parents like you."
    ]
  },
  {
    pattern: /who are you|what are you/i,
    responses: [
      "I am the Tuco Assistant, your friendly guide for all things parenting, skincare, and child development!",
      "I'm a chatbot designed to help parents find answers, tips, and community support here at Tuco."
    ]
  },
  {
    pattern: /thank you|thanks|thx/i,
    responses: [
      "You're very welcome! I'm always happy to help. ❤️",
      "No problem at all! Let me know if you need anything else.",
      "Anytime! We're all in this together. 😊"
    ]
  },
  {
    pattern: /bye|goodbye|see you/i,
    responses: [
      "Goodbye! Have a wonderful day with your little one! 👋",
      "See you later! Come back whenever you have a question.",
      "Take care! Happy parenting! ❤️"
    ]
  },
  {
    pattern: /joke|tell me a joke/i,
    responses: [
      "Why did the cookie go to the doctor? Because he was feeling crumb-y! 🍪",
      "What do you call a bear with no teeth? A gummy bear! 🐻",
      "How do you make a tissue dance? Put a little boogey in it! 😂"
    ]
  },
  {
    pattern: /help|what can you do/i,
    responses: [
      "I can help with advice on skincare, nutrition, sleep routines, behavior, and navigating our community forum! Just ask away.",
      "I'm here to provide tips on raising happy, healthy kids. Try asking about 'tiffin ideas', 'eczema', or 'bedtime routines'."
    ]
  },
  {
    pattern: /ok|okay|cool|nice/i,
    responses: [
      "Great! Let me know if there's anything specific you'd like to discuss.",
      "Awesome! I'm here if you need more info."
    ]
  },
  {
    pattern: /yes|yeah|sure/i,
    responses: [
      "Perfect! What's on your mind?",
      "Excellent. How can I assist further?"
    ]
  },
  {
    pattern: /no|not really|stop/i,
    responses: [
      "No problem. I'm here whenever you need me!",
      "Understood. Feel free to reach out anytime."
    ]
  },

  // SKINCARE & HYGIENE (15)
  {
    pattern: /sunscreen|spf|sun protection/i,
    responses: [
      "Always use a mineral-based SPF 30+ for kids. Tuco's sunscreens are specially formulated to be safe and effective! Apply 15 mins before heading out."
    ]
  },
  {
    pattern: /rash|skin irritation|redness/i,
    responses: [
      "For minor rashes, keep the area clean and dry. If it persists, it might be heat rash or an allergy. A consultation with a pediatrician is always safest."
    ]
  },
  {
    pattern: /eczema|dry skin|atopic dermatitis/i,
    responses: [
      "Keep baths short and lukewarm. Use a thick, fragrance-free moisturizer immediately after. Tuco's barrier-repair lotions are great for sensitive skin!"
    ]
  },
  {
    pattern: /moisturizer|lotion|cream/i,
    responses: [
      "For kids, look for ingredients like ceramides and natural oils. Avoid parabens and strong fragrances which can irritate young skin."
    ]
  },
  {
    pattern: /soap|body wash|cleanser/i,
    responses: [
      "Use soap-free cleansers that don't strip natural oils. Our 'Kids & Hygiene' forum has many recommendations for gentle washes."
    ]
  },
  {
    pattern: /bath|shower|washing/i,
    responses: [
      "Most experts recommend bathing infants 3 times a week, but older kids might need daily rinses. Keep the water temperature around 37°C."
    ]
  },
  {
    pattern: /diaper rash|nappy rash/i,
    responses: [
      "Frequent changes and plenty of 'air time' are key. Use a zinc-oxide based cream to create a barrier against moisture."
    ]
  },
  {
    pattern: /mosquito|insect bite|bug spray/i,
    responses: [
      "Use DEET-free repellents for children. For bites, a cold compress or calamine lotion can help soothe the itch."
    ]
  },
  {
    pattern: /hair|shampoo|cradle cap/i,
    responses: [
      "For cradle cap, gently massage baby oil and brush with a soft brush. Use a tear-free shampoo for older kids."
    ]
  },
  {
    pattern: /nails|cutting nails/i,
    responses: [
      "Cut nails when they are soft after a bath. Use baby-specific clippers and go straight across to avoid ingrown nails."
    ]
  },
  {
    pattern: /teeth|brushing|toothpaste/i,
    responses: [
      "Start brushing as soon as the first tooth appears! Use a tiny smear of fluoride toothpaste twice a day."
    ]
  },
  {
    pattern: /acne|teen skin|pimples/i,
    responses: [
      "Pre-teens should start a simple routine: gentle cleanser and oil-free moisturizer. Remind them not to pick at spots!"
    ]
  },
  {
    pattern: /deodorant|smell|sweat/i,
    responses: [
      "For active kids, look for aluminum-free natural deodorants. Teaching good hygiene habits early makes a big difference!"
    ]
  },
  {
    pattern: /winter skin|cold weather/i,
    responses: [
      "Cold air dries out skin fast! Use a humidifier indoors and apply a thicker moisturizer before going outside."
    ]
  },
  {
    pattern: /summer skin|heat/i,
    responses: [
      "Keep kids hydrated and use lightweight, breathable cotton clothes. Don't forget the sunblock even on cloudy days!"
    ]
  },

  // NUTRITION & EATING (15)
  {
    pattern: /picky eater|won't eat|refuse food/i,
    responses: [
      "Picky eating is a phase! Try the 'one bite rule' and don't make mealtime a battleground. Check out our 'Tiffin Hacks' for creative ideas."
    ]
  },
  {
    pattern: /vegetable|veggie|greens/i,
    responses: [
      "Try 'hiding' veggies in pasta sauces or smoothies. Modeling healthy eating yourself is the most powerful tool!"
    ]
  },
  {
    pattern: /sugar|sweets|candy/i,
    responses: [
      "Moderation is key. Try swapping sugary snacks for fruits or yogurt. Setting clear 'treat days' can help manage expectations."
    ]
  },
  {
    pattern: /milk|dairy|calcium/i,
    responses: [
      "Milk is great for calcium, but cheese and yogurt are excellent alternatives if your child isn't a fan of plain milk."
    ]
  },
  {
    pattern: /water|hydration|drinking/i,
    responses: [
      "Kids often forget to drink. Keep a fun, colorful water bottle handy and offer water with every meal."
    ]
  },
  {
    pattern: /protein|meat|eggs|beans/i,
    responses: [
      "Protein is essential for growth. If they don't like meat, try eggs, lentils, chickpeas, or peanut butter."
    ]
  },
  {
    pattern: /breakfast|morning meal/i,
    responses: [
      "A high-protein breakfast helps with focus at school. Oatmeal with nuts or eggs on toast are great options."
    ]
  },
  {
    pattern: /tiffin|lunchbox|school lunch/i,
    responses: [
      "Keep it simple! A wrap, some cut fruits, and a handful of nuts is a balanced tiffin that's easy to eat."
    ]
  },
  {
    pattern: /junk food|fast food/i,
    responses: [
      "Occasional treats are fine! Focus on the '80/20 rule'—80% healthy, 20% fun food."
    ]
  },
  {
    pattern: /fruit|vitamins/i,
    responses: [
      "Whole fruits are better than juices because of the fiber. Aim for a 'rainbow' of colors throughout the week."
    ]
  },
  {
    pattern: /snack|hungry/i,
    responses: [
      "Keep healthy snacks visible. Sliced cucumbers, roasted makhana, or apple slices with nut butter are winners."
    ]
  },
  {
    pattern: /allergy|allergic|peanut/i,
    responses: [
      "Food allergies are serious. Always read labels and inform the school. If you suspect an allergy, see an allergist immediately."
    ]
  },
  {
    pattern: /cooking with kids|help in kitchen/i,
    responses: [
      "Kids are more likely to eat what they help cook! Let them wash veggies or stir (with supervision)."
    ]
  },
  {
    pattern: /iron|anemia|energy/i,
    responses: [
      "Spinach, beans, and fortified cereals are good iron sources. Pair them with Vitamin C (like oranges) for better absorption."
    ]
  },
  {
    pattern: /weight|fat|thin/i,
    responses: [
      "Focus on health and energy rather than weight. If you have concerns, your pediatrician can check their growth chart."
    ]
  },

  // SLEEP & ROUTINES (10)
  {
    pattern: /sleep|nap|bedtime/i,
    responses: [
      "A consistent routine (Bath, Book, Bed) works wonders. Try to keep the same sleep schedule even on weekends."
    ]
  },
  {
    pattern: /nightmare|bad dream|scared of dark/i,
    responses: [
      "Validate their feelings. A nightlight or a 'magic' stuffed animal can provide comfort. Keep the pre-bedtime mood calm."
    ]
  },
  {
    pattern: /won't sleep|staying up/i,
    responses: [
      "Limit screen time at least an hour before bed. The blue light can interfere with their natural sleep hormone, melatonin."
    ]
  },
  {
    pattern: /snoring|mouth breathing/i,
    responses: [
      "Occasional snoring is common, but if it's frequent, it might be worth mentioning to a doctor to check for enlarged tonsils."
    ]
  },
  {
    pattern: /sleepwalking|talking in sleep/i,
    responses: [
      "Sleepwalking is usually harmless. Just ensure their environment is safe and gently lead them back to bed."
    ]
  },
  {
    pattern: /waking up early|early bird/i,
    responses: [
      "An 'OK to wake' clock that changes color can help kids understand when it's time to get out of bed."
    ]
  },
  {
    pattern: /co-sleeping|own bed/i,
    responses: [
      "Transitioning to their own bed takes patience. Start with naps in their room and use lots of positive reinforcement."
    ]
  },
  {
    pattern: /room temperature|too hot|too cold/i,
    responses: [
      "The ideal room temperature for sleep is around 18-22°C. Overheating can lead to restless sleep."
    ]
  },
  {
    pattern: /bedwetting|accident/i,
    responses: [
      "Bedwetting is common and usually outgrown. Stay patient and avoid shaming; it's almost always involuntary."
    ]
  },
  {
    pattern: /routine|schedule|daily/i,
    responses: [
      "Visual schedules can help kids feel secure. They love knowing what comes next in their day!"
    ]
  },

  // HEALTH & MEDICAL (10)
  {
    pattern: /fever|temperature|hot/i,
    responses: [
      "For a mild fever, keep them hydrated and dressed in light layers. If it's high or persistent, call your doctor."
    ]
  },
  {
    pattern: /cough|cold|flu/i,
    responses: [
      "Honey can help soothe a cough (for kids over 1 year). Use a saline spray for stuffy noses and keep them rested."
    ]
  },
  {
    pattern: /vomit|stomach ache|diarrhea/i,
    responses: [
      "The main goal is preventing dehydration. Offer small sips of ORS or water frequently. See a doctor if it doesn't improve."
    ]
  },
  {
    pattern: /vaccine|shot|immunization/i,
    responses: [
      "Vaccines are the best way to protect against serious diseases. Keep a digital record of their schedule for easy access."
    ]
  },
  {
    pattern: /headache|pain/i,
    responses: [
      "Occasional headaches can be due to dehydration or eye strain. If they are frequent, a check-up is recommended."
    ]
  },
  {
    pattern: /doctor|pediatrician|hospital/i,
    responses: [
      "Always trust your gut. If something feels wrong, don't hesitate to contact your healthcare provider."
    ]
  },
  {
    pattern: /medicine|dosage|syrup/i,
    responses: [
      "Never give medication without checking the dose for their current weight. Use the measuring tool provided with the medicine."
    ]
  },
  {
    pattern: /injury|fall|bump/i,
    responses: [
      "Clean scrapes with soap and water. For head bumps, watch for vomiting or unusual sleepiness and seek medical help if needed."
    ]
  },
  {
    pattern: /eyes|glasses|vision/i,
    responses: [
      "If your child squints or sits too close to the TV, it might be time for an eye exam. Early detection is key!"
    ]
  },
  {
    pattern: /ears|infection|hearing/i,
    responses: [
      "Ear pulling and irritability can signal an infection. Avoid using cotton swabs inside the ear canal."
    ]
  },

  // GROWTH & DEVELOPMENT (10)
  {
    pattern: /growth|height|weight/i,
    responses: [
      "Children grow in spurts! Focus on overall health and energy levels. You can track their progress on a growth chart."
    ]
  },
  {
    pattern: /talking|speech|language/i,
    responses: [
      "Read to them every day! Narrating your daily activities is a great way to build their vocabulary naturally."
    ]
  },
  {
    pattern: /walking|crawling|motor skills/i,
    responses: [
      "Every child reaches milestones at different times. Plenty of floor time and encouragement are the best supports."
    ]
  },
  {
    pattern: /potty training|toilet/i,
    responses: [
      "Look for signs of readiness, like staying dry for longer periods. Keep it positive and expect a few accidents—it's part of learning!"
    ]
  },
  {
    pattern: /puberty|changes|growing up/i,
    responses: [
      "Start conversations early and use correct terminology. It's important they feel they can come to you with questions."
    ]
  },
  {
    pattern: /milestones|expect/i,
    responses: [
      "Milestones are ranges, not deadlines. Our 'Kids & Growth' forum has great discussions on what to expect at different ages."
    ]
  },
  {
    pattern: /social skills|sharing|friends/i,
    responses: [
      "Playdates are great for learning social cues. Modeling kindness and sharing at home is where it all starts."
    ]
  },
  {
    pattern: /emotions|feelings|sad|angry/i,
    responses: [
      "Help them name their feelings. Saying 'I see you're feeling frustrated' helps them feel understood and learn self-regulation."
    ]
  },
  {
    pattern: /independence|doing it myself/i,
    responses: [
      "Encourage their desire to be independent! Give them simple choices, like which shirt to wear, to build confidence."
    ]
  },
  {
    pattern: /brain development|intelligence/i,
    responses: [
      "Unstructured play is the best brain food! It builds problem-solving skills and creativity far better than any app."
    ]
  },

  // EDUCATION & LEARNING (10)
  {
    pattern: /school|preschool|kindergarten/i,
    responses: [
      "Choosing a school is a big decision. Consider the curriculum (CBSE, ICSE, IB) and the school's environment. Check our forum for parent reviews!"
    ]
  },
  {
    pattern: /homework|study|learning/i,
    responses: [
      "Create a quiet, dedicated space for homework. Focus on the effort they put in rather than just the grades."
    ]
  },
  {
    pattern: /reading|books|literacy/i,
    responses: [
      "Let them choose books that interest them. Reading for pleasure is one of the best habits a child can develop."
    ]
  },
  {
    pattern: /math|numbers|counting/i,
    responses: [
      "Make math fun! Count stairs, measure ingredients while baking, or play board games that involve numbers."
    ]
  },
  {
    pattern: /science|experiments|nature/i,
    responses: [
      "Kids are natural scientists. Encourage their curiosity by exploring the park or doing simple kitchen science experiments."
    ]
  },
  {
    pattern: /exam|test|stress/i,
    responses: [
      "Help them manage exam stress by ensuring they get enough sleep and have a balanced study schedule with plenty of breaks."
    ]
  },
  {
    pattern: /teacher|school problem/i,
    responses: [
      "Maintain a positive relationship with teachers. If there's an issue, approach it as a partnership to help your child succeed."
    ]
  },
  {
    pattern: /creativity|art|drawing/i,
    responses: [
      "Provide plenty of art supplies and let them create without rules. It's the process that matters, not the final product!"
    ]
  },
  {
    pattern: /concentration|focus/i,
    responses: [
      "Limit distractions and break tasks into smaller chunks. Short bursts of focused work are more effective for young minds."
    ]
  },
  {
    pattern: /extracurricular|hobbies|sports/i,
    responses: [
      "Let them try different things! Sports, music, or dance are great for building discipline and finding new passions."
    ]
  },

  // BEHAVIOR & DISCIPLINE (10)
  {
    pattern: /tantrum|meltdown|crying/i,
    responses: [
      "Stay calm yourself first. Sometimes a quiet hug or just being present is more effective than trying to reason during a meltdown."
    ]
  },
  {
    pattern: /discipline|punishment|rules/i,
    responses: [
      "Focus on positive reinforcement. Catch them being good! Clear, consistent boundaries help kids feel safe."
    ]
  },
  {
    pattern: /hitting|biting|aggressive/i,
    responses: [
      "Aggression is often a sign of frustration. Teach them words to express their anger and set a firm 'no hitting' rule."
    ]
  },
  {
    pattern: /lying|dishonesty/i,
    responses: [
      "Young kids often mix fantasy and reality. For older kids, focus on why they felt they needed to lie and encourage honesty."
    ]
  },
  {
    pattern: /screen time|tablet|phone/i,
    responses: [
      "Set clear limits and prioritize 'green time' over 'screen time'. Use high-quality educational content when they do use devices."
    ]
  },
  {
    pattern: /sharing|selfish/i,
    responses: [
      "Sharing is a learned skill. Use 'turn-taking' instead of forcing them to give up a toy immediately."
    ]
  },
  {
    pattern: /listening|won't listen/i,
    responses: [
      "Get down to their eye level before speaking. Keep instructions short and ask them to repeat what you said."
    ]
  },
  {
    pattern: /bored|boredom/i,
    responses: [
      "Boredom is actually good for kids! it sparks creativity and self-reliance. Let them figure out what to do."
    ]
  },
  {
    pattern: /shyness|introvert/i,
    responses: [
      "Respect their temperament. Don't force them into social situations; instead, provide gentle opportunities to engage."
    ]
  },
  {
    pattern: /confidence|self-esteem/i,
    responses: [
      "Praise their effort and resilience, not just their achievements. Feeling capable is the root of true confidence."
    ]
  },
  {
    pattern: /stubborn|defiant/i,
    responses: [
      "Pick your battles! Offer choices within boundaries so they feel some control over their situation."
    ]
  },
  {
    pattern: /sibling|brother|sister|rivalry/i,
    responses: [
      "Try to spend dedicated one-on-one time with each child. Encourage teamwork rather than competition."
    ]
  },
  {
    pattern: /curse|bad word|swearing/i,
    responses: [
      "Often they are just testing the reaction. Stay calm, explain why it's not a nice word, and provide a better alternative."
    ]
  },
  {
    pattern: /money|allowance|spending/i,
    responses: [
      "It's never too early to learn about saving and spending! Use a clear jar so they can see their savings grow."
    ]
  },
  {
    pattern: /safety|danger|stranger/i,
    responses: [
      "Teach them their full name and your phone number early on. Use 'safety circles' to explain who they can trust."
    ]
  },

  // ACTIVITIES & PLAY (5)
  {
    pattern: /outdoor|park|nature/i,
    responses: [
      "Nature is the best playground! It improves mood, focus, and physical health. Aim for at least 30 minutes of outside time daily."
    ]
  },
  {
    pattern: /indoor activities|rainy day/i,
    responses: [
      "Try building a fort, having a living room picnic, or doing a puzzle. Classic games like 'Hide and Seek' never get old!"
    ]
  },
  {
    pattern: /toys|what to buy/i,
    responses: [
      "Open-ended toys like blocks, dolls, and art supplies have the longest play-life. They grow with your child's imagination."
    ]
  },
  {
    pattern: /traveling with kids|flight|car trip/i,
    responses: [
      "Pack plenty of snacks and small, new toys to keep them occupied. A little preparation goes a long way for a smooth journey!"
    ]
  },
  {
    pattern: /holidays|vacation/i,
    responses: [
      "Keep some parts of their routine (like bedtime) consistent even on holiday to help them feel secure and less cranky."
    ]
  },
  {
    pattern: /birthday|party|celebration/i,
    responses: [
      "Keep parties short and sweet for younger kids. Overstimulation is real! A few close friends and a favorite cake are often enough."
    ]
  },
  {
    pattern: /rain|monsoon|umbrella/i,
    responses: [
      "Rainy days are perfect for indoor dens and reading. Just keep an eye on damp clothes to avoid chills!"
    ]
  },
  {
    pattern: /tv|television|shows/i,
    responses: [
      "Co-watching and discussing the show with your child makes screen time much more educational."
    ]
  },
  {
    pattern: /music|singing|dance/i,
    responses: [
      "Music is wonderful for brain development! Have a kitchen dance party—it's great for both of you."
    ]
  },
  {
    pattern: /pets|dog|cat/i,
    responses: [
      "Pets teach empathy and responsibility. Always supervise interactions between young children and animals."
    ]
  },

  // TUCO APP & COMMUNITY (10)
  {
    pattern: /post|discussion|new thread/i,
    responses: [
      "To start a discussion, click the 'New Post' button. You can choose a category and even add an image to get more replies!"
    ]
  },
  {
    pattern: /saved|bookmarks/i,
    responses: [
      "You can find all your saved posts in the 'Saved' section of the sidebar. It's great for keeping track of helpful advice."
    ]
  },
  {
    pattern: /category|categories/i,
    responses: [
      "We have categories for Skincare, Nutrition, Growth, and more! Use them to find specific topics you're interested in."
    ]
  },
  {
    pattern: /helpful|heart|upvote/i,
    responses: [
      "If you find a comment useful, click the heart icon! It lets the other parent know you appreciate their advice."
    ]
  },
  {
    pattern: /notification|alerts/i,
    responses: [
      "Check your notifications to see when someone replies to your post or likes your comment. Stay engaged with the community!"
    ]
  },
  {
    pattern: /search|find/i,
    responses: [
      "Use the search bar at the top to find existing discussions on any topic. Most questions have already been discussed by our amazing parents!"
    ]
  },
  {
    pattern: /hot|trending/i,
    responses: [
      "The 'Hot' section shows you what's currently being discussed most in the community. It's a great way to see what's trending."
    ]
  },
  {
    pattern: /logout|log out|sign out/i,
    responses: [
      "You can log out from the sidebar. We'll be here whenever you're ready to come back!"
    ]
  },
  {
    pattern: /badge|trust score|trusted/i,
    responses: [
      "Earn badges and increase your Trust Score by being active and helpful! Our top members get special 'Insider' status."
    ]
  },
  {
    pattern: /tuco products|recommendations/i,
    responses: [
      "Check out 'Recommended Picks' for products that parents in our community love and trust. Safe, natural, and Tuco-approved!"
    ]
  }
];

export function getFallbackResponse(userInput: string): string {
  const text = userInput.toLowerCase();
  console.log('ChatBot Fallback searching for:', text);
  
  // Find the first rule that matches
  const rule = fallbackRules.find(r => r.pattern.test(text));
  
  if (rule) {
    console.log('ChatBot Fallback matched rule:', rule.pattern);
    // Pick a random response from the matches
    return rule.responses[Math.floor(Math.random() * rule.responses.length)];
  }
  
  console.log('ChatBot Fallback: No match found, using default.');
  // Default response if no match
  return "That's a great question! While I'm in offline mode, I'm a bit limited, but I recommend checking out our categories in the sidebar to see what other parents are saying about this topic. You can also start a new post to get advice from the community!";
}
