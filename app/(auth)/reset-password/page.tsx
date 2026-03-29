'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center p-6 text-white font-inter">
      <Card className="w-full max-w-[400px] bg-[#1E293B] border-[#334155] text-white">
        <CardHeader>
          <h2 className="text-xl font-semibold text-center mt-2">New Password</h2>
          <p className="text-sm text-[#94A3B8] text-center mt-2 text-balance leading-relaxed">
            Create a new password to access your account.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#94A3B8]">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[#0D0D0D] border-[#334155] text-white focus-visible:ring-[#E91E8C]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[#94A3B8]">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-[#0D0D0D] border-[#334155] text-white focus-visible:ring-[#E91E8C]"
              />
            </div>
            
            {error && <div className="text-xs text-red-500 font-medium py-1">{error}</div>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-semibold h-11 transition-colors"
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
        <CardFooter />
      </Card>
    </div>
  );
}
