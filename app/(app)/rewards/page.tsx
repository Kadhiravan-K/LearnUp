'use client';

import React, { useState, useEffect } from 'react';

interface Reward {
  id: string;
  title: string;
  description: string;
  status: 'unlocked' | 'in_progress' | 'locked';
  xp_earned: number;
  xp_required?: number;
  completion_percentage: number;
  unlocked_at?: string;
  icon?: string;
}

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unlocked' | 'in_progress' | 'locked'>('all');

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // TODO: Connect to /api/rewards
      // const response = await fetch('/api/rewards');
      // if (!response.ok) throw new Error('Failed to load rewards');
      // const data = await response.json();
      // setRewards(data.rewards || []);
      setRewards([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rewards');
      console.error('Error loading rewards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRewards = rewards.filter((reward) => {
    if (filterStatus === 'all') return true;
    return reward.status === filterStatus;
  });

  const getStatusColor = (status: Reward['status']) => {
    switch (status) {
      case 'unlocked':
        return { bg: '#dbeafe', text: '#0369a1', label: 'Unlocked' };
      case 'in_progress':
        return { bg: '#fef3c7', text: '#92400e', label: 'In Progress' };
      case 'locked':
        return { bg: '#f3f4f6', text: '#6b7280', label: 'Locked' };
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>Achievements & Rewards</h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Earn achievements by completing learning milestones and challenges.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#991b1b'
          }}
        >
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {(['all', 'unlocked', 'in_progress', 'locked'] as const).map((status) => {
          const count = status === 'all' ? rewards.length : rewards.filter((r) => r.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: filterStatus === status ? '#3b82f6' : 'white',
                color: filterStatus === status ? 'white' : '#374151',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')} ({count})
            </button>
          );
        })}
      </div>

      {/* Rewards Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#999' }}>
          <p>Loading achievements...</p>
        </div>
      ) : filteredRewards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', backgroundColor: '#f9fafb', borderRadius: '8px', color: '#999' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No rewards to display</p>
          <p style={{ fontSize: '14px' }}>Complete learning activities to unlock achievements.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filteredRewards.map((reward) => {
            const statusColor = getStatusColor(reward.status);
            return (
              <div
                key={reward.id}
                style={{
                  padding: '20px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                {/* Icon & Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div style={{ fontSize: '32px' }}>{reward.icon || '🏆'}</div>
                  <div
                    style={{
                      padding: '4px 8px',
                      backgroundColor: statusColor.bg,
                      color: statusColor.text,
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    {statusColor.label}
                  </div>
                </div>

                {/* Content */}
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 4px 0', color: '#1f2937' }}>
                  {reward.title}
                </h3>
                <p style={{ fontSize: '13px', color: '#666', margin: '0 0 12px 0' }}>{reward.description}</p>

                {/* Progress Bar */}
                {reward.status !== 'unlocked' && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>Progress</span>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>
                        {reward.completion_percentage}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          backgroundColor: '#3b82f6',
                          width: `${reward.completion_percentage}%`,
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* XP Info */}
                <div style={{ fontSize: '12px', color: '#666' }}>
                  <p style={{ margin: 0 }}>💰 {reward.xp_earned} XP earned</p>
                  {reward.xp_required && (
                    <p style={{ margin: '4px 0 0 0' }}>
                      {reward.status === 'locked' ? `Requires ${reward.xp_required} XP` : 'Unlocked!'}
                    </p>
                  )}
                </div>

                {reward.unlocked_at && (
                  <p style={{ fontSize: '11px', color: '#999', margin: '8px 0 0 0' }}>
                    Unlocked: {new Date(reward.unlocked_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '32px', padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', fontSize: '12px', color: '#0369a1' }}>
        <p>🔗 API integration required for production. Connect to /api/rewards endpoint.</p>
      </div>
    </div>
  );
}
