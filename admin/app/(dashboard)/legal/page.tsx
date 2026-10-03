'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Alert, Spinner } from '@/components/Feedback';
import { Field, Textarea } from '@/components/Input';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth';

interface LegalDoc {
  privacyPolicy: string;
  termsAndConditions: string;
}

export default function LegalPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('SETTINGS_UPDATE');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const doc = await api.get<LegalDoc>('/admin/legal');
      setPrivacyPolicy(doc.privacyPolicy || '');
      setTermsAndConditions(doc.termsAndConditions || '');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      const next = await api.patch<LegalDoc>('/admin/legal', {
        privacyPolicy,
        termsAndConditions,
      });
      setPrivacyPolicy(next.privacyPolicy || '');
      setTermsAndConditions(next.termsAndConditions || '');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Legal Policies" 
        description="Manage the platform's Privacy Policy and Terms &amp; Conditions." 
      />

      <Card>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
            <Spinner /> Loading policies…
          </div>
        ) : (
          <div className="space-y-6">
            {error && <Alert tone="error">{error}</Alert>}
            {success && <Alert tone="success">Legal policies updated successfully.</Alert>}
            
            <Field label="Privacy Policy" hint="Content displayed in the app for Privacy Policy.">
              <Textarea
                rows={12}
                value={privacyPolicy}
                onChange={(e) => setPrivacyPolicy(e.target.value)}
                disabled={!canEdit || busy}
              />
            </Field>

            <Field label="Terms and Conditions" hint="Content displayed in the app for Terms & Conditions.">
              <Textarea
                rows={12}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                disabled={!canEdit || busy}
              />
            </Field>

            {canEdit && (
              <div className="flex justify-end">
                <Button onClick={save} disabled={busy} loading={busy}>
                  Save policies
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
