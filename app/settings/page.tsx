import { getDb } from '@/lib/db/supabaseStore';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { MerchantPolicies } from '@/types';

export default async function SettingsPage() {
  const policies = await (await getDb()).getPolicies();

  const handleSave = async (updatedPolicies: MerchantPolicies) => {
    'use server';
    await (await getDb()).updatePolicies(updatedPolicies);
  };

  return (
    <SettingsForm initialPolicies={policies} onSave={handleSave} />
  );
}
