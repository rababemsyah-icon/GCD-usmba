import React, { useState } from 'react';
import { SimulatedEmail } from '../types';
import { Mail, ArrowRight, X, Clock, CheckCircle2, AlertCircle, Send, Search } from 'lucide-react';

interface EmailSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  emails: SimulatedEmail[];
  onActionClick?: (actionUrl: string) => void;
}

export const EmailSimulatorModal: React.FC<EmailSimulatorModalProps> = ({
  isOpen,
  onClose,
  emails,
  onActionClick,
}) => {
  const [filterText, setFilterText] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<SimulatedEmail | null>(emails[0] || null);

  if (!isOpen) return null;

  const filtered = emails.filter((e) => {
    const q = filterText.toLowerCase();
    return (
      e.to.toLowerCase().includes(q) ||
      e.toName.toLowerCase().includes(q) ||
      e.subject.toLowerCase().includes(q) ||
      (e.applicationId && e.applicationId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Boîte des E-mails Transactionnels (Simulation)
                </h3>
                <span className="text-[11px] bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-full font-mono">
                  {emails.length} notifications
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Traçabilité des alertes générées automatiquement pour chaque étape du workflow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Split: List & Preview */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* List panel */}
          <div className="w-full md:w-5/12 border-r border-slate-200 flex flex-col bg-slate-50">
            {/* Search */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrer par destinataire ou sujet..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Aucun e-mail ne correspond au filtre.
                </div>
              ) : (
                filtered.map((mail) => {
                  const isSelected = selectedEmail?.id === mail.id;
                  return (
                    <button
                      key={mail.id}
                      onClick={() => setSelectedEmail(mail)}
                      className={`w-full text-left p-3.5 transition-colors cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-white border-l-4 border-l-slate-900 shadow-xs'
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-900 truncate max-w-[170px]">
                          {mail.toName}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {new Date(mail.sentAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {mail.subject}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">
                        {mail.body}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            mail.type === 'ACTION'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {mail.type === 'ACTION' ? 'Action requise' : 'Informatif'}
                        </span>
                        {mail.applicationId && (
                          <span className="text-[9px] text-slate-400 font-mono">
                            {mail.applicationId}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Email Preview Panel */}
          <div className="flex-1 flex flex-col bg-white overflow-y-auto">
            {selectedEmail ? (
              <div className="p-6 flex flex-col h-full justify-between gap-6">
                <div className="space-y-4">
                  <div className="border-b border-slate-200 pb-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">
                        Date d'envoi : {new Date(selectedEmail.sentAt).toLocaleString('fr-FR')}
                      </span>
                      {selectedEmail.type === 'ACTION' && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Action Attendue
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-slate-900 leading-snug">
                      {selectedEmail.subject}
                    </h4>

                    <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1 font-mono text-slate-600 border border-slate-200">
                      <div>
                        <strong className="text-slate-900">De :</strong> {selectedEmail.from}
                      </div>
                      <div>
                        <strong className="text-slate-900">À :</strong> {selectedEmail.toName} &lt;{selectedEmail.to}&gt;
                      </div>
                      {selectedEmail.deadline && (
                        <div className="text-amber-800 font-bold">
                          <strong>Échéance limite :</strong>{' '}
                          {new Date(selectedEmail.deadline).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body content */}
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    {selectedEmail.body}
                  </div>
                </div>

                {/* Footer action button */}
                {selectedEmail.actionLabel && (
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Lien direct inclus dans la notification :
                    </span>
                    <button
                      onClick={() => {
                        onClose();
                        if (onActionClick && selectedEmail.actionUrl) {
                          onActionClick(selectedEmail.actionUrl);
                        }
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <span>{selectedEmail.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-400 my-auto">
                Sélectionnez un e-mail dans la liste pour prévisualiser son contenu.
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Serveur de messagerie USMBA (Simulation)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 font-semibold text-white cursor-pointer text-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
