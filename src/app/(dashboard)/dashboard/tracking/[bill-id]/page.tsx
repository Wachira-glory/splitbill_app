"use client";

import { useEffect, useState, use, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle, Clock, RefreshCw, XCircle, ArrowLeft, Terminal, Activity } from "lucide-react";
import { useRouter } from "next/navigation";

const undaSupa = createClient(
  process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!
);

export default function PaymentTrackingPage({ params }: { params: Promise<{ "bill-id": string }> }) {
  const resolvedParams = use(params);
  const billSlug = resolvedParams["bill-id"];
  const router = useRouter();

  const [bill, setBill] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setSystemLogs(prev => [`${new Date().toLocaleTimeString()} » ${msg}`, ...prev].slice(0, 5));
  };

  const syncUndaTruth = useCallback(async () => {
    try {
      const authRes = await fetch(`${process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY! },
        body: JSON.stringify({
          email: process.env.NEXT_PUBLIC_UNDA_API_USERNAME,
          password: process.env.NEXT_PUBLIC_UNDA_API_PASSWORD,
        })
      });
      const { access_token } = await authRes.json();

      const { data: accData } = await undaSupa
        .from("accounts")
        .select("*, items(*)")
        .eq("slug", billSlug)
        .eq("p_id", 23)
        .setHeader('Authorization', `Bearer ${access_token}`)
        .maybeSingle();

      if (accData) {
        setBill(accData);
        setItems(accData.items || []);

        const { data: payData, error: payError } = await undaSupa
          .from("payments")
          .select("*")
          .eq("to_ac_id", accData.id) 
          .order('created_at', { ascending: false })
          .setHeader('Authorization', `Bearer ${access_token}`);

        if (payError) throw payError;
        
        setPayments(payData || []);
        addLog(`Gateway Synced: Found ${payData?.length || 0} transaction attempts`);
      }
    } catch (err: any) {
      addLog(`Sync Error: Gateway Unreachable`);
    } finally {
      setLoading(false);
    }
  }, [billSlug]);

  useEffect(() => {
    syncUndaTruth();
    const interval = setInterval(syncUndaTruth, 4000);
    return () => clearInterval(interval);
  }, [syncUndaTruth]);

  const resolveStatus = (item: any) => {
    const phone = item.data?.phone?.replace(/\D/g, '').slice(-9);
    const payment = payments.find(p => {
      const pPhone = (p.data?.phone || p.idata?.customer_no || p.reference)?.replace(/\D/g, '').slice(-9);
      return pPhone === phone;
    });

    if (!payment) return 'pending';
    const s = payment.status?.toLowerCase();
    if (s === 'completed' || s === 'paid' || payment.idata?.ResultCode === "0") return 'paid';
    if (s === 'cancelled' || s === 'failed' || payment.idata?.ResultCode === "1032") return 'failed';
    return 'processing';
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <Activity className="animate-pulse text-blue-600 mb-2" size={32} />
      <p className="font-bold text-gray-400 text-[10px] tracking-widest uppercase">Initializing Unda Feed</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFE] text-slate-900 p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        
        <button onClick={() => router.back()} className="mb-8 flex items-center gap-2 text-slate-400 font-bold text-xs hover:text-blue-600 transition-colors uppercase tracking-widest">
          <ArrowLeft size={14} /> Back to History
        </button>

        {/* Bill Info */}
        <div className="mb-10">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">{bill?.data?.name || "Payment"}</h1>
              <p className="text-[10px] font-mono text-slate-400 mt-2">ACCOUNT_ID: {bill?.id}</p>
            </div>
            <div className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-[10px] font-black border border-green-500/20">LIVE_SYNC</div>
          </div>
        </div>

        {/* Participants */}
        <div className="space-y-4 mb-12">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Participants</h3>
          {items.map((item) => {
            const status = resolveStatus(item);
            return (
              <div key={item.id} className="bg-white rounded-[1.5rem] p-5 flex items-center justify-between border border-slate-100 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${
                    status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-300'
                  }`}>
                    {item.data?.name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{item.data?.name}</h4>
                    <p className="text-[10px] font-mono text-slate-400">{item.data?.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900">KES {item.amount}</p>
                  <StatusBadge status={status} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Integrated System Logs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between ml-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gateway Activity</h3>
            <Terminal size={14} className="text-slate-300" />
          </div>
          <div className="bg-slate-900 rounded-[1.5rem] p-6 shadow-xl border border-white/5">
            <div className="space-y-2 font-mono text-[10px]">
              {systemLogs.length > 0 ? (
                systemLogs.map((log, i) => (
                  <div key={i} className={`flex gap-3 ${i === 0 ? "text-blue-400" : "text-slate-500"}`}>
                    <span className="opacity-30">[{systemLogs.length - i}]</span>
                    <span>{log}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-600 italic">Waiting for gateway handshake...</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') return <span className="text-green-500 text-[9px] font-black flex items-center gap-1 justify-end uppercase mt-1 tracking-tighter"><CheckCircle size={12}/> Success</span>;
  if (status === 'failed') return <span className="text-red-500 text-[9px] font-black flex items-center gap-1 justify-end uppercase mt-1 tracking-tighter"><XCircle size={12}/> Cancelled</span>;
  if (status === 'processing') return <span className="text-blue-500 text-[9px] font-black flex items-center gap-1 justify-end uppercase mt-1 tracking-tighter"><RefreshCw size={12} className="animate-spin"/> STK Active</span>;
  return <span className="text-slate-300 text-[9px] font-black flex items-center gap-1 justify-end uppercase mt-1 tracking-tighter"><Clock size={12}/> No Attempt</span>;
}