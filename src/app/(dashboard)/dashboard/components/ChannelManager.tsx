"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Power, Plus, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { supabase, getUndaAuthClient } from "@/lib/supabaseClient"; 

interface Channel {
  id: number;
  uid: string;
  name: string;
  idata: {
    is_default: boolean;
    owner_id: string;
  };
}

export default function ChannelManager() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newUid, setNewUid] = useState(''); 
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // FETCH: Uses the user.id to filter Unda channels privately
  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Get the current user from SplitBill
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("Please login to manage channels.");
        setLoading(false);
        return;
      }

      const authSupa = await getUndaAuthClient();
      
      // Filter Unda channels by Project 23 AND your specific user ID
      const { data, error: fetchError } = await authSupa
        .from('channels')
        .select('*')
        .eq('p_id', 23)
        .filter('idata->>owner_id', 'eq', user.id); // Remote filtering

      if (fetchError) throw fetchError;
      setChannels(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // CREATE: Adds a new Paybill stamped with your User ID
  const handleCreateChannel = async (e: React.FormEvent) => {
  e.preventDefault();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return setError("Login required");

  setIsCreating(true);
  try {
    const authSupa = await getUndaAuthClient();
    
    // FIX: Append a short hash or the User ID to the UID 
    // to bypass the unique constraint in a shared project.
    // We keep the actual Paybill number in a separate metadata field if needed.
    const uniqueUid = `${newUid}-${user.id.substring(0, 5)}`;

    const { error: insertError } = await authSupa
      .from('channels')
      .insert([{
        p_id: 23,
        uid: uniqueUid, // This is now unique to THIS user
        name: newName,
        provider: 'mpesa',
        category: 'inbound',
        mode: 'child',
        parent_channel_id: 2, 
        status: 'active',
        idata: { 
          is_default: false,
          owner_id: user.id,
          display_uid: newUid // Keep the clean Paybill number for the UI
        } 
      }]);

    if (insertError) {
        if (insertError.code === '23505') {
            throw new Error("This Paybill is already registered under your account.");
        }
        throw insertError;
    }

    setNewUid(''); 
    setNewName('');
    fetchChannels();
  } catch (err: any) {
    setError(err.message);
  } finally {
    setIsCreating(false);
  }
};

  // DEFAULT: Set one channel as active for THIS user
  const setDefaultChannel = async (channelId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const authSupa = await getUndaAuthClient();

      // 1. Reset all your channels to false
      for (const ch of channels) {
        await authSupa
          .from('channels')
          .update({ idata: { ...ch.idata, is_default: false } })
          .eq('id', ch.id);
      }

      // 2. Set the selected one to true
      const target = channels.find(c => c.id === channelId);
      if (target) {
        await authSupa
          .from('channels')
          .update({ idata: { ...target.idata, is_default: true } })
          .eq('id', channelId);
      }
      
      fetchChannels();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {error && (
        <div className="bg-red-50 p-4 rounded-xl text-red-600 flex items-center gap-2 font-bold">
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100">
        <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <Plus className="text-purple-600" /> Register Paybill
        </h2>
        <form onSubmit={handleCreateChannel} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Business Name</label>
            <input required placeholder="e.g. My Shop" className="w-full p-4 bg-slate-50 rounded-xl outline-none font-bold focus:ring-2 ring-purple-100 transition-all" value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Paybill / Till Number</label>
            <input required placeholder="e.g. 123456" className="w-full p-4 bg-slate-50 rounded-xl outline-none font-mono focus:ring-2 ring-purple-100 transition-all" value={newUid} onChange={e => setNewUid(e.target.value)} />
          </div>
          <button disabled={isCreating} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-purple-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            {isCreating ? <Loader2 className="animate-spin" /> : 'Add My Paybill'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-4">My Registered Channels</h3>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-purple-600" /></div>
        ) : channels.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed text-slate-400 font-bold">
            No Paybills registered yet.
          </div>
        ) : (
          channels.map(channel => (
            <div key={channel.id} className={`p-6 rounded-[2rem] border-2 flex items-center justify-between transition-all ${channel.idata?.is_default ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-50'}`}>
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
                onClick={() => setDefaultChannel(channel.id)} 
                className={`px-6 py-3 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${channel.idata?.is_default ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
              >
                {channel.idata?.is_default ? <><CheckCircle2 size={16}/> Active</> : <><Power size={16}/> Use this</>}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}