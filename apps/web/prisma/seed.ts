import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create a user with the 'admin' role
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin', // This role is defined in your schema
    },
  });
  console.log(`Created admin user: ${admin.email}`);
}

main(); // Run the function