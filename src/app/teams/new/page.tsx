"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowLeft, Mail, Loader2, Sparkles, CheckCircle2, Copy, Check } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Using your specific Supabase URL
const supabase = createClient(
  "https://bufdseweassfymorwyyc.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CreateTeamPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 1. Get current user session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in first");

      // 2. Create the Team in Supabase
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert([{ 
            name: teamName, 
            p_id: 23, 
            created_by: user.id 
        }])
        .select()
        .single();

      if (teamError) throw teamError;

      // 3. Trigger the Magic Link Invitation API
      // This calls our internal API that uses the Service Role Key
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.toLowerCase().trim(),
          teamName: teamName,
          teamId: teamData.id
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to send invitation");

      // Backup link in case they prefer manual sending
      setGeneratedLink(`${window.location.origin}/dashboard`);
      setIsSuccess(true);

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 3000);

    } catch (error: any) {
      console.error('Error:', error.message);
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center">
        <div className="animate-in zoom-in-95 duration-300 max-w-sm">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 leading-tight">Magic Link Sent!</h1>
          <p className="text-slate-500 mt-4 text-sm font-medium">
            Supabase is sending the invite to <strong>{inviteEmail}</strong>. 
            Reconciliation happens automatically once they join [cite: 2026-01-13].
          </p>
          <div className="mt-8 pt-6 border-t border-slate-100">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Redirecting to Dashboard...</p>
             <Loader2 className="animate-spin mx-auto text-slate-200" size={20} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 relative">
        <button 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 font-bold text-[10px] uppercase tracking-widest transition-colors outline-none"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-purple-100">
          <Users size={28} />
        </div>

        <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2">Invite Partner</h1>
        <p className="text-slate-500 text-sm font-medium mb-8">
          Send a Supabase Magic Link to join Project 23.
        </p>

        <form onSubmit={handleCreate} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Team Name</label>
            <input 
              required
              placeholder="e.g. Household Bills"
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-purple-500/10 outline-none transition-all font-semibold"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teammate's Email</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                required
                type="email"
                placeholder="partner@example.com"
                className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-purple-500/10 outline-none transition-all font-semibold"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full py-5 bg-slate-900 hover:bg-purple-600 text-white font-black rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><Sparkles size={18} /> Send Magic Invite</>}
          </button>
        </form>
      </div>
    </div>
  );
}