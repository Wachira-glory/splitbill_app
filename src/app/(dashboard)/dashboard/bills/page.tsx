"use client";

import { useEffect, useState, useCallback } from "react";
import { Receipt, Loader2, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { AppBill } from "../../../../../types";

export default function BillsDashboard() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  
  const [bills, setBills] = useState<AppBill[] | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const fetchBills = useCallback(async () => {
    if (authLoading || !authUser) return;
    
    setIsDataLoading(true);

    try {
      // We no longer call Supabase or Unda directly.
      // We just call our own secure endpoint.
      const response = await fetch('/api/bills');
      
      if (!response.ok) throw new Error('Failed to fetch ledger');
      
      const data = await response.json();
      setBills(data);
    } catch (error) {
      console.error('Dashboard Fetch Error:', error);
      setBills([]);
    } finally {
      setIsDataLoading(false);
    }
  }, [authUser, authLoading]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Handle Loading States
  if (authLoading || (bills === null && isDataLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="animate-spin text-purple-600" size={48}/>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {authLoading ? "Verifying Identity..." : "Fetching Ledger..."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900">Bill Ledger</h1>
          <p className="text-slate-400 font-medium mt-1">
            Tracking {bills?.length || 0} bills for {authUser?.email}
          </p>
        </div>
      </div>

      {!bills || bills.length === 0 ? (
        <div className="text-center py-32 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
           <p className="font-black text-slate-400">Your ledger is currently empty.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {bills.map((bill) => {
             const goal = Number(bill.goal) || 0;
             const collected = Number(bill.real_collected) || 0;
             const progress = goal > 0 ? Math.min((collected / goal) * 100, 100) : 0;
             
             return (
               <div 
                 key={bill.id} 
                 onClick={() => router.push(`/dashboard/tracking/${bill.slug}`)} 
                 className="bg-white p-8 rounded-[2.5rem] border border-slate-100 hover:border-purple-500 cursor-pointer shadow-sm relative transition-all group"
               >
                  <div className="flex justify-between items-center mb-6">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                           <Receipt size={24} />
                        </div>
                        <h3 className="font-black text-2xl">{bill.bill_name || bill.display_name}</h3>
                     </div>
                     <p className="font-black text-lg text-slate-900">KES {collected.toLocaleString()}</p>
                  </div>
                  
                  <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-tighter">
                    <span>Progress</span>
                    <span>Goal: KES {goal.toLocaleString()}</span>
                  </div>

                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-purple-600 transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-200 group-hover:text-purple-500 transition-colors" />
               </div>
             );
          })}
        </div>
      )}
    </div>
  );
}