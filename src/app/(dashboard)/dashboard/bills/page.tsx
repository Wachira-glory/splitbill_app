"use client";

import { useEffect, useState } from "react";
import { Receipt, Loader2, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase, getUndaAuthClient } from "@/lib/supabaseClient";

export default function BillsDashboard() {
  const router = useRouter();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBills = async () => {
    setLoading(true);
    try {
      // 1. Fetch from YOUR PRIVATE MIRROR (RLS handles the email filtering)
      // This table ONLY returns bills created by the logged-in email.
      const { data: mirrorBills, error: mirrorError } = await supabase
        .from("unda_bills_mirror")
        .select("*")
        .order("updated_at", { ascending: false });

      if (mirrorError) throw mirrorError;
      if (!mirrorBills || mirrorBills.length === 0) {
        setBills([]);
        return;
      }

      // 2. Connect to Unda to get the real-time payment status
      const authSupa = await getUndaAuthClient();
      const slugs = mirrorBills.map(b => b.slug);

      // Fetch the actual accounts from Unda using your private slugs
      const { data: undaAccounts, error: accError } = await authSupa
        .from("accounts")
        .select(`id, slug, balance`)
        .in("slug", slugs)
        .eq("p_id", 23);

      if (accError) throw accError;

      const accountIds = undaAccounts?.map(a => a.id) || [];

      // 3. Fetch successful payments for these specific accounts
      let payments: any[] = [];
      if (accountIds.length > 0) {
        const { data: payData, error: payError } = await authSupa
          .from("payments")
          .select("to_ac_id, amount, status")
          .in("to_ac_id", accountIds);
        
        if (payError) throw payError;
        payments = payData || [];
      }

      // 4. Combine Mirror Data with Unda Payment Data
      const enrichedBills = mirrorBills.map(mirror => {
        // Find the corresponding Unda account ID
        const undaAcc = undaAccounts?.find(ua => ua.slug === mirror.slug);
        
        // Calculate collected amount from payments
        const collected = payments
          .filter(p => p.to_ac_id === undaAcc?.id && ['SUCCESS', 'PAID', 'COMPLETED'].includes(p.status?.toUpperCase()))
          .reduce((sum, p) => sum + p.amount, 0);

        return {
          ...mirror,
          real_collected: collected,
          // Use data from mirror if Unda data is missing
          display_name: mirror.bill_name,
          goal: mirror.total_goal
        };
      });

      setBills(enrichedBills);
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900">Bill Ledger</h1>
        <p className="text-slate-400 font-medium mt-1">Private tracking for {bills.length} bills</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="animate-spin text-purple-600" size={48}/>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Securing your data...</p>
        </div>
      ) : bills.length === 0 ? (
        <div className="text-center py-32 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
           <p className="font-black text-slate-400">No bills found for this account.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {bills.map((bill) => {
            const goal = bill.goal || 0;
            const collected = bill.real_collected || 0;
            const progress = goal > 0 ? Math.min((collected / goal) * 100, 100) : 0;
            const isFullyPaid = collected >= goal && goal > 0;

            return (
              <div key={bill.id} onClick={() => router.push(`/dashboard/tracking/${bill.slug}`)} className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 hover:border-purple-500 transition-all cursor-pointer relative shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isFullyPaid ? 'bg-green-100 text-green-600' : 'bg-purple-50 text-purple-600'}`}><Receipt size={32} /></div>
                    <div>
                      <h3 className="font-black text-2xl">{bill.display_name || "Untitled Bill"}</h3>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${isFullyPaid ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                        {isFullyPaid ? 'Fully Collected' : 'Collecting'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Goal: KES {goal.toLocaleString()}</p>
                    <p className="text-xl font-black">Collected: KES {collected.toLocaleString()}</p>
                  </div>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${isFullyPaid ? 'bg-green-500' : 'bg-purple-600'}`} style={{ width: `${progress}%` }} />
                </div>
                <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-100 group-hover:text-purple-500 transition-all" size={32} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}