'use client';

import React, { useState, useEffect } from 'react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load initial chat history from API
    const loadChatHistory = async () => {
      try {
        // TODO: Connect to /api/assistant/history
        // const response = await fetch('/api/assistant/history');
        // const data = await response.json();
        // setMessages(data.messages);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };

    loadChatHistory();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Connect to /api/assistant/chat endpoint
      // const response = await fetch('/api/assistant/chat', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ message: input.trim() })
      // });
      //
      // if (!response.ok) throw new Error('Failed to get AI response');
      //
      // const data = await response.json();
      // const aiMessage: ChatMessage = {
      //   id: `msg-${Date.now()}`,
      //   sender: 'ai',
      //   text: data.response,
      //   timestamp: new Date().toISOString()
      // };
      //
      // setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMsg);
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>AI Study Assistant</h1>
        <p style={{ color: 'var(--sf-color-text-secondary)', fontSize: '14px' }}>
          Chat interface for AI-powered learning assistance. Backend integration required for production use.
        </p>
      </div>

      {/* Chat Messages */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          marginBottom: '16px',
          border: '1px solid var(--sf-color-border)',
          borderRadius: '8px',
          padding: '16px',
          backgroundColor: 'var(--sf-color-bg-secondary)'
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--sf-color-text-tertiary)', paddingTop: '24px' }}>
            <p>No messages yet. Start a conversation below.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                marginBottom: '16px',
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: msg.sender === 'user' ? 'var(--sf-color-primary)' : 'var(--sf-color-border)',
                  color: msg.sender === 'user' ? 'var(--sf-color-text-on-primary)' : 'var(--sf-color-text-primary)',
                  wordWrap: 'break-word'
                }}
              >
                <p style={{ margin: 0, fontSize: '14px' }}>{msg.text}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div style={{ textAlign: 'center', color: 'var(--sf-color-text-tertiary)' }}>
            <p>AI is thinking...</p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: 'var(--sf-color-error-bg)',
            border: '1px solid var(--sf-color-error-border)',
            borderRadius: '6px',
            color: 'var(--sf-color-error-text)',
            fontSize: '14px'
          }}
        >
          Error: {error}
        </div>
      )}

      {/* Message Input */}
      <form
        onSubmit={handleSendMessage}
        style={{
          display: 'flex',
          gap: '8px',
          padding: '16px',
          backgroundColor: 'var(--sf-color-surface-hover)',
          borderRadius: '8px'
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything about your learning content..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid var(--sf-color-input-border)',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'inherit',
            opacity: isLoading ? 0.5 : 1
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            padding: '12px 24px',
            backgroundColor: isLoading || !input.trim() ? 'var(--sf-color-input-border)' : 'var(--sf-color-primary)',
            color: 'var(--sf-color-text-on-primary)',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            transition: 'background-color 0.2s'
          }}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>

      <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--sf-color-text-tertiary)', textAlign: 'center' }}>
        <p>🔗 API integration required for production use. See /api/assistant/ endpoints.</p>
      </div>
    </div>
  );
}
