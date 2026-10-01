'use client';

import React, { useState } from 'react';
import styles from './assistant.module.css';

type AssistantMode = 'chat' | 'doubts' | 'quiz' | 'summary' | 'planner';

export default function AssistantPage() {
  const [currentMode, setCurrentMode] = useState<AssistantMode>('chat');

  // Chat state
  const [messages, setMessages] = useState([
    {
      id: 'm1',
      sender: 'user',
      text: 'Explain pointers simply, especially how array stride works with 32-bit hardware registers.',
      time: '10:42 AM'
    },
    {
      id: 'm2',
      sender: 'ai',
      text: 'Think of memory as a massive row of numbered lockers in your microcontroller RAM, where each locker holds exactly one byte (8 bits). A pointer is simply a piece of paper storing the locker number (address), not the item inside.',
      grounding: 'Lecture 7 @ 23:41',
      code: `// UART Driver Register Mapping
volatile uint32_t *uart_reg = (uint32_t*)0x4000C000;
// Incrementing pointer by 1:
uart_reg++; // Moves forward 4 bytes in physical memory to 0x4000C004`,
      lemma: 'Corresponds to Lemma 4.2: 0x4000C000 + (1 × 4) = 0x4000C004. If unaligned, ARM Cortex-M issues a UsageFault exception.',
      time: '10:42 AM'
    }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Doubt solver state
  const [doubtQuery, setDoubtQuery] = useState(
    'Why does incrementing ptr++ move by 4 bytes when my microcontroller RAM is byte-addressable (8-bit)?'
  );
  const [doubtResolved, setDoubtResolved] = useState(true);

  // Quiz state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(1); // Option B selected
  const [quizSubmitted, setQuizSubmitted] = useState(true);

  // Planner state
  const [cadenceDays, setCadenceDays] = useState(5);
  const [dailyCap, setDailyCap] = useState(1.5);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: chatInput.trim(),
      time: 'Just now'
    };

    const aiMsg = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: `Synthesizing response for "${chatInput.trim()}" against active course transcripts and technical taxonomy...`,
      grounding: 'Lecture 7 Context Linked',
      time: 'Just now'
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setChatInput('');
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <span>Workspace</span>
            <span>/</span>
            <span>AI Tutor Suite</span>
            <span>/</span>
            <span className={styles.activeCourseBadge}>● MIT 6.004 Embedded Systems & C Internals</span>
          </div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>AI Study Assistant & Knowledge Copilot</h1>
            <div className={styles.engineBadge}>
              <span>🤖</span>
              <span>Claude 3.5 Sonnet (128k Synced)</span>
            </div>
          </div>
        </div>

        {/* Mode Navigation Tabs */}
        <div className={styles.modeTabs}>
          <button
            type="button"
            className={`${styles.modeTabBtn} ${currentMode === 'chat' ? styles.modeTabBtnActive : ''}`}
            onClick={() => setCurrentMode('chat')}
          >
            <span>💬</span>
            <span>AI Assistant</span>
          </button>
          <button
            type="button"
            className={`${styles.modeTabBtn} ${currentMode === 'doubts' ? styles.modeTabBtnActive : ''}`}
            onClick={() => setCurrentMode('doubts')}
          >
            <span>❓</span>
            <span>Doubt Solver</span>
          </button>
          <button
            type="button"
            className={`${styles.modeTabBtn} ${currentMode === 'quiz' ? styles.modeTabBtnActive : ''}`}
            onClick={() => setCurrentMode('quiz')}
          >
            <span>📝</span>
            <span>Adaptive Quiz</span>
          </button>
          <button
            type="button"
            className={`${styles.modeTabBtn} ${currentMode === 'summary' ? styles.modeTabBtnActive : ''}`}
            onClick={() => setCurrentMode('summary')}
          >
            <span>📑</span>
            <span>Knowledge Synthesis</span>
          </button>
          <button
            type="button"
            className={`${styles.modeTabBtn} ${currentMode === 'planner' ? styles.modeTabBtnActive : ''}`}
            onClick={() => setCurrentMode('planner')}
          >
            <span>📅</span>
            <span>Adaptive Planner</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className={styles.workspaceGrid}>
        {/* Left Context Column: Active Learning Context */}
        <aside className={styles.contextPane} aria-label="Active Context Information">
          <div className={styles.contextHeader}>
            <div className={styles.contextTitle}>
              <span>📡</span>
              <span>Active Context</span>
            </div>
            <span className={styles.liveLinkedBadge}>Live Linked</span>
          </div>

          <div className={styles.courseCard}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--sf-accent-primary)' }}>
              Active Course • Module 4/6
            </span>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--sf-text-primary)' }}>
              MIT 6.004: Embedded Systems & C Internals
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-secondary)' }}>Instructor: Dr. Christopher Terman</div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginTop: '4px' }}>
              Syllabus Mastery: 68%
            </div>
          </div>

          <div className={styles.playheadBox}>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--sf-text-muted)', textTransform: 'uppercase' }}>Lecture Playhead</div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sf-text-primary)' }}>Lecture 7: Memory & MMIO</div>
              <div style={{ fontSize: '0.75rem', color: '#10b981' }}>23:41 / 54:02</div>
            </div>
            <button
              type="button"
              className={styles.jumpBtn}
              onClick={() => alert('Jumping to 23:41 in player...')}
            >
              Jump ▶
            </button>
          </div>

          <div style={{ background: 'var(--sf-bg-canvas)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.75rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--sf-text-primary)', marginBottom: '4px' }}>Skill Taxonomy Link</div>
            <div style={{ color: 'var(--sf-text-secondary)' }}>Embedded Systems • Level 4 Core (78% Verified)</div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ padding: '2px 6px', background: 'var(--sf-bg-surface)', borderRadius: '4px', fontSize: '0.6875rem' }}>#bare-metal</span>
              <span style={{ padding: '2px 6px', background: 'var(--sf-bg-surface)', borderRadius: '4px', fontSize: '0.6875rem' }}>#pointers</span>
              <span style={{ padding: '2px 6px', background: 'var(--sf-bg-surface)', borderRadius: '4px', fontSize: '0.6875rem' }}>#arm-cortex</span>
            </div>
          </div>
        </aside>

        {/* Right Main Content Pane */}
        <main className={styles.mainPane}>
          {/* MODE 1: Chat Copilot */}
          {currentMode === 'chat' && (
            <>
              {/* Shortcut Prompts */}
              <div className={styles.shortcutsRow}>
                <button
                  type="button"
                  className={styles.shortcutBtn}
                  onClick={() => setChatInput('Summarize key points from Lecture 7')}
                >
                  ✨ Summarize Lecture
                </button>
                <button
                  type="button"
                  className={styles.shortcutBtn}
                  onClick={() => setChatInput('Generate 3 practice questions on pointer stride')}
                >
                  ⚡ Generate Quiz
                </button>
                <button
                  type="button"
                  className={styles.shortcutBtn}
                  onClick={() => setChatInput('Explain difference between volatile pointer vs pointer to volatile')}
                >
                  💡 Explain This
                </button>
                <button
                  type="button"
                  className={styles.shortcutBtn}
                  onClick={() => setChatInput('Ask doubt: why is byte alignment required on ARM?')}
                >
                  ❓ Ask a Doubt
                </button>
              </div>

              {/* Chat Stream */}
              <div className={styles.chatStream}>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`${styles.messageCard} ${m.sender === 'user' ? styles.userMessage : styles.aiMessage}`}
                  >
                    <div className={styles.messageHeader}>
                      <span>{m.sender === 'user' ? 'Learner' : 'LearnUp Copilot'}</span>
                      {m.grounding && <span className={styles.groundedTag}>🔗 Grounded @ {m.grounding}</span>}
                    </div>

                    <div className={styles.messageBody}>{m.text}</div>

                    {m.code && (
                      <pre className={styles.codeBlock}>
                        <code>{m.code}</code>
                      </pre>
                    )}

                    {m.lemma && (
                      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '8px 12px', fontSize: '0.75rem', color: '#92400e' }}>
                        📋 <strong>{m.lemma}</strong>
                      </div>
                    )}

                    {m.sender === 'ai' && (
                      <div className={styles.messageActions}>
                        <button
                          type="button"
                          className={styles.msgActionBtn}
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(m.text);
                              alert('Copied response to clipboard.');
                            }
                          }}
                        >
                          📋 Copy
                        </button>
                        <button
                          type="button"
                          className={styles.msgActionBtn}
                          onClick={() => alert('Saved note to course notebook!')}
                        >
                          ★ Save to Course Notes
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className={styles.inputContainer}>
                <textarea
                  placeholder="Ask about pointers, quiz yourself on register offsets, or request code breakdowns..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className={styles.chatTextarea}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <div className={styles.inputControlsRow}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--sf-text-muted)' }}>Press Enter ↵ to send</span>
                  <button type="submit" className={styles.sendBtn} disabled={!chatInput.trim()}>
                    <span>Send</span>
                    <span>↑</span>
                  </button>
                </div>
              </form>
            </>
          )}

          {/* MODE 2: Doubt Solver */}
          {currentMode === 'doubts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: '#10b981' }}>
                  Context-Aware Doubt Solver
                </span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', color: 'var(--sf-text-primary)' }}>
                  Active Ingestion Query & Rigorous Breakdown
                </h2>
              </div>

              <div style={{ background: 'var(--sf-bg-canvas)', border: '1px solid var(--sf-border-subtle)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-muted)', marginBottom: '6px' }}>
                  Query Grounded in Lecture 7 @ 23:41
                </div>
                <div style={{ fontWeight: 600, color: 'var(--sf-text-primary)', fontSize: '1rem' }}>
                  {doubtQuery}
                </div>
              </div>

              {doubtResolved && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Intuitive Model */}
                  <div style={{ border: '1px solid var(--sf-border-subtle)', borderRadius: '10px', padding: '16px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9375rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💡</span>
                      <span>Intuitive Mental Model (The Street & Townhouses)</span>
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--sf-text-secondary)' }}>
                      Think of microcontroller RAM as a long residential avenue where each individual door number is 1 byte (8 bits). A standard <code style={{ color: '#6366f1' }}>uint32_t</code> variable is not a 1-bedroom studio; it is a large 4-bedroom townhouse spanning 4 contiguous door numbers (#0 through #3). When you advance pointer arithmetic, you step to the next townhouse entrance (+4 bytes).
                    </p>
                  </div>

                  {/* Rigorous Engineering Detail */}
                  <div style={{ border: '1px solid var(--sf-border-subtle)', borderRadius: '10px', padding: '16px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9375rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📐</span>
                      <span>Rigorous Engineering Detail (ISO/IEC 9899 & ARM ISA)</span>
                    </h3>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--sf-text-secondary)' }}>
                      In C99 (§6.5.6 Additive Operators), pointer addition operates on element types: <code style={{ color: '#059669' }}>Physical_Address = Base + (Index_Increment × sizeof(*ptr))</code>.
                    </p>
                    <pre className={styles.codeBlock}>
                      <code>{`// Memory dump layout
uint32_t arr[2] = {0x11223344, 0x55667788};
uint32_t *p = arr;
p++; // Evaluated: 0x20000000 + (1 * sizeof(uint32_t)) = 0x20000004`}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 3: Adaptive Quiz */}
          {currentMode === 'quiz' && (
            <div className={styles.quizCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sf-accent-primary)' }}>
                  Question 04 / 10 • Pointer Arithmetic Offsets
                </span>
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>⏱️ 01:45</span>
              </div>

              <div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--sf-text-primary)' }}>
                  Given a 32-bit architecture where <code style={{ color: '#6366f1' }}>uint32_t *reg = (uint32_t*)0x4000C000;</code>, what is the exact physical memory address evaluated by <code style={{ color: '#6366f1' }}>*(reg + 2)</code>?
                </h3>

                <pre className={styles.codeBlock}>
                  <code>{`#define PERIPH_BASE   0x40000000UL
#define GPIO_PORTC    (PERIPH_BASE + 0xC000)
uint32_t *reg = (uint32_t *)GPIO_PORTC;
uint32_t target_val = *(reg + 2); // Physical address evaluated?`}</code>
                </pre>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  className={`${styles.optionItem} ${selectedAnswer === 0 ? styles.optionSelectedCorrect : ''}`}
                  onClick={() => setSelectedAnswer(0)}
                >
                  <span>A. 0x4000C002 (Byte-wise increment without scale)</span>
                  <span style={{ color: 'var(--sf-text-muted)' }}>1</span>
                </div>
                <div
                  className={`${styles.optionItem} ${selectedAnswer === 1 ? styles.optionSelectedCorrect : ''}`}
                  onClick={() => setSelectedAnswer(1)}
                >
                  <span>B. 0x4000C008 (Correct: Pointer stride = 2 × 4 bytes = 8 bytes offset)</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Correct</span>
                </div>
                <div
                  className={`${styles.optionItem} ${selectedAnswer === 2 ? styles.optionSelectedCorrect : ''}`}
                  onClick={() => setSelectedAnswer(2)}
                >
                  <span>C. 0x4000C004 (Single 32-bit word step)</span>
                  <span style={{ color: 'var(--sf-text-muted)' }}>3</span>
                </div>
                <div
                  className={`${styles.optionItem} ${selectedAnswer === 3 ? styles.optionSelectedCorrect : ''}`}
                  onClick={() => setSelectedAnswer(3)}
                >
                  <span>D. 0x4000C010 (16-byte bus alignment jump)</span>
                  <span style={{ color: 'var(--sf-text-muted)' }}>4</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <button type="button" className={styles.msgActionBtn}>
                  Previous
                </button>
                <button
                  type="button"
                  className={styles.sendBtn}
                  onClick={() => alert('Assessment submitted! Score: 8/10 (80% Mastery).')}
                >
                  Submit Assessment ➔
                </button>
              </div>
            </div>
          )}

          {/* MODE 4: Knowledge Synthesis & Summary */}
          {currentMode === 'summary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: '#10b981' }}>
                  Neural Synthesis Engine v2.4 • Confidence 99.4%
                </span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', color: 'var(--sf-text-primary)' }}>
                  Lecture 7: Low-Level Memory, Hardware Stride & MMIO Registers
                </h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-secondary)', marginTop: '2px' }}>
                  Instructor: Dr. Christopher Terman • Grounded in Video Range 00:00 – 54:02
                </div>
              </div>

              <div style={{ border: '1px solid var(--sf-border-subtle)', borderRadius: '10px', padding: '16px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9375rem', color: 'var(--sf-text-primary)' }}>Executive Overview</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--sf-text-secondary)' }}>
                  In modern systems architecture, high-level abstractions frequently mask the physical reality of memory buses. In C, memory is presented as a homogeneous linear array of typed bytes; however, underlying hardware architectures (specifically 32-bit ARM Cortex-M microcontrollers) interact with physical memory banks in strictly organized word-aligned chunks across AHB/APB interconnect fabrics.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                <div style={{ background: 'var(--sf-bg-canvas)', border: '1px solid var(--sf-border-subtle)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#6366f1' }}>01. ALIGNMENT</div>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', margin: '4px 0' }}>Physical Word Alignment</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-secondary)' }}>Addresses must end in binary 00 (0x0, 0x4, 0x8, 0xC).</div>
                </div>
                <div style={{ background: 'var(--sf-bg-canvas)', border: '1px solid var(--sf-border-subtle)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#10b981' }}>02. SCALING</div>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', margin: '4px 0' }}>Stride Scaling Semantics</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-secondary)' }}>Adding integer 1 steps by sizeof(*ptr) bytes.</div>
                </div>
                <div style={{ background: 'var(--sf-bg-canvas)', border: '1px solid var(--sf-border-subtle)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#f59e0b' }}>03. PERIPHERALS</div>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', margin: '4px 0' }}>Volatile MMIO Registers</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-secondary)' }}>Volatile qualifier prevents compiler dead-code elimination.</div>
                </div>
              </div>
            </div>
          )}

          {/* MODE 5: AI Study Planner */}
          {currentMode === 'planner' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: '#10b981' }}>
                  Adaptive Ingestion v2.4 • Neural Spaced Repetition
                </span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', color: 'var(--sf-text-primary)' }}>
                  Automated Load Allocation & Schedule Blueprint
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div style={{ background: 'var(--sf-bg-canvas)', border: '1px solid var(--sf-border-subtle)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--sf-text-muted)' }}>TOTAL CURRICULUM</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>24 Sessions</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--sf-text-secondary)' }}>16 Lectures • 8 Labs</div>
                </div>
                <div style={{ background: 'var(--sf-bg-canvas)', border: '1px solid var(--sf-border-subtle)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--sf-text-muted)' }}>EST. COMPLETION</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>Nov 21</div>
                  <div style={{ fontSize: '0.6875rem', color: '#10b981' }}>+3d Ahead of Target</div>
                </div>
                <div style={{ background: 'var(--sf-bg-canvas)', border: '1px solid var(--sf-border-subtle)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--sf-text-muted)' }}>AVG DAILY LOAD</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>48 min / day</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--sf-text-secondary)' }}>Inside cognitive budget</div>
                </div>
                <div style={{ background: 'var(--sf-bg-canvas)', border: '1px solid var(--sf-border-subtle)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--sf-text-muted)' }}>FEASIBILITY INDEX</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#6366f1' }}>96%</div>
                  <div style={{ fontSize: '0.6875rem', color: '#6366f1' }}>High Confidence</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className={styles.sendBtn}
                  onClick={() => alert('Synchronized AI Study Plan with calendar!')}
                >
                  Accept & Sync to Calendar ✓
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
