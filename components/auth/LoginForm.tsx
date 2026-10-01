'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { Alert } from '@/components/ui/Alert/Alert';
import Link from 'next/link';
import styles from './LoginForm.module.css';

export interface LoginFormProps {
  initialEmail?: string;
  onBackToProfiles?: () => void;
}

export function LoginForm({ initialEmail = '', onBackToProfiles }: LoginFormProps) {
  const supabase = createClient();

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        // Save to browser saved profiles for Chrome-like profile picker
        try {
          const namePart = email.split('@')[0];
          const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
          const existing = JSON.parse(localStorage.getItem('LearnUp_saved_profiles') || '[]');
          const filtered = existing.filter((p: { email: string }) => p.email.toLowerCase() !== email.toLowerCase());
          const newProfile = {
            id: data.session.user.id || String(Date.now()),
            name: displayName,
            email: email,
            initials: displayName.slice(0, 2).toUpperCase(),
            color: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            lastActive: new Date().toISOString()
          };
          localStorage.setItem('LearnUp_saved_profiles', JSON.stringify([newProfile, ...filtered]));
          localStorage.removeItem('LearnUp_is_guest');
        } catch {
          // Ignore
        }

        // Clear guest mode cookie
        document.cookie = 'LearnUp_guest_mode=; path=/; max-age=0; SameSite=Lax';

        // Full page navigation so middleware reads cookies
        window.location.href = '/dashboard';
      } else {
        setError('Login succeeded but no session was returned. Please verify your account.');
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {onBackToProfiles && (
        <button
          type="button"
          onClick={onBackToProfiles}
          className={styles.link}
          style={{ alignSelf: 'flex-start', marginBottom: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
        >
          &larr; Back to Profiles
        </button>
      )}

      <div className={styles.header}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your LearnUp workspace</p>
      </div>

      {error && (
        <Alert variant="error" className={styles.alert}>
          {error}
        </Alert>
      )}

      <div className={styles.fields}>
        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={isLoading}
          autoFocus={!initialEmail}
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          disabled={isLoading}
          autoFocus={Boolean(initialEmail)}
          required
        />
      </div>

      <Button type="submit" className={styles.submitBtn} isLoading={isLoading}>
        Sign In
      </Button>

      <div className={styles.footer}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" className={styles.link}>
          Sign up
        </Link>
      </div>
    </form>
  );
}
