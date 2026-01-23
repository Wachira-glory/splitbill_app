"use client";

import { useEffect, useState, use } from "react";
import { CheckCircle, Clock, RefreshCw, AlertCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase, getUndaAuthClient } from "@/lib/supabaseClient";

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
    const [accessDenied, setAccessDenied] = useState(false);

    const fetchBill = async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            
            // --- STEP 1: SECURITY CHECK (The Privacy Layer) ---
            // Check if this slug exists in YOUR private mirror
            const { data: mirrorData, error: mirrorError } = await supabase
                .from("unda_bills_mirror")
                .select("*")
                .eq("slug", billId)
                .maybeSingle();

            // If it doesn't exist in your mirror, RLS or the query will block you
            if (!mirrorData) {
                setAccessDenied(true);
                setLoading(false);
                return;
            }

            // --- STEP 2: FETCH REAL-TIME DATA FROM UNDA ---
            const authSupa = await getUndaAuthClient();
            const { data: accData, error: accError } = await authSupa
                .from("accounts")
                .select("id, uid, data, balance")
                .eq("slug", billId)
                .single();

            if (accError || !accData) return;

            setBill({
                bill_name: mirrorData.bill_name, // Use your private name
                total_amount: mirrorData.total_goal, // Use your private goal
                paybill: accData.uid
            });

            const { data: payments, error: payError } = await authSupa
                .from("payments")
                .select("*")
                .or(`from_ac_id.eq.${accData.id},to_ac_id.eq.${accData.id}`);

            if (payments && payments.length > 0) {
                const mapped = payments.map(p => {
                    let displayName = "Participant";
                    const dataName = p.data?.details?.customer_name || p.data?.details?.source || p.data?.customer_name;
                    const idataName = p.idata?.customer_name || p.idata?.full_name;
                    
                    if (dataName) displayName = dataName;
                    else if (idataName) displayName = idataName;

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
                // Fallback to participants saved in your private Mirror
                if (mirrorData.raw_data?.participants) {
                    const fallback = mirrorData.raw_data.participants.map((p: any) => ({
                        name: p.name,
                        phone: p.phone,
                        amount: p.amount,
                        status: 'pending'
                    }));
                    setParticipants(fallback);
                }
            }
        } catch (err) {
            console.error("Tracking Error:", err);
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    useEffect(() => {
        if (billId) {
            fetchBill();
            const interval = setInterval(() => fetchBill(true), 3000);
            return () => clearInterval(interval);
        }
    }, [billId]);

    // UI for Access Denied
    if (accessDenied) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
            <AlertCircle className="text-red-500 mb-4" size={64} />
            <h1 className="text-2xl font-black">Access Denied</h1>
            <p className="text-gray-500 mt-2">You don't have permission to view this bill tracking page.</p>
            <button onClick={() => router.push('/dashboard/bills')} className="mt-6 bg-black text-white px-8 py-3 rounded-2xl font-bold">
                Back to My Bills
            </button>
        </div>
    );

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <RefreshCw className="animate-spin text-purple-600 mb-4" size={48} />
            <p className="text-gray-500 font-bold tracking-widest uppercase text-xs">Verifying Access...</p>
        </div>
    );

    // ... (Keep the rest of your JSX exactly the same)
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