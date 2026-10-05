'use client';

import React, { useState, useEffect } from 'react';

interface Skill {
  id: string;
  name: string;
  category: 'core' | 'emerging' | 'review' | 'mastered' | 'focus';
  mastery_level: number;
  description: string;
  hours_logged: number;
  verified_lemmas?: number;
  related_courses?: string[];
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<'all' | 'core' | 'emerging' | 'review' | 'mastered'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // TODO: Connect to /api/skills
      // const response = await fetch('/api/skills');
      // if (!response.ok) throw new Error('Failed to load skills');
      // const data = await response.json();
      // setSkills(data.skills || []);
      setSkills([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
      console.error('Error loading skills:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterCategory === 'all' || skill.category === filterCategory;
    return matchesSearch && matchesFilter;
  });

  const getCategoryBadgeColor = (category: Skill['category']) => {
    switch (category) {
      case 'core':
        return { bg: 'var(--sf-color-success-bg)', text: 'var(--sf-color-success-text)' };
      case 'emerging':
        return { bg: 'var(--sf-color-warning-bg)', text: 'var(--sf-color-warning-text)' };
      case 'review':
        return { bg: 'var(--sf-color-warning-bg)', text: 'var(--sf-color-warning-text)' };
      case 'mastered':
        return { bg: 'var(--sf-color-primary-light)', text: 'var(--sf-color-primary)' };
      case 'focus':
        return { bg: 'var(--sf-color-primary-light)', text: 'var(--sf-color-primary)' };
    }
  };

  const getMasteryColor = (level: number) => {
    if (level >= 80) return 'var(--sf-color-success)';
    if (level >= 60) return 'var(--sf-color-primary)';
    if (level >= 40) return 'var(--sf-color-warning)';
    return 'var(--sf-color-error)';
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>Skills & Mastery</h1>
        <p style={{ color: 'var(--sf-color-text-secondary)', fontSize: '14px' }}>
          Track your skill development across technical domains. Demonstrated mastery comes from course completion and verification.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            backgroundColor: 'var(--sf-color-error-bg)',
            border: '1px solid var(--sf-color-error-border)',
            borderRadius: '6px',
            color: 'var(--sf-color-error-text)'
          }}
        >
          {error}
        </div>
      )}

      {/* Search & Filter */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div>
          <input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--sf-color-input-border)',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['all', 'core', 'emerging', 'review', 'mastered'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--sf-color-input-border)',
                borderRadius: '6px',
                backgroundColor: filterCategory === cat ? 'var(--sf-color-primary)' : 'var(--sf-color-surface)',
                color: filterCategory === cat ? 'var(--sf-color-text-on-primary)' : 'var(--sf-color-text-primary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Skills List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--sf-color-text-tertiary)' }}>
          <p>Loading skills...</p>
        </div>
      ) : filteredSkills.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'var(--sf-color-bg-secondary)', borderRadius: '8px', color: 'var(--sf-color-text-tertiary)' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No skills found</p>
          <p style={{ fontSize: '14px' }}>Complete courses to build skills in technical domains.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filteredSkills.map((skill) => {
            const badgeColor = getCategoryBadgeColor(skill.category);
            const masteryColor = getMasteryColor(skill.mastery_level);

            return (
              <div
                key={skill.id}
                style={{
                  padding: '20px',
                  border: '1px solid var(--sf-color-border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--sf-color-surface)',
                  boxShadow: 'var(--sf-shadow-xs)'
                }}
              >
                {/* Header Row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '12px'
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 4px 0', color: 'var(--sf-color-text-primary)' }}>
                      {skill.name}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--sf-color-text-secondary)', margin: 0 }}>{skill.description}</p>
                  </div>
                  <div
                    style={{
                      padding: '4px 8px',
                      backgroundColor: badgeColor.bg,
                      color: badgeColor.text,
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {skill.category.charAt(0).toUpperCase() + skill.category.slice(1)}
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  {/* Mastery Level */}
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--sf-color-text-secondary)', marginBottom: '4px', fontWeight: '500' }}>
                      Mastery Level
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            height: '8px',
                            backgroundColor: 'var(--sf-color-border)',
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              backgroundColor: masteryColor,
                              width: `${skill.mastery_level}%`,
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--sf-color-text-primary)', minWidth: '30px' }}>
                        {skill.mastery_level}%
                      </span>
                    </div>
                  </div>

                  {/* Hours Logged */}
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--sf-color-text-secondary)', marginBottom: '4px', fontWeight: '500' }}>
                      Hours Logged
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--sf-color-text-primary)', margin: 0 }}>
                      {skill.hours_logged}h
                    </p>
                  </div>

                  {/* Verified Lemmas */}
                  {skill.verified_lemmas !== undefined && (
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--sf-color-text-secondary)', marginBottom: '4px', fontWeight: '500' }}>
                        Verified Lemmas
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--sf-color-text-primary)', margin: 0 }}>
                        {skill.verified_lemmas}
                      </p>
                    </div>
                  )}
                </div>

                {/* Related Courses */}
                {skill.related_courses && skill.related_courses.length > 0 && (
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--sf-color-text-secondary)', marginBottom: '6px', fontWeight: '500' }}>
                      Related Courses
                    </p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {skill.related_courses.slice(0, 3).map((course, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'var(--sf-color-surface-hover)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: 'var(--sf-color-text-secondary)'
                          }}
                        >
                          {course}
                        </span>
                      ))}
                      {skill.related_courses.length > 3 && (
                        <span style={{ fontSize: '12px', color: 'var(--sf-color-text-tertiary)' }}>
                          +{skill.related_courses.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '32px', padding: '16px', backgroundColor: 'var(--sf-color-primary-light)', borderRadius: '8px', fontSize: '12px', color: 'var(--sf-color-primary)' }}>
        <p>🔗 API integration required for production. Connect to /api/skills endpoint.</p>
      </div>
    </div>
  );
}
