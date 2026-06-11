
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDatabase() {
  console.log('🔍 Connecting to Neon database...\n');

  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Connected to Neon database!\n');

    // List all tables and their row counts
    const tables = [
      { name: 'User', model: prisma.user },
      { name: 'Conversation', model: prisma.conversation },
      { name: 'Reply', model: prisma.reply },
      { name: 'Vote', model: prisma.vote },
      { name: 'Notification', model: prisma.notification },
      { name: 'ModerationLog', model: prisma.moderationLog },
      { name: 'ChatSession', model: prisma.chatSession },
      { name: 'ChatMessage', model: prisma.chatMessage },
      { name: 'Category', model: prisma.category },
      { name: 'Product', model: prisma.product },
      { name: 'EmailLog', model: prisma.emailLog },
    ];

    console.log('📊 Table row counts:');
    for (const table of tables) {
      // @ts-ignore - dynamic model access
      const count = await table.model.count();
      console.log(`   • ${table.name}: ${count} rows`);
    }

    console.log('\n📋 Sample data check:');
    // Check if categories are seeded
    const categories = await prisma.category.findMany({ take: 3 });
    if (categories.length > 0) {
      console.log('\n✅ Categories seeded successfully:');
      categories.forEach(cat => console.log(`   • ${cat.label}`));
    }

    // Check if products are seeded
    const products = await prisma.product.findMany({ take: 3 });
    if (products.length > 0) {
      console.log('\n✅ Products seeded successfully:');
      products.forEach(prod => console.log(`   • ${prod.name}`));
    }

    // Check nested replies structure if any
    const replies = await prisma.reply.findMany({
      where: { parentId: { not: null } },
      include: { parent: true },
      take: 2,
    });
    if (replies.length > 0) {
      console.log('\n✅ Nested replies structure verified:');
      console.log(`   • Found ${replies.length} nested replies`);
    }

    console.log('\n🎉 All tables present and operational!');
  } catch (error) {
    console.error('❌ Database verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();

