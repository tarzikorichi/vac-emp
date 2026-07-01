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
        recognitionBalance: parseInt(updateData.recognitionBalance || 0)
      }
    });

    revalidatePath('/dashboard/employees');
    return { success: true, updated };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateEmployeeRecognitionBalance(id, recDays) {
  console.log('ffffffffffffffffffff: ', id, recDays)
  try {
    const updated = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: {
        recognitionBalance: parseInt(recDays || 0)
      }
    });

    revalidatePath('/dashboard/Reconnaissance');
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
        leaveRequests: true // قد لا نحتاجها في هذه الصفحة حالياً
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
      // const annualDaysLastTwoYears = emp.yearlyBalances
      //   .filter(balance => lastTwoYears.includes(balance.year)) // نأخذ السنتين الأخيرتين فقط
      //   .reduce((sum, balance) => sum + balance.daysRemaining, 0); // نجمع الأيام المتبقية فيهما

      // // 📐 حساب: exceptionalDaysOlder (مجموع الأيام المتبقية في *أي سنة أخرى* أقدم)
      // const exceptionalDaysOlder = emp.yearlyBalances
      //   .filter(balance => !lastTwoYears.includes(balance.year)) // نأخذ أي سنة ليست من العامين الأخيرين
      //   .reduce((sum, balance) => sum + balance.daysRemaining, 0); // نجمع أيامها

      const totalAnnualBalance = emp.yearlyBalances.reduce(
        (sum, balance) => sum + balance.daysRemaining,
        0
      );

      // نعيد كائن الموظف الأصلي مع إضافة الحقول المحسوبة الجديدة
      return {
        ...emp,
        totalAnnualBalance
        // annualDaysLastTwoYears, // 👈 هذا هو الحقل الذي تنتظره الواجهة في الـ col-span-2
        // exceptionalDaysOlder,   // 👈 وهذا أيضاً
      };
    });

    return { success: true, data: transformedEmployees };
  } catch (error) {
    console.error("فشل جلب وتحويل بيانات الموظفين للعطل:", error);
    return { success: false, error: error.message };
  }
}



// for balances page 
export async function getEmployeesHistoricalBalances() {
  try {
    // 1. جلب الموظفين وتضمين جدول الأرصدة السنوية الخاص بهم تلقائياً
    const employees = await prisma.employee.findMany({
      include: {
        yearlyBalances: true 
      },
      orderBy: { name: 'asc' }
    });

    // 2. معالجة وتوزيع الأرصدة بدقة من جدولها الفعلي
    const result = employees.map(emp => {
      
      // دالة مساعدة للبحث داخل الأرصدة المخزنة للموظف بناءً على أرقام السنة
      const getDaysFromTable = (yearDigits) => {
        const record = emp.yearlyBalances.find(yb => yb.year.includes(yearDigits));
        // إذا وجد السجل المالي للسنة نأخذ الأيام المتبقية منه، وإلا نضع 50 كوضع افتراضي
        return record ? record.daysRemaining : 50;
      };

      // جلب الأيام بدقة مذهلة بناءً على السجلات الحقيقية في قاعدة البيانات
      const balance2026 = getDaysFromTable('26'); // تطابق "2026" أو "25/26"
      const balance2025 = getDaysFromTable('25'); // تطابق "2025" أو "24/25"
      const balance2024 = getDaysFromTable('24'); // تطابق "2024" أو "23/24"
      const balance2023 = getDaysFromTable('23'); // تطابق "2023" أو "22/23"

      return {
        id: emp.id,
        name: emp.name,
        position: emp.position || '—',
        department: emp.department || '—',
        
        // الأيام المتبقية للسنة الحالية 2026
        daysRemaining: balance2026,

        // توزيع الأعمدة للجدول بالتوافق مع الـ State في الواجهة
        y2026: balance2026,
        y2025: balance2025,
        y2024: balance2024,
        y2023: balance2023,
      };
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Erreur lors du chargement des soldes:", error);
    return { success: false, data: [] };
  }
}


export async function getUniqueDepartments() {
  const result = await prisma.employee.groupBy({
    by: ['department'],
    _count: {
      department: true,
    },
    orderBy: {
      department: 'asc', // Keeps them alphabetically sorted for your select dropdown
    },
  });

  // Map it to return a clean string array: ['Administration', 'Radiologie', ...]
  return result.map(item => item.department);
}

// when click on +/- 
export async function updateEmployeeYearlyBalance(employeeId, yearKey, newDays) {
  try {
    // استخراج رقم السنة المستهدفة من المفتاح (مثال: y2026 تصبح "26")
    const yearDigits = yearKey.replace('y', '').substring(2); 

    // البحث عن السجل المالي لهذه السنة بالتحديد للموظف المعني
    const existingBalance = await prisma.yearlyBalance.findFirst({
      where: {
        employeeId: parseInt(employeeId),
        year: { contains: yearDigits }
      }
    });

    if (existingBalance) {
      // إذا كان السجل موجوداً، نقوم بتحديث الأيام المتبقية فوراً
      await prisma.yearlyBalance.update({
        where: { id: existingBalance.id },
        data: { daysRemaining: newDays }
      });
    } else {
      // احتياطياً: إذا لم يكن السجل موجوداً في قاعدة البيانات، نقوم بإنشائه تلقائياً
      const fullYear = parseInt(yearKey.replace('y', ''));
      const generatedYearName = `${fullYear - 1 - 2000}/${fullYear - 2000}`; // ينتج صيغة "25/26"

      await prisma.yearlyBalance.create({
        data: {
          employeeId: parseInt(employeeId),
          year: generatedYearName,
          daysGranted: 50,
          daysRemaining: newDays
        }
      });
    }

    return { success: true};
  } catch (error) {
    console.error("Mise à jour du solde échouée:", error);
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
  },
  {
    name: "DEKHINISSA SARAH",
    department: "Soins dentaires",
    position: "Chirurgien-dentiste généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "SAYAH BEN AISSA IMEN",
    department: "Soins dentaires",
    position: "Chirurgien-dentiste généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "HADJADJ YACINE",
    department: "Soins dentaires",
    position: "Chirurgien-dentiste généraliste en chef de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "ANGRI BILAL",
    department: "Soins dentaires",
    position: "Chirurgien-dentiste généraliste principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BASLIMANE Zineb",
    department: "Soins dentaires",
    position: "Pharmacien généraliste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "LAIDI LOUBNA",
    department: "Soins dentaires",
    position: "Pharmacien généraliste principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "LASSAKEUR ZAKARIA",
    department: "Vieux ksar",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "HADDAUI KHADIDJA",
    department: "Vieux ksar",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "Lakhnache sofiane",
    department: "Medicine de travail",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "Chouireb khawla",
    department: "Belle vue",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "Chouireb zineb",
    department: "Baalich mazouz",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHAACHIA FATIHA",
    department: "SEMEP",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BENSEGHIR MAROUA",
    department: "Détachée",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "DABOUZ BAKIR",
    department: "Chikh ameur",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BELMALIANI IMAN",
    department: "Mise en dispo",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "OULAD MILOUD SIHAM",
    department: "Baalich mazouz",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "KACIOUSSALAH BRAHIM",
    department: "Urgence medical",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "LAKHENACHE ISMAHAN",
    department: "Service de radiologie",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "DJOUHRI IBTISSAM",
    department: "Mise en dispo",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHETTOUH FATIMA CHAIMA",
    department: "Service d'hémodialyse",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHANA MOHAMED",
    department: "Vieux ksar",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BEKAIRI ABDERRAOUF NAILI",
    department: "Urgence medical",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "GUESMIA KHOULOUD",
    department: "Vieux ksar",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BELLAKHDER SARAH",
    department: "Urgence medical",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "KAHLOUL MAROUA",
    department: "UDS",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "NETTACHE YASMIN",
    department: "Détachée",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BENREMILI EL ALIA",
    department: "Urgence medical",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHETTOUH KHOULOUD",
    department: "Service d'hémodialyse",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "HEMAZA YAMINA",
    department: "Urgence medical",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "NAADJA MANSOURA",
    department: "Belle vue",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "NAAS HANNIA",
    department: "ElMadagh",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "RGHIS FATIMA EZZAHRAA",
    department: "Baalich mazouz",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "ZITOUT HANAA",
    department: "UDS",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BELAAMRI ZINEB",
    department: "Détachée",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "KASMI ABDERRAHMAN",
    department: "Urgence medical",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BENYAMMI AHMED RAFIK",
    department: "Vieux ksar",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "SAIFIA AHMED",
    department: "Détachée",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "MEDJELIDA BRAHIM",
    department: "Urgence medical",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "MECHAT ABDERRAHMAN",
    department: "Medicine de travail",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BEKIRI MOHAMMED NAILI",
    department: "Mise en dispo",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "Bekiri Oumelkhair",
    department: "Baalich mazouz",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BOUFRIDI FERYAL",
    department: "Baalich mazouz",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "SBAA MONIR",
    department: "Urgence medical",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BOTOULA BASAID",
    department: "Urgence medical",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "MOURED AHMED",
    department: "Urgence medical",
    position: "Aide-soignant de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHEBHA ABDELLAHE",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "ELAKHECHE ABDELKADER BEN AHMED",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHEBHA TOUFIK",
    department: "ElMadagh",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "NAASS ABDELKADER",
    department: "Baalich mazouz",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "MOURED SMAHI",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BOUELAM AISSA",
    department: "Service d'hémodialyse",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "MECHAT HAMZA",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "DKHEINISSA SOUAD",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "HOBBI ZINEB",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "DJALMAMI OUM KALTHOUM",
    department: "Chikh ameur",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHEBHA ABDELKADER",
    department: "Service d'hémodialyse",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "KAROUCHI LHADJ",
    department: "Service de radiologie",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "MOURED YACINE",
    department: "Service d'hémodialyse",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "KASI MOUSSA AICHA",
    department: "Medicine de travail",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BOUSSEDDIK MOUNIR",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "OULAD MULOUD SMAHI",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "ZIAT CHEIKHA",
    department: "Vieux ksar",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BEN ABDELLAHE YAMINA",
    department: "Pharmacie Centrale",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "HACHANI DJAMAL",
    department: "Service d'hémodialyse",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "SAIFIA MOHAMMED ELAMINE",
    department: "Belle vue",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "ZITOUT BEN HARZELLAHE",
    department: "Service d'hémodialyse",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "AZEIZ HANAN",
    department: "Service d'hémodialyse",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BOUSSETTA LAMIAE",
    department: "ElMadagh",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BEN CHEKKAL SOLEIMAN",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BOUTASSOUNA MBARKA",
    department: "Medicine de travail",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "MAHDI SOUFIANE",
    department: "ElMadagh",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BOUELAM DJAMAL BEN RAHMOUN",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BAOUCHI BAYA",
    department: "Chikh ameur",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "KALOU SALEH",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "OMAR AYOUB MOUSSA",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "ZEMMIT ABDERRAHMANE",
    department: "Baalich mazouz",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "KASI MOUSSA OMAR",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHEMENI SAID",
    department: "Medicine de travail",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "HOBBI ABDERRAZAK",
    department: "Vieux ksar",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "KASI MOUSSA MOUNIR",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "SEREIFIH TAYAB",
    department: "Pharmacie Centrale",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHEUIREB FATNA",
    department: "ElMadagh",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "OULAD ALI SAEIH",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "LAEOUAR MOHAMMED ELALMI",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BEN DJREID FATIMA ZAHRAE",
    department: "Détachée",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "ELAKHECHE ABDELKADER BEN LAID",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "GUESMIA SALIHA",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "GREEN IMANE",
    department: "Pharmacie Centrale",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "MOUSSELMAL FAFFA",
    department: "Pharmacie Centrale",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "DABOUZ HAMZA",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHEUIREB ABDELMALEK",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BOUKRAA AYOUB",
    department: "Medicine de travail",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHAACHIA ABDELKARIM",
    department: "Service d'hémodialyse",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BEN YAMI BAHMED",
    department: "Vieux ksar",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BEDIRINA MOHAMED",
    department: "Détachée",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BAHEDDI MAMMA",
    department: "Service d'hémodialyse",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "MADKOUR MOKHTARIA",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "DAGHOUR TOUFIK",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "MHAMMEDI FATNA",
    department: "Baalich mazouz",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "ZEMMIT SAYAH",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "HACHANI ABDERAHMMANE",
    department: "Pharmacie Centrale",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BEKKAIR HADJ BELKACEM",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "LAKHAL YACINE",
    department: "Baalich mazouz",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "MADJLIDA LAKHDER",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "LATRACH MAASOUD",
    department: "Détachée",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "ZEMMIT BRAHIM",
    department: "Urgence medical",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "NOURRI ABDERAHMANE",
    department: "Service d'hémodialyse",
    position: "Aide-soignant principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BENACHAR MOHAMMED",
    department: "Urgence medical",
    position: "Infirmier de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHOUIREB NOUREDDINE",
    department: "Belle Vue",
    position: "Infirmier de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHELAT MERIAMA",
    department: "Service d'hémodialyse",
    position: "Infirmier de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHOUIREB ABDELLAH",
    department: "Urgence medical",
    position: "Infirmier de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BAOUCHI YASMINA",
    department: "Urgence medical",
    position: "Infirmier de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "OULAD DAOUED ASMA",
    department: "Urgence medical",
    position: "Infirmier de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHEMENI ABDENOUR",
    department: "Mise en dispo",
    position: "Infirmier de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "OULAD DAOUED RADIA",
    department: "Détachée",
    position: "Infirmier de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "ZITOUT SAMIA",
    department: "Urgence medical",
    position: "Infirmier de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "GUERGUER SAFA",
    department: "Urgence medical",
    position: "Infirmier de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "OULAD SIDI ECHIKH KHADIDJA",
    department: "Urgence medical",
    position: "Infirmier de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BEDJLOUD NACER",
    department: "Urgence medical",
    position: "Infirmier major de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "TEMEZGHINE BRAHIM",
    department: "Service d'hémodialyse",
    position: "Infirmier major de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BASLIMAN MERIEM",
    department: "Vieux ksar",
    position: "Infirmier major de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "OULAD ALI MENNA",
    department: "Service d'hémodialyse",
    position: "Infirmier major de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHEKEBKEB AYOUB",
    department: "Chikh ameur",
    position: "Infirmier major de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "ELAKHECHE DJEMAA",
    department: "Service d'hémodialyse",
    position: "Infirmier major de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "LAKHECHE ZINEB",
    department: "Service d'hémodialyse",
    position: "Infirmier spécialise de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHEMENI SOUMIA",
    department: "Urgence medical",
    position: "Biologiste Du 1er Degré De santé Publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "naadja zineb",
    department: "Baalich mazouz",
    position: "Biologiste Du 1er Degré De santé Publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "LAKEHAL MOUKHTARIA",
    department: "Baalich mazouz",
    position: "Biologiste Du 1er Degré De santé Publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "OTHMANI MERIEM",
    department: "Vieux ksar",
    position: "Biologiste Du 1er Degré De santé Publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "DAGHOUR HADJIRA",
    department: "Urgence medical",
    position: "Biologiste Du 2ème Degré De santé Publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "SMAINIA FATNA",
    department: "Urgence medical",
    position: "Biologiste Du 2ème Degré De santé Publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "GREEN MERIEM",
    department: "Baalich mazouz",
    position: "Biologiste Du 2ème Degré De santé Publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "naadja djihad",
    department: "Urgence medical",
    position: "Biologiste Du 2ème Degré De santé Publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BASLIMAN MERIEM",
    department: "Vieux ksar",
    position: "Biologiste Du 2ème Degré De santé Publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "SEBAA KALTOUME",
    department: "Vieux ksar",
    position: "Biologiste Du 2ème Degré De santé Publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BOUTOULA SARA",
    department: "Vieux ksar",
    position: "Biologiste principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BEN TERKIA KHEIRA",
    department: "Baalich mazouz",
    position: "Biologiste principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "Berghaid zahra",
    department: "Baalich mazouz",
    position: "Laborantin de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "OULAD MULOUD ABDELLAHE",
    department: "Urgence medical",
    position: "Laborantin major de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "MECHICHE NAIMA",
    department: "Baalich mazouz",
    position: "Laborantin major de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "KASI MOUSSA HAMIDA",
    department: "Vieux ksar",
    position: "Laborantin major de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "OULAD MULOUD MOHAMED YAZID",
    department: "Urgence medical",
    position: "Laborantin spécialise de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "TOUAHRIA MBARKA",
    department: "Vieux ksar",
    position: "Sage-femme de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "DASSI NOURA",
    department: "Détachée",
    position: "Sage-femme de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "KARMOULA HALIMA",
    department: "Baalich mazouz",
    position: "Sage-femme de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "GREEN DALILA",
    department: "Baalich mazouz",
    position: "Sage-femme de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "MEBSOUT CHAIMA",
    department: "Vieux ksar",
    position: "Auxiliaire de puériculture de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHEMANI KHADRA",
    department: "Baalich mazouz",
    position: "Auxiliaire de puériculture de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BEKAIR YACINE",
    department: "Vieux ksar",
    position: "Assistant en fauteuil dentaire de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "NETTACHE IMEN",
    department: "Baalich mazouz",
    position: "Assistant en fauteuil dentaire de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "HEIRRACHE NASSERRADINE",
    department: "Medicine de travail",
    position: "Assistant en fauteuil dentaire de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "ouladenoui khawla",
    department: "Medicine de travail",
    position: "Hygiéniste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHOUIREB WAFAA",
    department: "Medicine de travail",
    position: "Hygiéniste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BENTOUMI NAFISSA",
    department: "Medicine de travail",
    position: "Hygiéniste de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "RESIOUI AHMED",
    department: "Medicine de travail",
    position: "Hygiéniste major de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "SEGLAB SARAH",
    department: "Urgence medical",
    position: "Manipulateur en imagerie médicale de santé publique",
    isSpecialRole: true,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "BABAOUMOUSSA SALEH",
    department: "Urgence medical",
    position: "Manipulateur en imagerie médicale de santé publique",
    isSpecialRole: true,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "AZEIZ AHMED",
    department: "Urgence medical",
    position: "Manipulateur en imagerie médicale de santé publique",
    isSpecialRole: true,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "KOUTA KACEM",
    department: "Urgence medical",
    position: "Manipulateur en imagerie médicale major de santé publique",
    isSpecialRole: true,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "HADJAISSA ALAMINE",
    department: "Urgence medical",
    position: "Manipulateur en imagerie médicale major de santé publique",
    isSpecialRole: true,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "HMAZA NADJAT",
    department: "Urgence medical",
    position: "Manipulateur en imagerie médicale spécialise de santé publique",
    isSpecialRole: true,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "LATRACHE FAISSAL",
    department: "Baalich mazouz",
    position: "Manipulateur en imagerie médicale spécialise de santé publique",
    isSpecialRole: true,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "MOUSSELMAL NAIMA",
    department: "Détachée",
    position: "Psychologue clinicien de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "LAHOUADJI TOURKIA",
    department: "Service d'hémodialyse",
    position: "Psychologue clinicien de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "GAGI SOUMAIA ZAHRA",
    department: "Baalich mazouz",
    position: "Psychologue clinicien major de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "CHEBHA AICHA",
    department: "UDS",
    position: "Psychologue clinicien principal de santé publique",
    isSpecialRole: false,
    balances: [
      { year: "2023", daysRemaining: 0 },
      { year: "2024", daysRemaining: 50 },
      { year: "2025", daysRemaining: 50 },
      { year: "2026", daysRemaining: 50 }
    ]
  },
  {
    name: "RGHIS WAHIBA",
    department: "Elmadagh",
    position: "Psychologue clinicien principal de santé publique",
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



