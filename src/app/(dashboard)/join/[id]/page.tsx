"use client"

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { UserPlus, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AcceptInvitePage() {
  const { id } = useParams();
  const router = useRouter();
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const { data, error } = await supabase
          .from('invitations')
          .select('*, teams(name)')
          .eq('id', id)
          .single();

        if (error || !data) throw new Error("Invitation not found or expired.");
        if (data.status === 'accepted') throw new Error("This invitation has already been used.");

        setInvitation(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [id]);

  const handleJoin = () => {
    // Redirect to signup and pass the invite ID in the URL to process after signup
    router.push(`/signup?invite=${id}&email=${invitation.email}`);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-purple-600" size={40} />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl text-center border border-red-50">
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <h2 className="text-2xl font-black text-slate-900">Oops!</h2>
        <p className="text-slate-500 mt-2 font-medium">{error}</p>
        <button onClick={() => router.push('/')} className="mt-8 text-sm font-bold text-purple-600 uppercase tracking-widest">Return Home</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4">
      <div className="max-w-lg w-full bg-white p-12 rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.07)] border border-white relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full -mr-16 -mt-16 opacity-50" />
        
        <div className="relative z-10">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-8">
            <UserPlus size={32} />
          </div>

          <h1 className="text-3xl font-black text-slate-900 leading-tight">
            You've been invited to join <span className="text-purple-600">{invitation?.teams?.name}</span>.
          </h1>
          
          <p className="text-slate-500 mt-4 font-medium leading-relaxed">
            By joining this team, you will get access to real-time payment tracking for <strong>Project 23</strong>. 
            All reconciliations happen automatically.
          </p>

          <div className="mt-10 space-y-4">
            <button 
              onClick={handleJoin}
              className="w-full py-5 bg-slate-900 hover:bg-purple-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
            >
              Accept Invitation <ArrowRight size={20} />
            </button>
            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Joining as: {invitation?.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}