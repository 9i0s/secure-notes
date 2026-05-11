import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node prisma/seed-admin.js <email>");
    process.exit(1);
  }

  const user = await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { role: "ADMIN" },
    select: { id: true, email: true, role: true },
  });

  console.log("Promoted to ADMIN:", user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());