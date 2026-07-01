'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '../lib/db';

// 1. إضافة طلب عطلة جديد مع تطبيق منطق الاقتطاع (Create)
export async function createLeaveRequest(leaveData) {
  
  const { employeeId, daysTaken, startDate, endDate, leaveType, substitute } = leaveData;
  const days = parseInt(daysTaken);

  
  if (isNaN(employeeId)) {
    throw new Error("معرّف الموظف غير صالح أو مفقود");
  }


  return await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id: employeeId },
      include: {
        yearlyBalances: {
          where: { daysRemaining: { gt: 0 } },
          orderBy: { year: 'asc' } // الفيفو: من الأقدم للأحدث
        }
      }
    });

    if (!employee) throw new Error("الموظف غير موجود");

    // أ) إذا كانت العطلة سنوية عادية (تخضع للـ FIFO)
    if (leaveType === 'annual') {
      const totalAvailable = employee.yearlyBalances.reduce((sum, b) => sum + b.daysRemaining, 0);
      if (totalAvailable < days) {
        throw new Error(`رصيد السنتين غير كافٍ. المتاح: ${totalAvailable} يوم.`);
      }

      let remainingToDeduct = days;
      for (const balance of employee.yearlyBalances) {
        if (remainingToDeduct <= 0) break;

        if (balance.daysRemaining >= remainingToDeduct) {
          await tx.yearlyBalance.update({
            where: { id: balance.id },
            data: { daysRemaining: balance.daysRemaining - remainingToDeduct }
          });
          remainingToDeduct = 0;
        } else {
          remainingToDeduct -= balance.daysRemaining;
          await tx.yearlyBalance.update({
            where: { id: balance.id },
            data: { daysRemaining: 0 }
          });
        }
      }
    } 
    // ب) إذا كانت العطلة استثنائية (تقتطع من رصيد الطوارئ التراكمي الذي لا يموت)
    else if (leaveType === 'reconissance') {
      
      await tx.employee.update({
        where: { id: employeeId },
        data: { recognitionBalance: employee.recognitionBalance - days }
      });
    }
    // ج) إذا كانت عطلة خاصة (21 يوماً صحية للمشمولين بنظام الراديو/الربو)
    else if (leaveType === 'special') {
      if (!employee.isSpecialRole) {
        throw new Error("هذا الموظف لا يخضع للنظام الخاص المستحق للعطل الطبية الدورية.");
      }
      // العطلة الخاصة تمنح كحق دوري ولا تؤثر على الأرصدة السنوية للموظف
    }

    // تسجيل الطلب في جدول السجلات
    const request = await tx.leaveRequest.create({
      data: {
        employeeId: employeeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        daysTaken: days,
        leaveType,
        substitute: substitute || null
      }
    });

    revalidatePath('/dashboard');
    return { success: true, request, leaveId: request.id };
  });
}

// 2. جلب جميع طلبات العطل المسجلة (Read)
export async function getAllLeaveRequests() {
  try {
    const result = await prisma.leaveRequest.findMany({
      include: { employee: true },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, data: [] };
  }
}

// 3. حذف طلب عطلة وإرجاع الأيام المحسوبة تلقائياً إلى رصيد الموظف (Delete)
export async function deleteLeaveRequest(requestId) {
  return await prisma.$transaction(async (tx) => {
    const leave = await tx.leaveRequest.findUnique({
      where: { id: parseInt(requestId) }
    });

    if (!leave) throw new Error("طلب العطلة غير موجود");

    // إعادة الأيام حسب نوع العطلة المحذوفة
    if (leave.leaveType === 'annual') {
      // نرجع الأيام لأحدث سنة مالية متاحة للموظف لإنعاش رصيده أولاً
      const latestBalance = await tx.yearlyBalance.findFirst({
        where: { employeeId: leave.employeeId },
        orderBy: { year: 'desc' }
      });
      if (latestBalance) {
        await tx.yearlyBalance.update({
          where: { id: latestBalance.id },
          data: { daysRemaining: latestBalance.daysRemaining + leave.daysTaken }
        });
      }
    } else if (leave.leaveType === 'exceptional') {
      await tx.employee.update({
        where: { id: leave.employeeId },
        data: { recognitionBalance: { increment: leave.daysTaken } }
      });
    }

    // حذف السجل نهائياً
    await tx.leaveRequest.delete({
      where: { id: leave.id }
    });

    revalidatePath('/dashboard');
    return { success: true, message: "تم إلغاء العطلة واسترداد الأيام بنجاح" };
  });
}


export async function getLeaveRequests() {
  try {
    // 1. جلب الطلبات مع بيانات الموظف المرتبطة
    const requests = await prisma.leaveRequest.findMany({
      include: { 
        employee: {
          include: {
            yearlyBalances: {
              orderBy: {
                year: "asc",
              },
            },
          },
        }
      },
      orderBy: { 
        createdAt: 'desc' 
      }
    });

    // 2. تحويل وتجهيز البيانات لتطابق تصميم الواجهة
    const formattedRequests = requests.map((req) => {
      
      const remaining = req.employee.yearlyBalances
      .map(
        (balance) =>
          `${balance.daysRemaining} / ${balance.year}`
      )
      .join("\n");

      return {
        id: req.id,
        // توليد رقم سند تلقائي من الـ ID أو تركه فارغاً ليعبأ يدوياً
        docNum: req.id.toString().padStart(2, '0'), 
        year: new Date(req.createdAt).getFullYear().toString(),
        
        // بيانات الموظف (تأكد أن هذه الحقول موجودة في جدول Employee الخاص بك)
        name: req.employee?.name || "indéfini",
        position: req.employee?.position || "indéfini",
        department: req.employee?.department || "indéfini",
        substitute: req.substitute || "/",
        notes: req.notes || "",
        // حقول غير موجودة في الداتابيز (نتركها فارغة ليكتبها المدير بيده على الشاشة)
        
        remaining,
        
        typeText: req.leaveType,
        duration: req.daysTaken,
        durationText: `${req.daysTaken} jour (s)`, // يمكن برمجتها لاحقاً لتحويل الرقم لحروف
        
        // تنسيق التواريخ لتظهر بشكل YYYY/MM/DD
        startDate: new Date(req.startDate).toLocaleDateString('en-GB').replace(/\//g, '/'),
        endDate: new Date(req.endDate).toLocaleDateString('en-GB').replace(/\//g, '/')
      };
    });

    return { success: true, data: formattedRequests };
  } catch (error) {
    console.error(error);
    return { success: false, error: "فشل في جلب البيانات" };
  }
}



// export async function GET() {
//   const data = await prisma.leaveRequest.findMany({
//     include: { employee: true },
//     orderBy: { startDate: 'desc' }
//   });
//   return Response.json(data);
// }







// dashboard alerts for employees with special leave types (6 months or exceptional medical)

export async function getLeaveAlerts() {
  try {
    const employeesWithSpecialLeaves = await prisma.employee.findMany({
      where: { isSpecialRole: true },
      include: {
        leaveRequests: {
          where: {
            leaveType: { in: ['6months', 'exceptional_medical'] }
          },
          orderBy: { startDate: 'desc' },
          take: 1
        }
      }
    });

    
    const alerts = [];
    
    // تاريخ اليوم الحالي
    const today = new Date();

    for (const emp of employeesWithSpecialLeaves) {
      const lastLeave = emp.leaveRequests[0];
      console.log(`Processing employee: ${emp.name}, Last leave: ${lastLeave ? lastLeave.startDate : 'None'}`);
      if (lastLeave) {
        const lastLeaveDate = new Date(lastLeave.startDate);
        
        // حساب الفارق الفعلي بالأيام بين تاريخ اليوم وتاريخ العطلة السابقة
        const diffTime = Math.abs(today - lastLeaveDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // القانون ينص على عطلة كل 6 أشهر (أي ما يعادل تقريباً 180 يوماً)
        // إذا مر 180 يوماً أو أكثر، يظهر التنبيه فوراً
        if (diffDays >= 180) {
          alerts.push({
            id: emp.id,
            name: emp.name,
            role: `${emp.position} • ${emp.department}`,
            lastSpecialLeave: lastLeaveDate.toLocaleDateString('fr-FR'),
          });
        }
      } else {
        // إذا لم يستفد من أي عطلة من قبل
        alerts.push({
          id: emp.id,
          name: emp.name,
          role: `${emp.position} • ${emp.department}`,
          lastSpecialLeave: "Aucun congé enregistré",
        });
      }
    }

    return { success: true, data: alerts };
  } catch (error) {
    console.error("Erreur lors du calcul des alertes:", error);
    return { success: false, data: [] };
  }
}

export async function getDashboardStats() {
  try {
    const today = new Date();

    // 1. إجمالي الموظفين
    const totalEmployees = await prisma.employee.count();

    // 2. عدد الموظفين في عطلة حالياً
    // نبحث عن أي طلب عطلة تاريخ بدايته أقل من أو يساوي اليوم، وتاريخ نهايته أكبر من أو يساوي اليوم
    const currentlyOnLeave = await prisma.leaveRequest.count({
      where: {
        startDate: { lte: today },
        endDate: { gte: today }
      }
    });

    // 3. عدد الموظفين ذوي النظام الخاص (isSpecialRole)
    const specialRoleCount = await prisma.employee.count({
      where: {
        isSpecialRole: true
      }
    });

    // 4. إجمالي الأيام الاستثنائية المستهلكة
    // نقوم بجمع (Sum) حقل الأيام المستهلكة (daysTaken) فقط للعطل التي نوعها استثنائي
    const sumExceptional = await prisma.leaveRequest.aggregate({
      where: {
        leaveType: 'exceptional'
      },
      _sum: {
        daysTaken: true
      }
    });

    return {
      success: true,
      data: {
        totalEmployees,
        currentlyOnLeave,
        specialRoleCount,
        totalExceptionalDays: sumExceptional._sum.daysTaken || 0 // إذا لم تكن هناك عطل نرجع 0
      }
    };
  } catch (error) {
    console.error("Erreur lors du calcul des statistiques:", error);
    return {
      success: false,
      data: {
        totalEmployees: 0,
        currentlyOnLeave: 0,
        specialRoleCount: 0,
        totalExceptionalDays: 0
      }
    };
  }
}

export async function getActiveLeavesWithReturnDate() {
  try {
    const today = new Date();

    // جلب طلبات العطل النشطة حالياً (تاريخ البداية أقل من أو يساوي اليوم، والنهاية أكبر من أو تساوي اليوم)
    const activeLeaveRequests = await prisma.leaveRequest.findMany({
      where: {
        startDate: { lte: today },
        endDate: { gte: today }
      },
      include: {
        employee: true // جلب بيانات الموظف صاحب العطلة
      },
      orderBy: [
        {
          employee: {
            isSpecialRole: 'desc' // العطل الخاصة (Radio / Asthme) تظهر أولاً
          }
        },
        { startDate: 'asc' } // ثم الأقدم فالأحدث حسب بداية العطلة
      ]
    });

    // تحويل البيانات لتناسب أعمدة الجدول الجديدة
    const result = activeLeaveRequests.map(leave => {
      const endDate = new Date(leave.endDate);
      
      // حساب تاريخ العودة الفعلي (تاريخ النهاية + 1 يوم)
      const returnDate = new Date(endDate);
      returnDate.setDate(returnDate.getDate() + 1);

      return {
        id: leave.id,
        name: leave.employee.name,
        department: leave.employee.department,
        leaveType: leave.leaveType,
        startDate: new Date(leave.startDate).toLocaleDateString('fr-FR'),
        endDate: endDate.toLocaleDateString('fr-FR'),
        // تنسيق تاريخ العودة بشكل مقروء
        returnDate: returnDate.toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        regimeType: leave.employee.isSpecialRole ? 'Radio / Asthme' : 'Régime Normal'
      };
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Erreur lors du chargement des congés actifs:", error);
    return { success: false, data: [] };
  }
}