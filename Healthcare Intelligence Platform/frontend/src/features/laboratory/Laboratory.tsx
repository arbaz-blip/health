import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Plus, Beaker, FileText, CheckCircle, ShieldAlert, AlertTriangle, Filter } from 'lucide-react';
import { api } from '../../lib/api';

export default function Laboratory() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [collectForm, setCollectForm] = useState({
    sample_number: '',
    sample_type: 'Whole Blood'
  });

  const [resultForm, setResultForm] = useState<Record<string, { value: string; is_critical: boolean }>>({});
  const [newOrderForm, setNewOrderForm] = useState({
    patient_id: '',
    tests: [] as string[],
    clinical_notes: ''
  });

  // Query: Get Lab Orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['lab-orders'],
    queryFn: async () => {
      const res = await api.get('/laboratory/orders');
      return res.data.data;
    },
    refetchInterval: 6000 // Refresh orders list every 6s
  });

  // Query: Get Patients for making order
  const { data: patientsList } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const res = await api.get('/patients');
      return res.data.data;
    }
  });

  // Query: Get Lab Tests Catalog
  const { data: testCatalog } = useQuery({
    queryKey: ['lab-test-catalog'],
    queryFn: async () => {
      const res = await api.get('/laboratory/test-catalog');
      return res.data.data;
    }
  });

  // Mutation: Create Lab Order
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: { patient_id: string; tests: string[]; clinical_notes: string }) => {
      const res = await api.post('/laboratory/orders', orderData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      setShowCreateModal(false);
      setNewOrderForm({ patient_id: '', tests: [], clinical_notes: '' });
    }
  });

  // Mutation: Log Specimen Collection
  const collectMutation = useMutation({
    mutationFn: async (sampleData: typeof collectForm & { lab_order_id: string }) => {
      const res = await api.put('/laboratory/samples/collect', sampleData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      setShowCollectModal(false);
      setCollectForm({ sample_number: '', sample_type: 'Whole Blood' });
    }
  });

  // Mutation: Input Test Results
  const resultsMutation = useMutation({
    mutationFn: async (resultsData: { lab_order_id: string; results: Array<{ test_code: string; result_value: string; is_flagged_critical: boolean }> }) => {
      const res = await api.post('/laboratory/results', resultsData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      setShowResultModal(false);
      setResultForm({});
    }
  });

  // Mutation: Verify Results (APPROVE/REJECT)
  const verifyMutation = useMutation({
    mutationFn: async ({ orderId, action, reason }: { orderId: string; action: 'APPROVE' | 'REJECT'; reason?: string }) => {
      const res = await api.put('/laboratory/results/verify', {
        lab_order_id: orderId,
        action,
        rejection_reason: reason
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    }
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderForm.patient_id || newOrderForm.tests.length === 0) return;
    createOrderMutation.mutate(newOrderForm);
  };

  const handleCollectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    collectMutation.mutate({
      ...collectForm,
      lab_order_id: selectedOrderId
    });
  };

  const handleResultsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    const order = orders.find((o: any) => o.id === selectedOrderId);
    if (!order) return;

    const formattedResults = order.results.map((r: any) => ({
      test_code: r.test_code,
      result_value: resultForm[r.test_code]?.value || '',
      is_flagged_critical: !!resultForm[r.test_code]?.is_critical
    }));

    resultsMutation.mutate({
      lab_order_id: selectedOrderId,
      results: formattedResults
    });
  };

  const toggleTestSelection = (testCode: string) => {
    const current = [...newOrderForm.tests];
    const index = current.indexOf(testCode);
    if (index === -1) {
      current.push(testCode);
    } else {
      current.splice(index, 1);
    }
    setNewOrderForm({ ...newOrderForm, tests: current });
  };

  const filteredOrders = orders?.filter((o: any) => {
    if (statusFilter === 'All') return true;
    return o.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Verified':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Processing':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'Sample Collected':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Ordered':
        return 'bg-slate-700/50 text-slate-400 border border-slate-600/30';
      default:
        return 'bg-slate-700/50 text-slate-400 border border-slate-600/30';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Lab Information System (LIS)</h1>
          <p className="text-slate-400 mt-1">Manage laboratory workflow: ordered, collected, processing, and supervisor validation.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/10 shrink-0"
        >
          <Plus className="h-5 w-5" />
          <span>New Lab Order</span>
        </button>
      </div>

      {/* LIS Worklist Dashboard */}
      <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-cyan-400" />
            <span>LIS Specimen Worklist</span>
          </h2>

          {/* Status Filter Tab Group */}
          <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-700/50 text-xs font-semibold">
            {['All', 'Ordered', 'Sample Collected', 'Processing', 'Verified'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === status 
                    ? 'bg-cyan-500 text-slate-900 font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Worklist Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-xs font-semibold tracking-wider border-b border-slate-700">
              <tr>
                <th className="py-4 px-4">Order ID</th>
                <th className="py-4 px-4">Patient details</th>
                <th className="py-4 px-4">Tests Ordered</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-750">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">Retrieving laboratory records...</td>
                </tr>
              ) : filteredOrders?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">No laboratory orders fit the active filter.</td>
                </tr>
              ) : (
                filteredOrders?.map((ord: any) => {
                  const hasCriticalResult = ord.results.some((r: any) => r.is_flagged_critical);
                  return (
                    <tr key={ord.id} className="hover:bg-slate-750/30 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-cyan-400">
                        <div className="flex flex-col">
                          <span>{ord.id}</span>
                          <span className="text-[10px] text-slate-500">Ordered: {new Date(ord.created_at).toLocaleTimeString()}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white">{ord.patient_name}</div>
                        <div className="text-xs font-mono text-slate-400">MRN: {ord.mrn}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {ord.results.map((r: any) => (
                            <span key={r.id} className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] text-slate-350">
                              {r.test_name} {r.result_value ? `(${r.result_value} ${r.unit || ''})` : ''}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md uppercase ${getStatusBadge(ord.status)}`}>
                            {ord.status}
                          </span>
                          {hasCriticalResult && (
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-extrabold rounded border border-red-500/30 animate-pulse flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" />
                              <span>CRITICAL VALUE</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {ord.status === 'Ordered' && (
                            <button
                              onClick={() => { setSelectedOrderId(ord.id); setShowCollectModal(true); }}
                              className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold transition-colors border border-cyan-400/20 flex items-center gap-1"
                            >
                              <Beaker className="h-3.5 w-3.5" />
                              <span>Collect Sample</span>
                            </button>
                          )}
                          {ord.status === 'Sample Collected' && (
                            <button
                              onClick={() => { 
                                setSelectedOrderId(ord.id); 
                                // Prep initial result form state
                                const initForm: typeof resultForm = {};
                                ord.results.forEach((r: any) => {
                                  initForm[r.test_code] = { value: '', is_critical: false };
                                });
                                setResultForm(initForm);
                                setShowResultModal(true); 
                              }}
                              className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-bold transition-colors border border-indigo-400/20 flex items-center gap-1"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>Enter Results</span>
                            </button>
                          )}
                          {ord.status === 'Processing' && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => verifyMutation.mutate({ orderId: ord.id, action: 'APPROVE' })}
                                className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-extrabold border border-emerald-400/20"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Specify rejection reason:');
                                  if (reason) verifyMutation.mutate({ orderId: ord.id, action: 'REJECT', reason });
                                }}
                                className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-extrabold border border-red-500/20"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {ord.status === 'Verified' && (
                            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                              <CheckCircle className="h-4 w-4 text-emerald-400" />
                              <span>Verified</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Create Lab Order */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl space-y-6">
            <h2 className="text-xl font-bold text-white border-b border-slate-750 pb-4">Order Lab Investigations</h2>
            
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Patient</label>
                <select
                  required
                  value={newOrderForm.patient_id}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, patient_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="">Choose patient...</option>
                  {patientsList?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.mrn} - {p.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Tests</label>
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-900 border border-slate-700 rounded-xl">
                  {testCatalog?.map((test: any) => {
                    const isSelected = newOrderForm.tests.includes(test.code);
                    return (
                      <button
                        type="button"
                        key={test.code}
                        onClick={() => toggleTestSelection(test.code)}
                        className={`p-3 text-left rounded-lg text-xs font-bold border transition-all ${
                          isSelected 
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-400' 
                            : 'bg-slate-800 text-slate-400 border-slate-750'
                        }`}
                      >
                        {test.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Clinical Indication Notes</label>
                <textarea
                  rows={2}
                  value={newOrderForm.clinical_notes}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, clinical_notes: e.target.value })}
                  placeholder="e.g. Rule out anemia, routine checkup..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-750">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createOrderMutation.isPending}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl text-sm"
                >
                  {createOrderMutation.isPending ? 'Submitting...' : 'Issue Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Log Specimen Collection */}
      {showCollectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-white border-b border-slate-750 pb-3">Log Specimen Collection</h2>
            
            <form onSubmit={handleCollectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Barcode Sample Number</label>
                <input
                  type="text"
                  required
                  value={collectForm.sample_number}
                  onChange={(e) => setCollectForm({ ...collectForm, sample_number: e.target.value })}
                  placeholder="e.g. SMP-20261011"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Specimen Type</label>
                <select
                  value={collectForm.sample_type}
                  onChange={(e) => setCollectForm({ ...collectForm, sample_type: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                >
                  <option>Whole Blood</option>
                  <option>Serum</option>
                  <option>Plasma</option>
                  <option>Urine Specimen</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-750">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={collectMutation.isPending}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl text-sm"
                >
                  {collectMutation.isPending ? 'Logging...' : 'Confirm Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Enter Results Form */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl space-y-6">
            <h2 className="text-xl font-bold text-white border-b border-slate-750 pb-4">Enter Diagnostic Lab Values</h2>
            
            <form onSubmit={handleResultsSubmit} className="space-y-6">
              
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {orders?.find((o: any) => o.id === selectedOrderId)?.results.map((r: any) => (
                  <div key={r.id} className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">{r.test_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Range: {r.reference_range} {r.unit || ''}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 items-center">
                      <div className="col-span-2">
                        <input
                          type="text"
                          required
                          placeholder={`Enter value (${r.unit || ''})`}
                          value={resultForm[r.test_code]?.value || ''}
                          onChange={(e) => setResultForm({
                            ...resultForm,
                            [r.test_code]: {
                              value: e.target.value,
                              is_critical: !!resultForm[r.test_code]?.is_critical
                            }
                          })}
                          className="w-full p-2.5 bg-slate-850 border border-slate-700 rounded-lg text-sm text-white focus:outline-none"
                        />
                      </div>
                      
                      <div className="flex items-center justify-center">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-red-400">
                          <input
                            type="checkbox"
                            checked={!!resultForm[r.test_code]?.is_critical}
                            onChange={(e) => setResultForm({
                              ...resultForm,
                              [r.test_code]: {
                                value: resultForm[r.test_code]?.value || '',
                                is_critical: e.target.checked
                              }
                            })}
                            className="accent-red-500"
                          />
                          <span>Critical Flag</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-750 pt-4">
                <button
                  type="button"
                  onClick={() => setShowResultModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resultsMutation.isPending}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl text-sm"
                >
                  {resultsMutation.isPending ? 'Submitting...' : 'Submit to Supervisor'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
