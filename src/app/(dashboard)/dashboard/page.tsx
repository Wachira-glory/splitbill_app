"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MirrorBill,UndaAccount } from '../../../../types';
import { 
  DollarSign, 
  History, 
  Plus, 
  User, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  LogOut, 
  PlusCircle, 
  Search, 
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock3,
  TrendingUp,
  Wallet,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient as createSupabaseClient} from '@supabase/supabase-js';
import { createClient as createLocalClient } from '@/utils/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button';


const undaSupa = createSupabaseClient(
  process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!
);


const mySupa = createLocalClient();


const DashboardPage = () => {
    const router = useRouter();
    const [userName] = useState("Admin User");
    const [bills, setBills] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    const metrics = useMemo(() => {
        const totalGoal = bills.reduce((sum, b) => sum + (b.balance || 0), 0);
        const totalCollected = bills.reduce((sum, b) => {
            const paid = (b.items || []).filter((p: any) => p.status === 'completed' || p.status === 'paid');
            return sum + paid.reduce((s: number, p: any) => s + p.amount, 0);
        }, 0);
        const activeBills = bills.filter(b => {
            const paid = (b.items || []).filter((p: any) => p.status === 'completed' || p.status === 'paid');
            return paid.reduce((s: number, p: any) => s + p.amount, 0) < b.balance;
        }).length;

        const progress = totalGoal > 0 ? Math.round((totalCollected / totalGoal) * 100) : 0;
        return { totalCollected, activeBills, progress, totalGoal };
    }, [bills]);


const fetchBills = useCallback(async () => {
    setIsLoading(true);
    try {
        // --- STEP 1: Fetch from YOUR PRIVATE MIRROR ---
        const { data: mirrorData, error: mirrorError } = await mySupa
            .from('unda_bills_mirror')
            .select('*')
            .order('updated_at', { ascending: false });

        if (mirrorError) throw mirrorError;

        if (!mirrorData || mirrorData.length === 0) {
            setBills([]);
            setIsLoading(false);
            return;
        }

        // --- STEP 2: Get Unda Auth Token ---
        const response = await fetch(`${process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY! },
            body: JSON.stringify({
                email: process.env.NEXT_PUBLIC_UNDA_API_USERNAME,
                password: process.env.NEXT_PUBLIC_UNDA_API_PASSWORD,
            })
        });
        const authData = await response.json();
        
        // --- STEP 3: Fetch Targeted Data from Unda ---
        // Explicitly typed 'b' as MirrorBill to resolve ts(7006)
        const slugs = mirrorData.map((b: MirrorBill) => b.slug);

        const { data: undaAccounts, error: undaError } = await undaSupa
            .from('accounts')
            .select('*, items(*)')
            .in('slug', slugs)
            .eq('p_id', 23)
            .setHeader('Authorization', `Bearer ${authData.access_token}`);
        
        if (undaError) throw undaError;

        // --- STEP 4: Enrich Mirror Data ---
        // Explicitly typed 'mirror' as MirrorBill to resolve ts(7006)
        const enriched = mirrorData.map((mirror: MirrorBill) => {
            // Typed 'ua' as UndaAccount for safety
            const undaMatch = undaAccounts?.find((ua: UndaAccount) => ua.slug === mirror.slug);
            
            return {
                ...mirror,
                items: undaMatch?.items || [],
                balance: mirror.total_goal,
                data: { name: mirror.bill_name } 
            };
        });

        setBills(enriched);

    } catch (error) {
        console.error('Dashboard Privacy Fetch Error:', error);
    } finally {
        setIsLoading(false);
    }
}, []);


    useEffect(() => { fetchBills(); }, [fetchBills]);

    const currentItems = bills.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(bills.length / itemsPerPage);

    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
        
        {/* --- 1. TOP NAVIGATION --- */}
        <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
            <span className="font-black text-xl tracking-tight text-slate-900">SplitBill</span>
            <div className="ml-4 h-6 w-[1px] bg-slate-200 hidden sm:block" />
            <span className="hidden sm:block ml-2 text-sm font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">Project 23</span>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              onClick={() => router.push('/dashboard/create-payment')}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Create Payment</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 p-1 hover:bg-slate-100 rounded-full transition-all outline-none">
                  <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center text-slate-600">
                    <User size={20} />
                  </div>
                  <ChevronDown size={14} className="text-slate-400 mr-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl p-2 shadow-xl border-slate-200">
                <DropdownMenuLabel className="px-3 py-2 text-xs text-slate-400 uppercase">Manage Team</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push('/teams/new')} className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-semibold">
                  <PlusCircle size={18} />
                  <span>Create New Team</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard/channels')} className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-semibold">
                <Wallet size={18} className="text-purple-600" />
                <span>Create Channels</span>
              </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2 p-3 rounded-xl cursor-pointer text-red-600">
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>

        {/* --- 2. MAIN CONTENT --- */}
        <main className="flex-1 overflow-hidden p-6">
          <div className="h-full max-w-[1600px] mx-auto flex flex-col">
            
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Payment Dashboard</h1>
                <p className="text-sm text-slate-500">Track and manage all your payment requests</p>
              </div>
              <button 
                onClick={fetchBills}
                disabled={isLoading}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all duration-300 hover:shadow-lg disabled:opacity-50 text-sm"
              >
                <RefreshCw size={16} className={`inline mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {/* Compact Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl shadow-lg overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                <div className="relative z-10">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center mb-3">
                    <Wallet size={20} className="text-white" />
                  </div>
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Total Collected</p>
                  <h3 className="text-3xl font-black text-white">KES {metrics.totalCollected.toLocaleString()}</h3>
                </div>
              </div>

              <div className="relative bg-white p-5 rounded-2xl shadow-lg border border-slate-200 hover:border-purple-200 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <BarChart3 size={20} className="text-purple-600" />
                  </div>
                  <TrendingUp size={14} className="text-purple-600" />
                </div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Requests</p>
                <h3 className="text-3xl font-black text-slate-900">{metrics.activeBills}</h3>
              </div>

              <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-purple-500/50">
                    <TrendingUp size={20} className="text-white" />
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Global Progress</p>
                  <div className="flex items-end gap-2 mb-2">
                    <h3 className="text-3xl font-black text-white">{metrics.progress}</h3>
                    <span className="text-lg font-black text-purple-400 mb-1">%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-1000"
                      style={{ width: `${metrics.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Table - Takes remaining space */}
            <div className="flex-1 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col min-h-0">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <h2 className="text-lg font-black text-slate-900">Recent Activities</h2>
                <p className="text-xs text-slate-500 mt-0.5">View and track all payment requests</p>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50/90 backdrop-blur z-10">
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Request Details</th>
                      <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Collected</th>
                      <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Progress</th>
                      <th className="px-6 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {currentItems.map((bill) => {
                      const paidItems = (bill.items || []).filter((p: any) => p.status === 'completed' || p.status === 'paid');
                      const totalPaid = paidItems.reduce((sum: number, p: any) => sum + p.amount, 0);
                      const isDone = totalPaid >= bill.balance && bill.balance > 0;
                      const progress = bill.balance > 0 ? Math.round((totalPaid / bill.balance) * 100) : 0;

                      return (
                        <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                <DollarSign size={16} className="text-purple-600" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-sm">{bill.data?.name || "Payment Request"}</p>
                                <p className="text-xs font-mono text-slate-400">{bill.slug}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                              isDone 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {isDone ? <CheckCircle2 size={11} /> : <Clock3 size={11} />}
                              {isDone ? "Done" : "Active"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-black text-slate-900 text-sm">
                              KES {totalPaid.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isDone ? 'bg-emerald-500' : 'bg-purple-500'
                                  }`}
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-600 min-w-[32px]">
                                {progress}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => router.push(`/dashboard/tracking/${bill.slug}`)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-900 text-slate-600 hover:text-white rounded-lg font-bold transition-all text-sm"
                            >
                              <span className="flex items-center gap-1.5">
                                View
                                <ArrowRight size={14} />
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination - Fixed at bottom */}
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
                <p className="text-xs font-medium text-slate-600">
                  Page <span className="font-bold text-slate-900">{currentPage}</span> of <span className="font-bold text-slate-900">{totalPages || 1}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(c => c - 1)}
                    className="p-2 rounded-lg bg-white border-2 border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-900 hover:border-slate-900 hover:text-white transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(c => c + 1)}
                    className="p-2 rounded-lg bg-white border-2 border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-900 hover:border-slate-900 hover:text-white transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
};

export default DashboardPage;