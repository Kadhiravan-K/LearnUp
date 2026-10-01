import { AuthLoginClient } from '@/components/auth/AuthLoginClient';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Choose Profile & Sign In | LearnUp',
  description: 'Choose your learning profile, sign in, or browse LearnUp in guest mode',
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthLoginClient />
    </Suspense>
  );
}
