'use client';

import { Bell, Search, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input 
            type="search" 
            placeholder="Search payments, customers, or recovery cases..." 
            className="w-full bg-gray-50 pl-9 border-gray-200 focus-visible:ring-indigo-500"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-200 shadow-sm">
          <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
          Simulation Mode Active
        </div>
        <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
