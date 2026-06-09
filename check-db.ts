
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking Neon database...');
  console.log('');

  console.log('📊 Users:');
  const users = await prisma.user.findMany();
  console.log(users.length, 'users found');
  users.forEach(u => {
    console.log('-', u.id, u.username, u.email);
  });
  console.log('');

  console.log('💬 Conversations:');
  const convos = await prisma.conversation.findMany({ include: { replies: true } });
  console.log(convos.length, 'conversations found');
  convos.forEach(c => {
    console.log('-', c.id, c.title, c.category, `(${c.replies.length} replies)`);
  });
  console.log('');

  console.log('📝 Replies:');
  const replies = await prisma.reply.findMany();
  console.log(replies.length, 'replies found');
  console.log('');

  console.log('🏷️ Categories:');
  const cats = await prisma.category.findMany();
  console.log(cats.length, 'categories found');
  cats.forEach(c => {
    console.log('-', JSON.stringify(c, null, 2));
  });
  console.log('');

  console.log('🎉 Products:');
  const products = await prisma.product.findMany();
  console.log(products.length, 'products found');
  console.log('');

  console.log('🔔 Notifications:');
  const notifs = await prisma.notification.findMany();
  console.log(notifs.length, 'notifications found');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
