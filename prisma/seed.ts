import { PrismaClient } from '@prisma/client';

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
      name: 'Tuco Mineral Sunscreen SPF 50+',
      icon: '☀️',
      subtitle: 'Gentle for sensitive skin',
      tag: 'Trending',
      price: '₹499',
      linkUrl: 'https://example.com/sunscreen'
    },
    {
      id: 'moisturizer',
      name: 'Tuco Baby Moisturizer',
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
