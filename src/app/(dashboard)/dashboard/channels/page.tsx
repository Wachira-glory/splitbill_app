"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Power, Plus, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { supabase, getUndaAuthClient } from "@/lib/supabaseClient"; 

// Defined interface to replace 'any'
interface Channel {
  id: number;
  uid: string;
  name: string;
  idata: {
    is_default: boolean;
    owner_id: string;
  };
  created_at?: string;
}

export default function ChannelManager() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newUid, setNewUid] = useState(''); 
  const [newName, setNewName] = useState('');
  const [authError, setAuthError] = useState(false);

  // 1. Defined fetchChannels ABOVE useEffect to fix "accessed before declared"
  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const authSupa = await getUndaAuthClient();
      
      const { data, error } = await authSupa
        .from('channels')
        .select('*')
        .eq('p_id', 23) 
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setChannels(data as Channel[]);
    } catch (err) {
      console.error("Fetch Error:", err);
      setAuthError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // 2. Create or Update channel ownership
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Please login");

    setIsCreating(true);
    try {
      const authSupa = await getUndaAuthClient();

      const { data: existing } = await authSupa
        .from('channels')
        .select('id, idata')
        .eq('p_id', 23)
        .eq('uid', newUid)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await authSupa
          .from('channels')
          .update({
            idata: { ...existing.idata, owner_id: user.id }
          })
          .eq('id', existing.id);
        
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await authSupa
          .from('channels')
          .insert([{
            p_id: 23,
            uid: newUid, 
            name: newName,
            provider: 'mpesa',
            category: 'inbound',
            mode: 'child',
            parent_channel_id: 2, 
            status: 'active',
            idata: { 
              is_default: false,
              owner_id: user.id 
            } 
          }]);

        if (insertError) throw insertError;
      }
      
      setNewUid('');
      setNewName('');
      fetchChannels();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Insert Error:", errorMessage);
      alert("Failed to register channel: " + errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  // 3. Set Default Channel
  const setDefaultChannel = async (channelId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const authSupa = await getUndaAuthClient();

      // Reset local channels to false in the database
      for (const ch of channels) {
        await authSupa
          .from('channels')
          .update({ idata: { ...ch.idata, is_default: false } })
          .eq('id', ch.id);
      }

      // Set the target channel as default
      const target = channels.find(c => c.id === channelId);
      if (target) {
        await authSupa
          .from('channels')
          .update({ 
            idata: { ...target.idata, is_default: true } 
          })
          .eq('id', channelId);
      }

      fetchChannels();
    } catch (err) {
      console.error("Failed to swap active channel:", err);
    }
  };

  if (authError) return (
    <div className="p-10 text-center">
      <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
      <h2 className="text-xl font-bold">Connection Error</h2>
      <p className="text-slate-500">Could not sync with payment gateway.</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100">
        <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <Plus className="text-purple-600" /> Register Paybill
        </h2>
        <form onSubmit={handleCreateChannel} className="space-y-4">
          <input 
            required placeholder="Business Name (e.g. My Shop)" 
            className="w-full p-4 bg-slate-50 rounded-xl border-none outline-none font-bold text-slate-900"
            value={newName} onChange={e => setNewName(e.target.value)}
          />
          <input 
            required placeholder="M-Pesa Paybill / Till Number" 
            className="w-full p-4 bg-slate-50 rounded-xl border-none outline-none font-mono font-bold text-slate-900"
            value={newUid} onChange={e => setNewUid(e.target.value)}
          />
          <button 
            disabled={isCreating}
            className="w-full py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-purple-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="animate-spin" /> : 'Add My Paybill'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">My Merchant Channels</h3>
        {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-purple-600" /></div>
        ) : (
          channels.map(channel => (
            <div key={channel.id} className={`p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between ${channel.idata?.is_default ? 'bg-purple-50 border-purple-200 shadow-inner' : 'bg-white border-slate-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${channel.idata?.is_default ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <CreditCard size={24} />
                </div>
                <div>
                  <p className="font-black text-slate-900">{channel.name}</p>
                  <p className="text-xs font-mono font-bold text-slate-500">{channel.uid}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setDefaultChannel(channel.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs transition-all ${channel.idata?.is_default ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
              >
                {channel.idata?.is_default ? <CheckCircle2 size={16}/> : <Power size={16}/>}
                {channel.idata?.is_default ? 'Selected' : 'Use This'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}