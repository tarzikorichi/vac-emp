'use client';
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';



export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // إعادة التوجيه تلقائياً إلى صفحة لوحة التحكم بعد 3 ثوانٍ مثلاً
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 3000);

    return () => clearTimeout(timer); // تنظيف المؤقت عند مغادرة الصفحة
  }, [router]);
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      
    </div>
  );
}
