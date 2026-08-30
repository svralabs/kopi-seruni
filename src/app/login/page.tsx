import Image from 'next/image';
import LoginForm from './login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0] p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-[#EBE7DF] p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="relative w-20 h-20 mx-auto rounded-3xl overflow-hidden bg-[#FAF8F5] border border-[#EBE7DF] p-2 flex items-center justify-center shadow-xs">
            <Image
              src="/logo.webp"
              alt="Toko Kopi Seruni"
              width={72}
              height={72}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-black text-[#201C1A] tracking-tight">
              TOKO KOPI SERUNI
            </h1>
            <p className="text-xs text-[#8E867C] mt-1 font-medium">
              Sistem POS Kasir & Manajemen Multi-Outlet
            </p>
          </div>
        </div>

        <LoginForm />

        <div className="text-center pt-2 border-t border-[#F0ECE4]">
          <p className="text-[11px] text-[#A8A095]">
            Default Login: <span className="font-mono text-[#201C1A]">owner@kopiseruni.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}
