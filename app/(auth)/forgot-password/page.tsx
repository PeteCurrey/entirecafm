'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setMessage('Check your email for the reset link');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center p-6 text-white font-inter">
      <Card className="w-full max-w-[400px] bg-[#1E293B] border-[#334155] text-white">
        <CardHeader>
          <div className="mb-4">
            <Link href="/login" className="text-[#94A3B8] hover:text-white flex items-center gap-2 text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
          <h2 className="text-xl font-semibold text-center mt-2">Reset Password</h2>
          <p className="text-sm text-[#94A3B8] text-center mt-2">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetRequest} className="space-y-4">
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
            
            {error && <div className="text-xs text-red-500 font-medium py-1">{error}</div>}
            {message && <div className="text-xs text-[#22C55E] font-medium py-1">{message}</div>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E91E8C] hover:bg-[#D41B7F] text-white font-semibold h-11"
            >
              {loading ? 'Sending Request...' : 'Send Reset Link'}
            </Button>
          </form>
        </CardContent>
        <CardFooter />
      </Card>
    </div>
  );
}
