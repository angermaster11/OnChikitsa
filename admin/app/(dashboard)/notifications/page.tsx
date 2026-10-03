'use client';

import { useState, useCallback, useEffect, ReactNode } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Modal } from '@/components/Modal';

interface Broadcast {
  _id: string;
  title: string;
  body: string;
  audienceType: string;
  sentCount: number;
  createdAt: string;
}

function SectionCard({ title, noPadding, children }: { title: string; noPadding?: boolean; children: ReactNode }) {
  return (
    <Card className={noPadding ? '!p-0 overflow-hidden' : ''}>
      <h2 className={`text-sm font-semibold text-slate-900 ${noPadding ? 'p-4 pb-0' : 'mb-4'}`}>{title}</h2>
      <div className={noPadding ? 'mt-4' : ''}>{children}</div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

export default function NotificationsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('ALL_PATIENTS');
  
  const load = useCallback(async () => {
    try {
      const data = await api.get<{ items: Broadcast[] }>('/admin/notifications?limit=50');
      setBroadcasts(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;
    setSending(true);
    try {
      await api.post('/admin/notifications', {
        title,
        body,
        audienceType: audience
      });
      setModalOpen(false);
      setTitle('');
      setBody('');
      setAudience('ALL_PATIENTS');
      void load();
    } catch (err) {
      alert(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Broadcast Notifications"
        actions={<Button onClick={() => setModalOpen(true)}>New Broadcast</Button>}
      />

      <SectionCard title="Past Broadcasts" noPadding>
        {loading ? (
          <div className="p-4 text-sm text-slate-500">Loading...</div>
        ) : broadcasts.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">No broadcasts sent yet.</div>
        ) : (
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Audience</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium text-right">Sent To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {broadcasts.map(b => (
                <tr key={b._id}>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(b.createdAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.audienceType}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{b.title}</div>
                    <div className="text-slate-500 truncate max-w-sm">{b.body}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{b.sentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Broadcast">
        <form onSubmit={handleSend} className="space-y-4">
          <Field label="Audience">
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            >
              <option value="ALL_PATIENTS">All Patients</option>
              <option value="ALL_CLINICS">All Clinics</option>
            </select>
          </Field>
          <Field label="Title">
            <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Special Offer!" />
          </Field>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Message Body</label>
            <textarea
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={4}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Your message here..."
            />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)} type="button">Cancel</Button>
            <Button type="submit" loading={sending}>Send Broadcast</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
