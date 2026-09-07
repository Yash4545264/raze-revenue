import { getDb } from '@/lib/db/supabaseStore';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { MerchantPolicies } from '@/types';

export default async function SettingsPage() {
  const policies = await (await getDb()).getPolicies();

  const handleSave = async (updatedPolicies: MerchantPolicies) => {
    'use server';
    try {
      await (await getDb()).updatePolicies(updatedPolicies);
      return { success: true };
    } catch (e: any) {
      console.error("Save error:", e);
      return { success: false, error: e.message || String(e) };
    }
  };

  return (
    <SettingsForm initialPolicies={policies} onSave={handleSave} />
  );
}
