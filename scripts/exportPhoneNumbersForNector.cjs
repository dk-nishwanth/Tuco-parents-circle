// Nector's leads API confirmed (tested live against production) to NOT
// support adding/updating a mobile number on a lead that already exists —
// both a re-POST to /leads and their documented PUT /leads/:id return
// 200/success but leave metadetail.mobile untouched. So a phone number
// added via the forum profile AFTER a person's lead was already created
// (which is true for every one of the 752 backfilled users, and anyone who
// signs up without a phone and adds one later) never reaches Nector through
// the API.
//
// The practical workaround is Nector's own "Import or Bulk Edit Data" CSV
// upload, under Customer Data in the merchant dashboard. This script
// generates that CSV from our DB — every user who has a phone number saved
// with us — for periodic manual upload there. Check Nector's own template/
// column-name requirements in that screen before uploading; adjust the
// header row below to match if theirs differs.
//
// Usage: node scripts/exportPhoneNumbersForNector.cjs > phones.csv
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const SYSTEM_USER_EMAIL = 'seed@tucokids.internal';

(async () => {
  const users = await prisma.user.findMany({
    where: { email: { not: SYSTEM_USER_EMAIL }, phone: { not: null } },
    select: { id: true, phone: true, email: true },
  });

  console.error(`${users.length} users have a phone number on file.`);
  console.log('customer_id,mobile,country,email');
  for (const u of users) {
    console.log(`${u.id},${u.phone},ind,${u.email}`);
  }
  await prisma.$disconnect();
})();
