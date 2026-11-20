import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ApplicationBasket,
  StatutConformite,
  Subject,
  User,
  RoleName,
  CampaignRules,
} from '../types';
import {
  Search,
  Building2,
  PlusCircle,
  X,
  CheckCircle2,
  Eye,
  RotateCcw,
  Users,
  Calendar,
  ShieldCheck,
  UserCheck,
  UserX,
  FileText,
  Save,
  BookOpen,
  Award,
} from 'lucide-react';
import { DossierPreviewModal } from './DossierPreviewModal';
import { savePersistedApplication } from '../utils/documentPersistence';

interface AdministrationDashboardProps {
  applications: ApplicationBasket[];
  allSubjects?: Subject[];
  currentUser?: Partial<User> | null;
  activeCampaign?: CampaignRules;
  onCampaignUpdated?: (campaign: CampaignRules) => void;
  onRefreshApplications: () => void;
  onOpenCharterModal?: () => void;
  onNotify?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

type QuickFilterType = 'all' | 'conforme' | 'a_completer' | 'en_attente';
type AdminSubTab = 'dossiers' | 'personnel' | 'campagne';
type StaffFilterType = 'all' | 'personnel' | 'candidats' | 'actif' | 'inactif';

const ROLE_DISPLAY_META: Record<
  RoleName,
  { label: string; badgeClass: string }
> = {
  CANDIDAT: {
    label: 'Candidat',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  DIRECTEUR_THESE: {
    label: 'Directeur de thèse',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  DIRECTEUR_LABO: {
    label: 'Direction de structure',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  RESPONSABLE_CED: {
    label: 'Administration CEDoc',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  ADMINISTRATION: {
    label: 'Administration CEDoc',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  SUPER_ADMIN: {
    label: 'Super Administrateur',
    badgeClass: 'bg-slate-900 text-white border-slate-900',
  },
  VISITEUR: {
    label: 'Visiteur',
    badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
  },
};

export const AdministrationDashboard: React.FC<AdministrationDashboardProps> = ({
  applications,
  allSubjects = [],
  currentUser,
  activeCampaign,
  onCampaignUpdated,
  onRefreshApplications,
  onNotify,
}) => {
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('dossiers');

  // Staff / Users RBAC state
  const [usersList, setUsersList] = useState<User[]>([]);
  const [staffFilter, setStaffFilter] = useState<StaffFilterType>('personnel');
  const [staffSearch, setStaffSearch] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Campaign Rules form state
  const [campaignForm, setCampaignForm] = useState<CampaignRules>(
    activeCampaign || {
      id: 'camp-usmba-2026',
      code: 'CAMP-DOC-2026-2027',
      label: 'Campagne Doctorale USMBA 2026/2027',
      startDate: '2026-09-01',
      endDate: '2027-02-28',
      isOpen: true,
      maxChoicesPerCandidate: 3,
      maxPdfSizeMB: 5,
      allowedFileExtensions: ['.pdf'],
    }
  );
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);

  useEffect(() => {
    if (activeCampaign) {
      setCampaignForm(activeCampaign);
    }
  }, [activeCampaign]);

  const authHeaders = useMemo<Record<string, string>>(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (currentUser?.id) h['x-user-id'] = currentUser.id;
    if (currentUser?.role) h['x-user-role'] = currentUser.role;
    return h;
  }, [currentUser?.id, currentUser?.role]);

  const fetchUsersList = useCallback(async () => {
    try {
      const res = await fetch('/api/users', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.users)) {
          setUsersList(data.users);
        }
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchUsersList();
  }, [fetchUsersList, applications.length]);

  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      if (staffFilter === 'personnel' && u.role === 'CANDIDAT') return false;
      if (staffFilter === 'candidats' && u.role !== 'CANDIDAT') return false;
      if (staffFilter === 'actif' && (u.status !== 'ACTIF' || !u.isEnabled)) return false;
      if (staffFilter === 'inactif' && u.status === 'ACTIF' && u.isEnabled) return false;

      if (staffSearch.trim()) {
        const q = staffSearch.toLowerCase().trim();
        const roleLabel = (ROLE_DISPLAY_META[u.role]?.label || u.role).toLowerCase();
        return (
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.establishment || '').toLowerCase().includes(q) ||
          (u.laboratory || '').toLowerCase().includes(q) ||
          roleLabel.includes(q)
        );
      }
      return true;
    });
  }, [usersList, staffFilter, staffSearch]);

  const handleToggleUserStatus = async (targetUser: User) => {
    const nextStatus = targetUser.status === 'ACTIF' ? 'INACTIF' : 'ACTIF';
    setUpdatingUserId(targetUser.id);
    try {
      const res = await fetch(`/api/users/${targetUser.id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          status: nextStatus,
          actorName: currentUser?.fullName || 'Administration CEDoc',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (onNotify) onNotify(data.error || 'Action refusée.', 'error');
        return;
      }
      if (data.user) {
        setUsersList((prev) => prev.map((u) => (u.id === targetUser.id ? data.user : u)));
      }
      if (onNotify) onNotify(data.message || 'Statut mis à jour.', 'success');
    } catch (e: any) {
      if (onNotify) onNotify(`Erreur réseau : ${e.message}`, 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleChangeUserRole = async (targetUser: User, nextRole: RoleName) => {
    if (targetUser.role === nextRole) return;
    setUpdatingUserId(targetUser.id);
    try {
      const res = await fetch(`/api/users/${targetUser.id}/role`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          role: nextRole,
          actorName: currentUser?.fullName || 'Administration CEDoc',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (onNotify) onNotify(data.error || 'Modification de rôle refusée.', 'error');
        return;
      }
      if (data.user) {
        setUsersList((prev) => prev.map((u) => (u.id === targetUser.id ? data.user : u)));
      }
      if (onNotify) onNotify(data.message || 'Rôle mis à jour.', 'success');
    } catch (e: any) {
      if (onNotify) onNotify(`Erreur réseau : ${e.message}`, 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCampaign(true);
    try {
      const res = await fetch('/api/campaign', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          label: campaignForm.label,
          startDate: campaignForm.startDate,
          endDate: campaignForm.endDate,
          isOpen: campaignForm.isOpen,
          maxChoicesPerCandidate: Number(campaignForm.maxChoicesPerCandidate),
          maxPdfSizeMB: Number(campaignForm.maxPdfSizeMB),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (onNotify) onNotify(data.error || 'Erreur lors de la sauvegarde de la campagne.', 'error');
        return;
      }
      if (data.campaign) {
        setCampaignForm(data.campaign);
        if (onCampaignUpdated) onCampaignUpdated(data.campaign);
      }
      if (onNotify) onNotify(data.message || 'Règles de la campagne active enregistrées.', 'success');
    } catch (err: any) {
      if (onNotify) onNotify(`Erreur réseau : ${err.message}`, 'error');
    } finally {
      setIsSavingCampaign(false);
    }
  };
  // Multi-criteria instant search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchEtablissement, setSearchEtablissement] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('all');

  // Modals & finalization state
  const [selectedApp, setSelectedApp] = useState<ApplicationBasket | null>(null);
  const [finalizingAppId, setFinalizingAppId] = useState<string | null>(null);
  const [isProvisionalModalOpen, setIsProvisionalModalOpen] = useState(false);
  const [complementReason, setComplementReason] = useState('');
  const [isRequestingComplement, setIsRequestingComplement] = useState(false);

  // Quick Provisional Registration Form (Nom + Établissement)
  const [provisionalForm, setProvisionalForm] = useState({
    nom: '',
    etablissementOrigine: 'FST Fès',
  });

  // Single Compliance Status Helper
  const getComplianceStatus = (app: ApplicationBasket) => {
    const docs = app.documents || [];
    if (
      app.currentStatut === 'INSCRIT_DEFINITIF' ||
      app.currentStatut === 'INSCRIPTION_DEFINITIVE' ||
      app.currentStatut === 'INSCRITE' ||
      Boolean(app.officialAttestationNumber)
    ) {
      return {
        status: 'INSCRITE',
        label: 'Inscrit définitif',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 whitespace-nowrap',
      };
    }
    if (app.currentStatut === 'VALIDE_LABO') {
      return {
        status: 'CONFORME',
        label: 'Validé Labo',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200 whitespace-nowrap',
      };
    }
    if (docs.length === 0 || app.currentStatut === 'EN_ATTENTE_PIECES') {
      return { status: 'EN_ATTENTE_PIECES', label: 'En attente de pièces', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' };
    }

    const nonConformeCount = docs.filter((d) => d.conformite === 'NON_CONFORME' || d.conformite === 'COMPLEMENT_DEMANDE').length;
    const missingCount = docs.filter((d) => d.conformite === 'MANQUANTE' || !d.storagePath).length;

    if (nonConformeCount > 0) {
      return { status: 'NON_CONFORME', label: `À compléter (${nonConformeCount})`, badgeClass: 'bg-rose-100 text-rose-800 border-rose-200' };
    }
    if (missingCount > 0) {
      return { status: 'A_COMPLETER', label: `À compléter (${missingCount} mq.)`, badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    return { status: 'CONFORME', label: 'Conforme (6/6)', badgeClass: 'bg-slate-100 text-slate-800 border-slate-200' };
  };

  // Zero-Latency Multi-Criteria Filter (Nom, Prénom, CNE, CIN, Code, Établissement + Puces)
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      // 1. Quick filter pill
      const comp = getComplianceStatus(app);
      if (quickFilter === 'conforme' && comp.status !== 'CONFORME' && comp.status !== 'INSCRITE') {
        return false;
      }
      if (quickFilter === 'a_completer' && comp.status !== 'A_COMPLETER' && comp.status !== 'NON_CONFORME') {
        return false;
      }
      if (quickFilter === 'en_attente' && comp.status !== 'EN_ATTENTE_PIECES' && app.currentStatut !== 'EN_ATTENTE_VERIFICATION') {
        return false;
      }

      // 2. Multi-criteria query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const candNom = (app.candidat?.nom || '').toLowerCase();
        const candPrenom = (app.candidat?.prenom || '').toLowerCase();
        const candFull = (app.candidateName || '').toLowerCase();
        const candCin = (app.candidateCin || '').toLowerCase();
        const candCne = (app.candidateCne || '').toLowerCase();
        const candCode = (app.codeCandidature || '').toLowerCase();

        const matchesQuery =
          candNom.includes(q) ||
          candPrenom.includes(q) ||
          candFull.includes(q) ||
          candCin.includes(q) ||
          candCne.includes(q) ||
          candCode.includes(q);

        if (!matchesQuery) return false;
      }

      // 3. Établissement query
      if (searchEtablissement.trim()) {
        const qEtab = searchEtablissement.toLowerCase().trim();
        const candEtab = (app.candidat?.etablissementOrigine || '').toLowerCase();
        const candStructure = (app.structureRecherche?.nom || '').toLowerCase();
        if (!candEtab.includes(qEtab) && !candStructure.includes(qEtab)) return false;
      }

      return true;
    });
  }, [applications, searchQuery, searchEtablissement, quickFilter]);

  const hasActiveFilters = Boolean(searchQuery.trim() || searchEtablissement.trim() || quickFilter !== 'all');

  const handleResetFilters = () => {
    setSearchQuery('');
    setSearchEtablissement('');
    setQuickFilter('all');
  };

  // Actions
  const handleMarkVueAuGuichet = async (appId: string, docId: string) => {
    try {
      const res = await fetch(`/api/applications/${appId}/vue-au-guichet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, agentName: 'Mme. Imane Bernoussi' }),
      });
      if (res.ok) {
        onRefreshApplications();
        if (onNotify) onNotify('Pièce certifiée vue au guichet. E-mail de confirmation envoyé.', 'success');
        if (selectedApp) {
          setSelectedApp((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              documents: prev.documents.map((d) =>
                d.id === docId ? { ...d, conformite: 'VUE_AU_GUICHET', verifiedByGuichet: true } : d
              ),
            };
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyDocument = async (
    appId: string,
    docId: string,
    conformite: StatutConformite,
    rejectionReason?: string
  ) => {
    try {
      const res = await fetch(`/api/candidatures/${appId}/verify-doc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId,
          conformite,
          rejectionReason,
          verifiedBy: 'Mme. Imane Bernoussi',
        }),
      });
      if (res.ok) {
        onRefreshApplications();
        if (onNotify) {
          onNotify(
            conformite === 'CONFORME'
              ? 'Pièce validée conforme. Notification e-mail générée.'
              : 'Rejet de pièce enregistré avec motif. E-mail envoyé au candidat.',
            conformite === 'CONFORME' ? 'success' : 'info'
          );
        }
        if (selectedApp) {
          setSelectedApp((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              documents: prev.documents.map((d) =>
                d.id === docId ? { ...d, conformite, rejectionReason } : d
              ),
            };
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTransitionStatus = async (appId: string, nextStatus: string, reason?: string) => {
    try {
      const res = await fetch(`/api/applications/${appId}/status`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          nextStatus,
          reason,
          actorRole: currentUser?.role || 'ADMINISTRATION',
          actorName: currentUser?.fullName || 'Mme. Imane Bernoussi',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.application) {
          await savePersistedApplication(data.application);
        }
        onRefreshApplications();
        if (onNotify) {
          onNotify(
            `Statut mis à jour (${nextStatus}). E-mail automatique envoyé au candidat.`,
            'success'
          );
        }
        setSelectedApp(null);
        setIsRequestingComplement(false);
        setComplementReason('');
      } else if (onNotify) {
        onNotify(data.error || 'Transition de statut refusée.', 'error');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleValidateFinalInscription = async (appId: string) => {
    setFinalizingAppId(appId);
    try {
      const res = await fetch(`/api/candidatures/${appId}/valider-inscription-final`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          actorName: currentUser?.fullName || 'Administration CEDoc',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (onNotify) {
          onNotify(data.error || "Impossible de valider l'inscription définitive.", 'error');
        }
        return;
      }

      if (data.application) {
        await savePersistedApplication(data.application);
        if (selectedApp && selectedApp.id === appId) {
          setSelectedApp(data.application);
        }
      }

      onRefreshApplications();
      if (onNotify) {
        onNotify(
          `Inscription définitive validée (INSCRIT_DEFINITIF). Attestation générée : ${data.officialAttestationNumber}.`,
          'success'
        );
      }
    } catch (e: any) {
      console.error(e);
      if (onNotify) onNotify(`Erreur réseau : ${e.message}`, 'error');
    } finally {
      setFinalizingAppId(null);
    }
  };

  const handleCreateProvisional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionalForm.nom || !provisionalForm.etablissementOrigine) return;

    try {
      const res = await fetch('/api/applications/provisional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: provisionalForm.nom,
          prenom: '',
          etablissementOrigine: provisionalForm.etablissementOrigine,
          email: `${provisionalForm.nom.toLowerCase().replace(/\s+/g, '.')}@usmba.ac.ma`,
        }),
      });
      if (res.ok) {
        setIsProvisionalModalOpen(false);
        setProvisionalForm({ nom: '', etablissementOrigine: 'FST Fès' });
        onRefreshApplications();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Sub-navigation bar: Dossiers | Personnel & Rôles (RBAC) | Campagne Active */}
      <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setAdminSubTab('dossiers')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            adminSubTab === 'dossiers'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span>Dossiers & Pièces ({applications.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminSubTab('personnel')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            adminSubTab === 'personnel'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>Personnel & Rôles ({usersList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminSubTab('campagne')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            adminSubTab === 'campagne'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>Campagne Active</span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
              campaignForm.isOpen
                ? adminSubTab === 'campagne'
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'bg-emerald-100 text-emerald-800'
                : adminSubTab === 'campagne'
                ? 'bg-rose-500/20 text-rose-200'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {campaignForm.isOpen ? 'Ouverte' : 'Fermée'}
          </span>
        </button>
      </div>

      {/* TAB 2: PERSONNEL, RÔLES (RBAC) & STATUTS ACTIF / INACTIF */}
      {adminSubTab === 'personnel' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              {(
                [
                  { id: 'personnel', label: 'Personnel' },
                  { id: 'candidats', label: 'Candidats' },
                  { id: 'all', label: 'Tous' },
                  { id: 'actif', label: 'Actifs' },
                  { id: 'inactif', label: 'Inactifs' },
                ] as { id: StaffFilterType; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStaffFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
                    staffFilter === f.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Filtrer (Nom, e-mail, rôle, labo...)"
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {staffSearch && (
                <button
                  type="button"
                  onClick={() => setStaffSearch('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-700 shrink-0" />
            <span>
              La désactivation d’un compte bloque immédiatement sa connexion (mot de passe et Google SSO) tout en conservant intégralement son historique, ses rattachements, sujets et candidatures.
            </span>
          </div>

          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-xs text-slate-500">
                Aucun compte ne correspond aux filtres sélectionnés.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const roleMeta = ROLE_DISPLAY_META[u.role] || ROLE_DISPLAY_META.CANDIDAT;
                const isActif = u.status === 'ACTIF' && u.isEnabled;
                const isSelf = currentUser?.id === u.id;
                const isBusy = updatingUserId === u.id;

                return (
                  <div
                    key={u.id}
                    className={`p-4 rounded-2xl border bg-white shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                      isActif ? 'border-slate-200' : 'border-rose-200 bg-rose-50/30'
                    }`}
                  >
                    {/* User identity + legible non-wrapping Role & Status badges + structured rattachements */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {u.fullName}
                        </span>

                        {/* Role Badge: strictly whitespace-nowrap & shrink-0 to prevent awkward line breaks */}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0 ${roleMeta.badgeClass}`}
                        >
                          {roleMeta.label}
                        </span>

                        {/* Status Badge: Actif / Inactif */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 ${
                            isActif
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActif ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                          <span>{isActif ? 'Actif' : 'Inactif'}</span>
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 font-mono truncate">
                        {u.email} • @{u.username}
                      </div>

                      {/* Structured Rattachements (Établissement, Laboratoire, Sujets, Candidatures) */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 pt-0.5">
                        {u.establishment && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{u.establishment}</span>
                          </span>
                        )}
                        {u.laboratory && (
                          <span className="inline-flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-md">{u.laboratory}</span>
                          </span>
                        )}
                        <span className="font-mono text-slate-500 whitespace-nowrap">
                          {u.linkedSubjectsCount || 0} sujet{(u.linkedSubjectsCount || 0) > 1 ? 's' : ''} •{' '}
                          {u.linkedApplicationsCount || 0} candidature{(u.linkedApplicationsCount || 0) > 1 ? 's' : ''}
                        </span>
                      </div>

                      {!isActif && u.deactivatedAt && (
                        <div className="text-[11px] text-rose-700">
                          Désactivé le {new Date(u.deactivatedAt).toLocaleDateString('fr-FR')}
                          {u.deactivatedBy ? ` par ${u.deactivatedBy}` : ''} — Historique conservé.
                        </div>
                      )}
                    </div>

                    {/* RBAC Controls: Role Assignment & Soft Deactivation / Reactivation */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
                      <select
                        aria-label={`Rôle de ${u.fullName}`}
                        value={u.role}
                        disabled={isBusy || isSelf}
                        onChange={(e) => handleChangeUserRole(u, e.target.value as RoleName)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50"
                      >
                        <option value="CANDIDAT">Candidat</option>
                        <option value="DIRECTEUR_THESE">Directeur de thèse</option>
                        <option value="DIRECTEUR_LABO">Direction de structure</option>
                        <option value="RESPONSABLE_CED">Administration CEDoc</option>
                        <option value="ADMINISTRATION">Scolarité CEDoc</option>
                        <option value="SUPER_ADMIN">Super Administrateur</option>
                      </select>

                      <button
                        type="button"
                        disabled={isBusy || isSelf}
                        onClick={() => handleToggleUserStatus(u)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          isActif
                            ? 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                        }`}
                        title={
                          isSelf
                            ? 'Impossible de désactiver votre propre compte actif'
                            : isActif
                            ? 'Désactiver le compte sans supprimer ses données'
                            : 'Réactiver le compte'
                        }
                      >
                        {isActif ? (
                          <>
                            <UserX className="w-3.5 h-3.5 shrink-0" />
                            <span>Désactiver</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>Réactiver</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RÈGLES DE LA CAMPAGNE ACTIVE */}
      {adminSubTab === 'campagne' && (
        <form
          onSubmit={handleSaveCampaign}
          className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {campaignForm.code}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Règles de la Campagne Doctorale Active
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ces règles s’appliquent immédiatement au panier de sujets, au dépôt PDF et à la période de candidature.
              </p>
            </div>

            <label className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={campaignForm.isOpen}
                onChange={(e) =>
                  setCampaignForm((prev) => ({ ...prev, isOpen: e.target.checked }))
                }
                className="w-4 h-4 accent-slate-900 cursor-pointer"
              />
              <span>Campagne ouverte aux dépôts</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Intitulé de la campagne :
              </label>
              <input
                type="text"
                required
                value={campaignForm.label}
                onChange={(e) =>
                  setCampaignForm((prev) => ({ ...prev, label: e.target.value }))
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Date d’ouverture :
              </label>
              <input
                type="date"
                required
                value={campaignForm.startDate}
                onChange={(e) =>
                  setCampaignForm((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Date de clôture :
              </label>
              <input
                type="date"
                required
                value={campaignForm.endDate}
                onChange={(e) =>
                  setCampaignForm((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre maximal de sujets par candidat (1 à 5) :
              </label>
              <input
                type="number"
                min={1}
                max={5}
                required
                value={campaignForm.maxChoicesPerCandidate}
                onChange={(e) =>
                  setCampaignForm((prev) => ({
                    ...prev,
                    maxChoicesPerCandidate: Math.max(1, Math.min(5, Number(e.target.value) || 1)),
                  }))
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Taille maximale d’un fichier PDF en Mo (1 à 20) :
              </label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={campaignForm.maxPdfSizeMB}
                onChange={(e) =>
                  setCampaignForm((prev) => ({
                    ...prev,
                    maxPdfSizeMB: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                  }))
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSavingCampaign}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingCampaign ? 'Enregistrement...' : 'Enregistrer les règles'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 1: EXISTING DOSSIERS & CONTRÔLE DES PIÈCES */}
      {adminSubTab === 'dossiers' && (
        <>
      {/* 1. Top Controls Bar: Shortcuts & Emergency Save (No title, no badges) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setQuickFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer border ${
              quickFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tous ({applications.length})
          </button>

          <button
            type="button"
            onClick={() => setQuickFilter('conforme')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer border ${
              quickFilter === 'conforme'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Conformes
          </button>

          <button
            type="button"
            onClick={() => setQuickFilter('a_completer')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer border ${
              quickFilter === 'a_completer'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            À compléter
          </button>

          <button
            type="button"
            onClick={() => setQuickFilter('en_attente')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer border ${
              quickFilter === 'en_attente'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            En attente
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-900 text-xs flex items-center gap-1 cursor-pointer transition-colors"
              title="Réinitialiser tous les filtres"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>

        {/* Emergency Provisional Dossier Button */}
        <button
          type="button"
          onClick={() => setIsProvisionalModalOpen(true)}
          className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl border border-slate-300 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5 text-slate-600" />
          <span>Saisie rapide (Nom + Établissement)</span>
        </button>
      </div>

      {/* 2. Instant Double Search Bar (No superfluous descriptions) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Field 1: Candidate Search (Nom, Prénom, CIN, CNE, Code) */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher (Nom, Prénom, CNE, CIN, Code...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Field 2: Establishment */}
        <div className="relative">
          <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Établissement d'origine (FST, ENSA, FSDM...)"
            value={searchEtablissement}
            onChange={(e) => setSearchEtablissement(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all shadow-xs"
          />
          {searchEtablissement && (
            <button
              onClick={() => setSearchEtablissement('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Direct Minimal List of Dossiers (Single Line per Student, Zero Fluff) */}
      <div className="space-y-2 pt-1">
        {filteredApps.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-500 shadow-xs">
            <p className="text-sm font-semibold text-slate-700">Aucun dossier trouvé</p>
            <p className="text-xs text-slate-400 mt-1">Modifiez vos critères de recherche ou réinitialisez les filtres.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 px-3.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          filteredApps.map((app) => {
            const comp = getComplianceStatus(app);
            return (
              <div
                key={app.id}
                className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
              >
                {/* Left: Code, Name, Establishment, CIN, Grade */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
                      {app.codeCandidature}
                    </span>
                    <span className="font-semibold text-slate-900 text-sm truncate">
                      {app.candidateName}
                    </span>
                  </div>

                  <div className="text-slate-500 text-[11px] truncate flex items-center gap-1.5 font-mono">
                    <span>{app.candidat?.etablissementOrigine || 'USMBA'}</span>
                    <span>•</span>
                    <span>CIN: {app.candidateCin || '-'}</span>
                    {app.candidat?.moyenneGenerale && (
                      <>
                        <span>•</span>
                        <span>Moyenne: {app.candidat.moyenneGenerale}/20</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Clean Status Badge + Final Validation Action + Preview Button */}
                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 self-end sm:self-center">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${comp.badgeClass}`}
                  >
                    {comp.label}
                  </span>

                  {['INSCRIT_DEFINITIF', 'INSCRIPTION_DEFINITIVE', 'INSCRITE'].includes(
                    app.currentStatut
                  ) || Boolean(app.officialAttestationNumber) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                      <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{app.officialAttestationNumber || 'Attestation prête'}</span>
                    </span>
                  ) : !['REJETEE', 'REFUSEE'].includes(app.currentStatut) ? (
                    <button
                      type="button"
                      disabled={finalizingAppId === app.id}
                      onClick={() => handleValidateFinalInscription(app.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50 whitespace-nowrap"
                    >
                      <Award className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                      <span>
                        {finalizingAppId === app.id
                          ? 'Validation...'
                          : "Valider l'inscription définitive & Générer l'attestation"}
                      </span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedApp(app);
                      setIsRequestingComplement(false);
                      setComplementReason('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Voir le dossier & pièces</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
        </>
      )}

      {/* 4. MODAL: Aperçu complet du dossier & spécimens des pièces */}
      <DossierPreviewModal
        isOpen={Boolean(selectedApp)}
        onClose={() => setSelectedApp(null)}
        application={selectedApp}
        subject={
          allSubjects.find(
            (s) =>
              s.id === selectedApp?.assignedSubjectId ||
              s.id === selectedApp?.choices?.[0]?.subjectId
          ) || allSubjects[0]
        }
        mode="admin"
        onVerifyDocument={handleVerifyDocument}
        onMarkVueAuGuichet={handleMarkVueAuGuichet}
        onTransitionStatus={handleTransitionStatus}
        onValidateFinalInscription={handleValidateFinalInscription}
      />

      {/* 5. MODAL: Saisie rapide dossier incomplet (Nom + Établissement) */}
      {isProvisionalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Saisie Rapide (Dossier en attente de pièces)
              </h3>
              <button
                onClick={() => setIsProvisionalModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProvisional} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nom de famille :
                </label>
                <input
                  type="text"
                  required
                  value={provisionalForm.nom}
                  onChange={(e) => setProvisionalForm({ ...provisionalForm, nom: e.target.value })}
                  placeholder="Ex: Alaoui, Benjelloun..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Établissement d'origine :
                </label>
                <select
                  value={provisionalForm.etablissementOrigine}
                  onChange={(e) =>
                    setProvisionalForm({ ...provisionalForm, etablissementOrigine: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="FST Fès">Faculté des Sciences et Techniques (FST Fès)</option>
                  <option value="ENSA Fès">École Nationale des Sciences Appliquées (ENSA Fès)</option>
                  <option value="FS Dhar El Mahraz">Faculté des Sciences Dhar El Mahraz (FSDM)</option>
                  <option value="FLSH Dhar El Mahraz">Faculté des Lettres et Sciences Humaines (FLSH)</option>
                  <option value="Autre Établissement">Autre Établissement</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                Le dossier sera immédiatement identifié et enregistré avec l'indicateur <strong>« En attente de pièces »</strong>.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProvisionalModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:text-slate-900 text-xs cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
