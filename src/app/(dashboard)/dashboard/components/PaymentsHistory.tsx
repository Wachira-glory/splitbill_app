"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  Clock3, 
  TrendingUp, 
  Wallet, 
  BarChart3,
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const undaSupa = createClient(
  process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY!
);

interface PaymentsHistoryProps {
    isVisible: boolean;
}

const PaymentsHistory = ({ isVisible }: PaymentsHistoryProps) => {
    const [bills, setBills] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;
    const router = useRouter();

    // --- DATA CALCULATIONS ---
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
        if (!isVisible) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_UNDA_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "apikey": process.env.NEXT_PUBLIC_UNDA_SUPABASE_ANON_KEY! },
                body: JSON.stringify({
                    email: process.env.NEXT_PUBLIC_UNDA_API_USERNAME,
                    password: process.env.NEXT_PUBLIC_UNDA_API_PASSWORD,
                })
            });
            const authData = await response.json();
            
            const { data, error } = await undaSupa
                .from('accounts')
                .select('*, items(*)')
                .eq('p_id', 23) 
                .order('created_at', { ascending: false })
                .setHeader('Authorization', `Bearer ${authData.access_token}`);
            
            if (!error) setBills(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isVisible]);

    useEffect(() => { fetchBills(); }, [fetchBills]);

    const currentItems = bills.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(bills.length / itemsPerPage);

    if (!isVisible) return null;

    return (
      <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-purple-50/30 p-6">
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
      </div>
    );
};

export default PaymentsHistory;