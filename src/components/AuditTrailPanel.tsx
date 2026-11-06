import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Clock,
  User,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { AuditLog } from '../types';

interface AuditTrailPanelProps {
  onClose?: () => void;
}

export const AuditTrailPanel: React.FC<AuditTrailPanelProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');

  const fetchLogs = () => {
    setIsLoading(true);
    fetch('/api/audit-logs')
      .then((res) => res.json())
      .then((data) => {
        if (data.logs) setLogs(data.logs);
      })
      .catch((err) => console.error('Error fetching audit logs:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === '' ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.affectedEntityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEntity =
      selectedEntity === 'all' || log.affectedEntityName.toLowerCase() === selectedEntity.toLowerCase();

    return matchesSearch && matchesEntity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            Traçabilité & Sécurité
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            Journal d'Audit des Événements & Transitions
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Enregistrement chronologique immuable des actions exécutées par chaque acteur (Candidat, Agent, Directeur, Labo, CEDoc).
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par action, acteur, code dossier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-slate-500 font-semibold">Entité :</span>
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">Toutes les entités</option>
            <option value="candidature">Candidature</option>
            <option value="document">Document</option>
            <option value="user">Utilisateur</option>
          </select>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3">Horodatage (UTC)</th>
                <th className="px-5 py-3">Événement / Méthode</th>
                <th className="px-5 py-3">Acteur (RBAC)</th>
                <th className="px-5 py-3">Entité Ciblée</th>
                <th className="px-5 py-3">Détails de l'Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Aucun événement d'audit ne correspond à vos filtres.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isSuccessAction =
                    log.action.includes('valider') ||
                    log.action.includes('approuver') ||
                    log.action.includes('soumettre');
                  const isRejectAction = log.action.includes('refuser') || log.action.includes('signaler');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(log.timestamp).toLocaleString('fr-FR')}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3 whitespace-nowrap">
                        <span
                          className={`font-mono font-bold px-2.5 py-1 rounded-md text-[11px] border ${
                            isRejectAction
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isSuccessAction
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{log.userName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{log.userRole}</div>
                      </td>

                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{log.affectedEntityName}</span>
                        <div className="font-mono text-[10px] text-slate-500">{log.affectedEntityId}</div>
                      </td>

                      <td className="px-5 py-3 text-slate-600 leading-relaxed max-w-md">
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
