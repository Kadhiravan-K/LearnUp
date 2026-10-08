'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Alert } from '@/components/ui/Alert/Alert';
import { Factor } from '@supabase/supabase-js';
import styles from './MfaSettings.module.css';

export function MfaSettings() {
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  useEffect(() => {
    loadFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFactors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setFactors(data?.all || []);
    } catch (err: any) {
      setError('Failed to load MFA settings: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnroll = async () => {
    setIsEnrolling(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });
      if (error) throw error;

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: data.id,
      });
      if (challengeError) throw challengeError;
      
      setChallengeId(challengeData.id);
    } catch (err: any) {
      setError(err.message || 'Failed to start enrollment.');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode || !factorId || !challengeId) return;

    setIsVerifying(true);
    setError(null);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: verifyCode,
      });

      if (error) throw error;

      // Reset enrollment state and reload factors
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setChallengeId(null);
      setVerifyCode('');
      
      await loadFactors();
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUnenroll = async (factorIdToUnenroll: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factorIdToUnenroll,
      });
      if (error) throw error;
      await loadFactors();
    } catch (err: any) {
      setError(err.message || 'Failed to disable MFA.');
    } finally {
      setIsLoading(false);
    }
  };

  const hasVerifiedTotp = factors.some(f => f.factor_type === 'totp' && f.status === 'verified');

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Two-Factor Authentication (MFA)</h2>
      <p className={styles.description}>
        Add an extra layer of security to your account by enabling Two-Factor Authentication with an authenticator app (like Google Authenticator or Authy).
      </p>

      {error && <Alert variant="error" className={styles.alert}>{error}</Alert>}

      {!isLoading && !hasVerifiedTotp && !qrCode && (
        <div className={styles.actionArea}>
          <Button onClick={handleEnroll} isLoading={isEnrolling}>
            Enable Two-Factor Authentication
          </Button>
        </div>
      )}

      {qrCode && (
        <div className={styles.enrollArea}>
          <h3>Set up Authenticator App</h3>
          <p>Scan the QR code below with your authenticator app.</p>
          <div className={styles.qrContainer} dangerouslySetInnerHTML={{ __html: qrCode }} />
          <p className={styles.secretText}>
            Or enter this secret manually: <code>{secret}</code>
          </p>

          <form onSubmit={handleVerify} className={styles.verifyForm}>
            <Input
              label="6-digit verification code"
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              required
            />
            <div className={styles.formActions}>
              <Button type="button" variant="secondary" onClick={() => setQrCode(null)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isVerifying} disabled={verifyCode.length < 6}>
                Verify & Enable
              </Button>
            </div>
          </form>
        </div>
      )}

      {!isLoading && hasVerifiedTotp && (
        <div className={styles.enabledArea}>
          <div className={styles.statusBadge}>
            ✓ Two-Factor Authentication is Enabled
          </div>
          <div className={styles.factorsList}>
            {factors.filter(f => f.factor_type === 'totp' && f.status === 'verified').map(f => (
              <div key={f.id} className={styles.factorItem}>
                <span>Authenticator App (Added {new Date(f.created_at).toLocaleDateString()})</span>
                <Button 
                  variant="danger" 
                  size="sm" 
                  onClick={() => handleUnenroll(f.id)}
                >
                  Disable
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
