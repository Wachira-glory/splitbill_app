"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Send, RefreshCw, ArrowLeft, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
// Use the centralized library file
import { supabase, getUndaAuthClient } from '@/lib/supabaseClient';

const normalizePhoneNumber = (phone: string): string => {
    if (!phone) return "";
    const p = String(phone).replace(/\s/g, '');
    if (p.startsWith('07')) return '254' + p.substring(1);
    if (p.startsWith('011')) return '25411' + p.substring(3);
    return p;
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
    const [userProfile, setUserProfile] = useState<{full_name: string} | null>(null);

    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
                if (data) setUserProfile(data);
            }
        };
        getProfile();
    }, []);

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

    const fetchDefaultChannel = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const authSupa = await getUndaAuthClient();
            
            const { data, error } = await authSupa
                .from('channels')
                .select('id, uid, name')
                .eq('p_id', 23)
                .eq('idata->>is_default', 'true')
                .maybeSingle();

            if (data) {
                setPaybill(data.uid);
                setDefaultChannelName(data.name);
                setActiveChannelId(data.id);
            }
        } catch (err) {
            console.error("Fetch Default Channel Failed:", err);
        }
    }, []);

    useEffect(() => {
        fetchDefaultChannel();
    }, [fetchDefaultChannel]);

    const handleGenerateBill = async () => {
        if (!billName || !totalAmount) return alert("Fill in details");
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Please login first");
             
            const authSupa = await getUndaAuthClient();
            const billSlug = `bill-${Date.now()}`;

            const { data: undaAccount, error: accountError } = await authSupa
                .from('accounts')
                .insert([{
                    uid: billSlug,
                    slug: billSlug,
                    data: { 
                        name: billName,
                        total_goal: parseFloat(totalAmount),
                        owner_id: user.id,
                        owner_name: userProfile?.full_name || user.email,
                        participants: phoneNumbers.map(p => ({
                            name: p.name,
                            phone: p.number,
                            target_amount: parseFloat(p.amount)
                        }))
                    },
                    type: 'bill',
                    status: 'active',
                    p_id: 23 
                }])
                .select('id')
                .single();

            if (accountError) throw accountError;

            setActiveDbId(undaAccount.id);
            setGeneratedBill({ id: billSlug, bill_name: billName, total_amount: totalAmount, participants: phoneNumbers });
            setShowConfirmation(true);

        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendIndividualSTK = async (participant: any) => {
        if (!activeDbId || !activeChannelId) return alert("System Error: Setup missing.");
        
        const phoneToUse = normalizePhoneNumber(participant.number);
        setSendingStatus(prev => ({ ...prev, [participant.number]: 'sending' }));

        try {
            const response = await fetch('/api/unda-charge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_no: phoneToUse,
                    customer_name: participant.name,
                    amount: Number(participant.amount),
                    account_id: activeDbId,
                    channel_id: activeChannelId, 
                    reference: generatedBill.id, 
                })
            });
            
            setSendingStatus(prev => ({ ...prev, [participant.number]: response.ok ? 'sent' : 'failed' }));
        } catch (error) {
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
                    <button onClick={() => setShowConfirmation(false)} className="flex items-center gap-2 text-purple-600 font-bold mb-6">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                        <div className="bg-purple-600 p-8 text-white">
                            <h2 className="text-3xl font-black mb-1">{generatedBill.bill_name}</h2>
                            <p className="opacity-80 font-mono text-sm">REF: {generatedBill.id}</p>
                            <p className="text-4xl font-black mt-4">KES {generatedBill.total_amount}</p>
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
                                                disabled={status === 'sent'} 
                                                className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${status === 'sent' ? 'bg-green-100 text-green-600' : 'bg-black text-white hover:scale-105'}`}
                                            >
                                                {status === 'sending' ? <RefreshCw className="animate-spin" size={16}/> : status === 'sent' ? <CheckCircle size={16}/> : <Send size={16}/>}
                                                {status === 'sending' ? 'Sending...' : status === 'sent' ? 'Sent' : 'Send STK'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-8 bg-slate-50 border-t">
                            <button onClick={() => router.push(`/dashboard/tracking/${generatedBill.id}`)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black">Go to live Tracker</button>
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
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Bill Name</label>
                            <input value={billName} onChange={(e) => setBillName(e.target.value)} placeholder="Rent, Trip, etc." className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Goal Amount</label>
                            <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="Total Goal" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-purple-600 outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Active Channel</label>
                            <div className="relative">
                                <input readOnly value={paybill ? `${defaultChannelName} (${paybill})` : "Loading channel..."} className="w-full px-6 py-4 bg-purple-50 rounded-2xl font-black text-purple-700 outline-none border-2 border-purple-100" />
                                <Wallet size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-purple-400" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Group Size</label>
                            <input type="number" value={numberOfPeople} onChange={(e) => setNumberOfPeople(e.target.value)} placeholder="No. of People" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                        </div>
                    </div>

                    <div className="space-y-4 mb-10">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Participants</label>
                            <button onClick={splitEqually} className="text-xs font-bold text-white bg-black px-4 py-2 rounded-xl">Split Equally</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {phoneNumbers.map((person) => (
                                <div key={person.id} className="p-6 bg-slate-50 rounded-[1.5rem] space-y-3 border">
                                    <input type="text" value={person.name} onChange={(e) => setPhoneNumbers(phoneNumbers.map(p => p.id === person.id ? {...p, name: e.target.value} : p))} placeholder="Name" className="w-full bg-transparent border-b outline-none font-bold" />
                                    <input type="tel" value={person.number} onChange={(e) => setPhoneNumbers(phoneNumbers.map(p => p.id === person.id ? {...p, number: e.target.value} : p))} placeholder="Phone" className="w-full bg-transparent border-b outline-none" />
                                    <input type="number" value={person.amount} onChange={(e) => setPhoneNumbers(phoneNumbers.map(p => p.id === person.id ? {...p, amount: e.target.value} : p))} placeholder="Amount" className="w-full bg-transparent outline-none font-black text-purple-600 text-xl" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleGenerateBill} className="w-full py-6 bg-purple-600 text-white rounded-[1.5rem] font-black text-xl hover:bg-purple-700 transition-all">
                        {loading ? <RefreshCw className="animate-spin mx-auto" /> : "GENERATE BILL"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatePaymentPage;



