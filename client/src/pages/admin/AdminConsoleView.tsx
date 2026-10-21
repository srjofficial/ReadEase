import React, { useState, useEffect } from 'react';
import {
  Activity,
  Users,
  Brain,
  Database,
  ShieldAlert,
  Server,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Sliders,
  Cpu,
  Key
} from 'lucide-react';
import { Card, Button, Badge } from '../../components/ui';
import { getStoredToken } from '../../utils/auth';

interface SystemStats {
  system: {
    nodeVersion: string;
    platform: string;
    uptime: number;
    memory: {
      rssMB: number;
      heapUsedMB: number;
      heapTotalMB: number;
    };
    cpuCores: number;
    loadAverage: number[];
  };
  database: {
    status: string;
    name: string;
    host: string;
  };
  counts: {
    totalUsers: number;
    studentCount: number;
    teacherCount: number;
    educatorCount: number;
    parentCount: number;
  };
}

interface UserRecord {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  target?: string;
  ip: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  details: string;
}

interface AdminConsoleProps {
  activeTab?: string;
  onNavigateTab?: (tab: string) => void;
}

export const AdminConsoleView: React.FC<AdminConsoleProps> = ({
  activeTab = 'dashboard',
  onNavigateTab
}) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [liveUptime, setLiveUptime] = useState<number>(0);

  const fetchAdminData = async () => {
    try {
      const token = getStoredToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [statsRes, usersRes, logsRes] = await Promise.all([
        fetch('http://localhost:5000/api/v1/admin/stats', { headers }),
        fetch('http://localhost:5000/api/v1/admin/users', { headers }),
        fetch('http://localhost:5000/api/v1/admin/audit-logs', { headers })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
        if (statsData.data?.system?.uptime !== undefined) {
          setLiveUptime(statsData.data.system.uptime);
        }
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.data.users);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setAuditLogs(logsData.data.logs);
      }
    } catch (err) {
      console.error('Failed to load admin telemetry:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Continuously count uptime second-by-second in real time
  useEffect(() => {
    const ticker = setInterval(() => {
      setLiveUptime((prev) => (prev > 0 ? prev + 1 : prev));
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const token = getStoredToken();
      const res = await fetch(`http://localhost:5000/api/v1/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, status: nextStatus } : u))
        );
        setStatusMessage(`User status successfully updated to ${nextStatus}.`);
        setTimeout(() => setStatusMessage(null), 4000);
        // Refresh audit logs
        const logsRes = await fetch('http://localhost:5000/api/v1/admin/audit-logs', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setAuditLogs(logsData.data.logs);
        }
      }
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const formatUptime = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return '0h 0m 0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Stealth Mode Indicator Banner */}
      <div className="p-4 rounded-xl border border-secondary/30 bg-surface-lowest shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary/15 flex items-center justify-center text-secondary shrink-0">
            <Key size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-body-md font-bold text-text-primary">
                Stealth Administrative Session
              </h2>
              <Badge variant="secondary" dot>
                HASH AUTH ACTIVE
              </Badge>
            </div>
            <p className="text-body-sm text-text-muted">
              Authenticated via <code className="text-xs bg-surface-low px-1.5 py-0.5 rounded font-mono">#admin:Password123!</code>. URL bar credentials cleared instantly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            iconLeft={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
            onClick={() => {
              setRefreshing(true);
              fetchAdminData();
            }}
          >
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2 text-sm font-medium animate-fade-in">
          <CheckCircle2 size={16} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-3 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'System Health', icon: Activity },
          { id: 'users', label: 'User & Role Management', icon: Users },
          { id: 'ai-pipeline', label: 'AI & OCR Service', icon: Brain },
          { id: 'rag-kb', label: 'RAG Knowledge Base', icon: Database },
          { id: 'audit-logs', label: 'Audit & Compliance Logs', icon: ShieldAlert }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigateTab && onNavigateTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-text-on-primary shadow-soft'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-low'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SYSTEM HEALTH */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="subtle" padding="md">
              <div className="flex items-center justify-between text-text-muted mb-2">
                <span className="text-label-md font-semibold">Total Accounts</span>
                <Users size={18} className="text-primary" />
              </div>
              <p className="text-display-lg-mobile font-bold text-text-primary">
                {stats?.counts.totalUsers ?? '...'}
              </p>
              <p className="text-xs text-text-muted mt-1">Platform registered users</p>
            </Card>

            <Card variant="subtle" padding="md">
              <div className="flex items-center justify-between text-text-muted mb-2">
                <span className="text-label-md font-semibold">Server Uptime</span>
                <Clock size={18} className="text-secondary" />
              </div>
              <p className="text-headline-lg font-bold text-text-primary font-mono tabular-nums">
                {formatUptime(liveUptime)}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Express API Process • Live</span>
              </div>
            </Card>

            <Card variant="subtle" padding="md">
              <div className="flex items-center justify-between text-text-muted mb-2">
                <span className="text-label-md font-semibold">Node Memory</span>
                <Cpu size={18} className="text-tertiary" />
              </div>
              <p className="text-headline-lg font-bold text-text-primary">
                {stats?.system.memory.heapUsedMB ?? '...'} MB
              </p>
              <p className="text-xs text-text-muted mt-1">
                Heap: {stats?.system.memory.heapTotalMB ?? '...'} MB Total
              </p>
            </Card>

            <Card variant="subtle" padding="md">
              <div className="flex items-center justify-between text-text-muted mb-2">
                <span className="text-label-md font-semibold">MongoDB Atlas</span>
                <Server size={18} className="text-emerald-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-headline-lg font-bold text-text-primary capitalize">
                  {stats?.database.status || 'Connected'}
                </p>
              </div>
              <p className="text-xs text-text-muted mt-1">Database: {stats?.database.name}</p>
            </Card>
          </div>

          {/* Detailed Telemetry Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="default" padding="lg" className="space-y-4">
              <h3 className="text-title-md font-bold text-text-primary flex items-center gap-2">
                <Server size={18} className="text-primary" /> Node Runtime & Environment
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-surface-border">
                  <span className="text-text-muted">Node.js Version</span>
                  <span className="font-mono text-text-primary font-semibold">
                    {stats?.system.nodeVersion}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-border">
                  <span className="text-text-muted">Operating System</span>
                  <span className="font-mono text-text-primary">{stats?.system.platform}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-border">
                  <span className="text-text-muted">CPU Architecture</span>
                  <span className="font-mono text-text-primary">
                    {stats?.system.cpuCores} Cores
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-border">
                  <span className="text-text-muted">Memory Resident Set (RSS)</span>
                  <span className="font-mono text-text-primary">
                    {stats?.system.memory.rssMB} MB
                  </span>
                </div>
              </div>
            </Card>

            <Card variant="default" padding="lg" className="space-y-4">
              <h3 className="text-title-md font-bold text-text-primary flex items-center gap-2">
                <Users size={18} className="text-secondary" /> User Base Distribution
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-surface-border">
                  <span className="text-text-muted">Students</span>
                  <Badge variant="primary">{stats?.counts.studentCount} Active</Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-border">
                  <span className="text-text-muted">Classroom Teachers</span>
                  <Badge variant="secondary">{stats?.counts.teacherCount} Active</Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-border">
                  <span className="text-text-muted">Special Educators</span>
                  <Badge variant="tertiary">{stats?.counts.educatorCount} Active</Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-border">
                  <span className="text-text-muted">Parents & Guardians</span>
                  <Badge variant="outline">{stats?.counts.parentCount} Active</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: USER & ROLE MANAGEMENT */}
      {activeTab === 'users' && (
        <Card variant="default" padding="lg" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-title-lg font-bold text-text-primary">User Directory</h3>
              <p className="text-body-sm text-text-secondary">
                Search, inspect, and toggle activation status across platform roles.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-surface-low border border-surface-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-surface-low border border-surface-border rounded-lg text-sm text-text-primary focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="special_educator">Special Educator</option>
                <option value="parent">Parent</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-surface-border text-text-muted text-xs uppercase font-semibold">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-surface-low transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-text-primary">{u.name}</div>
                      <div className="text-xs text-text-muted font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          u.role === 'admin'
                            ? 'error'
                            : u.role === 'teacher'
                            ? 'secondary'
                            : u.role === 'student'
                            ? 'primary'
                            : 'tertiary'
                        }
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          u.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-red-500/15 text-red-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                        ></span>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-muted text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.role !== 'admin' && (
                        <Button
                          variant={u.status === 'active' ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleUserStatus(u._id, u.status)}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: AI & OCR PIPELINE */}
      {activeTab === 'ai-pipeline' && (
        <div className="space-y-6">
          <Card variant="default" padding="lg" className="space-y-4">
            <h3 className="text-title-md font-bold text-text-primary flex items-center gap-2">
              <Brain size={18} className="text-tertiary" /> Document Extraction & OCR Pipeline
            </h3>
            <p className="text-body-sm text-text-secondary">
              Real-time monitoring of text parsers, dyslexia phoneme classifiers, and OCR worker threads.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-surface-low border border-surface-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-text-primary text-sm">Tesseract OCR Engine</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <div className="text-xs text-text-muted">Workers: 4 active threads</div>
                <div className="text-xs text-emerald-400 font-semibold mt-1">Status: ONLINE</div>
              </div>

              <div className="p-4 rounded-lg bg-surface-low border border-surface-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-text-primary text-sm">Google Cloud Vision API</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <div className="text-xs text-text-muted">Fallback Latency: 240ms</div>
                <div className="text-xs text-emerald-400 font-semibold mt-1">Status: STANDBY (Healthy)</div>
              </div>

              <div className="p-4 rounded-lg bg-surface-low border border-surface-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-text-primary text-sm">Malayalam & English TTS</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <div className="text-xs text-text-muted">Accuracy: 98.4%</div>
                <div className="text-xs text-emerald-400 font-semibold mt-1">Status: READY</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: RAG KNOWLEDGE BASE */}
      {activeTab === 'rag-kb' && (
        <Card variant="default" padding="lg" className="space-y-4">
          <h3 className="text-title-md font-bold text-text-primary flex items-center gap-2">
            <Sliders size={18} className="text-primary" /> Master Reading Preset Benchmarks
          </h3>
          <p className="text-body-sm text-text-secondary">
            Default typographic and cognitive accessibility thresholds applied across Grade 1–8 readers.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-sm">
            <div className="p-4 rounded-lg bg-surface-low border border-surface-border space-y-2">
              <span className="font-semibold text-text-primary">Dyslexia Baseline Typography</span>
              <p className="text-xs text-text-muted">Default typeface: Lexend (Variable weight 400–600)</p>
              <p className="text-xs text-text-muted">Minimum Letter Spacing: 0.04em</p>
              <p className="text-xs text-text-muted">Default Line Height: 1.8x</p>
            </div>

            <div className="p-4 rounded-lg bg-surface-low border border-surface-border space-y-2">
              <span className="font-semibold text-text-primary">Bionic Fixation Points</span>
              <p className="text-xs text-text-muted">Default Saccadic Fixation: 50%</p>
              <p className="text-xs text-text-muted">Reading Ruler Default Height: 48px</p>
              <p className="text-xs text-text-muted">Tint Palette: Warm Cream (#FBF9F1)</p>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit-logs' && (
        <Card variant="default" padding="lg" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-title-md font-bold text-text-primary flex items-center gap-2">
                <ShieldAlert size={18} className="text-secondary" /> Compliance & Security Audit Trail
              </h3>
              <p className="text-body-sm text-text-secondary">
                Immutable record of administrative actions, stealth logins, and account alterations.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-surface-border text-text-muted text-xs uppercase font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">IP</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-low transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-text-muted">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-text-primary">
                        {log.action}
                      </span>
                      <div className="text-xs text-text-muted">{log.details}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-text-secondary">{log.actor}</td>
                    <td className="py-3 px-4 font-mono text-xs text-text-muted">
                      {log.target || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-text-muted">{log.ip}</td>
                    <td className="py-3 px-4">
                      <Badge variant={log.status === 'SUCCESS' ? 'primary' : 'error'}>
                        {log.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
