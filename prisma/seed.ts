import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed Categories
  const categories = [
    {
      id: 'skincare',
      label: 'Skincare, haircare & personal care',
      icon: '🧴',
      className: 'skincare',
      bg: '#FFF0E8',
      text: '#D84315',
      border: '#FFD8C2'
    },
    {
      id: 'school',
      label: 'School & Learning',
      icon: '📚',
      className: 'school',
      bg: '#FEE8F4',
      text: '#880E4F',
      border: '#FDBBDD'
    },
    {
      id: 'kids_growth',
      label: 'Kids & Growth',
      icon: '🌱',
      className: 'kids_growth',
      bg: '#EAF7F0',
      text: '#1B5E20',
      border: '#C7EED8'
    },
    {
      id: 'active_kids',
      label: 'Active Kids',
      icon: '🏃',
      className: 'active_kids',
      bg: '#E8F3FF',
      text: '#0D47A1',
      border: '#C4E1FF'
    },
    {
      id: 'parenting_hacks',
      label: 'Parenting Hacks',
      icon: '💡',
      className: 'parenting_hacks',
      bg: '#F1F9F1',
      text: '#2E7D32',
      border: '#D3ECD5'
    }
  ];

  // Upsert categories
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    });
    console.log(`✅ Seeded category: ${cat.label}`);
  }

  // Seed Products
  const products = [
    {
      id: 'sunscreen',
      name: 'tuco Mineral Sunscreen SPF 50+',
      icon: '☀️',
      subtitle: 'Gentle for sensitive skin',
      tag: 'Trending',
      price: '₹499',
      linkUrl: 'https://example.com/sunscreen'
    },
    {
      id: 'moisturizer',
      name: 'tuco Baby Moisturizer',
      icon: '🧴',
      subtitle: 'Dermatologist-tested',
      tag: 'Best Seller',
      price: '₹399',
      linkUrl: 'https://example.com/moisturizer'
    }
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { id: prod.id },
      update: {},
      create: prod,
    });
    console.log(`✅ Seeded product: ${prod.name}`);
  }

  // Seed demo user if none
  let seedUser = await prisma.user.findUnique({ where: { email: 'demo@tucokids.com' } });
  if (!seedUser) {
    const passwordHash = await bcrypt.hash('password123', 12);
    seedUser = await prisma.user.create({
      data: {
        email: 'demo@tucokids.com',
        passwordHash,
        username: 'DemoParent',
        city: 'Mumbai',
        childAge: '5 years',
        role: 'MEMBER',
        isVerified: true,
        trustScore: 50,
        savedPosts: [],
      },
    });
    console.log(`✅ Seeded user: ${seedUser.username}`);
  }

  // Seed moderator user if none
  let seedMod = await prisma.user.findUnique({ where: { email: 'moderator@tucokids.com' } });
  if (!seedMod) {
    const passwordHash = await bcrypt.hash('password123', 12);
    seedMod = await prisma.user.create({
      data: {
        email: 'moderator@tucokids.com',
        passwordHash,
        username: 'CircleMod',
        city: 'Mumbai',
        childAge: '5 years',
        role: 'MODERATOR',
        isVerified: true,
        trustScore: 100,
        savedPosts: [],
      },
    });
    console.log(`✅ Seeded moderator: ${seedMod.username}`);
  }

  // Seed initial conversations if none
  const existingConversations = await prisma.conversation.count();
  if (existingConversations === 0) {
    const INITIAL_CONVERSATIONS = [
      {
        title: 'Best sunscreen for outdoor cricket this summer?',
        category: 'skincare',
        isPinned: true,
        isHot: true,
        votes: 142,
        views: 1856,
        op: {
          author: 'Priya_Rao',
          city: 'Mumbai',
          time: '2 days ago',
          text: 'My 8-year-old son plays cricket outdoors every single evening and on weekends it\'s 4+ hours of direct sun. I\'ve been using a random adult sunscreen on him but I\'m not confident it\'s safe. Which sunscreen actually works for Indian kids in this heat? He sweats a lot so worried it wipes off too quickly. SPF 30 or 50? Mineral or chemical?',
        },
        replies: [
          {
            author: 'AnanyaK',
            city: 'Bangalore',
            time: '2 days ago',
            text: 'Same exact situation with my 9-year-old! We\'ve been through 5–6 sunscreens. The key for sporty kids is water/sweat resistance. We now use tuco\'s Daily Shield SPF 50 — it\'s specifically made for Indian kids, non-greasy, and actually stays on through a full practice session. Mineral-based so no chemicals to worry about.',
            tucoRec: 'sunscreen',
            likes: 12,
          },
          {
            author: 'MeeraSingh',
            city: 'Pune',
            time: '2 days ago',
            text: 'SPF 50 is definitely better for sustained outdoor play. SPF 30 filters about 97% UVB, SPF 50 filters 98%+ — sounds small but for 4 hours of sun it matters. Also reapplication every 2 hours is non-negotiable regardless of which brand you use.',
            likes: 8,
          },
        ],
      },
      {
        title: 'My 5-year-old has dry flaky patches on cheeks — mild eczema or something else?',
        category: 'skincare',
        isPinned: false,
        isHot: true,
        votes: 89,
        views: 1200,
        op: {
          author: 'SnehaVerma',
          city: 'Delhi',
          time: '3 days ago',
          text: 'My 5-year-old daughter has these dry, slightly flaky patches on her cheeks — especially after bathing. They\'ve been there since winter and now in summer they haven\'t gone away. The skin isn\'t red or itchy but it looks rough. Our paediatrician said it\'s mild eczema-prone skin. What moisturiser should I be using? Should I be bathing her less frequently?',
        },
        replies: [
          {
            author: 'DeepikaSharma',
            city: 'Jaipur',
            time: '3 days ago',
            text: 'My son had the exact same thing! Dermat explained that bath water (especially hard water) strips natural oils from kids\' skin. The key is: lukewarm water, not hot; 5–7 minute baths max; pat dry — never rub; and moisturiser within 3 minutes of bath while skin is still slightly damp. That window is crucial.',
            likes: 10,
          },
          {
            author: 'AnanyaK',
            city: 'Bangalore',
            time: '2 days ago',
            text: 'We use tuco\'s Nourish Night Moisturiser on my daughter\'s cheeks — it was recommended by our paed dermat for eczema-prone kids. Fragrance-free, no parabens. Within 2 weeks the flakiness reduced noticeably. It has ceramides which help repair the skin barrier.',
            tucoRec: 'moisturizer',
            likes: 14,
          },
        ],
      },
    ];

    const conversationMap = new Map<string, number>();
    for (const conv of INITIAL_CONVERSATIONS) {
      const createdConv = await prisma.conversation.create({
        data: {
          title: conv.title,
          category: conv.category,
          isPinned: conv.isPinned,
          isHot: conv.isHot,
          isFeatured: false,
          featuredLabel: null,
          votes: conv.votes,
          views: conv.views,
          opAuthor: conv.op.author,
          opCity: conv.op.city,
          opTime: conv.op.time,
          opText: conv.op.text,
          opImage: null,
          opAuthorRole: 'MEMBER',
          opAuthorBadges: [],
          moderationStatus: 'APPROVED',
          authorId: seedUser.id,
          greyAreaFlags: [],
          reviewPriority: 50,
        },
      });
      conversationMap.set(conv.title, createdConv.id);
      console.log(`✅ Seeded conversation: ${conv.title}`);
    }

    for (const conv of INITIAL_CONVERSATIONS) {
      const dbConvId = conversationMap.get(conv.title)!;
      for (const reply of conv.replies) {
        await prisma.reply.create({
          data: {
            conversationId: dbConvId,
            author: reply.author,
            authorId: seedUser.id,
            city: reply.city,
            time: reply.time,
            text: reply.text,
            image: null,
            likes: reply.likes,
            authorRole: 'MEMBER',
            authorBadges: [],
            moderationStatus: 'APPROVED',
          },
        });
      }
    }
  }

  console.log('🎉 Database seeding complete!');
}

main()
  .catch(e => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
