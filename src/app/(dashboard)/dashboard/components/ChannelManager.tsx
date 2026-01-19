






"use client"

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Power, CreditCard, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// Connect to the Unda Supabase Project
const supabase = createClient(
  process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!
);

export default function ChannelManager() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPaybill, setNewPaybill] = useState('');
  const [channelName, setChannelName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChannels();
  }, []);

  async function fetchChannels() {
    setError(null);
    // 1. Get the session to ensure a JWT is present for RLS
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setError("Please log in to manage channels");
      setLoading(false);
      return;
    }

    // 2. Query only Project 23 channels
    const { data, error: fetchError } = await supabase
      .from('channels')
      .select('*')
      .eq('p_id', 23); 

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setChannels(data);
    }
    setLoading(false);
  }

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    // 3. Create a new child channel for Mpesa
    const { error: insertError } = await supabase.from('channels').insert([{
      p_id: 23,
      uid: newPaybill,
      name: channelName,
      provider: 'mpesa',
      category: 'inbound',
      mode: 'child',
      parent_channel_id: 2, // Hardcoded per requirement
      status: 'active',
      idata: { is_default: false }
    }]);

    if (insertError) {
      setError(insertError.message);
    } else {
      setNewPaybill('');
      setChannelName('');
      fetchChannels();
    }
    setIsSubmitting(false);
  };

  const toggleDefault = async (selectedId: number) => {
    setError(null);
    try {
      // 4. Update all channels to 'not default' first
      const resetPromises = channels.map(channel => 
        supabase.from('channels')
          .update({ idata: { ...channel.idata, is_default: false } })
          .eq('id', channel.id)
      );
      await Promise.all(resetPromises);

      // 5. Set the chosen channel as the default
      const target = channels.find(c => c.id === selectedId);
      await supabase.from('channels')
        .update({ idata: { ...target.idata, is_default: true } })
        .eq('id', selectedId);

      fetchChannels();
    } catch (err: any) {
      setError("Failed to update default channel");
    }
  };

  if (loading) return <div className="p-4 text-slate-400 text-xs animate-pulse">Loading Channels...</div>;

  return (
    <div className="w-full space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Input Section */}
      <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
        <h3 className="text-sm font-black mb-4 flex items-center gap-2">
          <Plus size={16} className="text-purple-600" /> Register Paybill
        </h3>
        <form onSubmit={handleCreateChannel} className="space-y-3">
          <input 
            required placeholder="Channel Nickname" 
            className="w-full p-3 bg-white rounded-xl text-xs border-none outline-none font-bold shadow-sm"
            value={channelName} onChange={e => setChannelName(e.target.value)}
          />
          <input 
            required placeholder="Paybill Number" 
            className="w-full p-3 bg-white rounded-xl text-xs border-none outline-none font-mono shadow-sm"
            value={newPaybill} onChange={e => setNewPaybill(e.target.value)}
          />
          <button className="w-full py-3 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-purple-600 transition-all">
            {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Save Channel'}
          </button>
        </form>
      </div>

      {/* List Section */}
      <div className="space-y-2">
        {channels.map(channel => (
          <div key={channel.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${channel.idata?.is_default ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <CreditCard size={16} className={channel.idata?.is_default ? 'text-purple-600' : 'text-slate-400'} />
              <div>
                <p className="text-xs font-black text-slate-900">{channel.name}</p>
                <p className="text-[10px] font-mono text-slate-500">{channel.uid}</p>
              </div>
            </div>
            <button 
              onClick={() => toggleDefault(channel.id)}
              className={`px-3 py-1.5 rounded-lg font-black text-[10px] flex items-center gap-1 ${channel.idata?.is_default ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}
            >
              {channel.idata?.is_default ? <><CheckCircle2 size={12}/> Default</> : <><Power size={12}/> Enable</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}