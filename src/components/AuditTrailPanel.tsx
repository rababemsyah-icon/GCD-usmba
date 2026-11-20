import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  X,
  Lock,
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
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Top Header Row (Minimal, No marketing banner) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Journal d'Audit & Traçabilité
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {filteredLogs.length} événement(s) consigné(s)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLogs}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Actualiser les événements"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Fermer
            </button>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par action, acteur, code dossier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div>
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="all">Toutes les entités</option>
            <option value="Candidature">Candidature</option>
            <option value="Document">Document</option>
            <option value="Signature">Signature</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            Aucun enregistrement d'audit ne correspond à vos filtres.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                      {log.action}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {log.affectedEntityName} ({log.affectedEntityId})
                    </span>
                  </div>
                  <p className="text-slate-700 text-xs leading-snug">
                    {log.details}
                  </p>
                </div>

                <div className="text-right shrink-0 text-[11px] text-slate-400 font-mono space-y-0.5 self-end sm:self-center">
                  <div className="font-semibold text-slate-700">{log.userName}</div>
                  <div>{new Date(log.timestamp).toLocaleString('fr-FR')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
