import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Seed Admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { role: UserRole.ADMIN },
    create: {
      email: "admin@example.com",
      role: UserRole.ADMIN,
    },
  });
  console.log(`✓ Admin user ready: ${admin.email} (ID: ${admin.id})`);

  // Seed Customer user
  const customer = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: { role: UserRole.CUSTOMER },
    create: {
      email: "customer@example.com",
      role: UserRole.CUSTOMER,
    },
  });
  console.log(`✓ Customer user ready: ${customer.email} (ID: ${customer.id})`);

  console.log("Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during database seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

