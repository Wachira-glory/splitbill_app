"use client";

import { useEffect, useState } from "react";
import { Receipt, Loader2, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase, getUndaAuthClient } from "@/lib/supabaseClient";

export default function BillsDashboard() {
  const router = useRouter();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.warn("You have not logged in found. Please log in.");
        setLoading(false);
        return;
      }

      console.log(" Current  User ID:", user.id);

      
      const authSupa = await getUndaAuthClient();
      
      // Here I fetch accounts filtered by the owner_id stored that ar stored in 'data' JSON field
      const { data: accounts, error: accError } = await authSupa
        .from("accounts")
        .select(`id, slug, balance, data, p_id, created_at`)
        .eq("p_id", 23)
        .order("created_at", { ascending: false }); 

      if (accError) throw accError;

      // The we fetch Payments only if accounts were found
      const accountIds = accounts.map(a => a.id);
      if (accountIds.length === 0) {
        setBills([]);
        setLoading(false);
        return;
      }

      const { data: payments, error: payError } = await authSupa
        .from("payments")
        .select("to_ac_id, amount, status")
        .in("to_ac_id", accountIds);

      if (payError) throw payError;

      const enrichedBills = accounts.map(acc => {
        const successfulPayments = (payments || []).filter(p => {
          const s = p.status?.toUpperCase();
          return p.to_ac_id === acc.id && ['SUCCESS', 'PAID', 'COMPLETED'].includes(s);
        });

        const realTimeCollected = successfulPayments.reduce((sum, p) => sum + p.amount, 0);

        return {
          ...acc,
          real_collected: realTimeCollected 
        };
      })
      .sort((a, b) => b.id - a.id); 

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
    <div className="p-8 max-w-5xl mx-auto min-h-screen bg-gray-50/50">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Bill Ledger</h1>
          <p className="text-slate-400 font-medium mt-1">Track collections vs goals</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="animate-spin text-slate-300" size={48}/>
          <p className="text-slate-400 font-bold animate-pulse">Syncing ledger...</p>
        </div>
      ) : bills.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-bold text-lg">No bills found.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {bills.map((bill) => {
            const goal = bill.data?.total_goal || 0;
            const collected = bill.real_collected || 0;
            const remaining = Math.max(goal - collected, 0);
            const progressPercent = goal > 0 ? Math.min((collected / goal) * 100, 100) : 0;
            
            // Reconciliation logic
            const isFullyPaid = collected >= goal && goal > 0;

            return (
              <div 
                key={bill.id}
                onClick={() => router.push(`/bill/${bill.slug}`)}
                className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 hover:border-purple-500 transition-all cursor-pointer shadow-sm hover:shadow-2xl relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isFullyPaid ? 'bg-green-100 text-green-600' : 'bg-purple-50 text-purple-600'}`}>
                      <Receipt size={32} />
                    </div>
                    <div>
                      <h3 className="font-black text-2xl text-slate-900">{bill.data?.name || "Untitled Bill"}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${isFullyPaid ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                          {isFullyPaid ? <CheckCircle2 size={10}/> : <Clock size={10}/>}
                          {isFullyPaid ? 'Fully Collected' : 'Collecting'}
                        </span>
                        <p className="text-[10px] text-slate-300 font-mono font-bold uppercase">{bill.slug}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-8 text-right">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Collected</p>
                        <p className="text-xl font-black text-slate-900">KES {collected.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Goal</p>
                        <p className="text-xl font-black text-purple-600 font-mono">KES {goal.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-sm font-bold text-slate-500">{progressPercent.toFixed(0)}% Complete</p>
                    {remaining > 0 && (
                      <p className="text-xs font-bold text-slate-400 italic">Need KES {remaining.toLocaleString()} more</p>
                    )}
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out ${isFullyPaid ? 'bg-green-500' : 'bg-purple-600'}`} 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                
                <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-100 group-hover:text-purple-500 transition-colors" size={32} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}