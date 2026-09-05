'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink, CheckCircle2, RotateCcw } from 'lucide-react';

export function RazorpayPaymentButton({ caseId, status }: { caseId: string, status: string }) {
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleExecute = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recovery/${caseId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'payment_link' })
      });
      
      const data = await res.json();
      if (data.success && data.paymentLink?.short_url) {
        setPaymentUrl(data.paymentLink.short_url);
        toast({
          title: "Payment Link Generated",
          description: "Razorpay payment link has been created successfully.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to create link",
          description: data.error || "Simulated action executed.",
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'recovered') {
    return (
      <Button disabled className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Payment Recovered
      </Button>
    );
  }

  if (paymentUrl) {
    return (
      <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="w-full">
        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" variant="default">
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Payment Link
        </Button>
      </a>
    );
  }

  return (
    <Button 
      onClick={handleExecute} 
      disabled={loading || status === 'stopped'} 
      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
    >
      <RotateCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Generating...' : 'Execute Recovery Action'}
    </Button>
  );
}
