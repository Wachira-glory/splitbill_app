"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@supabase/supabase-js";
import { Wallet, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const supabaseUrl = process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!;

export default function BillDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  // Mirrors your working Ledger auth logic
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

  const loadBill = async () => {
    try {
      const authSupa = await getAuthClient();
      
      // Fetch the bill, its items, and payments linked to this bill
      const { data, error } = await authSupa
        .from("accounts")
        .select("*, items(*), payments:payments!payments_to_ac_id_fkey(*)")
        .eq("slug", slug)
        .single();
      
      if (error) throw error;
      setBill(data);
    } catch (err) {
      console.error("Detail Fetch Error:", err);
      setBill(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBill();
    // Automatic reconciliation check every 10 seconds
    const interval = setInterval(loadBill, 10000); 
    return () => clearInterval(interval);
  }, [slug]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <Loader2 className="animate-spin text-slate-300" size={40} />
    </div>
  );

  if (!bill) return (
    <div className="p-20 text-center">
      <h2 className="text-xl font-bold">Bill not found</h2>
      <button onClick={() => router.push('/dashboard/bills')} className="text-blue-500 mt-4 underline">
        Back to Ledger
      </button>
    </div>
  );

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen bg-white">
      <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-400">
        <ArrowLeft size={16} /> Back
      </button>

      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 leading-tight">{bill.data?.name || "Untitled Bill"}</h1>
        <div className="mt-2 flex justify-between items-end">
          <p className="text-slate-400 font-medium font-mono text-xs">{bill.slug}</p>
          <p className="text-2xl font-black">KES {bill.balance}</p>
        </div>
      </header>

      <div className="space-y-4">
        {bill.items?.map((item: any) => {
          // Check if there is a completed payment for this participant's phone number
          const hasPaid = bill.payments?.some(
            (p: any) => p.customer_phone === item.data.phone && (p.status === "COMPLETED" || p.status === "completed")
          );

          return (
            <div key={item.id} className="p-5 rounded-3xl border border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-900">{item.data.name}</p>
                <p className="text-xs text-slate-400 font-mono">{item.data.phone}</p>
              </div>
              
              {hasPaid ? (
                <div className="bg-green-100 text-green-600 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1">
                  <CheckCircle2 size={14} /> PAID
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="font-black text-slate-900">KES {item.amount}</p>
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Wallet size={18} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-12 p-6 bg-slate-900 rounded-[2rem] text-white">
        <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Automatic Reconciliation</p>
        <p className="text-sm font-bold mt-1 text-slate-300">Updates automatically via M-Pesa hooks.</p>
      </div>
    </div>
  );
}