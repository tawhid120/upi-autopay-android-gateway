// NOTE: STRICT ENGLISH-ONLY UI. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import React, { useState, useEffect } from 'react';
import {
  Briefcase, Plus, Search, Calendar, Clock, DollarSign,
  CheckCircle, AlertCircle, ChevronRight, X, User, ExternalLink,
  PlusCircle, Trash2, Edit2, FileText, CheckSquare, Layers
} from 'lucide-react';
import { api } from '../../services/api';

interface Milestone {
  title: string;
  amount?: number;
  status: 'Pending' | 'In Progress' | 'Completed';
  dueDate?: string;
}

interface Project {
  id: string;
  customer_id: string;
  customer_name: string;
  company_name?: string;
  customer_phone: string;
  title: string;
  description?: string;
  service_category: string;
  start_date?: string;
  expected_end_date?: string;
  actual_end_date?: string;
  project_amount: number;
  paid_amount: number;
  due_amount: number;
  status: 'Pending' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';
  milestones: Milestone[];
  notes?: string;
  invoice_count: number;
  created_at: string;
}

export const ProjectsWorkTab: React.FC<{ onNavigateToInvoice?: (projectId: string) => void }> = ({ onNavigateToInvoice }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectInvoices, setProjectInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // New Project Form
  const [customerId, setCustomerId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceCategory, setServiceCategory] = useState('Web Development');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [projectAmount, setProjectAmount] = useState('');
  const [milestones, setMilestones] = useState<Milestone[]>([
    { title: 'Project Discovery & Design', amount: 10000, status: 'Completed' },
    { title: 'Core Development', amount: 20000, status: 'In Progress' },
  ]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const [projRes, custRes] = await Promise.all([
        api.get('/business/projects', {
          params: { status: statusFilter !== 'all' ? statusFilter : undefined },
        }),
        api.get('/business/customers'),
      ]);
      setProjects(projRes.data.data || []);
      setCustomers(custRes.data.data || []);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  const handleAddMilestone = () => {
    setMilestones([...milestones, { title: '', amount: 0, status: 'Pending' }]);
  };

  const handleRemoveMilestone = (idx: number) => {
    setMilestones(milestones.filter((_, i) => i !== idx));
  };

  const handleMilestoneChange = (idx: number, field: keyof Milestone, val: any) => {
    const updated = [...milestones];
    (updated[idx] as any)[field] = val;
    setMilestones(updated);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/business/projects', {
        customerId,
        title,
        description,
        serviceCategory,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        expectedEndDate: expectedEndDate ? new Date(expectedEndDate).toISOString() : undefined,
        projectAmount: parseFloat(projectAmount) || 0,
        milestones,
        notes,
      });

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setProjectAmount('');
      fetchProjects();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  const loadProjectDetails = async (project: Project) => {
    setSelectedProject(project);
    setLoadingInvoices(true);
    try {
      const res = await api.get(`/business/projects/${project.id}`);
      setProjectInvoices(res.data.data?.invoices || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    try {
      await api.put(`/business/projects/${projectId}`, { status: newStatus });
      fetchProjects();
      if (selectedProject?.id === projectId) {
        setSelectedProject({ ...selectedProject, status: newStatus as any });
      }
    } catch (err) {
      alert('Failed to update project status.');
    }
  };

  // Metrics
  const activeProjects = projects.filter((p) => p.status === 'In Progress' || p.status === 'Pending').length;
  const totalValue = projects.reduce((sum, p) => sum + (p.project_amount || 0), 0);
  const totalPaid = projects.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
  const totalDue = projects.reduce((sum, p) => sum + (p.due_amount || 0), 0);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      p.service_category.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Active Projects</span>
            <Briefcase className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{activeProjects}</div>
          <div className="text-[11px] text-slate-400 mt-1">Pending / In delivery</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Total Contract Value</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">৳{totalValue.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">Across all clients</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Collected Fees</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-[#37e58a] font-mono">৳{totalPaid.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-600/80 dark:text-[#37e58a]/80 mt-1">Milestones settled</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1 font-medium">
            <span>Outstanding Project Dues</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">৳{totalDue.toLocaleString()}</div>
          <div className="text-[11px] text-rose-500/80 mt-1">Unbilled / Uncollected</div>
        </div>
      </div>

      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by title, client, or category..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          Loading client projects...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/40">
          <Briefcase className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Projects Registered</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Organize client deliverables, track milestones, monitor project fees, and link itemized invoices in one place.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((p) => {
            const percentPaid = p.project_amount > 0 ? Math.min(100, Math.round((p.paid_amount / p.project_amount) * 100)) : 0;
            return (
              <div
                key={p.id}
                onClick={() => loadProjectDetails(p)}
                className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0e1512] hover:border-purple-500/30 transition-all cursor-pointer space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 border border-purple-500/20">
                        {p.service_category}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        p.status === 'Completed'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : p.status === 'In Progress'
                          ? 'bg-blue-500/10 text-blue-600'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">{p.title}</h4>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.customer_name}</span>
                      {p.company_name && <span>• {p.company_name}</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Project Fee</span>
                    <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      ৳{Number(p.project_amount).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Paid: ৳{Number(p.paid_amount || 0).toLocaleString()} ({percentPaid}%)
                    </span>
                    <span className="text-rose-500 font-bold">
                      Due: ৳{Number(p.due_amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${percentPaid}%` }}
                    />
                  </div>
                </div>

                {/* Milestones count & Dates */}
                <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{p.milestones?.length || 0} Milestones</span>
                  </div>
                  {p.expected_end_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Target: {new Date(p.expected_end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* PROJECT DETAILS MODAL                                    */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* PROJECT DETAILS MODAL                                    */}
      {/* ======================================================== */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs overflow-hidden">
          <div className="relative w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-[#0f1714] border border-slate-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Pinned Header */}
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600">
                    {selectedProject.service_category}
                  </span>
                  <select
                    value={selectedProject.status}
                    onChange={(e) => handleStatusChange(selectedProject.id, e.target.value)}
                    className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 border-0 focus:outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{selectedProject.title}</h3>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Client: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedProject.customer_name}</span> ({selectedProject.customer_phone})
                </div>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto px-5 py-4 flex-1 space-y-5 overscroll-contain">
              {/* Financial Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Fee</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white font-mono">৳{Number(selectedProject.project_amount).toLocaleString()}</div>
                </div>
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl border border-emerald-500/20">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-1">Paid In</span>
                  <div className="text-base font-black text-emerald-600 dark:text-[#37e58a] font-mono">৳{Number(selectedProject.paid_amount || 0).toLocaleString()}</div>
                </div>
                <div className="p-3 bg-rose-50/50 dark:bg-rose-950/10 rounded-xl border border-rose-500/20">
                  <span className="text-[10px] uppercase font-bold text-rose-600 block mb-1">Remaining Due</span>
                  <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">৳{Number(selectedProject.due_amount || 0).toLocaleString()}</div>
                </div>
              </div>

              {/* Milestones Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Milestones & Deliverables ({selectedProject.milestones?.length || 0})
                </h4>
                <div className="space-y-2">
                  {selectedProject.milestones?.length === 0 ? (
                    <div className="text-xs text-slate-400">No milestones registered.</div>
                  ) : (
                    selectedProject.milestones.map((m, i) => (
                      <div key={i} className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckSquare className={`w-4 h-4 ${m.status === 'Completed' ? 'text-emerald-500' : 'text-slate-400'}`} />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{m.title}</div>
                            <div className="text-[11px] text-slate-400">{m.status}</div>
                          </div>
                        </div>
                        {m.amount && (
                          <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            ৳{Number(m.amount).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Linked Invoices */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Linked Invoices ({projectInvoices.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {loadingInvoices ? (
                    <div className="text-xs text-slate-400">Loading invoices...</div>
                  ) : projectInvoices.length === 0 ? (
                    <div className="text-xs text-slate-400">No invoices linked directly to this project.</div>
                  ) : (
                    projectInvoices.map((inv) => (
                      <div key={inv.id} className="p-3 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
                        <div className="font-mono font-bold">{inv.invoice_number}</div>
                        <div className="font-mono font-bold text-emerald-600">৳{Number(inv.total).toLocaleString()}</div>
                        <a href={`/invoice/${inv.id}`} target="_blank" rel="noreferrer" className="text-blue-500 font-bold hover:underline">
                          View
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedProject.notes && (
                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Notes: </span>
                  {selectedProject.notes}
                </div>
              )}
            </div>

            {/* Pinned Footer */}
            <div className="flex items-center justify-end px-5 py-3.5 border-t border-slate-100 dark:border-white/10 shrink-0 bg-slate-50/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* NEW PROJECT MODAL                                        */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs overflow-hidden">
          <div className="relative w-full max-w-xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-[#0f1714] border border-slate-200 dark:border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Pinned Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 shrink-0 bg-white/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Initialize Client Project</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="create-project-form" onSubmit={handleCreateProject} className="overflow-y-auto px-5 py-4 flex-1 space-y-3.5 overscroll-contain text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Select Client *</label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                >
                  <option value="">Choose customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) {c.company_name ? `• ${c.company_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Project Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Website Redesign & SEO"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Mobile App">Mobile App</option>
                    <option value="UI/UX Design">UI/UX Design</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Maintenance">Maintenance / Retainer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Total Fee (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={projectAmount}
                    onChange={(e) => setProjectAmount(e.target.value)}
                    placeholder="30000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Expected End Date</label>
                  <input
                    type="date"
                    value={expectedEndDate}
                    onChange={(e) => setExpectedEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Milestones builder */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Deliverable Milestones</span>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="text-purple-600 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Milestone</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {milestones.map((m, idx) => (
                    <div key={idx} className="p-2 sm:p-0 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] sm:bg-transparent sm:dark:bg-transparent border border-slate-200/60 dark:border-white/5 sm:border-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        required
                        value={m.title}
                        onChange={(e) => handleMilestoneChange(idx, 'title', e.target.value)}
                        placeholder="Milestone description..."
                        className="flex-1 px-3 py-2 rounded-xl bg-white sm:bg-slate-50 dark:bg-black/20 sm:dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-28 sm:w-24">
                          <span className="sm:hidden text-[10px] text-slate-400 block mb-0.5">Amount</span>
                          <input
                            type="number"
                            value={m.amount || ''}
                            onChange={(e) => handleMilestoneChange(idx, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder="Amount"
                            className="w-full px-2 py-2 rounded-xl bg-white sm:bg-slate-50 dark:bg-black/20 sm:dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-right"
                          />
                        </div>
                        <div className="flex-1 sm:w-28">
                          <span className="sm:hidden text-[10px] text-slate-400 block mb-0.5">Status</span>
                          <select
                            value={m.status}
                            onChange={(e) => handleMilestoneChange(idx, 'status', e.target.value)}
                            className="w-full px-2 py-2 rounded-xl bg-white sm:bg-slate-50 dark:bg-black/20 sm:dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-[11px]"
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                        {milestones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMilestone(idx)}
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg cursor-pointer self-end sm:self-center transition-colors"
                            title="Remove milestone"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Project Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Scope of work, repository links, client agreements..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 dark:border-white/10 shrink-0 bg-slate-50/95 dark:bg-[#0f1714]/95 backdrop-blur z-10">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                form="create-project-form"
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
              >
                {submitting ? 'Initializing...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
