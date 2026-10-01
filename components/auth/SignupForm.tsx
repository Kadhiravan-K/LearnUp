'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { Alert } from '@/components/ui/Alert/Alert';
import Link from 'next/link';
import styles from './SignupForm.module.css';

export function SignupForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        window.location.href = '/library';
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side validations
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      // Depending on Supabase configuration, sign up might require email confirmation.
      // If a session is returned immediately, redirect to library.
      if (data.session) {
        router.refresh();
        router.push('/library');
      } else {
        // Otherwise, show a success message to check their email.
        setSuccess('Account created! Please check your email to verify your account.');
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.header}>
        <h1 className={styles.title}>Create an account</h1>
        <p className={styles.subtitle}>Start building your LearnUp library</p>
      </div>

      {error && (
        <Alert variant="error" className={styles.alert}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" className={styles.alert}>
          {success}
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
          disabled={isLoading || !!success}
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          disabled={isLoading || !!success}
          required
        />
        <Input
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          disabled={isLoading || !!success}
          required
        />
      </div>

      {!success && (
        <Button type="submit" className={styles.submitBtn} isLoading={isLoading}>
          Sign Up
        </Button>
      )}

      <div className={styles.footer}>
        Already have an account?{' '}
        <Link href="/login?mode=form" className={styles.link}>
          Sign in
        </Link>
      </div>
    </form>
  );
}
