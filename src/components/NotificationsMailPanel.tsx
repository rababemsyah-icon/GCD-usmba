import React, { useState, useMemo, useEffect } from 'react';
import { SimulatedEmail, UserRole, User } from '../types';
import {
  Mail,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  ArrowRight,
  Inbox,
} from 'lucide-react';

interface NotificationsMailPanelProps {
  emails: SimulatedEmail[];
  currentRole: UserRole;
  currentUser: Partial<User> | null;
  onActionClick?: (actionUrl: string) => void;
}

export const NotificationsMailPanel: React.FC<NotificationsMailPanelProps> = ({
  emails,
  currentRole,
  currentUser,
  onActionClick,
}) => {
  const [filterText, setFilterText] = useState('');

  const isCandidate = currentRole === 'candidat';

  // Contextual visibility by role
  const roleEmails = useMemo(() => {
    if (isCandidate && currentUser?.email) {
      const userEmail = currentUser.email.toLowerCase();
      return emails.filter((e) => e.to.toLowerCase() === userEmail);
    }
    return emails;
  }, [emails, isCandidate, currentUser]);

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return roleEmails;
    return roleEmails.filter(
      (e) =>
        e.to.toLowerCase().includes(q) ||
        e.toName.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q) ||
        (e.applicationId && e.applicationId.toLowerCase().includes(q))
    );
  }, [roleEmails, filterText]);

  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(
    filtered[0]?.id || null
  );

  // Keep selectedEmail synced if list updates
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedEmailId(null);
    } else if (!selectedEmailId || !filtered.some((e) => e.id === selectedEmailId)) {
      setSelectedEmailId(filtered[0].id);
    }
  }, [filtered, selectedEmailId]);

  const selectedEmail = filtered.find((e) => e.id === selectedEmailId) || filtered[0] || null;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Minimal Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            {isCandidate ? <Inbox className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {isCandidate
                ? 'Notifications Mail — Boîte de réception personnelle'
                : 'Notifications Mail — Journal des envois automatiques'}
            </h2>
            <p className="text-xs text-slate-500">
              {isCandidate
                ? `Alertes reçues sur ${currentUser?.email || 'votre adresse institutionnelle'}`
                : 'Traçabilité en temps réel des e-mails générés lors de chaque transition d’état'}
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 self-start sm:self-center">
          {roleEmails.length} {roleEmails.length > 1 ? 'messages' : 'message'}
        </span>
      </div>

      {/* Split Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
        {/* Left: Message List */}
        <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 flex flex-col">
          <div className="p-3 bg-white border-b border-slate-200">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder={
                  isCandidate
                    ? 'Rechercher dans mes notifications...'
                    : 'Filtrer par candidat, sujet ou dossier...'
                }
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-200 max-h-[480px]">
            {filtered.length === 0 ? (
              <div className="p-10 text-center space-y-2 text-xs text-slate-500">
                <Mail className="w-7 h-7 text-slate-300 mx-auto" />
                <div className="font-semibold text-slate-700">
                  {isCandidate
                    ? 'Aucun e-mail reçu pour le moment'
                    : 'Aucune notification trouvée'}
                </div>
                <p className="text-[11px] text-slate-400">
                  Les confirmations de dépôt, rejets de pièces, convocations et délibérations apparaîtront ici automatiquement.
                </p>
              </div>
            ) : (
              filtered.map((mail) => {
                const isSelected = selectedEmail?.id === mail.id;
                const sentDate = new Date(mail.sentAt);
                const formattedTime = sentDate.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const formattedDate = sentDate.toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                });

                return (
                  <button
                    key={mail.id}
                    type="button"
                    onClick={() => setSelectedEmailId(mail.id)}
                    className={`w-full text-left p-3.5 transition-colors cursor-pointer flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-white border-l-4 border-l-slate-900 shadow-xs'
                        : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                      <span className="truncate text-slate-600 font-semibold font-sans">
                        {isCandidate ? 'Scolarité GCD-USMBA' : `À : ${mail.toName}`}
                      </span>
                      <span className="shrink-0">
                        {formattedDate} • {formattedTime}
                      </span>
                    </div>

                    <div className="font-bold text-xs text-slate-900 line-clamp-1">
                      {mail.subject}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-500 line-clamp-1">
                        {mail.body}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                          mail.type === 'ACTION'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {mail.type === 'ACTION' ? 'ACTION' : 'INFO'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Message Content */}
        <div className="md:col-span-7 p-6 bg-white flex flex-col justify-between">
          {selectedEmail ? (
            <div className="space-y-5">
              <div className="pb-4 border-b border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                      selectedEmail.type === 'ACTION'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {selectedEmail.type === 'ACTION' ? (
                      <AlertCircle className="w-3 h-3" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    <span>
                      {selectedEmail.type === 'ACTION'
                        ? 'Action requise'
                        : 'Notification automatique'}
                    </span>
                  </span>

                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(selectedEmail.sentAt).toLocaleString('fr-FR')}
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-900 leading-snug">
                  {selectedEmail.subject}
                </h4>

                <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <strong className="text-slate-700">De :</strong>{' '}
                    {selectedEmail.from || 'scolarite.cedoc@usmba.ac.ma'}
                  </div>
                  <div>
                    <strong className="text-slate-700">À :</strong> {selectedEmail.toName} (
                    <span className="font-mono">{selectedEmail.to}</span>)
                  </div>
                  {selectedEmail.applicationId && (
                    <div>
                      <strong className="text-slate-700">Réf. Dossier :</strong>{' '}
                      <span className="font-mono text-slate-800">{selectedEmail.applicationId}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedEmail.body}
              </div>

              {selectedEmail.actionLabel && selectedEmail.actionUrl && onActionClick && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onActionClick(selectedEmail.actionUrl!)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                  >
                    <span>{selectedEmail.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16 space-y-2">
              <Send className="w-8 h-8 opacity-30" />
              <p className="text-xs">Sélectionnez un message pour afficher son contenu.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
