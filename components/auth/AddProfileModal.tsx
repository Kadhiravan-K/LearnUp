'use client';

import React, { useState } from 'react';
import styles from './AddProfileModal.module.css';

export interface AddProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (profile: { name: string; email: string; password?: string }) => void;
  onGoToSignUp?: () => void;
}

export function AddProfileModal({
  isOpen,
  onClose,
  onSaveProfile,
  onGoToSignUp
}: AddProfileModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please provide an email address.');
      return;
    }

    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setError('Please provide a valid email address.');
      return;
    }

    const trimmedName = name.trim() || trimmedEmail.split('@')[0];

    onSaveProfile({
      name: trimmedName,
      email: trimmedEmail,
      password: password || undefined
    });

    setName('');
    setEmail('');
    setPassword('');
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="add-profile-title">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 id="add-profile-title" className={styles.title}>Add Learning Profile</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close dialog">
            &times;
          </button>
        </div>
        <p className={styles.subtitle}>
          Save your account credentials on this browser using cookies and local storage for 1-click access.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.errorText}>{error}</p>}

          <div className={styles.inputGroup}>
            <label htmlFor="profile-name" className={styles.label}>Profile Name</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              className={styles.input}
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="profile-email" className={styles.label}>Email Address *</label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="profile-password" className={styles.label}>Password</label>
            <input
              id="profile-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password to save"
              className={styles.input}
              autoComplete="current-password"
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn}>
              Save Profile
            </button>
          </div>

          {onGoToSignUp && (
            <div className={styles.signupHint}>
              Don&apos;t have an account yet?{' '}
              <button
                type="button"
                className={styles.signupLink}
                onClick={() => {
                  onClose();
                  onGoToSignUp();
                }}
              >
                Create Account
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
