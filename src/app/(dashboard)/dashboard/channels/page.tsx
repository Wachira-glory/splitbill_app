"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CreditCard, Power, Plus, CheckCircle2, Loader2, Wallet, AlertTriangle } from 'lucide-react';

// Connect to the Unda Project
const undaSupa = createClient(
  process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!
);

export default function ChannelManager() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newUid, setNewUid] = useState(''); 
  const [newName, setNewName] = useState('');
  const [authError, setAuthError] = useState(false);

  
  // This gets the JWT required to bypass RLS on the Unda Project
  const getAuthToken = async () => {
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
    return data.access_token;
  };

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      //Query the channels table after jwt is gotten
      const { data, error } = await undaSupa
        .from('channels')
        .select('*')
        .eq('p_id', 23) 
        .order('created_at', { ascending: false })
        .setHeader('Authorization', `Bearer ${token}`); 

      if (error) throw error;
      if (data) setChannels(data);
    } catch (err) {
      console.error("Auth/Fetch Error:", err);
      setAuthError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

//This is where the creation of channels is done, insert a new row into the channels table
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const token = await getAuthToken();
      
      const { error } = await undaSupa
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
          idata: { is_default: false} 
        }])
        .setHeader('Authorization', `Bearer ${token}`);

      if (error) throw error;

//This section is for retrieving the security credentials and also anage which channel is used to make payments
      setTimeout(async () => {
        const { data: publicData, error: viewError } = await undaSupa
          .from('channels_public_v')
          .select('api_key')//Getting the apikey because each api key has its own paybil
          .eq('uid', newUid)
          .single()
          .setHeader('Authorization', `Bearer ${token}`);
       
      }, 1000);

    } catch (err: any) {
      console.error("Insert Error:", err.message);
    } finally {
      setIsCreating(false);
    }
  };

  
  const setDefaultChannel = async (channelId: number) => {
  const token = await getAuthToken();

  try {
    // reset ALL channels for this platform to NOT be default in one request
    // We use a JSONB update syntax for the 'idata' column
    await undaSupa
      .from('channels')
      .update({ idata: { is_default: false } }) // This resets everyone
      .eq('p_id', 23)
      .setHeader('Authorization', `Bearer ${token}`);

    // 2. Set only the selected channel to be the default
    await undaSupa
      .from('channels')
      .update({ idata: { is_default: true } })
      .eq('id', channelId)
      .setHeader('Authorization', `Bearer ${token}`);

    // Refresh the list to reflect changes in the UI
    fetchChannels();
  } catch (err) {
    console.error("Failed to swap active channel:", err);
  }
};

  if (authError) return (
    <div className="p-10 text-center">
      <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
      <h2 className="text-xl font-bold">Authentication Failed</h2>
      <p className="text-slate-500">Check your Unda API credentials in .env</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* (UI JSX remains exactly as per your design with the New Channel form and Channel List) */}
      <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100">
        <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <Plus className="text-purple-600" /> New Channel
        </h2>
        <form onSubmit={handleCreateChannel} className="space-y-4">
          <input 
            required placeholder="Channel Name (e.g. Main Paybill)" 
            className="w-full p-4 bg-slate-50 rounded-xl border-none outline-none font-bold"
            value={newName} onChange={e => setNewName(e.target.value)}
          />
          <input 
            required placeholder="Paybill / Shortcode" 
            className="w-full p-4 bg-slate-50 rounded-xl border-none outline-none font-mono"
            value={newUid} onChange={e => setNewUid(e.target.value)}
          />
          <button 
            disabled={isCreating}
            className="w-full py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-purple-600 transition-all flex items-center justify-center gap-2"
          >
            {isCreating ? <Loader2 className="animate-spin" /> : 'Register Channel'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Your Channels</h3>
        {loading ? <p className="text-center text-slate-400">Loading...</p> : channels.map(channel => (
          <div key={channel.id} className={`p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between ${channel.idata?.is_default ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-50'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${channel.idata?.is_default ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <CreditCard size={24} />
              </div>
              <div>
                <p className="font-black text-slate-900">{channel.name}</p>
                <p className="text-xs font-mono text-slate-500">{channel.uid}</p>
              </div>
            </div>
            
            <button 
              onClick={() => setDefaultChannel(channel.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs transition-all ${channel.idata?.is_default ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
            >
              {channel.idata?.is_default ? <><CheckCircle2 size={16}/> Active</> : <><Power size={16}/> Enable</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}