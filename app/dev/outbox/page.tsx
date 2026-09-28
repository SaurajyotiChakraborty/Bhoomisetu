'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OutboxEntry {
  id: number;
  type: string;
  destination: string;
  subject: string | null;
  body: string;
  metadata: string | null;
  createdAt: string;
}

export default function DevOutbox() {
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
    const interval = setInterval(fetchEntries, 3000);
    return () => clearInterval(interval);
  }, []);

  async function fetchEntries() {
    try {
      const res = await fetch('/api/v1/dev/outbox');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } finally {
      setLoading(false);
    }
  }

  const filteredEntries = filter === 'all' ? entries : entries.filter(e => e.type === filter);
  const types = [...new Set(entries.map(e => e.type))];

  const TYPE_ICONS: Record<string, string> = {
    OTP: '🔑',
    HEX_CODE: '🔐',
    EMAIL: '📧',
    SMS: '📱',
    CREDENTIAL: '🎫',
    IN_APP: '🔔',
    NOTIFICATION: '🔔',
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="bg-[var(--color-bg-card)] border-b border-[var(--color-border-light)]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4A373] to-[#B8860B] flex items-center justify-center text-white font-bold text-sm">भू</div>
            </Link>
            <span className="font-semibold">Dev Outbox</span>
            <span className="badge badge-amber">Development Only</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-muted)]">Auto-refreshes every 3s</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          All OTPs, hex codes, credentials, and notifications appear here in development mode.
          In production, these go to real email/SMS providers.
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setFilter('all')} className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}>
            All ({entries.length})
          </button>
          {types.map(type => (
            <button key={type} onClick={() => setFilter(type)} className={`btn btn-sm ${filter === type ? 'btn-primary' : 'btn-ghost'}`}>
              {TYPE_ICONS[type] || '📨'} {type} ({entries.filter(e => e.type === type).length})
            </button>
          ))}
        </div>

        {/* Entries */}
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="card animate-fade-in">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{TYPE_ICONS[entry.type] || '📨'}</span>
                  <span className="badge badge-blue">{entry.type}</span>
                  <span className="text-sm text-[var(--color-text-secondary)]">→ {entry.destination}</span>
                </div>
                <span className="text-xs text-[var(--color-text-muted)] shrink-0">
                  {new Date(entry.createdAt).toLocaleTimeString()}
                </span>
              </div>
              {entry.subject && (
                <div className="font-medium text-sm mb-1">{entry.subject}</div>
              )}
              <div className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{entry.body}</div>
              {entry.metadata && (
                <div className="mt-2 p-2 rounded bg-[var(--color-bg-sidebar)] font-mono text-xs text-[var(--color-text-muted)] overflow-x-auto">
                  {entry.metadata}
                </div>
              )}
            </div>
          ))}

          {filteredEntries.length === 0 && !loading && (
            <div className="text-center py-16 text-[var(--color-text-muted)]">
              <div className="text-4xl mb-4">📭</div>
              <p>No messages yet. Register a citizen or trigger a transfer to see OTPs and notifications here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
