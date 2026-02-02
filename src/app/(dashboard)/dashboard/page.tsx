"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppBill } from '../../../../types';
import { 
  DollarSign, Plus, User, ChevronDown, ChevronLeft, ChevronRight, 
  LogOut, PlusCircle, RefreshCw, CheckCircle2, Clock3, 
  Wallet, ArrowRight, Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient as createLocalClient } from '@/utils/supabase/client';
import { useAuth } from "@/lib/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button';

const mySupa = createLocalClient();

const DashboardPage = () => {
    const router = useRouter();
    const { user: authUser, loading: authLoading } = useAuth();
    const [bills, setBills] = useState<AppBill[] | null>(null); 
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    const fetchDashboardData = useCallback(async () => {
        if (authLoading || !authUser) return;
        setIsLoading(true);

        try {
            const response = await fetch('/api/dashboard');
            if (!response.ok) throw new Error('Failed to fetch');
            
            const data = await response.json();
            setBills(data);
        } catch (error) {
            console.error('Fetch Error:', error);
            setBills([]);
        } finally {
            setIsLoading(false);
        }
    }, [authUser, authLoading]);

    useEffect(() => {
      fetchDashboardData();
    }, [fetchDashboardData]);

    const metrics = useMemo(() => {
        const data = bills || [];
        const totalGoal = data.reduce((sum, b) => sum + (Number(b.total_goal) || 0), 0);
        const totalCollected = data.reduce((sum, b) => sum + (b.real_collected || 0), 0);
        const activeBills = data.filter(b => (b.real_collected || 0) < (Number(b.total_goal) || 0)).length;
        const progress = totalGoal > 0 ? Math.round((totalCollected / totalGoal) * 100) : 0;
        return { totalCollected, activeBills, progress, totalGoal };
    }, [bills]);

    const handleSignOut = async () => {
        await mySupa.auth.signOut();
        window.location.href = '/login';
    };

    if (authLoading || (isLoading && bills === null)) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
              <p className="text-slate-500 font-bold animate-pulse">Securing Session...</p>
          </div>
      );
    }

    const currentBills = bills || [];
    const currentItems = currentBills.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(currentBills.length / itemsPerPage);

    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
        <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
            <span className="font-black text-xl tracking-tight text-slate-900">SplitBill</span>
            <div className="ml-4 h-6 w-[1px] bg-slate-200 hidden sm:block" />
            <span className="hidden sm:block ml-2 text-sm font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">Project 23</span>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={() => router.push('/dashboard/create-payment')} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
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
                <DropdownMenuLabel className="px-3 py-2 text-xs text-slate-400 uppercase">Manage Account</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push('/teams/new')} className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-semibold">
                  <PlusCircle size={18} /> <span>Create New Team</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard/channels')} className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-semibold">
                    <Wallet size={18} className="text-purple-600" /> <span>Create Channels</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 p-3 rounded-xl cursor-pointer text-red-600">
                  <LogOut size={18} /> <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>

        <main className="flex-1 overflow-hidden p-6">
          <div className="h-full max-w-[1600px] mx-auto flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Payment Dashboard</h1>
                <p className="text-sm text-slate-500">Track and manage your private payment requests</p>
              </div>
              <button onClick={fetchDashboardData} disabled={isLoading} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all duration-300 hover:shadow-lg disabled:opacity-50 text-sm">
                <RefreshCw size={16} className={`inline mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl shadow-lg">
                <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Total Collected</p>
                <h3 className="text-3xl font-black text-white">KES {metrics.totalCollected.toLocaleString()}</h3>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-200">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Requests</p>
                <h3 className="text-3xl font-black text-slate-900">{metrics.activeBills}</h3>
              </div>
              <div className="bg-slate-900 p-5 rounded-2xl shadow-xl">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Progress</p>
                <h3 className="text-3xl font-black text-white">{metrics.progress}%</h3>
                <div className="h-1.5 w-full bg-slate-700 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${metrics.progress}%` }} />
                </div>
              </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col min-h-0">
              <div className="flex-1 overflow-auto">
                {currentBills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                    <p className="font-bold">No payment requests found.</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="sticky top-0 bg-slate-50/90 backdrop-blur z-10 border-b">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase">Request Details</th>
                        <th className="px-4 py-4 text-left text-xs font-black text-slate-500 uppercase">Status</th>
                        <th className="px-4 py-4 text-left text-xs font-black text-slate-500 uppercase">Collected</th>
                        <th className="px-4 py-4 text-left text-xs font-black text-slate-500 uppercase">Progress</th>
                        <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {currentItems.map((bill) => {
                        const isDone = (bill.real_collected || 0) >= (bill.goal || 0) && (bill.goal || 0) > 0;
                        const progress = bill.goal && bill.goal > 0 ? Math.round(((bill.real_collected || 0) / bill.goal) * 100) : 0;
                        return (
                          <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600"><DollarSign size={16} /></div>
                                <div>
                                  <p className="font-bold text-slate-900 text-sm">{bill.bill_name}</p>
                                  <p className="text-xs font-mono text-slate-400">{bill.slug}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {isDone ? <CheckCircle2 size={11} /> : <Clock3 size={11} />} {isDone ? "Done" : "Active"}
                              </span>
                            </td>
                            <td className="px-4 py-4 font-black text-slate-900 text-sm">KES {(bill.real_collected || 0).toLocaleString()}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${isDone ? 'bg-emerald-500' : 'bg-purple-500'}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                                </div>
                                <span className="text-xs font-bold text-slate-500">{progress}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/tracking/${bill.slug}`)} className="font-bold hover:bg-slate-900 hover:text-white">
                                View <ArrowRight size={14} className="ml-1" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
                <p className="text-xs font-medium text-slate-600">Page {currentPage} of {totalPages || 1}</p>
                <div className="flex items-center gap-2">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className="p-2 rounded-lg bg-white border border-slate-200 disabled:opacity-30"><ChevronLeft size={16} /></button>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)} className="p-2 rounded-lg bg-white border border-slate-200 disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
};

export default DashboardPage;