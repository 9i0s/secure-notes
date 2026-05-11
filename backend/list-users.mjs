import prisma from './src/utils/prisma.js';
const users = await prisma.user.findMany({ select: { email: true, googleId: true, githubId: true, role: true } });
console.log(JSON.stringify(users, null, 2));
await prisma.$disconnect();
