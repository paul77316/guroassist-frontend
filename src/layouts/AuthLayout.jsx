import { Outlet } from 'react-router-dom';

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
      <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 px-5 py-8 sm:px-8 lg:w-1/2 lg:bg-gray-50 lg:px-4 lg:py-12">
        <div className="w-full max-w-md">
          <div className="mb-5 rounded-2xl bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-5 text-white shadow-lg shadow-blue-950/15 lg:hidden">
            <h1 className="text-2xl font-bold tracking-tight">
              <span>Guro</span><span className="text-blue-400">Assist</span>
            </h1>
            <p className="mt-1 text-sm text-blue-100/80">Teacher Assistant System</p>
            <div className="mt-4 h-0.5 w-10 bg-blue-400" />
          </div>

          <div className="rounded-3xl border border-white/80 bg-white p-6 shadow-2xl shadow-slate-900/10 sm:p-8 lg:rounded-2xl lg:border-gray-200 lg:shadow-xl">
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
