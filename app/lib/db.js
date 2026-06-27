// app/lib/db.js
import { PrismaClient } from '../generated/prisma';

const globalForPrisma = global;

// التأكد من عدم إنشاء العميل أكثر من مرة في بيئة التطوير
export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;