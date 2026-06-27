'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '../lib/db';

// 1. إضافة سنة مالية جديدة لموظف (مثلاً عند تدوير الأرصدة لدخول سنة جديدة)
export async function createYearlyBalance(employeeId, year, daysGranted = 50) {
  try {
    const balance = await prisma.yearlyBalance.create({
      data: {
        employeeId: parseInt(employeeId),
        year,
        daysGranted: parseInt(daysGranted),
        daysRemaining: parseInt(daysGranted)
      }
    });
    revalidatePath('/dashboard');
    return { success: true, balance };
  } catch (error) {
    return { success: false, error: "السنة المالية مسجلة بالفعل لهذا الموظف" };
  }
}

// 2. تحديث رصيد متبقي لسنة معينة يدوياً (للتصحيحات الإدارية)
export async function updateYearlyBalance(id, daysRemaining) {
  try {
    const updated = await prisma.yearlyBalance.update({
      where: { id: parseInt(id) },
      data: { daysRemaining: parseInt(daysRemaining) }
    });
    revalidatePath('/dashboard');
    return { success: true, updated };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 3. حذف رصيد سنة معينة
export async function deleteYearlyBalance(id) {
  try {
    await prisma.yearlyBalance.delete({
      where: { id: parseInt(id) }
    });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}