"use client";

import { useEffect, useState, use } from "react";
import { CheckCircle, Clock, RefreshCw, AlertCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase, getUndaAuthClient } from "@/lib/supabaseClient";

// Helper to map Unda status to local UI states
const mapUndaStatus = (undaStatus: string): string => {
    if (!undaStatus) return 'pending';
    const s = undaStatus.toUpperCase();
    if (['COMPLETED', 'SUCCESS', 'PAID'].includes(s)) return 'paid';
    if (['PROCESSING', 'PENDING', 'INITIATED', 'SENT'].includes(s)) return 'pending';
    if (['FAILED', 'EXPIRED', 'CANCELLED', 'REJECTED', 'DECLINED', 'ERROR'].includes(s)) return 'failed';
    return 'pending'; 
};

export default function PaymentTrackingPage({ params }: { params: Promise<{ "bill-id": string }> }) {
    const resolvedParams = use(params);
    const billId = resolvedParams["bill-id"];
    const router = useRouter();

    const [bill, setBill] = useState<any>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBill = async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            
            // Get the pre-authenticated Unda client from your lib
            const authSupa = await getUndaAuthClient();

            // 1. Fetch Account Details
            const { data: accData, error: accError } = await authSupa
                .from("accounts")
                .select("id, uid, data, balance")
                .eq("slug", billId)
                .single();

            if (accError || !accData) {
                console.error("DEBUG: Account Query Error:", accError);
                return;
            }

            setBill({
                bill_name: accData.data?.name || "Bill",
                total_amount: accData.data?.total_goal || 0,
                paybill: accData.uid
            });

            // 2. Fetch Payments associated with this Account ID
            const { data: payments, error: payError } = await authSupa
                .from("payments")
                .select("*")
                .or(`from_ac_id.eq.${accData.id},to_ac_id.eq.${accData.id}`);

            if (payError) {
                console.error("DEBUG: Payments Query Error:", payError);
            }

            if (payments && payments.length > 0) {
                const mapped = payments.map(p => {
                    let displayName = "Participant";

                    // Name Extraction Logic
                    const dataName = p.data?.details?.customer_name || p.data?.details?.source || p.data?.customer_name;
                    const idataName = p.idata?.customer_name || p.idata?.full_name;
                    const message = p.data?.details?.message || p.details || "";

                    if (dataName) {
                        displayName = dataName;
                    } else if (idataName) {
                        displayName = idataName;
                    } else if (message.includes("SplitBill: ")) {
                        displayName = message.split("SplitBill: ")[1];
                    }

                    return {
                        id: p.id,
                        name: displayName,
                        phone: p.uid, 
                        amount: p.amount,
                        status: mapUndaStatus(p.status)
                    };
                });
                setParticipants(mapped);
            } else {
                // Fallback to showing participants from account metadata if no payments exist yet
                if (accData.data?.participants) {
                    const fallback = accData.data.participants.map((p: any) => ({
                        name: p.name,
                        phone: p.phone,
                        amount: p.target_amount || p.amount,
                        status: 'pending'
                    }));
                    setParticipants(fallback);
                }
            }
        } catch (err) {
            console.error("DEBUG: Unexpected System Error:", err);
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    useEffect(() => {
        if (billId) {
            fetchBill();
            // Poll every 3 seconds for real-time status updates
            const interval = setInterval(() => fetchBill(true), 3000);
            return () => clearInterval(interval);
        }
    }, [billId]);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <RefreshCw className="animate-spin text-purple-600 mb-4" size={48} />
            <p className="text-gray-500 font-bold">Synchronizing Tracker...</p>
        </div>
    );

    const paidCount = participants.filter(p => p.status === "paid").length;
    const progress = participants.length > 0 ? (paidCount / participants.length) * 100 : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
            <div className="max-w-4xl mx-auto pt-8">
                <button 
                    onClick={() => router.push('/dashboard/bills')} 
                    className="flex items-center gap-2 text-purple-600 font-bold mb-6 hover:translate-x-[-4px] transition-transform"
                >
                    <ArrowLeft size={20} /> Back to Ledger
                </button>

                <div className="bg-white rounded-3xl shadow-xl p-8 mb-6 border border-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-black text-gray-800">{bill?.bill_name}</h2>
                            <p className="text-4xl font-black text-purple-600">KES {bill?.total_amount?.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                            <p className="font-bold text-slate-900">{paidCount} of {participants.length} Paid</p>
                        </div>
                    </div>
                    
                    <div className="mt-6">
                        <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500">{progress.toFixed(0)}% Collected</span>
                        </div>
                        <div className="bg-gray-100 h-3 rounded-full overflow-hidden">
                            <div 
                                className="bg-green-500 h-full transition-all duration-700 ease-out" 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    {participants.map((p, idx) => (
                        <div key={idx} className="bg-white rounded-2xl p-5 flex items-center justify-between border border-white shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${p.status === 'paid' ? 'bg-green-500' : 'bg-purple-600'}`}>
                                    {p.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{p.name}</h3>
                                    <p className="text-xs text-gray-500 font-mono">{p.phone}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <p className="text-xl font-black text-slate-900">KES {p.amount?.toLocaleString()}</p>
                                <div className="w-28 flex justify-end">
                                    {p.status === 'paid' ? (
                                        <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1">
                                            <CheckCircle size={14}/> Paid
                                        </span>
                                    ) : p.status === 'failed' ? (
                                        <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1">
                                            <AlertCircle size={14}/> Failed
                                        </span>
                                    ) : (
                                        <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1">
                                            <Clock size={14} className="animate-pulse"/> Pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}