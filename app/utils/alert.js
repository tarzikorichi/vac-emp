// app/utils/alert.js
import Swal from 'sweetalert2';

// إعدادات افتراضية مسبقة لدعم الواجهات العربية والتصميم العصري
const commonConfig = {
  html: `<div dir="rtl"></div>`, // إجبار التوجيه لليمين
  confirmButtonColor: '#2563eb',  // لون أزرق متناسق مع Tailwind (blue-600)
  cancelButtonColor: '#64748b',   // لون رمادي متناسق (slate-550)
};

export const showAlert = {
  /**
   * 1. نافذة نجاح كبيرة (تتطلب ضغط زر موافق)
   */
  success: (title, text = '') => {
    return Swal.fire({
      ...commonConfig,
      icon: 'success',
      title: `<span dir="rtl">${title}</span>`,
      text: text,
      confirmButtonText: 'موافق',
    });
  },

  /**
   * 2. نافذة خطأ كبيرة
   */
  error: (title, text = '') => {
    return Swal.fire({
      ...commonConfig,
      icon: 'error',
      title: `<span dir="rtl">${title}</span>`,
      text: text,
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#dc2626', // أحمر للخطأ
    });
  },

  /**
   * 3. إشعار نجاح خفيف (Toast) يظهر في زاوية الشاشة ويختفي تلقائياً
   */
  toastSuccess: (title) => {
    return Swal.fire({
      icon: 'success',
      title: `<span dir="rtl">${title}</span>`,
      toast: true,
      position: 'bottom-start',
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
  },

  /**
   * 4. إشعار خطأ خفيف (Toast) في زاوية الشاشة
   */
  toastError: (title) => {
    return Swal.fire({
      icon: 'error',
      title: `<span dir="rtl">${title}</span>`,
      toast: true,
      position: 'bottom-start',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  },

  /**
   * 5. نافذة تأكيد الإجراءات الحساسة (مثل الحذف أو التعديل)
   */
  confirm: async (title, text = '') => {
    const result = await Swal.fire({
      ...commonConfig,
      icon: 'warning',
      title: `<span dir="rtl">${title}</span>`,
      text: text,
      showCancelButton: true,
      confirmButtonText: 'نعم، استمر',
      cancelButtonText: 'إلغاء',
    });
    return result.isConfirmed; // ستُعيد true إذا ضغط نعم، و false إذا ألغى
  }
};