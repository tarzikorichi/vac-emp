'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../lib/db';


// 1. إضافة موظف جديد وتوليد أرصدة أولية له تلقائياً
export async function createEmployee(employeeData) {

  const { name, department, position, isSpecialRole } = employeeData;
  const currentYear = new Date().getFullYear().toString();
  try {
    const employee = await prisma.employee.create({
      data: {
        name,
        department,
        position,
        isSpecialRole,
        // عند إضافة موظف جديد، نفتح له رصيد السنة الحالية تلقائياً (50 يوم)
        yearlyBalances: {
          create: [
            { year: currentYear, daysGranted: 50, daysRemaining: 50 }
          ]
        }
      }
    });

    revalidatePath('/dashboard/employees');
    return { success: true, employee };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 2. جلب جميع الموظفين مع أرصدتهم وسجل عطلهم
export async function getAllEmployees() {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        yearlyBalances: true,
        leaveRequests: true
      },
      orderBy: { id: 'desc' }
    });
    return { success: true, data: employees };
  } catch (error) {
    console.error("فشل جلب الموظفين:", error);
    return { success: false, error: error.message };
  }
}

// 3. تعديل بيانات موظف حالي
export async function updateEmployee(id, updateData) {
  try {
    const updated = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: {
        name: updateData.name,
        department: updateData.department,
        position: updateData.position,
        isSpecialRole: updateData.isSpecialRole,
        exceptionalLeaveBalance: parseInt(updateData.exceptionalLeaveBalance || 0)
      }
    });

    revalidatePath('/dashboard/employees');
    return { success: true, updated };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 4. حذف موظف نهائياً من النظام (مع حذف أرصدته وسجلاته بفضل Cascade)
export async function deleteEmployee(id) {
  try {
    await prisma.employee.delete({
      where: { id: parseInt(id) }
    });

    revalidatePath('/dashboard/employees');
    return { success: true, message: "تم حذف الموظف وكل سجلاته بنجاح" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getAllEmployeesForLeaveRegistration() {
  try {
    // أ. نجلب البيانات الخام من Prisma مع تضمن العلاقات اللازمة
    const employeesRaw = await prisma.employee.findMany({
      include: {
        yearlyBalances: true, // ضرورية جداً لحساب الأرصدة
        // leaveRequests: true // قد لا نحتاجها في هذه الصفحة حالياً
      },
      orderBy: { id: 'desc' }
    });

    // 💡 ب. نقوم بعملية التحويل (Transformation) على السيرفر

    // 1. نحدد السنوات التي تمثل "آخر عامين".
    // هذا يعتمد على منطق تاريخ اليوم ( June 26, 2026).
    // نفترض أن السنة المالية الحالية هي '2026' والسابقة هي '2025'.
    const currentYearStr = "2026";
    const previousYearStr = "2025";
    const lastTwoYears = [currentYearStr, previousYearStr];

    // 2. نقوم بمسح (Map) الموظفين الخام وتوليد مصفوفة جديدة بالشكل المطلوب للواجهة
    const transformedEmployees = employeesRaw.map(emp => {
      
      // 📐 حساب: annualDaysLastTwoYears (مجموع الأيام المتبقية في آخر عامين محددين)
      const annualDaysLastTwoYears = emp.yearlyBalances
        .filter(balance => lastTwoYears.includes(balance.year)) // نأخذ السنتين الأخيرتين فقط
        .reduce((sum, balance) => sum + balance.daysRemaining, 0); // نجمع الأيام المتبقية فيهما

      // 📐 حساب: exceptionalDaysOlder (مجموع الأيام المتبقية في *أي سنة أخرى* أقدم)
      const exceptionalDaysOlder = emp.yearlyBalances
        .filter(balance => !lastTwoYears.includes(balance.year)) // نأخذ أي سنة ليست من العامين الأخيرين
        .reduce((sum, balance) => sum + balance.daysRemaining, 0); // نجمع أيامها

      // نعيد كائن الموظف الأصلي مع إضافة الحقول المحسوبة الجديدة
      return {
        ...emp,
        annualDaysLastTwoYears, // 👈 هذا هو الحقل الذي تنتظره الواجهة في الـ col-span-2
        exceptionalDaysOlder,   // 👈 وهذا أيضاً
      };
    });

    return { success: true, data: transformedEmployees };
  } catch (error) {
    console.error("فشل جلب وتحويل بيانات الموظفين للعطل:", error);
    return { success: false, error: error.message };
  }
}


// for historical migration of employees from paper records to the database

export async function runHistoricalMigration() {
  'use server';

  // 📝 ضع هنا سجل الموظفين الورقي الحقيقي الخاص بك
  const employeesToMigrate = [
  {
    name: "HAMOUDI IKRAM",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BENYAMMI ZINEB",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "SANHADJA FATIMA ZAHRAA",
    department: "Service d'hémodialyse",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "SEOUALMIA AYA",
    department: "Service d'hémodialyse",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "LALLOUT MARIA",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "KAHOUL HADJER",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BOUSLAMA Chahrazed",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BOUKAOUS Assia",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "HENNOUS Dikra",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BOUHBILA Zibouda",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "HAMMADI ASMA",
    department: "Urgence medical",
    position: "Médecin généraliste en chef de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "Bedjloud ismail",
    department: "Service d'Épidémiologie et de Médecine Préventive",
    position: "Médecin généraliste en chef de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BOUCHLAGHEM FATIHA",
    department: "Unité Contre la Tuberculose et les Maladies Respiratoires",
    position: "Médecin généraliste principal de santé publique",
    isSpecialRole: true,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "Djilali Imane",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "Djilali Lalia",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "Sahari Narimane",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "Djaber Wiam",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "Bendib Asma",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "Sid Maroua",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "Chemani Abdelbasset",
    department: "Service de médecine du travail",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "LATRECHE AHMED TAHA",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "Maachi Salaheddin",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "HADEF SOULAFA",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BERRAHAIL FERIEL",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "OURACI ABIR",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "LECHEHEB HASNA",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BASLIMANE Manal",
    department: "Urgence medical",
    position: "Médecin généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  }
];

  try {
    console.log("⏳ جاري بدء ترحيل البيانات الحقيقية...");
    
    for (const emp of employeesToMigrate) {
      await prisma.employee.create({
        data: {
          name: emp.name,
          department: emp.department,
          position: emp.position,
          isSpecialRole: emp.isSpecialRole,
          yearlyBalances: {
            create: emp.balances.map(b => ({
              year: b.year,
              daysGranted: 50,
              daysRemaining: parseInt(b.daysRemaining)
            }))
          }
        }
      });
    }

    return { success: true, message: `تم ترحيل ${employeesToMigrate.length} موظف بنجاح!` };
  } catch (error) {
    console.error("خطأ أثناء الترحيل:", error);
    return { success: false, error: error.message };
  }
}



