"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Power, Plus, CheckCircle2, Loader2, AlertTriangle, Hash } from 'lucide-react';
import { supabase, getUndaAuthClient } from "@/lib/supabaseClient"; 

interface Channel {
  id: number;
  uid: string;
  name: string;
  idata: {
    is_default: boolean;
    owner_id: string;
    display_uid?: string; // The clean paybill number
  };
}

export default function ChannelManager() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newUid, setNewUid] = useState(''); 
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);

      const authSupa = await getUndaAuthClient();
      const { data, error: fetchError } = await authSupa
        .from('channels')
        .select('*')
        .eq('p_id', 23)
        .filter('idata->>owner_id', 'eq', user.id); 

      if (fetchError) throw fetchError;
      setChannels(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setError("Login required");

    setIsCreating(true);
    setError(null);
    try {
      const authSupa = await getUndaAuthClient();
      
      // We append user ID to the UID to avoid the 409 Duplicate Key error
      const uniqueUid = `${newUid}-${user.id.substring(0, 8)}`;

      const { error: insertError } = await authSupa
        .from('channels')
        .insert([{
          p_id: 23,
          uid: uniqueUid, 
          name: newName,
          provider: 'mpesa',
          category: 'inbound',
          mode: 'child',
          parent_channel_id: 2, 
          status: 'active',
          idata: { 
            is_default: false,
            owner_id: user.id,
            display_uid: newUid // Store clean number for the UI
          } 
        }]);

      if (insertError) throw insertError;
      
      setNewUid(''); 
      setNewName('');
      fetchChannels();
    } catch (err: any) {
      // Handle the specific error if the user somehow submits twice
      setError(err.message.includes('unique') ? "This paybill is already in your list." : err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const setDefaultChannel = async (channelId: number) => {
    try {
      const authSupa = await getUndaAuthClient();
      
      // Update all local state channels to false first to be fast in UI
      const updatedChannels = channels.map(ch => ({
        ...ch,
        idata: { ...ch.idata, is_default: ch.id === channelId }
      }));
      setChannels(updatedChannels);

      // Perform background updates
      for (const ch of channels) {
        await authSupa.from('channels')
          .update({ idata: { ...ch.idata, is_default: ch.id === channelId } })
          .eq('id', ch.id);
      }
    } catch (err: any) {
      setError("Failed to update default: " + err.message);
      fetchChannels(); // Revert on error
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 flex items-center gap-3 animate-shake">
          <AlertTriangle size={20} /> <p className="font-bold text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white">
            <Plus size={24} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Add Paybill</h2>
        </div>
        
        <form onSubmit={handleCreateChannel} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Account Name</label>
            <input required placeholder="Personal Till" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold border-2 border-transparent focus:border-purple-200 transition-all" value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Till / Paybill Number</label>
            <div className="relative">
              <input required placeholder="123456" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-mono font-bold border-2 border-transparent focus:border-purple-200 transition-all" value={newUid} onChange={e => setNewUid(e.target.value)} />
              <Hash className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            </div>
          </div>
          <button disabled={isCreating} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-purple-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
            {isCreating ? <Loader2 className="animate-spin" /> : 'Register Channel'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] ml-6">Your Verified Channels</h3>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-purple-600" size={32} />
            <p className="text-xs font-bold text-slate-400 uppercase">Fetching your accounts...</p>
          </div>
        ) : channels.length === 0 ? (
          <div className="bg-slate-50 rounded-[2.5rem] p-16 text-center border-2 border-dashed border-slate-200">
            <p className="font-black text-slate-400">No channels found for this account.</p>
          </div>
        ) : (
          channels.map(channel => (
            <div key={channel.id} className={`p-6 rounded-[2.5rem] border-2 flex items-center justify-between transition-all duration-500 ${channel.idata?.is_default ? 'bg-white border-purple-500 shadow-xl shadow-purple-50' : 'bg-white border-slate-50 hover:border-slate-200'}`}>
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${channel.idata?.is_default ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <CreditCard size={28} />
                </div>
                <div>
                  <p className="font-black text-xl text-slate-900 leading-tight">{channel.name}</p>
                  <p className="text-xs font-mono font-bold text-purple-500">
                    {channel.idata?.display_uid || channel.uid.split('-')[0]}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setDefaultChannel(channel.id)} 
                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${channel.idata?.is_default ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white'}`}
              >
                {channel.idata?.is_default ? (
                  <span className="flex items-center gap-2"><CheckCircle2 size={16}/> Active</span>
                ) : (
                  <span className="flex items-center gap-2"><Power size={16}/> Use</span>
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}