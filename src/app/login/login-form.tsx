'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await authClient.signIn.email({
        email,
        password,
      });

      if (res.error) {
        setError(res.error.message || 'Email atau password salah');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4 text-xs">
      {error && (
        <div className="p-3 text-xs text-[#964B3B] bg-[#FBEBE8] rounded-2xl border border-[#F5C7BE]">
          {error}
        </div>
      )}

      <div>
        <label className="block font-bold text-[#4A4238] mb-1.5">
          Email Kasir / Owner
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-[#9E968B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@kopiseruni.com"
            className="w-full pl-10 pr-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
          />
        </div>
      </div>

      <div>
        <label className="block font-bold text-[#4A4238] mb-1.5">
          Kata Sandi
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 text-[#9E968B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full pl-10 pr-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
      >
        <span>{isLoading ? 'Memverifikasi...' : 'Masuk ke Kasir POS'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
