'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from 'next-intl';

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale() as 'zh' | 'en';
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || (locale === 'zh' ? '登录失败' : 'Login failed'));
        return;
      }
      document.cookie = `access_token=${data.accessToken}; path=/; max-age=${7 * 24 * 60 * 60}`;
      router.push(`/${locale}/home`);
      router.refresh();
    } catch {
      setError(locale === 'zh' ? '网络错误' : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl">GPAIAgent</CardTitle>
          </div>
          <CardDescription>
            {locale === 'zh' ? '登录您的账户' : 'Sign in to your account'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {locale === 'zh' ? '用户名' : 'Username'}
              </label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder={locale === 'zh' ? '输入用户名' : 'Enter username'}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {locale === 'zh' ? '密码' : 'Password'}
              </label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={locale === 'zh' ? '输入密码' : 'Enter password'}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (locale === 'zh' ? '登录中...' : 'Signing in...') : (locale === 'zh' ? '登录' : 'Sign in')}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {locale === 'zh' ? '还没有账户？' : "Don't have an account? "}
              <Link href="/register" className="text-primary hover:underline">
                {locale === 'zh' ? '立即注册' : 'Register'}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
