"use client"

import React, { useState } from 'react';
import { X, Mail, Users, Loader2, ShieldCheck } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CreateTeamModal = ({ onClose }: { onClose: () => void }) => {
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Create the Team Entry
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert([{ 
            name: teamName, 
            p_id: 23, // Linking to your Project 23
            created_by: (await supabase.auth.getUser()).data.user?.id 
        }])
        .select()
        .single();

      if (teamError) throw teamError;

      // 2. Create the Invitation Entry
      const { error: inviteError } = await supabase
        .from('invitations')
        .insert([{ 
            team_id: teamData.id, 
            email: inviteEmail.toLowerCase(),
            status: 'pending'
        }]);

      if (inviteError) throw inviteError;

      alert(`Team "${teamName}" created and invite sent to ${inviteEmail}!`);
      onClose();
    } catch (error: any) {
      console.error('Error creating team:', error.message);
      alert('Failed to create team. Check console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white overflow-hidden transform animate-in zoom-in-95 duration-200">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
              <Users size={28} />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
              <X size={20} />
            </button>
          </div>

          <h2 className="text-2xl font-black text-slate-900 mb-2">Build your team</h2>
          <p className="text-slate-500 text-sm font-medium mb-8">
            Create a workspace to manage Project 23 payments together.
          </p>

          <form onSubmit={handleCreateTeam} className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">
                Team Name
              </label>
              <input
                required
                type="text"
                placeholder="e.g., Marketing Squad"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-semibold text-slate-900"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">
                Invite first member
              </label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type="email"
                  placeholder="colleague@company.com"
                  className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-semibold text-slate-900"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 border border-slate-200 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                disabled={isSubmitting}
                className="flex-1 px-6 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-purple-600 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Create Team"}
              </button>
            </div>
          </form>
        </div>
        
        <div className="bg-slate-50 p-6 flex items-center gap-3 border-t border-slate-100">
            <ShieldCheck className="text-emerald-500" size={20} />
            <p className="text-[10px] text-slate-400 font-bold uppercase leading-tight">
                Team members will automatically see <br/> Project 23 data once they join.
            </p>
        </div>
      </div>
    </div>
  );
};

export default CreateTeamModal;