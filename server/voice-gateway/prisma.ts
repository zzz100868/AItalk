import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as typeof globalThis & {
  voiceGatewayPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.voiceGatewayPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.voiceGatewayPrisma = prisma;
}
