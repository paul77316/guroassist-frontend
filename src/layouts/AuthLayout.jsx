import { Outlet } from 'react-router-dom';
import logo from '../assets/logo.jpg';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Left Column - Minimalist Design */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-blue-900 to-slate-900 relative">
        {/* Subtle Blue Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center h-full px-16 text-white">

          {/* Brand */}
          <h1 className="text-4xl font-bold mb-3 mt-6">
            <span className="text-white">Guro</span><span className="text-blue-400">Assist</span>
          </h1>
          <p className="text-lg text-blue-200/70 mb-8">
            Teacher Assistant System
          </p>

          {/* Simple Divider */}
          <div className="w-16 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 mb-8" />

          {/* Description */}
          <p className="text-blue-100/80 mb-12 max-w-md leading-relaxed">
            A comprehensive platform for teachers to track attendance, manage student interventions, and monitor academic progress.
          </p>

          {/* Simple Stats */}
          <div className="grid grid-cols-3 gap-6 mb-12">
            <div className="border border-blue-500/20 rounded-lg p-4 bg-blue-500/5">
              <p className="text-2xl font-bold text-blue-400">Track</p>
              <p className="text-sm text-blue-200/60">Attendance</p>
            </div>
            <div className="border border-blue-500/20 rounded-lg p-4 bg-blue-500/5">
              <p className="text-2xl font-bold text-blue-400">Manage</p>
              <p className="text-sm text-blue-200/60">Interventions</p>
            </div>
            <div className="border border-blue-500/20 rounded-lg p-4 bg-blue-500/5">
              <p className="text-2xl font-bold text-blue-400">Monitor</p>
              <p className="text-sm text-blue-200/60">Progress</p>
            </div>
          </div>

          {/* Powered By */}
          <div className="mt-auto mb-6 text-md">
            <p className="text-sm text-blue-300/50">© 2026 GuroAssist</p>
            <p className="text-sm text-blue-400 mt-1 font-medium">Powered by RPGSolution</p>
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <img
              src={logo}
              alt="GuroAssist Logo"
              className="mx-auto mb-4 h-16 w-auto object-contain"
            />
            <h1 className="text-2xl font-bold text-gray-900">GuroAssist</h1>
            <p className="mt-1 text-sm text-gray-600">Teacher Assistant System</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
            <Outlet />
          </div>

          <div className="lg:hidden mt-6 text-center">
            <p className="text-xs text-gray-500">© 2024 GuroAssist</p>
            <p className="text-xs text-gray-400 mt-1">Powered by RPGSolution</p>
          </div>
        </div>
      </div>
    </div>
  );
}
