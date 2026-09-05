'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Save, Key } from 'lucide-react';
import { MerchantPolicies } from '@/types';

export function SettingsForm({ initialPolicies, onSave }: { initialPolicies: MerchantPolicies, onSave: (policies: MerchantPolicies) => Promise<void> }) {
  const { toast } = useToast();
  const [policies, setPolicies] = useState(initialPolicies);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(policies);
      toast({
        title: 'Policies Updated',
        description: 'Your recovery policies have been saved successfully.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update policies.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings & Policies</h1>
        <p className="text-muted-foreground">Configure AI bounds, escalation thresholds, and recovery limits.</p>
      </div>

      <Card className="border-indigo-100 shadow-sm">
        <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            Deterministic Policy Engine Rules
          </CardTitle>
          <CardDescription>
            These rules act as a hard boundary. The AI Agent cannot bypass these limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="max_retries">Max Auto-Retries</Label>
              <Input 
                id="max_retries" 
                type="number" 
                value={policies.max_retries || 0}
                onChange={(e) => setPolicies({ ...policies, max_retries: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Max times the system can retry a payment without user consent.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_contact_attempts">Max Contact Attempts</Label>
              <Input 
                id="max_contact_attempts" 
                type="number" 
                value={policies.max_contact_attempts || 0}
                onChange={(e) => setPolicies({ ...policies, max_contact_attempts: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Max emails or SMS sent to a customer per case.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_auto_recovery_amount">Auto-Recovery Limit (₹)</Label>
              <Input 
                id="max_auto_recovery_amount" 
                type="number" 
                value={policies.max_auto_recovery_amount || 0}
                onChange={(e) => setPolicies({ ...policies, max_auto_recovery_amount: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Any amount above this requires human approval.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="low_confidence_threshold">AI Confidence Threshold</Label>
              <Input 
                id="low_confidence_threshold" 
                type="number" 
                step="0.05"
                min="0"
                max="1"
                value={policies.low_confidence_threshold || 0}
                onChange={(e) => setPolicies({ ...policies, low_confidence_threshold: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Minimum confidence (0.0 - 1.0) required to auto-execute an action.</p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Policies'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-emerald-100 shadow-sm">
        <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
          <CardTitle className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Intervention Costs & Margins
          </CardTitle>
          <CardDescription>
            The Strategy Engine uses these exact vendor costs to calculate Expected Net Recovery.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="cost_payment_link">Payment Link SMS Cost (₹)</Label>
              <Input 
                id="cost_payment_link" 
                type="number" step="0.01"
                value={policies.cost_payment_link ?? 0.00}
                onChange={(e) => setPolicies({ ...policies, cost_payment_link: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Razorpay native SMS/Email is typically free.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_customer_reminder">WhatsApp Reminder Cost (₹)</Label>
              <Input 
                id="cost_customer_reminder" 
                type="number" step="0.01"
                value={policies.cost_customer_reminder ?? 0.11}
                onChange={(e) => setPolicies({ ...policies, cost_customer_reminder: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Meta utility API base is ₹0.11 + your vendor markup.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_switch_payment_method">Fallback SMS Cost (₹)</Label>
              <Input 
                id="cost_switch_payment_method" 
                type="number" step="0.01"
                value={policies.cost_switch_payment_method ?? 0.18}
                onChange={(e) => setPolicies({ ...policies, cost_switch_payment_method: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">DLT scrubbed SMS via Twilio/MSG91.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_human_escalation">Human Agent Cost (₹)</Label>
              <Input 
                id="cost_human_escalation" 
                type="number" step="0.01"
                value={policies.cost_human_escalation ?? 10.40}
                onChange={(e) => setPolicies({ ...policies, cost_human_escalation: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Est. cost for 5 mins of BPO support.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gateway_fee_rate">Payment Gateway Fee (%)</Label>
              <Input 
                id="gateway_fee_rate" 
                type="number" step="0.01"
                value={(policies.gateway_fee_rate ?? 0.0236) * 100}
                onChange={(e) => setPolicies({ ...policies, gateway_fee_rate: parseFloat(e.target.value) / 100 })}
              />
              <p className="text-xs text-muted-foreground">2% + 18% GST = 2.36%. Deducted on success.</p>
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Costs'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-indigo-600" />
            Razorpay API Keys
          </CardTitle>
          <CardDescription>
            Enter your Live or Test keys. Your custom webhook URL is: <br />
            <code className="text-xs bg-gray-100 p-1 rounded mt-2 block">
              https://api.razerevenue.com/api/webhooks/razorpay?merchant_id={policies.merchant_id}
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="razorpay_key_id">Razorpay Key ID</Label>
              <Input 
                id="razorpay_key_id" 
                type="text" 
                value={policies.razorpay_key_id || ''} 
                onChange={(e) => setPolicies({ ...policies, razorpay_key_id: e.target.value })}
                placeholder="rzp_live_..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="razorpay_key_secret">Razorpay Key Secret</Label>
              <Input 
                id="razorpay_key_secret" 
                type="password" 
                value={policies.razorpay_key_secret || ''} 
                onChange={(e) => setPolicies({ ...policies, razorpay_key_secret: e.target.value })}
                placeholder="••••••••••••••••••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="razorpay_webhook_secret">Razorpay Webhook Secret</Label>
              <Input 
                id="razorpay_webhook_secret" 
                type="password" 
                value={policies.razorpay_webhook_secret || ''} 
                onChange={(e) => setPolicies({ ...policies, razorpay_webhook_secret: e.target.value })}
                placeholder="Your Custom Secret"
              />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save API Keys'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-gray-500" />
            Website Integration (Universal JS Agent)
          </CardTitle>
          <CardDescription>
            Copy and paste this script into the <code>&lt;head&gt;</code> of your website to automatically track cart abandonments and checkout crashes. No coding required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 rounded-md p-4 overflow-x-auto">
            <pre className="text-sm text-gray-100">
              <code>{`<script src="http://localhost:3000/agent.js?merchant_id=your_merchant_id"></script>`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
