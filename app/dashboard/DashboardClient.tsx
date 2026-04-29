"use client";

import { signOut } from "next-auth/react";
import { LogOut, Users, Briefcase, BarChart3, ChevronRight, PieChart, TrendingUp } from "lucide-react";
import Link from "next/link";

interface DashboardClientProps {
  session: any;
  stats: {
    totalEmployees: number;
    averageAge: string;
    departmentStats: { department: string; _count: { _all: number } }[];
    recentHires: number;
  };
}

export default function DashboardClient({ session, stats }: DashboardClientProps) {
  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                HR Core
              </h1>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                Management Suite
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:block text-right border-r border-slate-200 pr-6">
              <p className="text-sm font-semibold text-slate-900">
                {session?.user?.username}
              </p>
              <p className="text-xs text-indigo-600 font-medium">
                {session?.user?.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all duration-200 font-medium shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            System Overview
          </h2>
          <p className="text-slate-600 mt-2">
            Welcome back. Here's a snapshot of your organization's health today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Total Employees */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 hover:shadow-xl hover:shadow-indigo-50 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-indigo-50 p-3 rounded-2xl group-hover:bg-indigo-600 transition-colors duration-300">
                <Users className="w-6 h-6 text-indigo-600 group-hover:text-white" />
              </div>
              <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg text-xs font-bold">
                +12%
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium">Total Personnel</p>
            <p className="text-4xl font-black text-slate-900 mt-1">
              {stats.totalEmployees}
            </p>
          </div>

          {/* Average Age */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 hover:shadow-xl hover:shadow-sky-50 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-sky-50 p-3 rounded-2xl group-hover:bg-sky-600 transition-colors duration-300">
                <TrendingUp className="w-6 h-6 text-sky-600 group-hover:text-white" />
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium">Average Age</p>
            <p className="text-4xl font-black text-slate-900 mt-1">
              {stats.averageAge} <span className="text-sm font-normal text-slate-400">years</span>
            </p>
          </div>

          {/* Departments Count */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 hover:shadow-xl hover:shadow-violet-50 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-violet-50 p-3 rounded-2xl group-hover:bg-violet-600 transition-colors duration-300">
                <PieChart className="w-6 h-6 text-violet-600 group-hover:text-white" />
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium">Departments</p>
            <p className="text-4xl font-black text-slate-900 mt-1">
              {stats.departmentStats.length}
            </p>
          </div>

          {/* Recent Hires */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 hover:shadow-xl hover:shadow-rose-50 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-rose-50 p-3 rounded-2xl group-hover:bg-rose-600 transition-colors duration-300">
                <BarChart3 className="w-6 h-6 text-rose-600 group-hover:text-white" />
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium">New Hires (30d)</p>
            <p className="text-4xl font-black text-slate-900 mt-1">
              {stats.recentHires}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Department Breakdown */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-900">Department Distribution</h3>
              <Link href="/employees" className="text-indigo-600 hover:text-indigo-700 text-sm font-bold flex items-center gap-1 group">
                View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="space-y-6">
              {stats.departmentStats.map((dept, index) => (
                <div key={dept.department} className="relative">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-bold text-slate-700">{dept.department}</span>
                    <span className="text-sm font-black text-slate-900">{dept._count._all}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000 delay-300"
                      style={{ width: `${(dept._count._all / stats.totalEmployees) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl shadow-2xl shadow-indigo-200 p-8 text-white">
            <h3 className="text-xl font-bold mb-6">Quick Actions</h3>
            <div className="space-y-4">
              <Link
                href="/employees"
                className="flex items-center justify-between p-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold">Manage Employees</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
              <div
                className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl cursor-not-allowed opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/10 p-2 rounded-xl">
                    <PieChart className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold">Financial Reports</span>
                </div>
                <span className="text-[10px] uppercase font-black tracking-widest bg-white/20 px-2 py-1 rounded-md">Locked</span>
              </div>
            </div>
            
            <div className="mt-12 p-6 bg-white/10 rounded-2xl border border-white/10">
              <p className="text-sm font-medium text-indigo-100 mb-1">Current User</p>
              <p className="text-lg font-bold truncate">{session?.user?.username}</p>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-200">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
