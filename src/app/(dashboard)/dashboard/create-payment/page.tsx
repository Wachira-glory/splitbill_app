"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, Send, RefreshCw, ArrowLeft, Users, Wallet } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const undaSupa = createClient(
    process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!
);

const normalizePhoneNumber = (phone: string): string => {
    if (!phone) return "";
    const p = String(phone).replace(/\s/g, '');
    if (p.startsWith('07')) return '254' + p.substring(1);
    if (p.startsWith('011')) return '25411' + p.substring(3);
    return p;
};

const getUndaJWT = async (): Promise<string | null> => {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!
            },
            body: JSON.stringify({
                email: process.env.NEXT_PUBLIC_UNDA_API_USERNAME,
                password: process.env.NEXT_PUBLIC_UNDA_API_PASSWORD,
            })
        });
        const data = await response.json();
        return data.access_token || null; 
    } catch (error) {
        console.error("Failed to generate new JWT:", error);
        return null;
    }
};

const CreatePaymentPage = () => {
    const router = useRouter();
    const [billName, setBillName] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [paybill, setPaybill] = useState('');
    const [defaultChannelName, setDefaultChannelName] = useState('');
    const [numberOfPeople, setNumberOfPeople] = useState('');
    const [phoneNumbers, setPhoneNumbers] = useState([{ id: 1, number: '', name: '', amount: '' }]);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [generatedBill, setGeneratedBill] = useState<any>(null);
    const [activeDbId, setActiveDbId] = useState<number | null>(null); 
    const [sendingStatus, setSendingStatus] = useState<{ [key: string]: 'idle' | 'sending' | 'sent' | 'failed' }>({});
    const [loading, setLoading] = useState(false);
    const [activeChannelId, setActiveChannelId] = useState<number | null>(null);


    const splitEqually = () => {
        if (!totalAmount || !numberOfPeople) return;
        const total = parseFloat(totalAmount);
        const count = parseInt(numberOfPeople);
        const roundedShare = Math.round(total / count);
        setPhoneNumbers(prev => {
            let currentSum = 0;
            return prev.map((p, idx) => {
                if (idx === prev.length - 1) return { ...p, amount: (total - currentSum).toString() };
                currentSum += roundedShare;
                return { ...p, amount: roundedShare.toString() };
            });
        });
    };
// Replace your existing fetchDefaultChannel with this:
const fetchDefaultChannel = useCallback(async () => {
    const token = await getUndaJWT();
    if (!token) return;

    const { data, error } = await undaSupa
        .from('channels_public_v')
        .select('id, uid, name') // Get the 'id' here
        .eq('p_id', 23)
        .eq('idata->is_default', true)
        .single()
        .setHeader('Authorization', `Bearer ${token}`);

    if (data) {
        setPaybill(data.uid);
        setDefaultChannelName(data.name);
        setActiveChannelId(data.id); // Store the actual database ID
    }
}, []);

    useEffect(() => {
        fetchDefaultChannel();
    }, [fetchDefaultChannel]);

    const handleGenerateBill = async () => {
    if (!billName || !totalAmount) return alert("Fill in details");
    setLoading(true);

    try {
        const jwtToken = await getUndaJWT(); 
        if (!jwtToken) throw new Error("Authentication failed.");

        const billSlug = `bill-${Date.now()}`;
        const PLATFORM_ID_INT = 23;
        const targetGoal = parseFloat(totalAmount);

        // THE RIGHT WAY:
        // 1. Balance starts at 0.
        // I am storing in the data object.
        const accountPayload = {
            uid: billSlug,
            slug: billSlug,
            data: { 
                name: billName,
                total_goal: targetGoal // This is your Target Amount
            },
            balance: 0, 
            type: 'bill',
            status: 'active',
            p_id: PLATFORM_ID_INT 
        };

        const { data: undaAccount, error: accountError } = await undaSupa
            .from('accounts')
            .insert([accountPayload])
            .select('id')
            .single()
            .setHeader('Authorization', `Bearer ${jwtToken}`);

        if (accountError) throw new Error(`Account Error: ${accountError.message}`);

        setActiveDbId(undaAccount.id);

        // Create the items (the participants)
        const itemsToInsert = phoneNumbers.map(p => ({
            account_id: undaAccount.id,
            amount: parseFloat(p.amount),
            p_id: PLATFORM_ID_INT,
            data: { name: p.name, phone: p.number }
        }));

        const { error: itemsError } = await undaSupa
            .from('items')
            .insert(itemsToInsert)
            .setHeader('Authorization', `Bearer ${jwtToken}`);

        if (itemsError) throw new Error(`Items Error: ${itemsError.message}`);

        setGeneratedBill({ 
            id: billSlug, 
            bill_name: billName, 
            total_amount: totalAmount, 
            participants: phoneNumbers 
        });
        setShowConfirmation(true);

    } catch (err: any) {
        console.error("Error:", err);
        alert(err.message);
    } finally {
        setLoading(false);
    }
};

const handleSendIndividualSTK = async (participant: any) => {
    // Log the actual DB ID of the channel instead of the key
    console.log("FRONTEND SENDING CHANNEL ID:", activeChannelId); 
    
    if (!activeDbId) return alert("System Error: Account ID missing.");
    if (!activeChannelId) return alert("Please select an active channel first.");
    
    const phoneToUse = normalizePhoneNumber(participant.number || participant.phone);
    setSendingStatus(prev => ({ ...prev, [participant.number]: 'sending' }));

    try {
        const jwtToken = await getUndaJWT();
        const response = await fetch('/api/unda-charge', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${jwtToken}` 
            },
            body: JSON.stringify({
                customer_no: phoneToUse,
                amount: Number(participant.amount),
                account_id: activeDbId,
                // Pass the numeric database ID of the channel
                channel_id: activeChannelId, 
                reference: generatedBill.id, 
            })
        });
        
        if (response.ok) {
            setSendingStatus(prev => ({ ...prev, [participant.number]: 'sent' }));
        } else {
            setSendingStatus(prev => ({ ...prev, [participant.number]: 'failed' }));
            const errorData = await response.json();
            console.error("Payment Error:", errorData);
        }
    } catch (error) {
        console.error("Network Error:", error);
        setSendingStatus(prev => ({ ...prev, [participant.number]: 'failed' }));
    }
};

    useEffect(() => {
        const count = parseInt(numberOfPeople);
        if (count > 0) setPhoneNumbers(prev => prev.length === count ? prev : (prev.length < count ? [...prev, ...Array.from({length: count - prev.length}).map(() => ({id: Math.random(), number:'', name:'', amount:''}))] : prev.slice(0, count)));
    }, [numberOfPeople]);

    if (showConfirmation && generatedBill) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 md:p-8">
                <div className="max-w-3xl mx-auto">
                    <button onClick={() => setShowConfirmation(false)} className="flex items-center gap-2 text-purple-600 font-bold mb-6 hover:translate-x-1 transition-transform">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                        <div className="bg-purple-600 p-8 text-white">
                            <h2 className="text-3xl font-black mb-1">{generatedBill.bill_name}</h2>
                            <p className="opacity-80 font-medium font-mono text-sm tracking-tighter">REF: {generatedBill.id}</p>
                            <div className="mt-6 flex justify-between items-end">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest opacity-70">Total Goal</p>
                                    <p className="text-4xl font-black">KES {generatedBill.total_amount}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 space-y-4">
                            {generatedBill.participants.map((p: any, idx: number) => {
                                const status = sendingStatus[p.number] || 'idle';
                                return (
                                    <div key={idx} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div>
                                            <p className="font-bold text-slate-800">{p.name || "Participant"}</p>
                                            <p className="text-sm text-slate-400 font-mono">{p.number}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <p className="text-lg font-black text-slate-900">KES {p.amount}</p>
                                            <button 
                                                onClick={() => handleSendIndividualSTK(p)} 
                                                disabled={status === 'sending' || status === 'sent'} 
                                                className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${status === 'sent' ? 'bg-green-100 text-green-600' : 'bg-black text-white hover:scale-105 active:scale-95 shadow-lg shadow-black/10'}`}
                                            >
                                                {status === 'sending' ? <RefreshCw className="animate-spin" size={16}/> : status === 'sent' ? <CheckCircle size={16}/> : <Send size={16}/>}
                                                {status === 'sending' ? 'Sending...' : status === 'sent' ? 'Waiting PIN' : 'Send STK'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-8 bg-slate-50 border-t border-slate-100">
                            <button onClick={() => router.push(`/dashboard/bills`)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-colors">Return to Ledger</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-[2.5rem] shadow-xl p-8 md:p-12 border border-slate-100">
                    <h2 className="text-4xl font-black text-slate-900 mb-8">Create Payment</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">General Info</label>
                            <input type="text" value={billName} onChange={(e) => setBillName(e.target.value)} placeholder="Bill Name" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-purple-200" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Target Goal</label>
                            <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="Total Amount" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-purple-600 outline-none border border-transparent focus:border-purple-200" />
                        </div>
                        {/* Merchant Paybill - Now Auto-filled from your Channels settings */}
<div className="space-y-2">
    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">
        Active Merchant Channel
    </label>
    <div className="relative group">
        <input 
            type="text" 
            readOnly
            value={paybill ? `${defaultChannelName} (${paybill})` : "Loading active channel..."} 
            className="w-full px-6 py-4 bg-purple-50 rounded-2xl font-black text-purple-700 outline-none border-2 border-purple-100 cursor-default" 
        />
        <Wallet size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-purple-400" />
    </div>
    <p className="text-[10px] text-slate-400 ml-4">
        Change this in <span className="text-purple-600 font-bold cursor-pointer" onClick={() => router.push('/dashboard/channels')}>Channel Settings</span>
    </p>
</div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Group Size</label>
                            <input type="number" value={numberOfPeople} onChange={(e) => setNumberOfPeople(e.target.value)} placeholder="Number of People" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-purple-200" />
                        </div>
                    </div>

                    <div className="space-y-4 mb-10">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Participants Details</label>
                            <button onClick={splitEqually} className="text-xs font-bold text-white bg-black px-4 py-2 rounded-xl hover:bg-slate-800 transition-all">Split Equally</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {phoneNumbers.map((person) => (
                                <div key={person.id} className="p-6 bg-slate-50 rounded-[1.5rem] space-y-3 border border-transparent hover:border-purple-200 transition-all shadow-sm">
                                    <input type="text" value={person.name} onChange={(e) => setPhoneNumbers(phoneNumbers.map(p => p.id === person.id ? {...p, name: e.target.value} : p))} placeholder="Name" className="w-full bg-transparent border-b border-slate-200 outline-none font-bold placeholder:text-slate-300" />
                                    <input type="tel" value={person.number} onChange={(e) => setPhoneNumbers(phoneNumbers.map(p => p.id === person.id ? {...p, number: e.target.value} : p))} placeholder="Phone" className="w-full bg-transparent border-b border-slate-200 outline-none placeholder:text-slate-300" />
                                    <input type="number" value={person.amount} onChange={(e) => setPhoneNumbers(phoneNumbers.map(p => p.id === person.id ? {...p, amount: e.target.value} : p))} placeholder="Amount" className="w-full bg-transparent outline-none font-black text-purple-600 text-xl" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleGenerateBill} className="w-full py-6 bg-purple-600 text-white rounded-[1.5rem] font-black text-xl shadow-xl hover:bg-purple-700 hover:scale-[1.01] active:scale-95 transition-all">
                        {loading ? <RefreshCw className="animate-spin mx-auto" /> : "GENERATE BILL"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatePaymentPage;

