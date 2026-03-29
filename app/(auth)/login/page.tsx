'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-1 justify-center">
          <span className="text-[#E91E8C]">ENTIRE</span>
          <span className="text-white">CAFM</span>
        </h1>
      </div>

      <Card className="w-full max-w-[400px] bg-[#1E293B] border-[#334155] text-white">
        <CardHeader>
          <h2 className="text-xl font-semibold text-center mt-2">Sign in to your account</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#94A3B8]">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[#0D0D0D] border-[#334155] text-white placeholder:text-[#475569] focus-visible:ring-[#E91E8C]"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[#94A3B8]">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#E91E8C] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[#0D0D0D] border-[#334155] text-white focus-visible:ring-[#E91E8C]"
              />
            </div>
            
            {error && (
              <div className="text-xs text-red-500 font-medium py-1">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-semibold h-11"
            >
              {loading ? 'Sign In...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 pt-0">
          {/* Optional helper text */}
        </CardFooter>
      </Card>
    </div>
  );
}
