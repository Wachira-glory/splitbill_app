"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Receipt, Loader2, Plus, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

const supabaseUrl = process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!;

export default function BillsDashboard() {
  const router = useRouter();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getAuthClient = async () => {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": supabaseAnonKey },
      body: JSON.stringify({
        email: process.env.NEXT_PUBLIC_UNDA_API_USERNAME,
        password: process.env.NEXT_PUBLIC_UNDA_API_PASSWORD,
      })
    });
    const data = await response.json();
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${data.access_token}` } }
    });
  };

  const fetchBills = async () => {
    setLoading(true);
    try {
      const authSupa = await getAuthClient();
      
      const { data, error } = await authSupa
        .from("accounts")
        .select(`id, slug, balance, data, p_id, created_at`)
        .eq("p_id", 23) 
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBills(data || []);
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
        <button 
          onClick={() => router.push('/create')}
          className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-black/10"
        >
          <Plus size={20} /> New Bill
        </button>
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
            // LOGIC: Goal is what we want, Balance is what we have collected
            const goal = bill.data?.total_goal || 0;
            const collected = bill.balance || 0;
            const remaining = Math.max(goal - collected, 0);
            
            // Percentage Calculation
            const progressPercent = goal > 0 ? Math.min((collected / goal) * 100, 100) : 0;
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

                {/* Progress Bar Section */}
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