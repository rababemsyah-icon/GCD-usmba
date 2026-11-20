import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, TEST_PERSONAS, PersonaProfile } from './components/Navbar';
import { ThreeArrowsMenuDrawer } from './components/ThreeArrowsMenuDrawer';
import { SubjectCatalog } from './components/SubjectCatalog';
import { SubjectBasketDrawer } from './components/SubjectBasketDrawer';
import { SubjectDetailModal } from './components/SubjectDetailModal';
import { AuthModal } from './components/AuthModal';
import { OcrCaptureModal } from './components/OcrCaptureModal';
import { AcademicMatchingPanel } from './components/AcademicMatchingPanel';
import { CandidateDashboard } from './components/CandidateDashboard';
import { SupervisorLabDashboard } from './components/SupervisorLabDashboard';
import { AdministrationDashboard } from './components/AdministrationDashboard';
import { EmailSimulatorModal } from './components/EmailSimulatorModal';
import { CharterViewerModal } from './components/CharterViewerModal';
import { AuditTrailPanel } from './components/AuditTrailPanel';
import { NotificationsMailPanel } from './components/NotificationsMailPanel';
import {
  INITIAL_SUBJECTS,
  SAMPLE_CANDIDATE_PROFILE,
  INITIAL_APPLICATIONS,
  INITIAL_EXCHANGE_MESSAGES,
  INITIAL_SIMULATED_EMAILS,
  INITIAL_USERS,
  INITIAL_CAMPAIGN,
} from './data/mockDatabase';
import {
  Subject,
  BasketChoice,
  CandidateProfile,
  ApplicationBasket,
  ThesisExchangeMessage,
  UserRole,
  User,
  SimulatedEmail,
  CampaignRules,
} from './types';
import { CheckCircle2, AlertTriangle, ArrowLeft, ShieldCheck } from 'lucide-react';
import {
  applyPersistedDocumentsToApplication,
  getAllPersistedApplications,
  getAllPersistedDocuments,
  savePersistedApplication,
} from './utils/documentPersistence';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('catalog');
  const [currentUser, setCurrentUser] = useState<Partial<User> | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('visiteur');

  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [basketChoices, setBasketChoices] = useState<BasketChoice[]>([]);

  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile>(SAMPLE_CANDIDATE_PROFILE);
  const [applications, setApplications] = useState<ApplicationBasket[]>([]);
  const [exchangeMessages, setExchangeMessages] = useState<ThesisExchangeMessage[]>(INITIAL_EXCHANGE_MESSAGES);
  const [simulatedEmails, setSimulatedEmails] = useState<SimulatedEmail[]>(
    JSON.parse(JSON.stringify(INITIAL_SIMULATED_EMAILS))
  );
  const [activeCampaign, setActiveCampaign] = useState<CampaignRules>(INITIAL_CAMPAIGN);

  // Modals state
  const [isThreeArrowsMenuOpen, setIsThreeArrowsMenuOpen] = useState(false);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCharterModalOpen, setIsCharterModalOpen] = useState(false);
  const [isEmailSimulatorOpen, setIsEmailSimulatorOpen] = useState(false);
  const [selectedDetailSubject, setSelectedDetailSubject] = useState<Subject | null>(null);
  const [pendingSubjectForApplication, setPendingSubjectForApplication] = useState<Subject | null>(null);
  const [pendingBasketSubmit, setPendingBasketSubmit] = useState<boolean>(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Evaluate active campaign open window
  const getCampaignClosedReason = useCallback((campaign: CampaignRules): string | null => {
    if (!campaign.isOpen) {
      return `La campagne "${campaign.label}" est actuellement fermée aux candidatures.`;
    }
    const todayIso = new Date().toISOString().slice(0, 10);
    if (campaign.startDate && todayIso < campaign.startDate) {
      return `La période de candidature n'a pas encore débuté (ouverture le ${campaign.startDate}).`;
    }
    if (campaign.endDate && todayIso > campaign.endDate) {
      return `La période de candidature est clôturée depuis le ${campaign.endDate}.`;
    }
    return null;
  }, []);

  const campaignClosedReason = getCampaignClosedReason(activeCampaign);

  const getHomeTabForRole = useCallback((role: UserRole): string => {
    if (role === 'directeur' || role === 'chef_labo') return 'supervisor_dashboard';
    if (role === 'administration' || role === 'admin_cedoc' || role === 'super_admin') {
      return 'administration_dashboard';
    }
    if (role === 'candidat') return 'candidate_dashboard';
    return 'catalog';
  }, []);

  const isTabAllowedForRole = useCallback((tab: string, role: UserRole): boolean => {
    if (role === 'visiteur') {
      return tab === 'catalog';
    }
    if (role === 'candidat') {
      return ['catalog', 'candidate_dashboard', 'ocr', 'notifications', 'charter', 'matching'].includes(tab);
    }
    if (role === 'directeur') {
      return ['supervisor_dashboard', 'notifications', 'catalog', 'charter'].includes(tab);
    }
    if (role === 'chef_labo') {
      return ['supervisor_dashboard', 'notifications', 'charter'].includes(tab);
    }
    if (role === 'administration' || role === 'admin_cedoc' || role === 'super_admin') {
      return ['administration_dashboard', 'notifications', 'audit_trail', 'charter'].includes(tab);
    }
    return tab === 'catalog';
  }, []);

  // Enforce RBAC tab isolation whenever role or active tab changes
  useEffect(() => {
    if (!isTabAllowedForRole(currentTab, currentRole)) {
      setCurrentTab(getHomeTabForRole(currentRole));
    }
  }, [currentTab, currentRole, isTabAllowedForRole, getHomeTabForRole]);

  const buildAuthHeaders = useCallback(
    (overrideUser?: Partial<User> | null): Record<string, string> => {
      const actor = overrideUser || currentUser;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (actor?.id) headers['x-user-id'] = actor.id;
      if (actor?.role) headers['x-user-role'] = actor.role;
      return headers;
    },
    [currentUser]
  );

  // Helper matching /api/applications RBAC rules when merging IndexedDB-persisted dossiers
  const matchesPersonaRbac = useCallback(
    (app: ApplicationBasket, user: Partial<User> | null): boolean => {
      if (!user) return false;
      const role = user.role;
      const userId = user.id || '';

      if (role === 'CANDIDAT') {
        return (
          app.candidateId === userId ||
          (Boolean(user.email) && app.candidateEmail?.toLowerCase() === user.email?.toLowerCase())
        );
      }
      if (role === 'DIRECTEUR_THESE') {
        if (userId === 'usr-prof-slaoui' || userId.includes('slaoui')) {
          return false;
        }
        const isHisDirecteur =
          app.directeurThese?.email === 'm.bennani@usmba.ac.ma' ||
          app.directeurThese?.nom === 'Bennani';
        const targetsHisSubject = app.choices?.some(
          (c) => c.subjectId === 'subj-1' || c.subjectId === 'subj-2'
        );
        return Boolean(isHisDirecteur || targetsHisSubject);
      }
      if (role === 'DIRECTEUR_LABO') {
        return app.structureRecherche?.acronyme === 'LISER';
      }
      return true;
    },
    []
  );

  // Restore any client-persisted applications to backend on initial app load
  useEffect(() => {
    getAllPersistedApplications()
      .then((persistedApps) => {
        if (!persistedApps || persistedApps.length === 0) return;
        const lightweightApps = persistedApps.map((app) => ({
          ...app,
          documents: (app.documents || []).map(({ fileDataUrl: _omit, ...rest }) => rest),
        }));
        return fetch('/api/applications/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applications: lightweightApps }),
        });
      })
      .catch((err) => console.log('Persisted applications sync skipped:', err));
  }, []);

  // Fetch applications tailored strictly to the current authenticated user (RBAC Isolation)
  // and hydrate all persisted uploaded PDF documents from IndexedDB
  const fetchApplicationsForActivePersona = useCallback(() => {
    if (!currentUser) {
      setApplications([]);
      return;
    }

    let query = '';
    if (currentUser.id === 'usr-candidate-youssef') {
      query = '?role=CANDIDAT&userId=usr-candidate-youssef&email=youssef.alaoui%40usmba.ac.ma';
    } else if (currentUser.id === 'usr-candidate-sara') {
      query = '?role=CANDIDAT&userId=usr-candidate-sara&email=sara.idrissi%40usmba.ac.ma';
    } else if (currentUser.id === 'usr-candidate-berrada') {
      query = '?role=CANDIDAT&userId=usr-candidate-berrada&email=sara.berrada%40usmba.ac.ma';
    } else if (currentUser.id === 'usr-candidate-amine') {
      query = '?role=CANDIDAT&userId=usr-candidate-amine&email=amine.chraibi%40usmba.ac.ma';
    } else if (currentUser.id === 'usr-candidate-imane') {
      query = '?role=CANDIDAT&userId=usr-candidate-imane';
    } else if (currentUser.id === 'usr-prof-bennani') {
      query = '?role=DIRECTEUR_THESE&userId=usr-prof-bennani';
    } else if (currentUser.id === 'usr-prof-slaoui') {
      query = '?role=DIRECTEUR_THESE&userId=usr-prof-slaoui';
    } else if (currentUser.id === 'usr-chef-elamrani') {
      query = '?role=DIRECTEUR_LABO&userId=usr-chef-elamrani';
    } else if (currentUser.id === 'usr-scolarite') {
      query = '?role=ADMINISTRATION&userId=usr-scolarite';
    } else if (currentUser.id === 'usr-admin-cedoc') {
      query = '?role=RESPONSABLE_CED&userId=usr-admin-cedoc';
    } else if (currentUser.role === 'CANDIDAT') {
      query = `?role=CANDIDAT&userId=${encodeURIComponent(currentUser.id || '')}&email=${encodeURIComponent(currentUser.email || '')}`;
    } else if (currentUser.role === 'DIRECTEUR_THESE') {
      query = `?role=DIRECTEUR_THESE&userId=${currentUser.id}`;
    } else if (currentUser.role === 'DIRECTEUR_LABO') {
      query = `?role=DIRECTEUR_LABO&userId=${currentUser.id}`;
    } else if (currentUser.role === 'ADMINISTRATION') {
      query = `?role=ADMINISTRATION&userId=${currentUser.id}`;
    }

    Promise.all([
      fetch(`/api/applications${query}`)
        .then((res) => res.json())
        .catch(() => []),
      getAllPersistedDocuments(),
      getAllPersistedApplications(),
    ])
      .then(([serverData, persistedDocs, persistedApps]) => {
        const serverApps: ApplicationBasket[] = Array.isArray(serverData) ? serverData : [];
        const statusRank = (st?: string): number => {
          switch (st) {
            case 'INSCRIT_DEFINITIF':
              return 11;
            case 'INSCRIPTION_DEFINITIVE':
            case 'INSCRITE':
              return 10;
            case 'INSCRIPTION_EN_COURS':
              return 9;
            case 'VALIDE_LABO':
              return 8;
            case 'VALIDE_ENCADRANT':
            case 'ADMISE_LISTE_PRINCIPALE':
            case 'ENTRETIEN_REALISE':
              return 7;
            case 'EN_ATTENTE_VALIDATION_ENCADRANT':
            case 'CONVOQUEE':
            case 'EN_EVALUATION':
              return 6;
            case 'VERIFICATION_CONFORME':
              return 5;
            case 'EN_ATTENTE_VERIFICATION':
              return 4;
            case 'SOUMIS':
            case 'SOUMISE':
              return 3;
            default:
              return 1;
          }
        };

        const mergedApps: ApplicationBasket[] = [...serverApps];

        for (const pApp of persistedApps) {
          const existingIdx = mergedApps.findIndex((a) => a.id === pApp.id);
          if (existingIdx === -1) {
            if (matchesPersonaRbac(pApp, currentUser)) {
              mergedApps.unshift(pApp);
            }
          } else {
            const sApp = mergedApps[existingIdx];
            const pRank = statusRank(pApp.currentStatut);
            const sRank = statusRank(sApp.currentStatut);
            if (
              pRank > sRank ||
              (pApp.officialAttestationNumber && !sApp.officialAttestationNumber)
            ) {
              mergedApps[existingIdx] = {
                ...sApp,
                currentStatut: pApp.currentStatut,
                status: pApp.status || pApp.currentStatut,
                officialAttestationNumber:
                  pApp.officialAttestationNumber || sApp.officialAttestationNumber,
                avisDirecteur: pApp.avisDirecteur || sApp.avisDirecteur,
                signatures: pApp.signatures || sApp.signatures,
                interview: pApp.interview || sApp.interview,
              };
            }
          }
        }

        const hydratedApps = mergedApps.map((app) =>
          applyPersistedDocumentsToApplication(app, persistedDocs)
        );
        setApplications(hydratedApps);
      })
      .catch((err) => console.log('Error fetching applications:', err));
  }, [currentUser, matchesPersonaRbac]);

  // Fetch simulated emails from backend
  const fetchEmails = useCallback(() => {
    fetch('/api/emails')
      .then((res) => res.json())
      .then((data) => {
        if (data.emails) {
          setSimulatedEmails(data.emails);
        }
      })
      .catch((err) => console.log('Error fetching emails:', err));
  }, []);

  useEffect(() => {
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((data) => {
        if (data.subjects) setSubjects(data.subjects);
      })
      .catch((err) => console.log('Error fetching subjects:', err));

    fetch('/api/campaign')
      .then((res) => res.json())
      .then((data) => {
        if (data.campaign) setActiveCampaign(data.campaign);
      })
      .catch((err) => console.log('Error fetching campaign:', err));

    fetchApplicationsForActivePersona();
    fetchEmails();
  }, [fetchApplicationsForActivePersona, fetchEmails]);

  // Basket Management Handlers (enforce active campaign rules)
  const handleAddChoice = (subject: Subject) => {
    if (campaignClosedReason) {
      showToast(campaignClosedReason, 'error');
      return;
    }
    const maxChoices = activeCampaign.maxChoicesPerCandidate || 3;
    if (basketChoices.length >= maxChoices) {
      showToast(
        `Le panier contient déjà le maximum autorisé de ${maxChoices} sujet${maxChoices > 1 ? 's' : ''} pour la campagne active.`,
        'error'
      );
      return;
    }
    if (basketChoices.some((c) => c.subjectId === subject.id)) {
      showToast('Ce sujet figure déjà dans vos choix.', 'info');
      return;
    }

    const nextRank = (basketChoices.length + 1) as 1 | 2 | 3;
    const newChoices = [
      ...basketChoices,
      {
        subjectId: subject.id,
        rank: nextRank,
        addedAt: new Date().toISOString(),
      },
    ];
    setBasketChoices(newChoices);
    showToast(`Sujet ajouté en Choix n°${nextRank} au panier !`, 'success');
  };

  const handleRemoveChoice = (subjectId: string) => {
    const remaining = basketChoices
      .filter((c) => c.subjectId !== subjectId)
      .map((c, index) => ({
        ...c,
        rank: (index + 1) as 1 | 2 | 3,
      }));
    setBasketChoices(remaining);
    showToast('Sujet retiré du panier.', 'info');
  };

  const handleMoveChoice = (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= basketChoices.length) return;

    const reordered = [...basketChoices];
    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const finalChoices = reordered.map((c, idx) => ({
      ...c,
      rank: (idx + 1) as 1 | 2 | 3,
    }));
    setBasketChoices(finalChoices);
    showToast('Ordre de préférence mis à jour.', 'success');
  };

  // Just-in-Time Application Handler on "Candidater" (inside Subject Detail)
  const handleApplySubject = (subject: Subject) => {
    if (campaignClosedReason) {
      showToast(campaignClosedReason, 'error');
      return;
    }
    setPendingSubjectForApplication(subject);
    setSelectedDetailSubject(null);
    if (!isAuthenticated || !currentUser) {
      setIsAuthModalOpen(true);
    } else {
      handleSuccessAuth(currentUser, currentRole, subject);
    }
  };

  // Validation Flow: Basket -> Auth -> Submit
  const handleProceedToAuth = () => {
    if (campaignClosedReason) {
      showToast(campaignClosedReason, 'error');
      return;
    }
    if (basketChoices.length === 0) {
      showToast('Ajoutez au moins 1 sujet au panier avant de candidater.', 'error');
      return;
    }
    if (basketChoices.length > activeCampaign.maxChoicesPerCandidate) {
      showToast(
        `Maximum autorisé par la campagne active : ${activeCampaign.maxChoicesPerCandidate} sujet(s). Retirez les choix excédentaires.`,
        'error'
      );
      return;
    }
    if (!isAuthenticated || !currentUser) {
      setPendingBasketSubmit(true);
      setIsAuthModalOpen(true);
    } else {
      handleSuccessAuth(currentUser, currentRole, undefined, true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentRole('visiteur');
    setCurrentTab('catalog');
    setBasketChoices([]);
    setApplications([]);
    setPendingSubjectForApplication(null);
    setPendingBasketSubmit(false);
    showToast('Session fermée avec succès.', 'info');
  };

  const handleSuccessAuth = async (
    user: Partial<User>,
    mappedRole?: UserRole,
    directSubject?: Subject,
    submitBasketNow?: boolean
  ) => {
    const subjectToApply = directSubject || pendingSubjectForApplication;
    const shouldSubmitBasket = Boolean(submitBasketNow || pendingBasketSubmit);

    try {
      const targetRole: UserRole =
        mappedRole ||
        (user.role === 'CANDIDAT'
          ? 'candidat'
          : user.role === 'DIRECTEUR_THESE'
          ? 'directeur'
          : user.role === 'DIRECTEUR_LABO'
          ? 'chef_labo'
          : user.role === 'ADMINISTRATION'
          ? 'administration'
          : user.role === 'RESPONSABLE_CED'
          ? 'admin_cedoc'
          : 'candidat');

      // Consistent role-based redirection for all 4 roles:
      // 1. Directeur de thèse & 2. Direction de structure -> supervisor_dashboard
      if (targetRole === 'directeur' || targetRole === 'chef_labo') {
        setIsAuthenticated(true);
        setCurrentUser(user);
        setCurrentRole(targetRole);
        fetchEmails();
        setCurrentTab('supervisor_dashboard');
        const roleTag =
          targetRole === 'directeur' ? 'Directeur de thèse' : 'Direction de structure';
        showToast(`Connecté (${roleTag}) : ${user.fullName}`, 'success');
        return;
      }

      // 3. Administration CEDoc (Scolarité / Responsable CEDoc / Super Admin) -> administration_dashboard
      if (
        targetRole === 'administration' ||
        targetRole === 'admin_cedoc' ||
        targetRole === 'super_admin'
      ) {
        setIsAuthenticated(true);
        setCurrentUser(user);
        setCurrentRole(targetRole);
        fetchEmails();
        setCurrentTab('administration_dashboard');
        showToast(`Connecté (Administration CEDoc) : ${user.fullName}`, 'success');
        return;
      }

      const lowerEmail = (user.email || '').toLowerCase();
      const isSaraIdrissi =
        user.id === 'usr-candidate-sara' || lowerEmail === 'sara.idrissi@usmba.ac.ma';
      const isSaraBerrada =
        user.id === 'usr-candidate-berrada' ||
        lowerEmail === 'sara.berrada@usmba.ac.ma' ||
        lowerEmail === 'berrada@usmba.ac.ma';

      const activeProfile = isSaraBerrada
        ? {
            ...SAMPLE_CANDIDATE_PROFILE,
            nom: 'Berrada',
            prenom: 'Sara',
            cinNumber: user.cinNumber || 'CD784512',
            cneNumber: user.cneNumber || 'M140295811',
          }
        : isSaraIdrissi
        ? {
            ...SAMPLE_CANDIDATE_PROFILE,
            nom: 'Idrissi',
            prenom: 'Sara',
            cinNumber: user.cinNumber || 'CD712940',
            cneNumber: user.cneNumber || 'M139824102',
          }
        : SAMPLE_CANDIDATE_PROFILE;
      setCandidateProfile(activeProfile);

      // 4. Candidat: Standard login without pending application or basket submission
      if (!subjectToApply && !shouldSubmitBasket) {
        setIsAuthenticated(true);
        setCurrentUser(user);
        setCurrentRole(targetRole);
        fetchEmails();
        if (isSaraIdrissi) {
          if (basketChoices.length === 0) {
            setBasketChoices([]);
          }
          setCurrentTab('catalog');
          showToast(
            `Bienvenue Sara Idrissi ! Panier (${basketChoices.length}/${activeCampaign.maxChoicesPerCandidate}).`,
            'info'
          );
        } else if (isSaraBerrada) {
          // Check whether Sara Berrada already has an existing dossier or persisted documents
          const [persistedApps, persistedDocs, serverApps] = await Promise.all([
            getAllPersistedApplications(),
            getAllPersistedDocuments(),
            fetch(
              `/api/applications?role=CANDIDAT&userId=${encodeURIComponent(user.id || 'usr-candidate-berrada')}&email=${encodeURIComponent(user.email || 'sara.berrada@usmba.ac.ma')}`
            )
              .then((res) => res.json())
              .catch(() => []),
          ]);
          const hasApp =
            (Array.isArray(serverApps) && serverApps.length > 0) ||
            persistedApps.some((a) => matchesPersonaRbac(a, user));
          const hasDocs = persistedDocs.some(
            (d) =>
              !d.removed &&
              (d.candidateId === user.id ||
                d.candidateEmail?.toLowerCase() === lowerEmail)
          );
          if (hasApp) {
            setCurrentTab('candidate_dashboard');
          } else if (hasDocs) {
            setCurrentTab('ocr');
          } else {
            setCurrentTab('catalog');
          }
          showToast(`Connecté (Candidat) : ${user.fullName || 'Sara Berrada'}`, 'success');
        } else {
          const maxAllowed = Math.max(1, activeCampaign.maxChoicesPerCandidate || 3);
          const defaultChoices: BasketChoice[] = [
            { subjectId: 'subj-1', rank: 1, addedAt: new Date().toISOString() },
            { subjectId: 'subj-2', rank: 2, addedAt: new Date().toISOString() },
            { subjectId: 'subj-7', rank: 3, addedAt: new Date().toISOString() },
          ].slice(0, maxAllowed);
          setBasketChoices(defaultChoices);
          setCurrentTab('candidate_dashboard');
          showToast(`Connecté (Candidat) : ${user.fullName}`, 'success');
        }
        return;
      }

      // Build final choices from visitor/candidate basket respecting active campaign limit
      const maxChoices = activeCampaign.maxChoicesPerCandidate || 3;
      let finalChoices = [...basketChoices].slice(0, maxChoices);

      if (subjectToApply) {
        const remainingChoices = basketChoices
          .filter((c) => c.subjectId !== subjectToApply.id)
          .slice(0, Math.max(0, maxChoices - 1));
        finalChoices = [
          {
            subjectId: subjectToApply.id,
            rank: 1,
            addedAt: new Date().toISOString(),
          },
          ...remainingChoices.map((c, idx) => ({
            ...c,
            rank: (idx + 2) as 2 | 3,
          })),
        ];
        setBasketChoices(finalChoices);
      }

      if (finalChoices.length === 0) {
        setIsAuthenticated(true);
        setCurrentUser(user);
        setCurrentRole(targetRole);
        setCurrentTab('catalog');
        return;
      }

      const response = await fetch('/api/basket/submit', {
        method: 'POST',
        headers: buildAuthHeaders(user),
        body: JSON.stringify({
          candidateId: user.id || 'usr-candidate-youssef',
          candidateName: user.fullName || 'Youssef Alaoui Mdaghri',
          candidateEmail: user.email || 'youssef.alaoui@usmba.ac.ma',
          candidateCin: user.cinNumber || activeProfile.cinNumber || 'CD689412',
          candidateCne: user.cneNumber || activeProfile.cneNumber || 'M134567890',
          choices: finalChoices,
        }),
      });

      const data = await response.json();

      // Update auth state AFTER /api/basket/submit finishes so useEffect fetches the freshly persisted application
      setIsAuthenticated(true);
      setCurrentUser(user);
      setCurrentRole(targetRole);

      if (response.ok && data.application) {
        const persistedDocs = await getAllPersistedDocuments();
        const hydratedNewApp = applyPersistedDocumentsToApplication(
          data.application,
          persistedDocs
        );
        await savePersistedApplication(hydratedNewApp);
        setApplications((prev) => [hydratedNewApp, ...prev.filter((a) => a.id !== hydratedNewApp.id)]);
        showToast(
          `Candidature ${hydratedNewApp.codeCandidature} soumise (${finalChoices.length} sujet${finalChoices.length > 1 ? 's' : ''}). E-mail de confirmation envoyé.`,
          'success'
        );
        fetchEmails();
        setCurrentTab('candidate_dashboard');
      } else {
        showToast(data.error || 'Erreur lors de la soumission du panier.', 'error');
        setCurrentTab('candidate_dashboard');
      }
    } catch (err) {
      console.error(err);
      showToast('Session établie avec succès.', 'success');
      setCurrentTab('candidate_dashboard');
    } finally {
      setPendingSubjectForApplication(null);
      setPendingBasketSubmit(false);
    }
  };

  // Interview Scoring
  const handleScoreInterview = async (
    appId: string,
    scores: {
      specialite: number;
      motivation: number;
      projet: number;
      langues: number;
      juryNotes: string;
      decision: string;
    }
  ) => {
    try {
      const res = await fetch(`/api/applications/${appId}/interview`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify(scores),
      });
      const data = await res.json();
      if (data.application) {
        const persistedDocs = await getAllPersistedDocuments();
        const hydrated = applyPersistedDocumentsToApplication(data.application, persistedDocs);
        setApplications((prev) =>
          prev.map((app) => (app.id === appId ? hydrated : app))
        );
        fetchEmails();
        showToast('Délibération du jury enregistrée et notifiée au candidat.', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Certified Cryptographic Signing
  const handleSignCharter = async (role: string) => {
    const activeApp = applications[0];
    if (!activeApp) return;

    try {
      const res = await fetch(`/api/applications/${activeApp.id}/sign`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          role,
          signerName:
            role === 'Candidat'
              ? activeApp.candidateName
              : role === 'Directeur'
              ? 'Pr. Mustapha Bennani'
              : role === 'Chef_Labo'
              ? 'Dr. Karim El Amrani'
              : 'Pr. Rachid El Ghoumari',
          signerEmail:
            role === 'Candidat'
              ? activeApp.candidateEmail
              : role === 'Directeur'
              ? 'm.bennani@usmba.ac.ma'
              : role === 'Chef_Labo'
              ? 'k.elamrani@usmba.ac.ma'
              : 'cedoc.st@usmba.ac.ma',
        }),
      });
      const data = await res.json();
      if (data.application) {
        const persistedDocs = await getAllPersistedDocuments();
        const hydrated = applyPersistedDocumentsToApplication(data.application, persistedDocs);
        setApplications((prev) =>
          prev.map((app) => (app.id === activeApp.id ? hydrated : app))
        );
        fetchEmails();
        showToast(
          `Signature électronique certifiée apposée avec succès (Norme Cryptographique USMBA).`,
          'success'
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send Carnet de Thèse Message
  const handleSendMessage = async (msg: string, attachmentName?: string) => {
    const activeApp = applications[0];
    if (!activeApp) return;

    const senderRole =
      currentRole === 'candidat'
        ? 'Candidat'
        : currentRole === 'directeur'
        ? 'Directeur'
        : 'Chef_Labo';
    const senderName =
      currentRole === 'candidat'
        ? activeApp.candidateName
        : currentRole === 'directeur'
        ? 'Pr. Mustapha Bennani'
        : 'Dr. Karim El Amrani';

    try {
      const res = await fetch(`/api/applications/${activeApp.id}/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderRole,
          senderName,
          message: msg,
          attachmentName,
        }),
      });
      const data = await res.json();
      if (data.exchangeMessage) {
        setExchangeMessages((prev) => [...prev, data.exchangeMessage]);
        showToast('Document/Message consigné dans le carnet de thèse.', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeApp = applications[0] || null;
  const assignedSubject =
    subjects.find((s) => s.id === activeApp?.assignedSubjectId) ||
    subjects.find((s) => s.id === activeApp?.choices[0]?.subjectId) ||
    subjects[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        basketCount={basketChoices.length}
        openBasket={() => setIsBasketOpen(true)}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        onOpenLogin={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenThreeArrowsMenu={() => setIsThreeArrowsMenuOpen(true)}
        maxChoices={activeCampaign.maxChoicesPerCandidate}
      />

      {/* Main Single-Focused Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Module 1: Catalog */}
        {currentTab === 'catalog' && (
          <SubjectCatalog
            subjects={subjects}
            basketChoices={basketChoices}
            onAddChoice={handleAddChoice}
            onRemoveChoice={handleRemoveChoice}
            onOpenBasket={() => setIsBasketOpen(true)}
            onSelectSubjectForDetail={(subj) => setSelectedDetailSubject(subj)}
            onQuickApply={handleApplySubject}
            onProceedToAuth={handleProceedToAuth}
            maxChoices={activeCampaign.maxChoicesPerCandidate}
          />
        )}

        {/* Module 2: Administration Scolarité / CEDoc (Dossiers, Personnel RBAC, Campagne Active) */}
        {currentTab === 'administration_dashboard' && (
          <AdministrationDashboard
            applications={applications}
            allSubjects={subjects}
            currentUser={currentUser}
            activeCampaign={activeCampaign}
            onCampaignUpdated={(updated) => setActiveCampaign(updated)}
            onRefreshApplications={() => {
              fetchApplicationsForActivePersona();
              fetchEmails();
            }}
            onOpenCharterModal={() => setIsCharterModalOpen(true)}
            onNotify={showToast}
          />
        )}

        {/* Module 3: Supervisor / Lab Dashboard */}
        {currentTab === 'supervisor_dashboard' && (
          <SupervisorLabDashboard
            currentRole={currentRole}
            currentUser={currentUser}
            applications={applications}
            allSubjects={subjects}
            onScoreInterview={handleScoreInterview}
            onSignCharter={handleSignCharter}
            onOpenCharterModal={() => setIsCharterModalOpen(true)}
            onRefreshApplications={() => {
              fetchApplicationsForActivePersona();
              fetchEmails();
            }}
          />
        )}

        {/* Module 4: Candidate Dashboard (Strict upload, emergency incomplete mode) */}
        {currentTab === 'candidate_dashboard' && (
          <CandidateDashboard
            application={activeApp}
            allSubjects={subjects}
            currentUser={currentUser}
            activeCampaign={activeCampaign}
            onSignCharter={handleSignCharter}
            onOpenCharterModal={() => setIsCharterModalOpen(true)}
            onRefreshApplication={() => {
              fetchApplicationsForActivePersona();
              fetchEmails();
            }}
            onCreateProvisional={async (nom, etablissement) => {
              try {
                const res = await fetch('/api/applications/provisional', {
                  method: 'POST',
                  headers: buildAuthHeaders(),
                  body: JSON.stringify({
                    nom,
                    prenom: '',
                    etablissementOrigine: etablissement,
                    email: `${nom.toLowerCase().replace(/\s+/g, '.')}@usmba.ac.ma`,
                  }),
                });
                if (res.ok) {
                  const provData = await res.json().catch(() => null);
                  if (provData?.application) {
                    const persistedDocs = await getAllPersistedDocuments();
                    const hydratedProv = applyPersistedDocumentsToApplication(
                      provData.application,
                      persistedDocs
                    );
                    await savePersistedApplication(hydratedProv);
                  }
                  showToast('Dossier provisoire enregistré en attente de pièces.', 'success');
                  fetchApplicationsForActivePersona();
                }
              } catch (e) {
                console.error(e);
              }
            }}
          />
        )}

        {/* Module 5: OCR Verification */}
        {currentTab === 'ocr' && (
          <OcrCaptureModal
            candidateProfile={candidateProfile}
            currentUser={currentUser}
            activeCampaign={activeCampaign}
            application={activeApp}
            onRefreshApplication={() => {
              fetchApplicationsForActivePersona();
              fetchEmails();
            }}
            onUpdateProfile={(updated) =>
              setCandidateProfile((prev) => ({ ...prev, ...updated }))
            }
            onCompleteOcr={() => {
              showToast('Pièces justificatives validées avec succès.', 'success');
              setCurrentTab('candidate_dashboard');
            }}
          />
        )}

        {/* Module 5b: Notifications Mail */}
        {currentTab === 'notifications' && (
          <NotificationsMailPanel
            emails={simulatedEmails}
            currentRole={currentRole}
            currentUser={currentUser}
            onActionClick={(url) => {
              if (url.includes('pieces')) {
                setCurrentTab('ocr');
              } else if (url.includes('charte')) {
                setIsCharterModalOpen(true);
              } else if (url.includes('dossier')) {
                setCurrentTab('candidate_dashboard');
              }
            }}
          />
        )}

        {/* Module 6: Academic Matching */}
        {currentTab === 'matching' && (
          <AcademicMatchingPanel
            candidateProfile={candidateProfile}
            subjects={subjects}
            currentApplication={activeApp}
            onScheduleInterview={(d, t, r) => {
              showToast(`Entretien convoqué pour le ${d} à ${t}.`, 'success');
            }}
          />
        )}

        {/* Module 7: Audit Trail */}
        {currentTab === 'audit_trail' && (
          <AuditTrailPanel onClose={() => setCurrentTab('catalog')} />
        )}

        {/* Module 8: Charter Tab */}
        {currentTab === 'charter' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                  Cadre Réglementaire & Contractuel
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                  Charte des Thèses
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Document officiel et signatures de la commission doctorale.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentTab('catalog')}
                  className="py-2.5 px-5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl cursor-pointer transition-all flex items-center gap-2 border border-slate-200 shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Fermer l'aperçu</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCharterModalOpen(true)}
                  className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Aperçu Plein Écran</span>
                </button>
              </div>
            </div>

            {/* Embedded Charter View with functioning close action */}
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs">
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div className="text-xs text-slate-400 font-mono">
                    Réf. Inscription: {activeApp?.id || 'app-usmba-2026-089'}
                  </div>
                  <button
                    onClick={() => setCurrentTab('catalog')}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Fermer cette vue</span>
                  </button>
                </div>

                <div className="text-center space-y-1">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Royaume du Maroc • Université Sidi Mohamed Ben Abdellah
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    CHARTE DES THÈSES & CONTRAT DOCTORAL
                  </h3>
                  <p className="text-xs text-slate-700 font-semibold bg-slate-100 inline-block px-3 py-1 rounded-full border border-slate-200">
                    Année Universitaire 2026/2027
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <strong className="block text-slate-500 uppercase tracking-wider text-[11px]">Doctorant :</strong>
                    <div className="text-slate-900 font-semibold">{activeApp?.candidateName || 'Youssef Alaoui Mdaghri'}</div>
                    <div className="font-mono text-slate-500">CIN: {activeApp?.candidateCin || 'CD689412'}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <strong className="block text-slate-500 uppercase tracking-wider text-[11px]">Direction Scientifique :</strong>
                    <div className="text-slate-900 font-semibold">{assignedSubject?.professorName}</div>
                    <div className="text-slate-500">{assignedSubject?.establishment}</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Signatures Certifiées USMBA</span>
                    <span className="text-[11px] font-mono text-slate-500">PKI-SHA256</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <div className="text-slate-500">1. Candidat</div>
                      <div className="font-bold text-slate-900">✓ Signé</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <div className="text-slate-500">2. Directeur</div>
                      <div className="font-bold text-slate-900">✓ Signé</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <div className="text-slate-500">3. Chef Labo</div>
                      <div className="font-bold text-slate-900">✓ Signé</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <div className="text-slate-500">4. CEDoc</div>
                      <div className="font-bold text-slate-900">✓ Signé</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentTab('catalog')}
                    className="py-2.5 px-6 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer border border-slate-200 shadow-xs transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Fermer l'aperçu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCharterModalOpen(true)}
                    className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Ouvrir l'acte officiel complet</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* The Three-Arrows Drawer Hub */}
      <ThreeArrowsMenuDrawer
        isOpen={isThreeArrowsMenuOpen}
        onClose={() => setIsThreeArrowsMenuOpen(false)}
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        basketCount={basketChoices.length}
        openBasket={() => setIsBasketOpen(true)}
        currentRole={currentRole}
        emailCount={
          currentRole === 'candidat' && currentUser?.email
            ? simulatedEmails.filter(
                (e) => e.to.toLowerCase() === currentUser.email?.toLowerCase()
              ).length
            : simulatedEmails.length
        }
        onSelectRole={(role) => setCurrentRole(role)}
        onLogout={handleLogout}
        onOpenLogin={() => {
          setIsThreeArrowsMenuOpen(false);
          setIsAuthModalOpen(true);
        }}
        maxChoices={activeCampaign.maxChoicesPerCandidate}
        maxPdfSizeMB={activeCampaign.maxPdfSizeMB}
      />

      {/* Subject Basket Drawer */}
      <SubjectBasketDrawer
        isOpen={isBasketOpen}
        onClose={() => setIsBasketOpen(false)}
        basketChoices={basketChoices}
        allSubjects={subjects}
        onRemoveChoice={handleRemoveChoice}
        onMoveChoice={handleMoveChoice}
        onProceedToAuth={handleProceedToAuth}
        maxChoices={activeCampaign.maxChoicesPerCandidate}
        campaignClosedReason={campaignClosedReason}
      />

      {/* Subject Detail Modal */}
      <SubjectDetailModal
        subject={selectedDetailSubject}
        onClose={() => setSelectedDetailSubject(null)}
        basketChoices={basketChoices}
        onAddChoice={handleAddChoice}
        onRemoveChoice={handleRemoveChoice}
        onOpenBasket={() => {
          setSelectedDetailSubject(null);
          setIsBasketOpen(true);
        }}
        onApplySubject={handleApplySubject}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingBasketSubmit(false);
          setPendingSubjectForApplication(null);
        }}
        onSuccessAuth={handleSuccessAuth}
        pendingApplicationCount={
          pendingBasketSubmit
            ? basketChoices.length
            : pendingSubjectForApplication
            ? Math.max(1, basketChoices.length)
            : 0
        }
      />

      {/* Fullscreen Charter Modal */}
      {isCharterModalOpen && (
        <CharterViewerModal
          isOpen={isCharterModalOpen}
          onClose={() => setIsCharterModalOpen(false)}
          application={activeApp}
          subject={assignedSubject}
          onSignByRole={handleSignCharter}
        />
      )}

      {/* Simulated Email Box Modal */}
      <EmailSimulatorModal
        isOpen={isEmailSimulatorOpen}
        onClose={() => setIsEmailSimulatorOpen(false)}
        emails={simulatedEmails}
        onActionClick={(url) => {
          if (url.includes('pieces')) {
            setCurrentTab('candidate_dashboard');
          } else if (url.includes('charte')) {
            setIsCharterModalOpen(true);
          } else if (url.includes('candidatures')) {
            setCurrentTab('supervisor_dashboard');
          }
        }}
      />

      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-semibold flex items-center gap-2 text-white ${
              toast.type === 'error'
                ? 'bg-red-600'
                : toast.type === 'info'
                ? 'bg-blue-600'
                : 'bg-emerald-700'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto bg-white text-slate-500 text-xs py-5 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-bold text-slate-900">GCD-USMBA</span> • Université Sidi Mohamed Ben Abdellah de Fès
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Session 2026/2027 • Cycle Doctoral
          </div>
        </div>
      </footer>
    </div>
  );
}
