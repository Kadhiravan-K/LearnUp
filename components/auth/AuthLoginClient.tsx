'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProfileChooser } from './ProfileChooser';
import { LoginForm } from './LoginForm';

export function AuthLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFormMode = searchParams?.get('mode') === 'form';
  const [view, setView] = useState<'profiles' | 'login'>(isFormMode ? 'login' : 'profiles');
  const [selectedEmail, setSelectedEmail] = useState('');

  useEffect(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (params?.get('mode') === 'form' || searchParams?.get('mode') === 'form') {
      setView('login');
    }
  }, [searchParams]);

  const handleSelectSignIn = (email?: string) => {
    setSelectedEmail(email || '');
    setView('login');
  };

  const handleSelectSignUp = () => {
    router.push('/signup');
  };

  const handleSelectGuest = () => {
    // Set guest session cookie for server middleware
    document.cookie = 'studyflow_guest_mode=true; path=/; max-age=86400; SameSite=Lax';
    try {
      localStorage.setItem('studyflow_is_guest', 'true');
    } catch {
      // Ignore
    }
    // Navigate immediately to dashboard
    window.location.href = '/dashboard';
  };

  if (view === 'login') {
    return (
      <LoginForm
        initialEmail={selectedEmail}
        onBackToProfiles={() => setView('profiles')}
      />
    );
  }

  return (
    <ProfileChooser
      onSelectSignIn={handleSelectSignIn}
      onSelectSignUp={handleSelectSignUp}
      onSelectGuest={handleSelectGuest}
    />
  );
}
