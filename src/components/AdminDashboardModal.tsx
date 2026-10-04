import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Activity,
  Server,
  Users,
  HardDrive,
  Cpu,
  BarChart,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Lock,
  LogOut,
  CreditCard,
  FileText,
  Clock,
  Check,
  Ban,
  ArrowRight,
} from 'lucide-react';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginKey, setLoginKey] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'metrics' | 'payments' | 'audit'>('metrics');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Check if session is already active via server-side cookie
  const checkSession = async () => {
    setCheckingSession(true);
    try {
      const res = await fetch('/api/admin/session');
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        fetchMetrics();
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setCheckingSession(false);
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/metrics');
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 401) {
          setIsAuthenticated(false);
        } else {
          setError(data.message || 'Failed to fetch admin metrics.');
        }
      } else {
        setMetrics(data);
      }
    } catch (err: any) {
      setError(err?.message || 'Network error fetching system metrics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      if (data.success && data.logs) {
        setAuditLogs(data.logs);
      }
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      checkSession();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [isAuthenticated, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginKey.trim()) {
      setLoginError('Please enter the Admin Key.');
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: loginKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLoginError(data.message || 'Authentication failed. Invalid key.');
      } else {
        setIsAuthenticated(true);
        setLoginKey('');
        fetchMetrics();
      }
    } catch (err: any) {
      setLoginError('Connection error during admin login.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    setIsAuthenticated(false);
    setMetrics(null);
  };

  const handleVerifyPayment = async (paymentId: string, approve: boolean) => {
    try {
      const res = await fetch('/api/admin/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, approve }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess(data.message);
        setTimeout(() => setActionSuccess(null), 3000);
        fetchMetrics();
      }
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#071E17] text-stone-900 dark:text-stone-100 rounded-3xl max-w-4xl w-full border border-stone-200 dark:border-[#0D2E24] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-[#0D2E24] flex items-center justify-between bg-stone-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Khan G Admin &amp; Telemetry Portal</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  {isAuthenticated ? 'AUTHENTICATED' : 'PROTECTED'}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Server-side authenticated system telemetry and business controls
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                <button
                  onClick={fetchMetrics}
                  disabled={loading}
                  className="p-2 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
                  title="Refresh Telemetry"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  title="Log out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action success message */}
        {actionSuccess && (
          <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/80 border-b border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Content Area */}
        {checkingSession ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
            <p className="text-xs text-stone-500">Checking secure administrator session...</p>
          </div>
        ) : !isAuthenticated ? (
          /* Secure Sign-In Form */
          <div className="p-6 sm:p-10 flex flex-col items-center justify-center max-w-md mx-auto w-full my-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-1">
              Administrator Verification
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-6 max-w-xs leading-relaxed">
              This portal requires server-side authentication. Enter the master key to access real-time metrics, user plans, and verified payments.
            </p>

            <form onSubmit={handleLogin} className="w-full space-y-3">
              <div className="text-left">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Master Admin Key
                </label>
                <input
                  type="password"
                  value={loginKey}
                  onChange={(e) => setLoginKey(e.target.value)}
                  placeholder="Enter administrator key"
                  className="w-full text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 p-3 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  autoFocus
                />
              </div>

              {loginError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 text-left flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 rounded-xl bg-[#00A86B] hover:bg-[#00925d] active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate &amp; Access</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Dashboard */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-stone-200 dark:border-[#0D2E24] bg-stone-50 dark:bg-[#051711] overflow-x-auto text-xs">
              <button
                onClick={() => setActiveTab('metrics')}
                className={`px-3 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'metrics'
                    ? 'border-[#00A86B] text-[#00A86B] bg-white dark:bg-[#071E17]'
                    : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Overview &amp; Telemetry</span>
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`px-3 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'payments'
                    ? 'border-[#00A86B] text-[#00A86B] bg-white dark:bg-[#071E17]'
                    : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Payments &amp; Verifications</span>
                {metrics?.paymentGateway?.pendingVerificationCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {metrics.paymentGateway.pendingVerificationCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'audit'
                    ? 'border-[#00A86B] text-[#00A86B] bg-white dark:bg-[#071E17]'
                    : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Security Audit Trail</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {activeTab === 'metrics' && metrics && (
                <>
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                      <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
                        <span>Total Users</span>
                        <Users className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                        {metrics.totalUsers}
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {metrics.freeUsersCount} Free • {metrics.proUsersCount} Pro
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                      <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
                        <span>Active Pro</span>
                        <CheckCircle className="w-4 h-4 text-[#00A86B]" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-[#00A86B]">
                        {metrics.proUsersCount}
                      </div>
                      <span className="text-[10px] text-stone-400">
                        +{metrics.trialingUsersCount} trialing
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                      <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
                        <span>Total Requests</span>
                        <Activity className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                        {metrics.totalApiRequests}
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {metrics.analytics?.totalMessagesProcessed || 0} messages
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                      <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
                        <span>Verified Revenue</span>
                        <CreditCard className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                        {metrics.paymentGateway.currency} {metrics.paymentGateway.totalRevenue.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {metrics.paymentGateway.pendingVerificationCount} pending review
                      </span>
                    </div>
                  </div>

                  {/* System & Memory Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-emerald-600" />
                        <span>System Health &amp; Memory</span>
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                          <span className="text-[10px] text-stone-400 block">Uptime</span>
                          <span className="font-mono font-bold">{Math.floor(metrics.uptimeSeconds / 60)}m</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                          <span className="text-[10px] text-stone-400 block">Heap Used</span>
                          <span className="font-mono font-bold">{metrics.memoryUsageMB.heapUsed} MB</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                          <span className="text-[10px] text-stone-400 block">Storage Disk</span>
                          <span className="font-mono font-bold">{metrics.activeStorageMB} MB</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                        <Server className="w-4 h-4 text-emerald-600" />
                        <span>AI Inference Providers</span>
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                          <span>Gemini Flash</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${metrics.providersConfigured.gemini ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'}`}>
                            {metrics.providersConfigured.gemini ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                          <span>Groq LPU (Whisper/Llama)</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${metrics.providersConfigured.groq ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'}`}>
                            {metrics.providersConfigured.groq ? 'ONLINE' : 'CONFIG REQUIRED'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Payments & Verifications Tab */}
              {activeTab === 'payments' && metrics && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      Payment Verification Queue (JazzCash, EasyPaisa, Raast)
                    </h3>
                    <span className="text-xs text-stone-500">
                      {metrics.recentPayments?.length || 0} Total Transactions
                    </span>
                  </div>

                  {metrics.recentPayments?.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                      <p className="text-xs text-stone-500">No payment transaction records submitted yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-200 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden bg-white dark:bg-stone-900">
                      {metrics.recentPayments.map((p: any) => (
                        <div key={p.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                                {p.transactionId}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.status === 'verified'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : p.status === 'pending'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              }`}>
                                {p.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-stone-500 mt-1">
                              User: <span className="font-mono">{p.userId}</span> • Amount: <strong>{p.currency} {p.amount}</strong> ({p.provider})
                            </div>
                            <div className="text-[10px] text-stone-400 mt-0.5">
                              Submitted: {new Date(p.createdAt).toLocaleString()}
                            </div>
                          </div>

                          {p.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleVerifyPayment(p.id, true)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Verify &amp; Activate Pro</span>
                              </button>
                              <button
                                onClick={() => handleVerifyPayment(p.id, false)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Audit Logs Tab */}
              {activeTab === 'audit' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      Administrator Audit Trail (Immutable Log)
                    </h3>
                  </div>

                  <div className="divide-y divide-stone-200 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden bg-white dark:bg-stone-900 text-xs">
                    {auditLogs.length === 0 ? (
                      <div className="p-6 text-center text-stone-500">No audit logs recorded yet.</div>
                    ) : (
                      auditLogs.map((log: any) => (
                        <div key={log.id} className="p-3 flex items-center justify-between gap-3">
                          <div>
                            <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                              {log.action}
                            </span>
                            <span className="text-stone-400 text-[10px] ml-2">by {log.adminId}</span>
                            {log.details && (
                              <span className="text-stone-500 text-[10px] ml-2 font-mono">
                                ({JSON.stringify(log.details)})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-stone-400 font-mono shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
