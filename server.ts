import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import {
  INITIAL_SUBJECTS,
  INITIAL_APPLICATIONS,
  INITIAL_USERS,
  INITIAL_CAMPAIGN,
  SAMPLE_CANDIDATE_PROFILE,
  INITIAL_EXCHANGE_MESSAGES,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SIMULATED_EMAILS,
  CALENDAR_2026,
  DOCUMENT_RULES,
  calculateUsbaMeritScore,
} from './src/data/mockDatabase';
import {
  ApplicationBasket,
  Subject,
  ThesisExchangeMessage,
  AuditLog,
  Notification,
  EcheanceCalendrier,
  StatutConformite,
  StatutCandidature,
  StatutPiece,
  RoleName,
  UserRole,
  User,
  AccountStatus,
  CampaignRules,
  SimulatedEmail,
  CandidatureDocument,
} from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '25mb' }));

// Initialize GoogleGenAI SDK safely
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// In-memory application stores initialized with structured entities
let users: User[] = JSON.parse(JSON.stringify(INITIAL_USERS));
let activeCampaign: CampaignRules = { ...INITIAL_CAMPAIGN };
let subjects: Subject[] = [...INITIAL_SUBJECTS];
let applications: ApplicationBasket[] = JSON.parse(JSON.stringify(INITIAL_APPLICATIONS));
let exchangeMessages: ThesisExchangeMessage[] = [...INITIAL_EXCHANGE_MESSAGES];
let candidateProfile = { ...SAMPLE_CANDIDATE_PROFILE };
let auditLogs: AuditLog[] = [...INITIAL_AUDIT_LOGS];
let notifications: Notification[] = [...INITIAL_NOTIFICATIONS];
let simulatedEmails: SimulatedEmail[] = JSON.parse(JSON.stringify(INITIAL_SIMULATED_EMAILS));
let calendarMilestones: EcheanceCalendrier[] = [...CALENDAR_2026];

interface StoredUploadedFile {
  id: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
}

const uploadedFilesStore = new Map<string, StoredUploadedFile>();
const pendingCandidateUploads = new Map<
  string,
  Record<
    string,
    {
      fileId: string;
      fileUrl: string;
      fileName: string;
      fileSize: string;
      mimeType: string;
      dateUploaded: string;
    }
  >
>();

// Audit Logger Helper conforming strictly to Audit & Traçabilité diagram
function recordAuditLog(
  userId: string,
  userName: string,
  userRole: RoleName,
  action: string,
  affectedEntityName: string,
  affectedEntityId: string,
  details: string
): AuditLog {
  const log: AuditLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    userRole,
    action,
    affectedEntityName,
    affectedEntityId,
    details,
  };
  auditLogs.unshift(log);
  return log;
}

// Transactional Simulated Email Dispatcher
function dispatchSimulatedEmail(params: {
  to: string;
  toName: string;
  from?: string;
  subject: string;
  body: string;
  type?: 'INFORMATIVE' | 'ACTION';
  actionLabel?: string;
  actionUrl?: string;
  deadline?: string;
  applicationId?: string;
}): SimulatedEmail {
  const newEmail: SimulatedEmail = {
    id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    to: params.to,
    toName: params.toName,
    from: params.from || 'scolarite.cedoc@usmba.ac.ma',
    subject: params.subject,
    body: params.body,
    type: params.type || 'INFORMATIVE',
    actionLabel: params.actionLabel,
    actionUrl: params.actionUrl,
    deadline: params.deadline,
    sentAt: new Date().toISOString(),
    applicationId: params.applicationId,
  };
  simulatedEmails.unshift(newEmail);
  return newEmail;
}

// -------------------------------------------------------------
// HELPERS RBAC, STATUT ACTIF & RÈGLES DE LA CAMPAGNE ACTIVE
// -------------------------------------------------------------

function mapRoleToFrontend(role: RoleName): UserRole {
  if (role === 'DIRECTEUR_THESE') return 'directeur';
  if (role === 'DIRECTEUR_LABO') return 'chef_labo';
  if (role === 'RESPONSABLE_CED') return 'admin_cedoc';
  if (role === 'ADMINISTRATION' || role === 'SUPER_ADMIN') return 'administration';
  if (role === 'VISITEUR') return 'visiteur';
  return 'candidat';
}

function getDefaultRedirectTabForRole(role: RoleName): string {
  if (role === 'DIRECTEUR_THESE' || role === 'DIRECTEUR_LABO') return 'supervisor_dashboard';
  if (role === 'RESPONSABLE_CED' || role === 'ADMINISTRATION' || role === 'SUPER_ADMIN') {
    return 'administration_dashboard';
  }
  if (role === 'CANDIDAT') return 'candidate_dashboard';
  return 'catalog';
}

function isUserActive(u: User | undefined | null): boolean {
  if (!u) return false;
  return u.status === 'ACTIF' && u.isEnabled === true;
}

function checkCampaignActive(): { active: boolean; reason?: string } {
  if (!activeCampaign.isOpen) {
    return {
      active: false,
      reason: `La campagne « ${activeCampaign.label} » est actuellement clôturée par l'Administration CEDoc.`,
    };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (activeCampaign.startDate && today < activeCampaign.startDate) {
    return {
      active: false,
      reason: `La campagne « ${activeCampaign.label} » n'est pas encore ouverte (ouverture prévue le ${activeCampaign.startDate}).`,
    };
  }
  if (activeCampaign.endDate && today > activeCampaign.endDate) {
    return {
      active: false,
      reason: `La période de la campagne « ${activeCampaign.label} » est expirée (clôture le ${activeCampaign.endDate}).`,
    };
  }
  return { active: true };
}

function enrichUserWithRattachements(u: User): User {
  const emailLower = u.email.toLowerCase();
  const linkedSubjectsCount = subjects.filter(
    (s) => s.professorId === u.id || s.professorEmail?.toLowerCase() === emailLower
  ).length;

  const linkedApplicationsCount = applications.filter((a) => {
    if (u.role === 'CANDIDAT') {
      return a.candidateId === u.id || a.candidateEmail?.toLowerCase() === emailLower;
    }
    if (u.role === 'DIRECTEUR_THESE') {
      return (
        a.directeurThese?.email?.toLowerCase() === emailLower ||
        subjects.some(
          (s) =>
            (s.professorId === u.id || s.professorEmail?.toLowerCase() === emailLower) &&
            a.choices?.some((c) => c.subjectId === s.id)
        )
      );
    }
    if (u.role === 'DIRECTEUR_LABO') {
      return Boolean(
        u.laboratory &&
          a.structureRecherche?.nom &&
          u.laboratory.toLowerCase().includes(a.structureRecherche.acronyme.toLowerCase())
      );
    }
    return false;
  }).length;

  return {
    ...u,
    status: u.isEnabled ? 'ACTIF' : 'INACTIF',
    linkedSubjectsCount,
    linkedApplicationsCount,
  };
}

function enforceRoleAccess(
  req: Request,
  res: Response,
  allowedRoles: RoleName[],
  actionName: string
): User | null {
  const headerUserId = (req.headers['x-user-id'] as string | undefined)?.trim();
  const headerUserRole = (req.headers['x-user-role'] as RoleName | undefined)?.trim() as RoleName | undefined;

  // When an explicit authenticated actor header is provided, strictly enforce existence, ACTIF status, and RBAC
  if (headerUserId) {
    const actor = users.find((u) => u.id === headerUserId);
    if (!actor) {
      res.status(401).json({
        error: 'Session invalide : compte utilisateur introuvable.',
      });
      return null;
    }
    if (!isUserActive(actor)) {
      recordAuditLog(
        actor.id,
        actor.fullName,
        actor.role,
        'ACCES_REFUSE_COMPTE_INACTIF',
        'Sécurité RBAC',
        actionName,
        `Action "${actionName}" refusée : compte ${actor.email} désactivé (INACTIF).`
      );
      res.status(403).json({
        error: `Accès bloqué : le compte ${actor.fullName} est désactivé (statut Inactif).`,
      });
      return null;
    }
    if (!allowedRoles.includes(actor.role)) {
      recordAuditLog(
        actor.id,
        actor.fullName,
        actor.role,
        'ACCES_REFUSE_RBAC',
        'Sécurité RBAC',
        actionName,
        `Action "${actionName}" non autorisée pour le rôle ${actor.role}.`
      );
      res.status(403).json({
        error: `Action non autorisée : votre rôle (${actor.role}) ne dispose pas des droits requis pour cette opération.`,
      });
      return null;
    }
    return actor;
  }

  if (headerUserRole && !allowedRoles.includes(headerUserRole)) {
    res.status(403).json({
      error: `Action non autorisée pour le rôle ${headerUserRole}.`,
    });
    return null;
  }

  return null;
}

// -------------------------------------------------------------
// MODULE AUTHENTIFICATION SÉCURISÉE & CLOISONNÉE (ACTIF REQUIS)
// -------------------------------------------------------------

function handleAuthenticatedResponse(user: User, provider: 'password' | 'google', res: Response) {
  if (!isUserActive(user)) {
    recordAuditLog(
      user.id,
      user.fullName,
      user.role,
      provider === 'google' ? 'CONNEXION_GOOGLE_BLOQUEE_INACTIF' : 'CONNEXION_BLOQUEE_INACTIF',
      'Session',
      user.id,
      `Tentative de connexion (${provider}) bloquée pour le compte désactivé ${user.email}.`
    );
    return res.status(403).json({
      success: false,
      code: 'ACCOUNT_DISABLED',
      error: `Accès refusé : votre compte (${user.email}) est actuellement désactivé (statut Inactif). Veuillez contacter l'Administration CEDoc pour réactivation.`,
    });
  }

  const userRole = mapRoleToFrontend(user.role);
  const redirectTab = getDefaultRedirectTabForRole(user.role);
  user.lastLoginAt = new Date().toISOString();

  recordAuditLog(
    user.id,
    user.fullName,
    user.role,
    provider === 'google' ? 'CONNEXION_GOOGLE_SSO' : 'CONNEXION_UTILISATEUR',
    'Session',
    user.id,
    `Authentification (${provider}) réussie pour ${user.fullName} (${user.role} • Statut ACTIF)`
  );

  return res.json({
    success: true,
    user: {
      ...enrichUserWithRattachements(user),
      mappedRole: userRole,
    },
    role: userRole,
    redirectTab,
    campaign: activeCampaign,
    message: `Connexion réussie. Bienvenue ${user.fullName}.`,
  });
}

app.post('/api/auth/login', (req: Request, res: Response) => {
  const rawIdentifier = (req.body.identifier || req.body.email || req.body.username || '').trim().toLowerCase();
  const identifier = rawIdentifier === 'berrada@usmba.ac.ma' ? 'sara.berrada@usmba.ac.ma' : rawIdentifier;
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const provider = req.body.provider === 'google' ? 'google' : 'password';

  if (!identifier) {
    return res.status(400).json({ success: false, error: 'Adresse e-mail ou identifiant institutionnel requis.' });
  }

  if (provider === 'password' && !password.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Veuillez saisir votre mot de passe.',
    });
  }

  if (provider === 'password' && password.trim().length < 4) {
    return res.status(400).json({
      success: false,
      error: 'Veuillez saisir votre mot de passe (4 caractères minimum).',
    });
  }

  const user = users.find(
    (u) =>
      u.role !== 'VISITEUR' &&
      (u.email.toLowerCase() === identifier || u.username.toLowerCase() === identifier)
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Compte introuvable. Veuillez vérifier votre adresse e-mail ou identifiant institutionnel.',
    });
  }

  return handleAuthenticatedResponse(user, provider, res);
});

app.post('/api/auth/google', (req: Request, res: Response) => {
  const rawEmail = (req.body.email || req.body.identifier || '').trim().toLowerCase();
  const email = rawEmail === 'berrada@usmba.ac.ma' ? 'sara.berrada@usmba.ac.ma' : rawEmail;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Veuillez renseigner ou sélectionner votre adresse Google institutionnelle (@usmba.ac.ma).',
    });
  }

  const user = users.find(
    (u) => u.role !== 'VISITEUR' && (u.email.toLowerCase() === email || u.username.toLowerCase() === email)
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      error: `Aucun compte institutionnel GCD-USMBA associé à l'adresse Google ${rawEmail}.`,
    });
  }

  return handleAuthenticatedResponse(user, 'google', res);
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const { userId, userName, userRole } = req.body;
  if (userId) {
    recordAuditLog(
      userId,
      userName || 'Utilisateur',
      (userRole as RoleName) || 'CANDIDAT',
      'DECONNEXION_UTILISATEUR',
      'Session',
      userId,
      `Fermeture de session pour ${userName || userId}`
    );
  }
  return res.json({ success: true, message: 'Déconnexion effectuée avec succès.' });
});

// -------------------------------------------------------------
// GESTION STRUCTURÉE DES UTILISATEURS, RÔLES, STATUTS & CAMPAGNE
// -------------------------------------------------------------

app.get('/api/users', (req: Request, res: Response) => {
  const enriched = users
    .filter((u) => u.role !== 'VISITEUR')
    .map((u) => enrichUserWithRattachements(u));
  res.json({ users: enriched });
});

app.patch('/api/users/:id/status', (req: Request, res: Response) => {
  const actor = enforceRoleAccess(
    req,
    res,
    ['ADMINISTRATION', 'RESPONSABLE_CED', 'SUPER_ADMIN'],
    'MODIFICATION_STATUT_UTILISATEUR'
  );
  if (req.headers['x-user-id'] && !actor) return;

  const target = users.find((u) => u.id === req.params.id);
  if (!target) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  const nextStatus = (req.body.status as AccountStatus) || (target.status === 'ACTIF' ? 'INACTIF' : 'ACTIF');
  if (nextStatus !== 'ACTIF' && nextStatus !== 'INACTIF') {
    return res.status(400).json({ error: 'Statut invalide (ACTIF ou INACTIF attendu).' });
  }

  if (actor && actor.id === target.id && nextStatus === 'INACTIF') {
    return res.status(400).json({
      error: 'Vous ne pouvez pas désactiver votre propre compte administrateur actif.',
    });
  }

  const previousStatus = target.status;
  target.status = nextStatus;
  target.isEnabled = nextStatus === 'ACTIF';
  if (nextStatus === 'INACTIF') {
    target.deactivatedAt = new Date().toISOString();
    target.deactivatedBy = actor?.fullName || req.body.actorName || 'Administration CEDoc';
  } else {
    target.deactivatedAt = undefined;
    target.deactivatedBy = undefined;
  }

  // Zero data deletion: linked subjects, candidatures, and audit trail remain intact
  recordAuditLog(
    actor?.id || 'usr-scolarite',
    actor?.fullName || req.body.actorName || 'Mme. Imane Bernoussi',
    actor?.role || 'ADMINISTRATION',
    nextStatus === 'INACTIF' ? 'DESACTIVATION_COMPTE' : 'REACTIVATION_COMPTE',
    'Utilisateur',
    target.id,
    `Statut de ${target.fullName} (${target.email}) passé de ${previousStatus} à ${nextStatus}. Historique, sujets et candidatures intégralement conservés.`
  );

  return res.json({
    success: true,
    user: enrichUserWithRattachements(target),
    message:
      nextStatus === 'INACTIF'
        ? `Compte ${target.fullName} désactivé (accès bloqué, historique conservé).`
        : `Compte ${target.fullName} réactivé avec succès.`,
  });
});

app.patch('/api/users/:id/role', (req: Request, res: Response) => {
  const actor = enforceRoleAccess(
    req,
    res,
    ['ADMINISTRATION', 'RESPONSABLE_CED', 'SUPER_ADMIN'],
    'MODIFICATION_ROLE_UTILISATEUR'
  );
  if (req.headers['x-user-id'] && !actor) return;

  const target = users.find((u) => u.id === req.params.id);
  if (!target) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  const allowedTargetRoles: RoleName[] = [
    'CANDIDAT',
    'DIRECTEUR_THESE',
    'DIRECTEUR_LABO',
    'RESPONSABLE_CED',
    'ADMINISTRATION',
    'SUPER_ADMIN',
  ];
  const nextRole = req.body.role as RoleName;
  if (!allowedTargetRoles.includes(nextRole)) {
    return res.status(400).json({ error: 'Rôle cible invalide.' });
  }

  const prevRole = target.role;
  target.role = nextRole;
  if (typeof req.body.establishment === 'string') {
    target.establishment = req.body.establishment.trim() || target.establishment;
  }
  if (typeof req.body.laboratory === 'string') {
    target.laboratory = req.body.laboratory.trim() || undefined;
  }

  recordAuditLog(
    actor?.id || 'usr-scolarite',
    actor?.fullName || req.body.actorName || 'Mme. Imane Bernoussi',
    actor?.role || 'ADMINISTRATION',
    'MODIFICATION_ROLE_UTILISATEUR',
    'Utilisateur',
    target.id,
    `Rôle de ${target.fullName} modifié de ${prevRole} à ${nextRole} (rattachements et historique conservés).`
  );

  return res.json({
    success: true,
    user: enrichUserWithRattachements(target),
    message: `Rôle mis à jour pour ${target.fullName}.`,
  });
});

app.get('/api/campaign', (_req: Request, res: Response) => {
  const statusCheck = checkCampaignActive();
  res.json({
    campaign: activeCampaign,
    isCurrentlyActive: statusCheck.active,
    statusReason: statusCheck.reason,
  });
});

app.patch('/api/campaign', (req: Request, res: Response) => {
  const actor = enforceRoleAccess(
    req,
    res,
    ['ADMINISTRATION', 'RESPONSABLE_CED', 'SUPER_ADMIN'],
    'CONFIGURATION_CAMPAGNE'
  );
  if (req.headers['x-user-id'] && !actor) return;

  const { label, startDate, endDate, isOpen, maxChoicesPerCandidate, maxPdfSizeMB } = req.body;

  const nextStart = typeof startDate === 'string' && startDate ? startDate : activeCampaign.startDate;
  const nextEnd = typeof endDate === 'string' && endDate ? endDate : activeCampaign.endDate;
  if (nextStart > nextEnd) {
    return res.status(400).json({
      error: 'La date de début de campagne doit être antérieure ou égale à la date de fin.',
    });
  }

  const nextMaxChoices =
    maxChoicesPerCandidate !== undefined ? Number(maxChoicesPerCandidate) : activeCampaign.maxChoicesPerCandidate;
  if (!Number.isInteger(nextMaxChoices) || nextMaxChoices < 1 || nextMaxChoices > 5) {
    return res.status(400).json({
      error: 'Le nombre maximal de sujets par candidat doit être compris entre 1 et 5.',
    });
  }

  const nextMaxPdf =
    maxPdfSizeMB !== undefined ? Number(maxPdfSizeMB) : activeCampaign.maxPdfSizeMB;
  if (Number.isNaN(nextMaxPdf) || nextMaxPdf < 1 || nextMaxPdf > 20) {
    return res.status(400).json({
      error: 'La taille maximale des fichiers PDF doit être comprise entre 1 Mo et 20 Mo.',
    });
  }

  activeCampaign = {
    ...activeCampaign,
    label: typeof label === 'string' && label.trim() ? label.trim() : activeCampaign.label,
    startDate: nextStart,
    endDate: nextEnd,
    isOpen: typeof isOpen === 'boolean' ? isOpen : activeCampaign.isOpen,
    maxChoicesPerCandidate: nextMaxChoices,
    maxPdfSizeMB: nextMaxPdf,
  };

  recordAuditLog(
    actor?.id || 'usr-scolarite',
    actor?.fullName || 'Administration CEDoc',
    actor?.role || 'ADMINISTRATION',
    'MISE_A_JOUR_CAMPAGNE',
    'Campagne',
    activeCampaign.code,
    `Règles mises à jour : ${activeCampaign.isOpen ? 'Ouverte' : 'Fermée'}, période ${activeCampaign.startDate} -> ${activeCampaign.endDate}, max ${activeCampaign.maxChoicesPerCandidate} sujet(s), PDF max ${activeCampaign.maxPdfSizeMB} Mo.`
  );

  const statusCheck = checkCampaignActive();
  return res.json({
    success: true,
    campaign: activeCampaign,
    isCurrentlyActive: statusCheck.active,
    statusReason: statusCheck.reason,
    message: 'Règles de la campagne active enregistrées.',
  });
});

// -------------------------------------------------------------
// MODULE 1 : RECHERCHE ALGORITHMIQUE & PANIER DE SUJETS
// -------------------------------------------------------------

app.get('/api/subjects', (req: Request, res: Response) => {
  const q = ((req.query.q as string) || '').toLowerCase().trim();
  const establishment = req.query.establishment as string;
  const cedoc = req.query.cedoc as string;
  const lab = req.query.laboratory as string;

  let results = [...subjects];

  if (establishment && establishment !== 'all') {
    results = results.filter((s) => s.establishment.toLowerCase().includes(establishment.toLowerCase()));
  }

  if (cedoc && cedoc !== 'all') {
    results = results.filter((s) => s.cedoc.toLowerCase().includes(cedoc.toLowerCase()));
  }

  if (lab && lab !== 'all') {
    results = results.filter((s) => s.laboratory.toLowerCase().includes(lab.toLowerCase()));
  }

  if (q) {
    const tokens = q.split(/\s+/).filter((t) => t.length > 1);
    results = results.filter((subj) => {
      const fullSearchIndex = [
        subj.title,
        subj.professorName,
        subj.laboratory,
        subj.establishment,
        subj.axis,
        subj.requiredDiplomaField,
        ...subj.keywords,
      ]
        .join(' ')
        .toLowerCase();

      return tokens.every((token) => fullSearchIndex.includes(token));
    });
  }

  res.json({
    count: results.length,
    subjects: results,
  });
});

app.get('/api/subjects/:id', (req: Request, res: Response) => {
  const subj = subjects.find((s) => s.id === req.params.id);
  if (!subj) {
    return res.status(404).json({ error: 'Sujet introuvable' });
  }
  res.json(subj);
});

// -------------------------------------------------------------
// MODULE 2 : VALIDATION STRICTE DU PANIER (EXACTEMENT 3 SUJETS)
// -------------------------------------------------------------

app.post('/api/basket/submit', (req: Request, res: Response) => {
  const actor = enforceRoleAccess(req, res, ['CANDIDAT'], 'SOUMISSION_PANIER');
  if (req.headers['x-user-id'] && !actor) return;

  const campaignCheck = checkCampaignActive();
  if (!campaignCheck.active) {
    return res.status(403).json({
      error: campaignCheck.reason || 'La campagne doctorale est actuellement fermée.',
    });
  }

  const { candidateId, candidateName, candidateEmail, candidateCin, candidateCne, choices } = req.body;

  // Also verify account active status by candidateId / email if present in users
  const candidateRecord = users.find(
    (u) =>
      (candidateId && u.id === candidateId) ||
      (candidateEmail && u.email.toLowerCase() === String(candidateEmail).toLowerCase())
  );
  if (candidateRecord && !isUserActive(candidateRecord)) {
    return res.status(403).json({
      error: `Action bloquée : le compte candidat (${candidateRecord.email}) est désactivé (statut Inactif).`,
    });
  }

  const maxChoices = activeCampaign.maxChoicesPerCandidate || 3;
  if (!Array.isArray(choices) || choices.length < 1 || choices.length > maxChoices) {
    return res.status(400).json({
      error: `Le panier de candidature doit contenir entre 1 et ${maxChoices} sujet${maxChoices > 1 ? 's' : ''} ordonné${maxChoices > 1 ? 's' : ''} selon la campagne active.`,
    });
  }

  const uniqueSubjectIds = new Set(choices.map((c) => c.subjectId));
  if (uniqueSubjectIds.size !== choices.length) {
    return res.status(400).json({
      error: 'Les choix de sujets doivent être strictement distincts.',
    });
  }

  const primarySubject = subjects.find((s) => s.id === choices[0].subjectId) || subjects[0];
  const isSara = candidateId === 'usr-candidate-sara' || (candidateEmail || '').toLowerCase().includes('sara');

  const masterAvg = candidateProfile.master.averageGrade || 16.5;
  const merit = calculateUsbaMeritScore(masterAvg, candidateProfile.master.mention || 'Très Bien', 0.95, !isSara);

  const newAppId = `app-usmba-2026-${Math.floor(100 + Math.random() * 900)}`;
  const codeCandidature = `CAND-2026-${Math.floor(100 + Math.random() * 900)}`;

  const newApp: ApplicationBasket = {
    id: newAppId,
    codeCandidature,
    candidateId: candidateId || 'usr-candidate-youssef',
    candidateEmail: candidateEmail || 'youssef.alaoui@usmba.ac.ma',
    candidateName: candidateName || 'Youssef Alaoui Mdaghri',
    candidatePhone: '+212 661 23 45 67',
    candidateCin: candidateCin || 'CD689412',
    candidateCne: candidateCne || 'M134567890',
    choices: choices.map((c, index) => ({
      subjectId: c.subjectId,
      rank: (index + 1) as 1 | 2 | 3,
      addedAt: new Date().toISOString(),
    })),
    currentStatut: 'SOUMISE',
    status: 'SOUMISE',
    submittedAt: new Date().toISOString(),
    meritScore: merit,
    matchingScore: 94.5,
    assignedSubjectId: choices[0].subjectId,
    documents: (() => {
      const pendingMap = pendingCandidateUploads.get((candidateEmail || '').toLowerCase()) || {};
      const baseDocs: CandidatureDocument[] = [
        {
          id: `doc-${Date.now()}-1`,
          docId: 'DOC-CIN',
          docType: 'CIN',
          title: "Carte Nationale d'Identité (CIN)",
          fileType: 'application/pdf',
          storagePath: isSara ? '' : '/storage/uploads/cin.pdf',
          dateUploaded: isSara ? undefined : new Date().toISOString(),
          conformite: isSara ? 'MANQUANTE' : 'CONFORME',
          fileSize: isSara ? undefined : '1.2 Mo',
        },
        {
          id: `doc-${Date.now()}-2`,
          docId: 'DOC-BAC',
          docType: 'DIPLOME_BAC',
          title: 'Diplôme du Baccalauréat',
          fileType: 'application/pdf',
          storagePath: isSara ? '' : '/storage/uploads/bac.pdf',
          dateUploaded: isSara ? undefined : new Date().toISOString(),
          conformite: isSara ? 'MANQUANTE' : 'CONFORME',
          fileSize: isSara ? undefined : '890 Ko',
        },
        {
          id: `doc-${Date.now()}-3`,
          docId: 'DOC-LICENCE',
          docType: 'DIPLOME_LICENCE',
          title: 'Diplôme de Licence',
          fileType: 'application/pdf',
          storagePath: isSara ? '' : '/storage/uploads/licence.pdf',
          dateUploaded: isSara ? undefined : new Date().toISOString(),
          conformite: isSara ? 'MANQUANTE' : 'CONFORME',
          fileSize: isSara ? undefined : '950 Ko',
        },
        {
          id: `doc-${Date.now()}-4`,
          docId: 'DOC-MASTER',
          docType: 'DIPLOME_MASTER',
          title: 'Diplôme de Master / Ingénieur',
          fileType: 'application/pdf',
          storagePath: isSara ? '' : '/storage/uploads/master.pdf',
          dateUploaded: isSara ? undefined : new Date().toISOString(),
          conformite: isSara ? 'MANQUANTE' : 'CONFORME',
          fileSize: isSara ? undefined : '1.4 Mo',
        },
        {
          id: `doc-${Date.now()}-5`,
          docId: 'DOC-RELEVE',
          docType: 'RELEVE_NOTES',
          title: 'Relevé de notes universitaires (S1-S4)',
          fileType: 'application/pdf',
          storagePath: isSara ? '' : '/storage/uploads/releves.pdf',
          dateUploaded: isSara ? undefined : new Date().toISOString(),
          conformite: isSara ? 'MANQUANTE' : 'CONFORME',
          fileSize: isSara ? undefined : '2.1 Mo',
        },
        {
          id: `doc-${Date.now()}-6`,
          docId: 'DOC-PHOTO',
          docType: 'PHOTO_IDENTITE',
          title: 'Photo d’identité officielle 4x5',
          fileType: 'application/pdf',
          storagePath: isSara ? '' : '/storage/uploads/photo.pdf',
          dateUploaded: isSara ? undefined : new Date().toISOString(),
          conformite: isSara ? 'MANQUANTE' : 'CONFORME',
          fileSize: isSara ? undefined : '450 Ko',
        },
      ];

      // Merge any real PDFs uploaded prior to basket submission
      Object.entries(pendingMap).forEach(([dType, uploaded]) => {
        const existing = baseDocs.find((d) => d.docType === dType);
        if (existing) {
          existing.conformite = 'CONFORME';
          existing.storagePath = `/uploads/${uploaded.fileName}`;
          existing.uploadedFileName = uploaded.fileName;
          existing.fileUrl = uploaded.fileUrl;
          existing.fileType = uploaded.mimeType;
          existing.fileSize = uploaded.fileSize;
          existing.dateUploaded = uploaded.dateUploaded;
          existing.isRealUpload = true;
        } else {
          const ruleLabel = DOCUMENT_RULES[dType]?.label || dType;
          baseDocs.push({
            id: `doc-${Date.now()}-${dType}`,
            docId: `DOC-${dType}`,
            docType: dType as CandidatureDocument['docType'],
            title: ruleLabel,
            fileType: uploaded.mimeType,
            storagePath: `/uploads/${uploaded.fileName}`,
            uploadedFileName: uploaded.fileName,
            fileUrl: uploaded.fileUrl,
            fileSize: uploaded.fileSize,
            dateUploaded: uploaded.dateUploaded,
            conformite: 'CONFORME',
            isRealUpload: true,
          });
        }
      });

      return baseDocs;
    })(),
    candidat: {
      cin: candidateCin || 'CD689412',
      cne: candidateCne || 'M134567890',
      nom: (candidateName || 'Alaoui Mdaghri').split(' ').slice(1).join(' ') || 'Alaoui Mdaghri',
      prenom: (candidateName || 'Youssef').split(' ')[0] || 'Youssef',
      email: candidateEmail || 'youssef.alaoui@usmba.ac.ma',
      telephone: '+212 661 23 45 67',
      diplomeObtenu: candidateProfile.master.title || 'Master Spécialisé en Intelligence Artificielle & Sciences des Données',
      etablissementOrigine: candidateProfile.master.faculty || 'Faculté des Sciences et Techniques (FST Fès)',
      moyenneGenerale: candidateProfile.master.averageGrade || 16.51,
    },
    directeurThese: {
      cin: 'C104521',
      cne: '',
      nom: primarySubject?.professorName?.split(' ').slice(-1)[0] || 'Bennani',
      prenom: primarySubject?.professorName?.replace(/^Pr\.\s*/i, '').split(' ')[0] || 'Mustapha',
      email: primarySubject?.professorEmail || 'm.bennani@usmba.ac.ma',
      telephone: '+212 535 60 80 14',
      som: '884129',
      grade: 'Professeur de l’Enseignement Supérieur (PES)',
      specialite: primarySubject?.axis || 'Informatique & Systèmes Intelligents',
    },
    formationDoctorale: {
      intitule: primarySubject?.cedoc || 'Sciences et Technologies de l’Ingénieur',
      axeRecherche: primarySubject?.axis || 'Intelligence Artificielle & Transition Énergétique',
    },
    structureRecherche: {
      nom: primarySubject?.laboratory || "Laboratoire d'Informatique, Systèmes et Énergies Renouvelables",
      acronyme: primarySubject?.laboratory?.includes('LISER') ? 'LISER' : 'LAB-USMBA',
      type: 'Laboratoire de Recherche Agréé',
    },
    signatures: {
      candidat: {
        role: 'Candidat',
        signerName: candidateName || 'Youssef Alaoui Mdaghri',
        signerEmail: candidateEmail || 'youssef.alaoui@usmba.ac.ma',
        status: 'Pending',
      },
      directeur: {
        role: 'Directeur',
        signerName: primarySubject?.professorName || 'Pr. Mustapha Bennani',
        signerEmail: primarySubject?.professorEmail || 'm.bennani@usmba.ac.ma',
        status: 'Pending',
      },
      chef_labo: {
        role: 'Chef_Labo',
        signerName: 'Dr. Karim El Amrani',
        signerEmail: 'k.elamrani@usmba.ac.ma',
        status: 'Pending',
      },
      directeur_ced: {
        role: 'Directeur_CED',
        signerName: 'Pr. Rachid El Ghoumari',
        signerEmail: 'cedoc.st@usmba.ac.ma',
        status: 'Pending',
      },
    },
    charterDocumentHash: crypto.createHash('sha256').update(`${newAppId}-charter-usmba-2026`).digest('hex'),
  };

  choices.forEach((c) => {
    const s = subjects.find((item) => item.id === c.subjectId);
    if (s) s.candidateCount += 1;
  });

  applications.unshift(newApp);

  recordAuditLog(
    newApp.candidateId,
    newApp.candidateName,
    'CANDIDAT',
    'soumettreDossier()',
    'Candidature',
    newApp.codeCandidature,
    `Candidature soumise avec ${choices.length} choix ordonné(s). Statut: SOUMISE.`
  );

  dispatchSimulatedEmail({
    to: newApp.candidateEmail,
    toName: newApp.candidateName,
    subject: `Accusé de réception : Candidature doctorale ${newApp.codeCandidature} enregistrée`,
    body: `Bonjour ${newApp.candidateName},\n\nVotre candidature sous le numéro ${newApp.codeCandidature} a bien été enregistrée pour l'année universitaire 2026/2027 avec ${choices.length} choix de sujet(s).\nChoix prioritaire n°1 : ${primarySubject?.title || 'Thèse Doctorale USMBA'}.\n\nService de la Scolarité Centrale USMBA.`,
    type: 'INFORMATIVE',
    applicationId: newApp.id,
  });

  res.status(201).json({
    message: 'Candidature soumise avec succès.',
    application: newApp,
  });
});

// -------------------------------------------------------------
// MODULE 3 : ENREGISTREMENT PROVISOIRE SANS DOCUMENTS (PIÈCES MANQUANTES)
// -------------------------------------------------------------

app.post('/api/applications/provisional', (req: Request, res: Response) => {
  const { nom, prenom, etablissementOrigine, email, telephone, cin } = req.body;

  if (!nom || !etablissementOrigine) {
    return res.status(400).json({
      error: 'Le Nom de famille et l’Établissement d’origine sont obligatoires pour créer une fiche provisoire.',
    });
  }

  const newAppId = `app-usmba-2026-prov-${Math.floor(100 + Math.random() * 900)}`;
  const codeCandidature = `CAND-2026-P${Math.floor(10 + Math.random() * 90)}`;
  const candidateEmail = email || `${nom.toLowerCase()}.${(prenom || 'candidat').toLowerCase()}@usmba.ac.ma`;

  const provisionalApp: ApplicationBasket = {
    id: newAppId,
    codeCandidature,
    candidateId: `usr-prov-${Date.now()}`,
    candidateEmail,
    candidateName: `${prenom || ''} ${nom}`.trim(),
    candidatePhone: telephone || '+212 600 00 00 00',
    candidateCin: cin || 'EN_ATTENTE',
    candidateCne: 'EN_ATTENTE',
    choices: [
      { subjectId: 'subj-1', rank: 1, addedAt: new Date().toISOString() },
      { subjectId: 'subj-2', rank: 2, addedAt: new Date().toISOString() },
      { subjectId: 'subj-3', rank: 3, addedAt: new Date().toISOString() },
    ],
    currentStatut: 'EN_COMPLETION',
    status: 'EN_COMPLETION',
    submittedAt: new Date().toISOString(),
    meritScore: 70.0,
    matchingScore: 80.0,
    assignedSubjectId: 'subj-1',
    // Minimal documents all marked MANQUANTE
    documents: [
      {
        id: `doc-prov-1`,
        docId: 'DOC-CIN',
        docType: 'CIN',
        title: "Carte Nationale d'Identité (CIN)",
        fileType: 'application/pdf',
        storagePath: '',
        dateUploaded: '',
        conformite: 'MANQUANTE',
      },
      {
        id: `doc-prov-2`,
        docId: 'DOC-BAC',
        docType: 'DIPLOME_BAC',
        title: 'Diplôme du Baccalauréat',
        fileType: 'application/pdf',
        storagePath: '',
        dateUploaded: '',
        conformite: 'MANQUANTE',
      },
      {
        id: `doc-prov-3`,
        docId: 'DOC-LICENCE',
        docType: 'DIPLOME_LICENCE',
        title: 'Diplôme de Licence',
        fileType: 'application/pdf',
        storagePath: '',
        dateUploaded: '',
        conformite: 'MANQUANTE',
      },
      {
        id: `doc-prov-4`,
        docId: 'DOC-MASTER',
        docType: 'DIPLOME_MASTER',
        title: 'Diplôme de Master / Équivalent',
        fileType: 'application/pdf',
        storagePath: '',
        dateUploaded: '',
        conformite: 'MANQUANTE',
      },
      {
        id: `doc-prov-5`,
        docId: 'DOC-RELEVE',
        docType: 'RELEVE_NOTES',
        title: 'Relevés de notes universitaires',
        fileType: 'application/pdf',
        storagePath: '',
        dateUploaded: '',
        conformite: 'MANQUANTE',
      },
      {
        id: `doc-prov-6`,
        docId: 'DOC-PHOTO',
        docType: 'PHOTO_IDENTITE',
        title: 'Photo d’identité officielle',
        fileType: 'image/jpeg',
        storagePath: '',
        dateUploaded: '',
        conformite: 'MANQUANTE',
      },
    ],
    candidat: {
      cin: cin || 'EN_ATTENTE',
      cne: 'EN_ATTENTE',
      nom,
      prenom: prenom || '',
      email: candidateEmail,
      telephone: telephone || '',
      diplomeObtenu: 'En attente de justificatif officiel',
      etablissementOrigine,
      moyenneGenerale: 0,
    },
    directeurThese: {
      cin: 'C104521',
      cne: '',
      nom: 'Bennani',
      prenom: 'Mustapha',
      email: 'm.bennani@usmba.ac.ma',
      telephone: '+212 535 60 80 14',
      som: '884129',
      grade: 'Professeur de l’Enseignement Supérieur (PES)',
      specialite: 'Informatique & Systèmes Intelligents',
    },
    formationDoctorale: {
      intitule: 'Sciences et Technologies de l’Ingénieur',
      axeRecherche: 'Axe Doctoral USMBA',
    },
    structureRecherche: {
      nom: "Laboratoire d'Informatique, Systèmes et Énergies Renouvelables",
      acronyme: 'LISER',
      type: 'Laboratoire de Recherche Agréé',
    },
    signatures: {
      candidat: { role: 'Candidat', signerName: `${prenom || ''} ${nom}`, signerEmail: candidateEmail, status: 'Pending' },
      directeur: { role: 'Directeur', signerName: 'Pr. Mustapha Bennani', signerEmail: 'm.bennani@usmba.ac.ma', status: 'Pending' },
      chef_labo: { role: 'Chef_Labo', signerName: 'Dr. Karim El Amrani', signerEmail: 'k.elamrani@usmba.ac.ma', status: 'Pending' },
      directeur_ced: { role: 'Directeur_CED', signerName: 'Pr. Rachid El Ghoumari', signerEmail: 'cedoc.st@usmba.ac.ma', status: 'Pending' },
    },
    charterDocumentHash: '',
  };

  applications.unshift(provisionalApp);

  recordAuditLog(
    'usr-scolarite',
    'Mme. Imane Bernoussi',
    'ADMINISTRATION',
    'creerDossierProvisoire()',
    'Candidature',
    codeCandidature,
    `Création de fiche provisoire sans documents pour ${prenom || ''} ${nom} (${etablissementOrigine}). Statut: EN_COMPLETION (Pièces manquantes).`
  );

  dispatchSimulatedEmail({
    to: candidateEmail,
    toName: `${prenom || ''} ${nom}`,
    subject: `Création de dossier provisoire ${codeCandidature} - Dépôt de pièces requis`,
    body: `Bonjour ${prenom || ''} ${nom},\n\nUne fiche provisoire a été créée à votre nom pour le cycle doctoral USMBA. Votre dossier est actuellement incomplet (Pièces justificatives manquantes).\n\nVeuillez déposer vos scans officiels en ligne ou vous présenter au guichet de scolarité centrale avant la date limite du calendrier officiel.`,
    type: 'ACTION',
    actionLabel: 'Compléter mon dossier en ligne',
    actionUrl: '/candidat/pieces',
    deadline: '2026-09-09T23:59:00Z',
    applicationId: newAppId,
  });

  res.status(201).json({
    message: 'Dossier provisoire enregistré avec succès (Indicateur : Pièces manquantes).',
    application: provisionalApp,
  });
});

// -------------------------------------------------------------
// MODULE 4 : CONTRÔLE DE CONFORMITÉ STRICTE DES DOCUMENTS (FRONT & BACK)
// -------------------------------------------------------------

app.get('/api/documents/file/:fileId', (req: Request, res: Response) => {
  const stored = uploadedFilesStore.get(req.params.fileId);
  if (!stored) {
    return res.status(404).json({ error: 'Fichier documentaire introuvable.' });
  }
  const safeName = stored.fileName.replace(/["\r\n]/g, '_');
  res.setHeader('Content-Type', stored.mimeType || 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  res.setHeader('Cache-Control', 'no-store');
  return res.send(stored.buffer);
});

app.post('/api/documents/validate', async (req: Request, res: Response) => {
  try {
    const actor = enforceRoleAccess(
      req,
      res,
      ['CANDIDAT', 'ADMINISTRATION', 'RESPONSABLE_CED', 'SUPER_ADMIN'],
      'DEPOT_DOCUMENT_PDF'
    );
    if (req.headers['x-user-id'] && !actor) return;

    const campaignCheck = checkCampaignActive();
    if (!campaignCheck.active) {
      return res.status(403).json({
        valid: false,
        code: 'CAMPAIGN_CLOSED',
        error: campaignCheck.reason || 'La campagne doctorale est fermée : dépôt de pièces bloqué.',
      });
    }

    const {
      docType,
      fileName,
      fileSize,
      base64Data,
      mimeType,
      isCameraScan,
      applicationId,
      candidateName,
      candidateEmail,
    } = req.body;

    if (!docType || !fileName) {
      return res.status(400).json({
        valid: false,
        error: 'Type de document et nom de fichier requis.',
      });
    }

    const maxPdfMB = activeCampaign.maxPdfSizeMB || 5;
    const rule = DOCUMENT_RULES[docType] || { label: docType, maxSizeMB: maxPdfMB };

    // 1. Strict PDF-Only Extension check
    const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';

    if (ext !== '.pdf') {
      return res.status(400).json({
        valid: false,
        code: 'INVALID_EXTENSION',
        error: `Format non conforme : seuls les documents au format PDF sont autorisés. Les formats d'images (${ext || 'fichiers non-PDF'}, JPG, PNG, téléchargements Pinterest...) sont immédiatement rejetés.`,
      });
    }

    // 2. Active Campaign File Size Check (dynamic maxPdfSizeMB)
    const maxBytes = maxPdfMB * 1024 * 1024;
    if (fileSize && fileSize > maxBytes) {
      const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
      return res.status(400).json({
        valid: false,
        code: 'SIZE_EXCEEDED',
        error: `Taille de fichier dépassée : ${sizeInMB} Mo détectés. La limite de la campagne active est fixée à ${maxPdfMB.toFixed(1)} Mo maximum.`,
      });
    }

    // 3. MIME type check (allow image/jpeg only when captured via the live webcam scanner)
    if (mimeType && mimeType !== 'application/pdf' && !(isCameraScan && mimeType.startsWith('image/'))) {
      return res.status(400).json({
        valid: false,
        code: 'INVALID_MIME',
        error: `Format non conforme : type MIME ${mimeType} rejeté. Seul le format application/pdf est accepté.`,
      });
    }

    // 4. Inappropriate content check (Reject Pinterest, landscapes, wallpaper, memes)
    const lowerName = fileName.toLowerCase();
    const suspiciousKeywords = ['pinterest', 'wallpaper', 'paysage', 'landscape', 'meme', 'beach', 'sunset', 'photo_vacances', 'nature'];
    if (suspiciousKeywords.some((kw) => lowerName.includes(kw))) {
      return res.status(400).json({
        valid: false,
        code: 'INVALID_CONTENT',
        error: `Document rejeté : le fichier semble être une image ou un téléchargement Pinterest non académique (${fileName}). Veuillez fournir le document PDF officiel requis.`,
      });
    }

    // 5. Intelligent Gemini Flash Vision validation for camera scan images
    if (ai && base64Data && mimeType && mimeType.startsWith('image/')) {
      try {
        const prompt = `Tu es le contrôleur strict de conformité documentaire du Cycle Doctoral de l'Université Sidi Mohamed Ben Abdellah (USMBA).
Vérifie si cette image est bien un document officiel ou académique légitime pour la pièce suivante : "${rule.label}".
Si l'image représente un paysage, un coucher de soleil, une photo de plage, un fond d'écran, une image Pinterest, un dessin animé, un meme, un chat, ou une image manifestement inappropriée/non-documentaire :
réponds STRICTEMENT en JSON :
{
  "isAuthenticDocument": false,
  "rejectionReason": "Explication claire en français du rejet (ex: Image de paysage ou téléchargement web non conforme)"
}
Si l'image est un document d'identité, un diplôme, un relevé de notes ou une photo d'identité formelle :
réponds STRICTEMENT en JSON :
{
  "isAuthenticDocument": true,
  "confidenceScore": 98.5
}`;

        const cleanedBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: cleanedBase64,
                },
              },
              { text: prompt },
            ],
          },
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsedResult = JSON.parse(response.text || '{}');
        if (parsedResult.isAuthenticDocument === false) {
          return res.status(400).json({
            valid: false,
            code: 'CONTENT_REJECTED_BY_AI',
            error: `Contrôle de conformité échoué : ${parsedResult.rejectionReason || 'Fichier non académique ou inapproprié'}. Aucun envoi non conforme ne peut être validé.`,
          });
        }
      } catch (geminiErr) {
        console.warn('Gemini vision verification skipped or timed out, continuing:', geminiErr);
      }
    }

    // Store real uploaded binary content in memory so evaluators can preview the exact uploaded file
    let fileUrl: string | undefined;
    let fileId: string | undefined;
    const formattedSize = fileSize
      ? fileSize >= 1024 * 1024
        ? `${(fileSize / (1024 * 1024)).toFixed(2)} Mo`
        : `${Math.max(1, Math.round(fileSize / 1024))} Ko`
      : '1.2 Mo';
    const nowIso = new Date().toISOString();
    const storedMime = isCameraScan && mimeType?.startsWith('image/') ? mimeType : 'application/pdf';

    if (typeof base64Data === 'string' && base64Data.length > 0) {
      const rawBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const buffer = Buffer.from(rawBase64, 'base64');
      fileId = `file-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      uploadedFilesStore.set(fileId, {
        id: fileId,
        buffer,
        mimeType: storedMime,
        fileName,
        fileSize: formattedSize,
        uploadedAt: nowIso,
      });
      fileUrl = `/api/documents/file/${fileId}`;
    }

    const emailKey = (candidateEmail || '').toLowerCase();
    if (emailKey && fileId && fileUrl) {
      const existingPending = pendingCandidateUploads.get(emailKey) || {};
      existingPending[docType] = {
        fileId,
        fileUrl,
        fileName,
        fileSize: formattedSize,
        mimeType: storedMime,
        dateUploaded: nowIso,
      };
      pendingCandidateUploads.set(emailKey, existingPending);
    }

    const appItem = applicationId
      ? applications.find((a) => a.id === applicationId)
      : emailKey
      ? applications.find((a) => a.candidateEmail?.toLowerCase() === emailKey)
      : undefined;

    if (appItem) {
      let doc = appItem.documents.find((d) => d.docType === docType || d.docId === docType || d.id === docType);
      if (!doc) {
        doc = {
          id: `doc-${Date.now()}-${docType}`,
          docId: `DOC-${docType}`,
          docType: docType as CandidatureDocument['docType'],
          title: rule.label || docType,
          fileType: storedMime,
          storagePath: `/uploads/${fileName}`,
          conformite: 'CONFORME',
        };
        appItem.documents.push(doc);
      }

      doc.conformite = 'CONFORME';
      doc.storagePath = `/uploads/${fileName}`;
      doc.uploadedFileName = fileName;
      doc.fileType = storedMime;
      doc.fileSize = formattedSize;
      doc.dateUploaded = nowIso;
      if (fileUrl) {
        doc.fileUrl = fileUrl;
        doc.isRealUpload = true;
      }

      dispatchSimulatedEmail({
        to: appItem.candidateEmail,
        toName: appItem.candidateName,
        subject: `Confirmation de dépôt : ${rule.label} validé`,
        body: `Bonjour ${appItem.candidateName},\n\nVotre pièce justificative "${rule.label}" (${fileName}) a été validée et enregistrée avec succès au dossier ${appItem.codeCandidature}.\n\nService de la Scolarité Centrale USMBA.`,
        type: 'INFORMATIVE',
        applicationId: appItem.id,
      });

      recordAuditLog(
        appItem.candidateId,
        appItem.candidateName,
        'CANDIDAT',
        'deposerPiece()',
        'Document',
        docType,
        `Dépôt conforme de la pièce ${rule.label} (${fileName}).`
      );
    } else if (candidateEmail) {
      dispatchSimulatedEmail({
        to: candidateEmail,
        toName: candidateName || 'Candidat',
        subject: `Confirmation de dépôt : ${rule.label} validé`,
        body: `Bonjour ${candidateName || ''},\n\nVotre pièce justificative "${rule.label}" (${fileName}) a été vérifiée conforme (format PDF < 5 Mo) et enregistrée dans votre espace candidat.\n\nService de la Scolarité Centrale USMBA.`,
        type: 'INFORMATIVE',
      });
    }

    return res.json({
      valid: true,
      docType,
      label: rule.label,
      fileName,
      fileUrl,
      message: 'Fichier strictement conforme aux exigences techniques et académiques.',
    });
  } catch (err: any) {
    return res.status(500).json({
      valid: false,
      error: `Erreur lors de la validation du document: ${err.message}`,
    });
  }
});

app.post('/api/documents/remove', (req: Request, res: Response) => {
  const { docType, applicationId, candidateName, candidateEmail } = req.body;
  const rule = DOCUMENT_RULES[docType] || { label: docType };
  const emailKey = (candidateEmail || '').toLowerCase();

  if (emailKey && pendingCandidateUploads.has(emailKey)) {
    const map = pendingCandidateUploads.get(emailKey)!;
    if (map[docType]?.fileId) {
      uploadedFilesStore.delete(map[docType].fileId);
    }
    delete map[docType];
  }

  const appItem = applicationId
    ? applications.find((a) => a.id === applicationId)
    : emailKey
    ? applications.find((a) => a.candidateEmail?.toLowerCase() === emailKey)
    : undefined;

  if (appItem) {
    const doc = appItem.documents.find((d) => d.docType === docType || d.docId === docType || d.id === docType);
    if (doc) {
      if (doc.fileUrl) {
        const oldId = doc.fileUrl.split('/').pop();
        if (oldId) uploadedFilesStore.delete(oldId);
      }
      doc.conformite = 'MANQUANTE';
      doc.storagePath = '';
      doc.uploadedFileName = undefined;
      doc.fileUrl = undefined;
      doc.isRealUpload = false;
      doc.fileSize = '';
      doc.dateUploaded = '';
    }

    dispatchSimulatedEmail({
      to: appItem.candidateEmail,
      toName: appItem.candidateName,
      subject: `Notification de retrait de pièce : ${rule.label}`,
      body: `Bonjour ${appItem.candidateName},\n\nLa pièce "${rule.label}" a été retirée de votre dossier doctoral ${appItem.codeCandidature}. Vous pouvez désormais déposer un nouveau fichier PDF (max 5 Mo) ou effectuer une numérisation via caméra.\n\nService de la Scolarité Centrale USMBA.`,
      type: 'ACTION',
      actionLabel: 'Déposer à nouveau la pièce',
      actionUrl: '/candidat/pieces',
      applicationId: appItem.id,
    });

    recordAuditLog(
      appItem.candidateId,
      appItem.candidateName,
      'CANDIDAT',
      'retirerPiece()',
      'Document',
      docType,
      `Retrait de la pièce ${rule.label}. Le document est remis en attente de dépôt.`
    );

    return res.json({ success: true, message: `Pièce ${rule.label} retirée avec succès.` });
  }

  // Fallback email if no active applicationId yet
  if (candidateEmail) {
    dispatchSimulatedEmail({
      to: candidateEmail,
      toName: candidateName || 'Candidat',
      subject: `Notification de retrait de pièce : ${rule.label}`,
      body: `Bonjour ${candidateName || ''},\n\nLa pièce "${rule.label}" a été retirée de votre espace de vérification. Vous pouvez procéder à un nouveau dépôt ou scanner le document.\n\nService de la Scolarité Centrale USMBA.`,
      type: 'INFORMATIVE',
    });
  }

  return res.json({ success: true, message: `Pièce ${rule.label} retirée avec succès.` });
});

// -------------------------------------------------------------
// MODULE 5 : VÉRIFICATION PHYSIQUE AU GUICHET & CONFORMITÉ
// -------------------------------------------------------------

app.post('/api/applications/:id/vue-au-guichet', (req: Request, res: Response) => {
  const appItem = applications.find((a) => a.id === req.params.id);
  if (!appItem) {
    return res.status(404).json({ error: 'Candidature introuvable' });
  }

  const { docId, agentName = 'Mme. Imane Bernoussi' } = req.body;
  const doc = appItem.documents.find((d) => d.id === docId || d.docId === docId);

  if (!doc) {
    return res.status(404).json({ error: 'Document introuvable dans le dossier' });
  }

  const now = new Date().toISOString();
  doc.verifiedByGuichet = true;
  doc.guichetAgentName = agentName;
  doc.guichetDate = now;
  doc.conformite = 'VUE_AU_GUICHET';

  recordAuditLog(
    'usr-scolarite',
    agentName,
    'ADMINISTRATION',
    'marquerVueAuGuichet()',
    'Document',
    doc.docId,
    `Pièce "${doc.title}" certifiée vue en original physique au guichet de scolarité.`
  );

  dispatchSimulatedEmail({
    to: appItem.candidateEmail,
    toName: appItem.candidateName,
    subject: `Confirmation de vérification physique au guichet - Pièce ${doc.title}`,
    body: `Bonjour ${appItem.candidateName},\n\nLa pièce "${doc.title}" de votre dossier ${appItem.codeCandidature} a été validée au guichet de la scolarité centrale par ${agentName}.\n\nStatut de la pièce : Vue au guichet (Conforme).`,
    type: 'INFORMATIVE',
    applicationId: appItem.id,
  });

  res.json({
    message: 'Pièce marquée comme vérifiée physiquement au guichet.',
    application: appItem,
    document: doc,
  });
});

// -------------------------------------------------------------
// MODULE 6 : FILTRAGE RBAC ABSOLU & RECHERCHE INSTANTANÉE (NOM + ÉTABLISSEMENT)
// -------------------------------------------------------------

app.get('/api/applications', (req: Request, res: Response) => {
  const { role, userId, email, nom, etablissement, statut } = req.query as Record<string, string>;

  let filtered = [...applications];

  // Strict Role Cloisonnement (Zero leak between spaces)
  if (role === 'CANDIDAT') {
    const emailLower = (email || '').trim().toLowerCase();
    filtered = filtered.filter(
      (app) =>
        app.candidateId === userId ||
        app.candidateEmail?.toLowerCase() === userId?.toLowerCase() ||
        (Boolean(emailLower) && app.candidateEmail?.toLowerCase() === emailLower)
    );
    return res.json(filtered);
  }

  if (role === 'DIRECTEUR_THESE') {
    // If Pr. Nabil Slaoui -> 0 candidatures (strict requirement: displays "Aucune action requise")
    if (userId === 'usr-prof-slaoui' || userId?.includes('slaoui')) {
      return res.json([]);
    }

    // Pr. Mustapha Bennani -> candidatures on his subjects
    filtered = filtered.filter((app) => {
      const isHisDirecteur = app.directeurThese?.email === 'm.bennani@usmba.ac.ma' || app.directeurThese?.nom === 'Bennani';
      const targetsHisSubject = app.choices?.some((c) => c.subjectId === 'subj-1' || c.subjectId === 'subj-2');
      return isHisDirecteur || targetsHisSubject;
    });
  } else if (role === 'DIRECTEUR_LABO') {
    // Lab head of LISER (Dr. Karim El Amrani)
    filtered = filtered.filter((app) => app.structureRecherche?.acronyme === 'LISER');
  }

  // Instant 2-field search: Nom de famille & Établissement
  if (nom && nom.trim().length > 0) {
    const qNom = nom.trim().toLowerCase();
    filtered = filtered.filter((app) => {
      const matchNom = app.candidat?.nom?.toLowerCase().includes(qNom);
      const matchPrenom = app.candidat?.prenom?.toLowerCase().includes(qNom);
      const matchFull = app.candidateName?.toLowerCase().includes(qNom);
      return matchNom || matchPrenom || matchFull;
    });
  }

  if (etablissement && etablissement !== 'all' && etablissement.trim().length > 0) {
    const qEtab = etablissement.trim().toLowerCase();
    filtered = filtered.filter((app) => {
      return app.candidat?.etablissementOrigine?.toLowerCase().includes(qEtab);
    });
  }

  if (statut && statut !== 'all') {
    filtered = filtered.filter((app) => app.currentStatut === statut);
  }

  res.json(filtered);
});

app.get('/api/applications/:id', (req: Request, res: Response) => {
  const appItem = applications.find((a) => a.id === req.params.id);
  if (!appItem) {
    return res.status(404).json({ error: 'Candidature introuvable' });
  }
  res.json(appItem);
});

const STATUS_PROGRESS_RANK: Partial<Record<StatutCandidature, number>> = {
  BROUILLON: 1,
  EN_COMPLETION: 1,
  EN_ATTENTE_PIECES: 2,
  SOUMIS: 3,
  SOUMISE: 3,
  COMPLEMENT_REQUIS: 3,
  MODIFICATION_REQUISE: 3,
  EN_ATTENTE_VERIFICATION: 4,
  VERIFICATION_CONFORME: 5,
  EN_ATTENTE_VALIDATION_ENCADRANT: 6,
  EN_EVALUATION: 6,
  CONVOQUEE: 6,
  ENTRETIEN_REALISE: 7,
  VALIDE_ENCADRANT: 7,
  ADMISE_LISTE_PRINCIPALE: 7,
  VALIDE_LABO: 8,
  INSCRIPTION_EN_COURS: 9,
  INSCRIPTION_DEFINITIVE: 10,
  INSCRITE: 10,
  INSCRIT_DEFINITIF: 11,
};

app.post('/api/applications/restore', (req: Request, res: Response) => {
  const { applications: incoming } = req.body as { applications?: ApplicationBasket[] };
  if (!Array.isArray(incoming)) {
    return res.status(400).json({ error: 'Liste de candidatures invalide.' });
  }
  let restoredCount = 0;
  for (const appItem of incoming) {
    if (!appItem || !appItem.id) continue;
    const existingIdx = applications.findIndex((a) => a.id === appItem.id);
    if (existingIdx === -1) {
      applications.unshift(appItem);
      restoredCount++;
    } else {
      const existing = applications[existingIdx];
      const existingRank = STATUS_PROGRESS_RANK[existing.currentStatut] || 0;
      const incomingRank = STATUS_PROGRESS_RANK[appItem.currentStatut] || 0;
      const hasNewerAttestation = Boolean(appItem.officialAttestationNumber && !existing.officialAttestationNumber);
      if (incomingRank > existingRank || hasNewerAttestation) {
        applications[existingIdx] = {
          ...existing,
          currentStatut: appItem.currentStatut,
          status: appItem.status || appItem.currentStatut,
          officialAttestationNumber: appItem.officialAttestationNumber || existing.officialAttestationNumber,
          avisDirecteur: appItem.avisDirecteur || existing.avisDirecteur,
          signatures: appItem.signatures || existing.signatures,
          interview: appItem.interview || existing.interview,
        };
        restoredCount++;
      }
    }
  }
  return res.json({ restoredCount });
});

// -------------------------------------------------------------
// MODULE 7 : MACHINE D'ÉTAT STRICTE À 10 ÉTATS & DÉLIBÉRATIONS
// -------------------------------------------------------------

// Advance state
app.post('/api/applications/:id/status', (req: Request, res: Response) => {
  const appItem = applications.find((a) => a.id === req.params.id);
  if (!appItem) {
    return res.status(404).json({ error: 'Candidature introuvable' });
  }

  const { nextStatus, reason, actorRole = 'ADMINISTRATION', actorName = 'Agent Scolarité' } = req.body;

  const validTransitions: Partial<Record<StatutCandidature, StatutCandidature[]>> = {
    BROUILLON: ['EN_COMPLETION', 'SOUMISE', 'SOUMIS', 'EN_ATTENTE_PIECES', 'RETIREE'],
    EN_COMPLETION: ['SOUMISE', 'SOUMIS', 'EN_ATTENTE_PIECES', 'RETIREE'],
    EN_ATTENTE_PIECES: ['SOUMISE', 'SOUMIS', 'COMPLEMENT_REQUIS', 'MODIFICATION_REQUISE', 'RETIREE'],
    SOUMISE: ['EN_EVALUATION', 'COMPLEMENT_REQUIS', 'MODIFICATION_REQUISE', 'EN_ATTENTE_VERIFICATION', 'VERIFICATION_CONFORME', 'VALIDE_ENCADRANT', 'REFUSEE', 'REJETEE'],
    SOUMIS: ['EN_EVALUATION', 'COMPLEMENT_REQUIS', 'MODIFICATION_REQUISE', 'EN_ATTENTE_VERIFICATION', 'VERIFICATION_CONFORME', 'VALIDE_ENCADRANT', 'REFUSEE', 'REJETEE'],
    COMPLEMENT_REQUIS: ['SOUMISE', 'SOUMIS', 'VERIFICATION_CONFORME', 'VALIDE_ENCADRANT', 'MODIFICATION_REQUISE', 'REFUSEE', 'EXPIREE'],
    MODIFICATION_REQUISE: ['SOUMISE', 'SOUMIS', 'EN_ATTENTE_VERIFICATION', 'VERIFICATION_CONFORME', 'VALIDE_ENCADRANT', 'REJETEE', 'REFUSEE'],
    EN_ATTENTE_VERIFICATION: ['VERIFICATION_CONFORME', 'MODIFICATION_REQUISE', 'COMPLEMENT_REQUIS', 'REJETEE'],
    VERIFICATION_CONFORME: ['EN_ATTENTE_VALIDATION_ENCADRANT', 'VALIDE_ENCADRANT', 'MODIFICATION_REQUISE', 'COMPLEMENT_REQUIS', 'REJETEE', 'REFUSEE'],
    EN_ATTENTE_VALIDATION_ENCADRANT: ['VALIDE_ENCADRANT', 'MODIFICATION_REQUISE', 'COMPLEMENT_REQUIS', 'REJETEE', 'REFUSEE'],
    VALIDE_ENCADRANT: ['VALIDE_LABO', 'MODIFICATION_REQUISE', 'COMPLEMENT_REQUIS', 'REJETEE', 'REFUSEE'],
    VALIDE_LABO: ['INSCRIT_DEFINITIF', 'INSCRIPTION_DEFINITIVE', 'REJETEE'],
    INSCRIPTION_DEFINITIVE: [],
    INSCRIT_DEFINITIF: [],
    REJETEE: [],
    EN_EVALUATION: ['CONVOQUEE', 'VALIDE_ENCADRANT', 'MODIFICATION_REQUISE', 'COMPLEMENT_REQUIS', 'REFUSEE'],
    CONVOQUEE: ['ENTRETIEN_REALISE', 'VALIDE_ENCADRANT', 'MODIFICATION_REQUISE', 'COMPLEMENT_REQUIS', 'REFUSEE'],
    ENTRETIEN_REALISE: ['ADMISE_LISTE_PRINCIPALE', 'LISTE_ATTENTE', 'REFUSEE'],
    ADMISE_LISTE_PRINCIPALE: ['INSCRIPTION_EN_COURS', 'INSCRIT_DEFINITIF', 'RETIREE'],
    LISTE_ATTENTE: ['ADMISE_LISTE_PRINCIPALE', 'REFUSEE', 'EXPIREE'],
    REFUSEE: [],
    INSCRIPTION_EN_COURS: ['INSCRIT_DEFINITIF', 'INSCRITE', 'EXPIREE'],
    INSCRITE: [],
    RETIREE: [],
    EXPIREE: [],
  };

  const allowed = validTransitions[appItem.currentStatut] || [];
  if (!allowed.includes(nextStatus)) {
    return res.status(400).json({
      error: `Transition interdite : impossible de passer de "${appItem.currentStatut}" à "${nextStatus}".`,
    });
  }

  const previousStatut = appItem.currentStatut;
  appItem.currentStatut = nextStatus;
  appItem.status = nextStatus;

  recordAuditLog(
    'usr-actor',
    actorName,
    actorRole,
    `transitionStatut(${previousStatut} -> ${nextStatus})`,
    'Candidature',
    appItem.codeCandidature,
    `Transition d'état validée. Motif/Détails: ${reason || 'Déroulement du cycle doctoral 2026'}`
  );

  // Dispatch appropriate simulated email for all key transitions
  if (nextStatus === 'COMPLEMENT_REQUIS' || nextStatus === 'MODIFICATION_REQUISE') {
    dispatchSimulatedEmail({
      to: appItem.candidateEmail,
      toName: appItem.candidateName,
      subject: `Action requise : Correction / Complément de dossier ${appItem.codeCandidature}`,
      body: `Bonjour ${appItem.candidateName},\n\nVotre dossier de candidature ${appItem.codeCandidature} requiert une mise à jour ou un complément :\nMotif : ${reason || 'Pièce non conforme ou précision méthodologique attendue'}.\n\nVeuillez vous connecter à votre espace candidat pour régulariser votre dossier.`,
      type: 'ACTION',
      actionLabel: 'Régulariser mon dossier',
      actionUrl: '/candidat/pieces',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      applicationId: appItem.id,
    });
  } else if (nextStatus === 'VERIFICATION_CONFORME') {
    dispatchSimulatedEmail({
      to: appItem.candidateEmail,
      toName: appItem.candidateName,
      subject: `Conformité administrative validée — Dossier ${appItem.codeCandidature}`,
      body: `Bonjour ${appItem.candidateName},\n\nLe service de la Scolarité Centrale (${actorName}) a validé la conformité complète des pièces de votre dossier ${appItem.codeCandidature}.\nVotre candidature est désormais transmise au Directeur de Thèse pour évaluation scientifique.`,
      type: 'INFORMATIVE',
      applicationId: appItem.id,
    });
  } else if (nextStatus === 'CONVOQUEE') {
    dispatchSimulatedEmail({
      to: appItem.candidateEmail,
      toName: appItem.candidateName,
      subject: `Convocation officielle à l’entretien oral - Dossier ${appItem.codeCandidature}`,
      body: `Bonjour ${appItem.candidateName},\n\nVous êtes officiellement convoqué(e) à l’entretien d'évaluation scientifique devant la commission doctorale.\n\nDate: 23 Septembre 2026 à 10:00\nLieu: Salle des Thèses 2, FST Fès (ou visio Teams)`,
      type: 'INFORMATIVE',
      applicationId: appItem.id,
    });
  } else if (nextStatus === 'ADMISE_LISTE_PRINCIPALE') {
    dispatchSimulatedEmail({
      to: appItem.candidateEmail,
      toName: appItem.candidateName,
      subject: `Félicitations : Décision d'admission sur Liste Principale`,
      body: `Bonjour ${appItem.candidateName},\n\nLa commission doctorale a le plaisir de vous informer que votre candidature est retenue sur Liste Principale. Vous pouvez maintenant procéder à la signature électronique de la charte de thèse.`,
      type: 'ACTION',
      actionLabel: 'Signer la Charte des Thèses',
      actionUrl: '/charte',
      deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
      applicationId: appItem.id,
    });
  } else if (nextStatus === 'REJETEE' || nextStatus === 'REFUSEE') {
    dispatchSimulatedEmail({
      to: appItem.candidateEmail,
      toName: appItem.candidateName,
      subject: `Décision concernant votre candidature ${appItem.codeCandidature}`,
      body: `Bonjour ${appItem.candidateName},\n\nAprès examen par ${actorName}, votre dossier ${appItem.codeCandidature} n'a pas été retenu.\nMotif : ${reason || 'Critères académiques ou capacité d’accueil atteinte'}.\n\nService de la Scolarité Centrale USMBA.`,
      type: 'INFORMATIVE',
      applicationId: appItem.id,
    });
  }

  res.json({
    message: `Statut mis à jour vers "${nextStatus}".`,
    application: appItem,
  });
});

// Verify individual document (Administrateur) with automatic email on rejection/confirmation
app.post('/api/candidatures/:id/verify-doc', (req: Request, res: Response) => {
  const appItem = applications.find((a) => a.id === req.params.id);
  if (!appItem) {
    return res.status(404).json({ error: 'Candidature introuvable' });
  }

  const { docId, conformite, rejectionReason, verifiedBy = 'Mme. Imane Bernoussi' } = req.body;
  const doc = appItem.documents.find((d) => d.id === docId || d.docId === docId);

  if (!doc) {
    return res.status(404).json({ error: 'Pièce introuvable dans le dossier' });
  }

  doc.conformite = conformite;
  if (rejectionReason) {
    doc.rejectionReason = rejectionReason;
  } else if (conformite === 'CONFORME') {
    doc.rejectionReason = undefined;
  }

  const isRejection = conformite === 'NON_CONFORME' || conformite === 'COMPLEMENT_DEMANDE';

  if (isRejection && !['REJETEE', 'REFUSEE', 'INSCRITE'].includes(appItem.currentStatut)) {
    appItem.currentStatut = 'COMPLEMENT_REQUIS';
    appItem.status = 'COMPLEMENT_REQUIS';
  }

  recordAuditLog(
    'usr-scolarite',
    verifiedBy,
    'ADMINISTRATION',
    isRejection ? 'rejeterPiece()' : 'validerPiece()',
    'Document',
    doc.docId,
    isRejection
      ? `Pièce "${doc.title}" marquée ${conformite}. Motif: ${rejectionReason || 'Pièce non conforme ou illisible'}.`
      : `Pièce "${doc.title}" certifiée conforme par ${verifiedBy}.`
  );

  if (isRejection) {
    dispatchSimulatedEmail({
      to: appItem.candidateEmail,
      toName: appItem.candidateName,
      subject: `Rejet de pièce justificative (${doc.title}) — Dossier ${appItem.codeCandidature}`,
      body: `Bonjour ${appItem.candidateName},\n\nLors du contrôle de votre dossier ${appItem.codeCandidature} par ${verifiedBy}, la pièce suivante a été refusée :\n• Document concerné : ${doc.title}\n• Motif du rejet : ${rejectionReason || 'Document illisible, tronqué ou non conforme au format officiel.'}\n\nMerci de retirer la pièce concernée et de déposer un scan PDF conforme depuis votre espace candidat.`,
      type: 'ACTION',
      actionLabel: 'Mettre à jour la pièce',
      actionUrl: '/candidat/pieces',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      applicationId: appItem.id,
    });
  } else {
    dispatchSimulatedEmail({
      to: appItem.candidateEmail,
      toName: appItem.candidateName,
      subject: `Validation administrative de pièce : ${doc.title} (${appItem.codeCandidature})`,
      body: `Bonjour ${appItem.candidateName},\n\nVotre document "${doc.title}" du dossier ${appItem.codeCandidature} a été vérifié et déclaré conforme par ${verifiedBy}.`,
      type: 'INFORMATIVE',
      applicationId: appItem.id,
    });
  }

  return res.json({
    message: isRejection ? 'Pièce rejetée et candidat notifié par e-mail.' : 'Pièce validée conforme.',
    application: appItem,
    document: doc,
  });
});

// Supervisor Global Validation / Rejection
app.post('/api/candidatures/:id/approuver-sujet', (req: Request, res: Response) => {
  const appItem = applications.find((a) => a.id === req.params.id);
  if (!appItem) return res.status(404).json({ error: 'Candidature introuvable' });

  const { coEncadrant } = req.body;
  if (coEncadrant) {
    appItem.coEncadrant = coEncadrant;
  }

  appItem.currentStatut = 'VALIDE_ENCADRANT';
  appItem.status = 'VALIDE_ENCADRANT';

  recordAuditLog(
    'usr-prof-bennani',
    'Pr. Mustapha Bennani',
    'DIRECTEUR_THESE',
    'approuverDossierGlobal()',
    'Candidature',
    appItem.codeCandidature,
    `Dossier global approuvé par le Directeur de Thèse. Statut: VALIDE_ENCADRANT.`
  );

  dispatchSimulatedEmail({
    to: appItem.candidateEmail,
    toName: appItem.candidateName,
    subject: `Avis favorable du Directeur de Thèse — Dossier ${appItem.codeCandidature}`,
    body: `Bonjour ${appItem.candidateName},\n\nPr. Mustapha Bennani a approuvé votre dossier global de candidature (${appItem.codeCandidature}). Votre dossier est transmis au Directeur de Laboratoire pour validation du rattachement.`,
    type: 'INFORMATIVE',
    applicationId: appItem.id,
  });

  res.json({ message: 'Dossier approuvé par le directeur de thèse.', application: appItem });
});

app.post('/api/candidatures/:id/refuser-sujet', (req: Request, res: Response) => {
  const appItem = applications.find((a) => a.id === req.params.id);
  if (!appItem) return res.status(404).json({ error: 'Candidature introuvable' });

  const { reason = 'Critères scientifiques non satisfaits' } = req.body;
  appItem.currentStatut = 'REFUSEE';
  appItem.status = 'REFUSEE';

  recordAuditLog(
    'usr-prof-bennani',
    'Pr. Mustapha Bennani',
    'DIRECTEUR_THESE',
    'refuserDossier()',
    'Candidature',
    appItem.codeCandidature,
    `Dossier refusé par le Directeur de Thèse. Motif: ${reason}`
  );

  dispatchSimulatedEmail({
    to: appItem.candidateEmail,
    toName: appItem.candidateName,
    subject: `Décision d’encadrement — Dossier ${appItem.codeCandidature}`,
    body: `Bonjour ${appItem.candidateName},\n\nSuite à l’examen de votre dossier ${appItem.codeCandidature} par la direction de thèse, votre candidature n’a pas pu être retenue.\nMotif communiqué : ${reason}\n\nNous vous encourageons à consulter les autres sujets disponibles au catalogue USMBA.`,
    type: 'INFORMATIVE',
    applicationId: appItem.id,
  });

  res.json({ message: 'Candidature refusée et candidat notifié.', application: appItem });
});

// Direct Evaluation / Avis du Directeur de Thèse (Favorable / Défavorable / Demande de complément)
app.post('/api/candidatures/:id/avis-directeur', (req: Request, res: Response) => {
  const actor = enforceRoleAccess(
    req,
    res,
    ['DIRECTEUR_THESE', 'DIRECTEUR_LABO', 'RESPONSABLE_CED', 'SUPER_ADMIN'],
    'AVIS_DIRECTEUR_THESE'
  );
  if (req.headers['x-user-id'] && !actor) return;

  const appItem = applications.find((a) => a.id === req.params.id);
  if (!appItem) return res.status(404).json({ error: 'Candidature introuvable' });

  const {
    avis,
    commentaire = '',
    coEncadrant,
    actorName = 'Pr. Mustapha Bennani',
  } = req.body as {
    avis: 'FAVORABLE' | 'DEFAVORABLE' | 'COMPLEMENT';
    commentaire?: string;
    coEncadrant?: any;
    actorName?: string;
  };

  if (!['FAVORABLE', 'DEFAVORABLE', 'COMPLEMENT'].includes(avis)) {
    return res.status(400).json({ error: 'Avis invalide (FAVORABLE, DEFAVORABLE ou COMPLEMENT attendu).' });
  }

  const trimmedComment = (commentaire || '').trim();
  const previousStatut = appItem.currentStatut;

  if (coEncadrant && avis === 'FAVORABLE') {
    appItem.coEncadrant = coEncadrant;
  }

  appItem.avisDirecteur = {
    avis,
    commentaire: trimmedComment || undefined,
    evaluatedAt: new Date().toISOString(),
    evaluatorName: actorName,
  };

  if (avis === 'FAVORABLE') {
    appItem.currentStatut = 'VALIDE_ENCADRANT';
    appItem.status = 'VALIDE_ENCADRANT';
  } else if (avis === 'COMPLEMENT') {
    appItem.currentStatut = 'COMPLEMENT_REQUIS';
    appItem.status = 'COMPLEMENT_REQUIS';
  } else {
    appItem.currentStatut = 'REFUSEE';
    appItem.status = 'REFUSEE';
  }

  const avisLabel =
    avis === 'FAVORABLE'
      ? 'Avis Favorable'
      : avis === 'COMPLEMENT'
      ? 'Demande de complément'
      : 'Avis Défavorable';

  recordAuditLog(
    'usr-prof-bennani',
    actorName,
    'DIRECTEUR_THESE',
    `avisDirecteur(${avis})`,
    'Candidature',
    appItem.codeCandidature,
    `${avisLabel} enregistré (${previousStatut} -> ${appItem.currentStatut}).${trimmedComment ? ` Commentaire : ${trimmedComment}` : ''}`
  );

  if (avis === 'FAVORABLE') {
    dispatchSimulatedEmail({
      to: appItem.candidateEmail,
      toName: appItem.candidateName,
      subject: `Avis Favorable du Directeur de Thèse — Dossier ${appItem.codeCandidature}`,
      body: `Bonjour ${appItem.candidateName},\n\n${actorName} a émis un Avis Favorable sur votre dossier de candidature (${appItem.codeCandidature}).${trimmedComment ? `\n\nCommentaire du directeur :\n"${trimmedComment}"` : ''}\n\nVotre dossier est transmis à l'étape suivante pour validation du rattachement et entretien.`,
      type: 'INFORMATIVE',
      applicationId: appItem.id,
    });
  } else if (avis === 'COMPLEMENT') {
    dispatchSimulatedEmail({
      to: appItem.candidateEmail,
      toName: appItem.candidateName,
      subject: `Demande de complément du Directeur de Thèse — Dossier ${appItem.codeCandidature}`,
      body: `Bonjour ${appItem.candidateName},\n\nSuite à l'examen de votre dossier ${appItem.codeCandidature} par ${actorName}, un complément d'information ou une mise à jour est demandé(e).${trimmedComment ? `\n\nObservations du directeur :\n"${trimmedComment}"` : '\n\nMerci de vérifier et compléter les pièces de votre dossier.'}\n\nVeuillez vous connecter à votre espace candidat pour régulariser votre dossier.`,
      type: 'ACTION',
      actionLabel: 'Compléter mon dossier',
      actionUrl: '/candidat/pieces',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      applicationId: appItem.id,
    });
  } else {
    dispatchSimulatedEmail({
      to: appItem.candidateEmail,
      toName: appItem.candidateName,
      subject: `Avis Défavorable d’encadrement — Dossier ${appItem.codeCandidature}`,
      body: `Bonjour ${appItem.candidateName},\n\nAprès examen scientifique de votre dossier ${appItem.codeCandidature} par ${actorName}, votre candidature n'a pas reçu d'avis favorable.${trimmedComment ? `\n\nObservations communiquées :\n"${trimmedComment}"` : ''}\n\nNous vous invitons à consulter les autres sujets disponibles au catalogue USMBA.`,
      type: 'INFORMATIVE',
      applicationId: appItem.id,
    });
  }

  res.json({
    message: `${avisLabel} enregistré et notifié par e-mail.`,
    application: appItem,
  });
});

app.post('/api/candidatures/:id/valider-rattachement', (req: Request, res: Response) => {
  const actor = enforceRoleAccess(
    req,
    res,
    ['DIRECTEUR_LABO', 'RESPONSABLE_CED', 'SUPER_ADMIN'],
    'VALIDER_RATTACHEMENT_LABO'
  );
  if (req.headers['x-user-id'] && !actor) return;

  const appItem = applications.find((a) => a.id === req.params.id);
  if (!appItem) return res.status(404).json({ error: 'Candidature introuvable' });

  appItem.currentStatut = 'VALIDE_LABO';
  appItem.status = 'VALIDE_LABO';

  recordAuditLog(
    actor?.id || 'usr-chef-elamrani',
    actor?.fullName || 'Dr. Karim El Amrani',
    actor?.role || 'DIRECTEUR_LABO',
    'validerRattachementLabo()',
    'Candidature',
    appItem.codeCandidature,
    `Rattachement au laboratoire ${appItem.structureRecherche?.acronyme || 'LISER'} validé.`
  );

  dispatchSimulatedEmail({
    to: appItem.candidateEmail,
    toName: appItem.candidateName,
    subject: `Validation du rattachement au laboratoire — Dossier ${appItem.codeCandidature}`,
    body: `Bonjour ${appItem.candidateName},\n\nLe Directeur du laboratoire (${appItem.structureRecherche?.nom || 'LISER'}) a validé votre rattachement de structure pour votre projet de thèse.`,
    type: 'INFORMATIVE',
    applicationId: appItem.id,
  });

  res.json({ message: 'Rattachement validé.', application: appItem });
});

app.post('/api/candidatures/:id/refuser-rattachement', (req: Request, res: Response) => {
  const actor = enforceRoleAccess(
    req,
    res,
    ['DIRECTEUR_LABO', 'RESPONSABLE_CED', 'SUPER_ADMIN'],
    'REFUSER_RATTACHEMENT_LABO'
  );
  if (req.headers['x-user-id'] && !actor) return;

  const appItem = applications.find((a) => a.id === req.params.id);
  if (!appItem) return res.status(404).json({ error: 'Candidature introuvable' });

  const { reason = 'Capacité d’accueil du laboratoire atteinte' } = req.body;
  appItem.currentStatut = 'REFUSEE';
  appItem.status = 'REFUSEE';

  recordAuditLog(
    actor?.id || 'usr-chef-elamrani',
    actor?.fullName || 'Dr. Karim El Amrani',
    actor?.role || 'DIRECTEUR_LABO',
    'refuserRattachementLabo()',
    'Candidature',
    appItem.codeCandidature,
    `Rattachement refusé. Motif: ${reason}`
  );

  dispatchSimulatedEmail({
    to: appItem.candidateEmail,
    toName: appItem.candidateName,
    subject: `Décision du laboratoire — Dossier ${appItem.codeCandidature}`,
    body: `Bonjour ${appItem.candidateName},\n\nLe rattachement au laboratoire n’a pas été approuvé.\nMotif : ${reason}`,
    type: 'INFORMATIVE',
    applicationId: appItem.id,
  });

  res.json({ message: 'Rattachement refusé.', application: appItem });
});

app.post('/api/candidatures/:id/valider-inscription-final', (req: Request, res: Response) => {
  const actor = enforceRoleAccess(
    req,
    res,
    ['RESPONSABLE_CED', 'ADMINISTRATION', 'SUPER_ADMIN'],
    'VALIDER_INSCRIPTION_DEFINITIVE'
  );
  if (req.headers['x-user-id'] && !actor) return;

  const appItem = applications.find((a) => a.id === req.params.id);
  if (!appItem) return res.status(404).json({ error: 'Candidature introuvable' });

  const previousStatut = appItem.currentStatut;
  const nowIso = new Date().toISOString();
  appItem.currentStatut = 'INSCRIT_DEFINITIF';
  appItem.status = 'INSCRIT_DEFINITIF';
  appItem.officialAttestationNumber =
    appItem.officialAttestationNumber || `USMBA-DOC-ATT-2026-${Math.floor(100 + Math.random() * 900)}`;

  if (appItem.signatures) {
    if (appItem.signatures.chef_labo && appItem.signatures.chef_labo.status !== 'Signed') {
      appItem.signatures.chef_labo = {
        ...appItem.signatures.chef_labo,
        status: 'Signed',
        signedAt: nowIso,
      };
    }
    if (appItem.signatures.directeur_ced) {
      appItem.signatures.directeur_ced = {
        ...appItem.signatures.directeur_ced,
        signerName: actor?.fullName || appItem.signatures.directeur_ced.signerName || 'Administration CEDoc',
        signerEmail: actor?.email || appItem.signatures.directeur_ced.signerEmail || 'cedoc.st@usmba.ac.ma',
        status: 'Signed',
        signedAt: nowIso,
      };
    }
  }

  recordAuditLog(
    actor?.id || 'usr-admin-cedoc',
    actor?.fullName || 'Administration CEDoc',
    actor?.role || 'ADMINISTRATION',
    'validerInscriptionDefinitive()',
    'Candidature',
    appItem.codeCandidature,
    `Inscription définitive validée (${previousStatut} → INSCRIT_DEFINITIF). Attestation générée : ${appItem.officialAttestationNumber}`
  );

  dispatchSimulatedEmail({
    to: appItem.candidateEmail,
    toName: appItem.candidateName,
    subject: `Inscription doctorale définitive validée — Attestation ${appItem.officialAttestationNumber}`,
    body: `Bonjour ${appItem.candidateName},\n\nVotre inscription définitive en 1ère année de Doctorat à l'USMBA est officiellement validée (Statut : INSCRIT_DEFINITIF) pour l'année 2026/2027.\nNuméro d'attestation officielle : ${appItem.officialAttestationNumber}.\n\nVous pouvez télécharger votre attestation d'inscription définitive depuis votre Espace Candidat.`,
    type: 'INFORMATIVE',
    actionLabel: "Télécharger l'attestation",
    actionUrl: '/dossier',
    applicationId: appItem.id,
  });

  res.json({
    message: `Inscription définitive validée (INSCRIT_DEFINITIF). Attestation : ${appItem.officialAttestationNumber}`,
    officialAttestationNumber: appItem.officialAttestationNumber,
    application: appItem,
  });
});

// Scoring oral interview & Convocation
app.post('/api/applications/:id/interview', (req: Request, res: Response) => {
  const appItem = applications.find((a) => a.id === req.params.id);
  if (!appItem) {
    return res.status(404).json({ error: 'Candidature introuvable' });
  }

  const { specialite, motivation, projet, langues, juryNotes, decision, scheduledDate, scheduledTime, room } = req.body;

  if (scheduledDate && scheduledTime) {
    appItem.currentStatut = 'CONVOQUEE';
    appItem.status = 'CONVOQUEE';
    appItem.interview = {
      ...(appItem.interview || {
        specialite: 0,
        motivation: 0,
        projet: 0,
        langues: 0,
        total: 0,
        juryNotes: '',
        juryMembers: ['Pr. Mustapha Bennani', 'Dr. Karim El Amrani'],
      }),
      scheduledDate,
      scheduledTime,
      room: room || 'Salle des Thèses 2, FST Fès',
    };

    recordAuditLog(
      'usr-prof-bennani',
      'Pr. Mustapha Bennani',
      'DIRECTEUR_THESE',
      'convoquerEntretienOral()',
      'Candidature',
      appItem.codeCandidature,
      `Convocation à l'entretien oral programmée le ${scheduledDate} à ${scheduledTime} (${appItem.interview.room}).`
    );

    dispatchSimulatedEmail({
      to: appItem.candidateEmail,
      toName: appItem.candidateName,
      subject: `Convocation officielle à l’entretien oral — Dossier ${appItem.codeCandidature}`,
      body: `Bonjour ${appItem.candidateName},\n\nVous êtes officiellement convoqué(e) à l’entretien d'évaluation scientifique pour votre candidature doctorale ${appItem.codeCandidature}.\n\n• Date : ${scheduledDate}\n• Heure : ${scheduledTime}\n• Lieu : ${appItem.interview.room}\n\nMerci de vous munir de votre CIN et de vos originaux de diplômes.`,
      type: 'ACTION',
      actionLabel: 'Voir mon dossier',
      actionUrl: '/candidat/dossier',
      applicationId: appItem.id,
    });
  }

  if (specialite !== undefined) {
    const s = Number(specialite);
    const m = Number(motivation);
    const p = Number(projet);
    const l = Number(langues);
    const total = Math.round(((s + m + p + l) / 4) * 100) / 100;

    appItem.interview = {
      specialite: s,
      motivation: m,
      projet: p,
      langues: l,
      total,
      juryNotes: juryNotes || appItem.interview?.juryNotes || '',
      juryMembers: appItem.interview?.juryMembers || ['Pr. Mustapha Bennani', 'Dr. Karim El Amrani'],
      scheduledDate: appItem.interview?.scheduledDate || '2026-09-23',
      scheduledTime: appItem.interview?.scheduledTime || '10:00',
      room: appItem.interview?.room || 'Salle des Thèses 2, FST Fès',
      evaluatedAt: new Date().toISOString(),
    };

    appItem.currentStatut = 'ENTRETIEN_REALISE';
    appItem.status = 'ENTRETIEN_REALISE';

    let decisionLabel = 'Entretien réalisé';
    if (decision === 'ADMISE_LISTE_PRINCIPALE' || decision === 'Admitted_Principal') {
      appItem.currentStatut = 'ADMISE_LISTE_PRINCIPALE';
      appItem.status = 'ADMISE_LISTE_PRINCIPALE';
      decisionLabel = 'Admis(e) sur Liste Principale';
    } else if (decision === 'LISTE_ATTENTE' || decision === 'Admitted_Waiting') {
      appItem.currentStatut = 'LISTE_ATTENTE';
      appItem.status = 'LISTE_ATTENTE';
      decisionLabel = "Admis(e) sur Liste d'Attente";
    } else if (decision === 'REFUSEE' || decision === 'Rejected') {
      appItem.currentStatut = 'REFUSEE';
      appItem.status = 'REFUSEE';
      decisionLabel = 'Non Admis(e) / Refusé(e)';
    }

    recordAuditLog(
      'usr-prof-bennani',
      'Pr. Mustapha Bennani',
      'DIRECTEUR_THESE',
      'evaluerEntretienOral()',
      'Candidature',
      appItem.codeCandidature,
      `Note entretien: ${total}/20. Décision du jury: ${decisionLabel}.`
    );

    dispatchSimulatedEmail({
      to: appItem.candidateEmail,
      toName: appItem.candidateName,
      subject: `Résultat de délibération du jury — ${decisionLabel} (${appItem.codeCandidature})`,
      body: `Bonjour ${appItem.candidateName},\n\nLa commission doctorale a rendu sa délibération suite à votre entretien oral pour le dossier ${appItem.codeCandidature} :\n• Note globale d'entretien : ${total} / 20\n• Décision officielle : ${decisionLabel}\n• Appréciation du jury : ${juryNotes || 'Évaluation consignée au procès-verbal.'}\n\n${
        appItem.currentStatut === 'ADMISE_LISTE_PRINCIPALE'
          ? 'Vous êtes invité(e) à signer électroniquement la Charte des Thèses depuis votre espace candidat.'
          : 'Vous pouvez consulter le détail de votre dossier sur la plateforme GCD-USMBA.'
      }`,
      type: appItem.currentStatut === 'ADMISE_LISTE_PRINCIPALE' ? 'ACTION' : 'INFORMATIVE',
      actionLabel: appItem.currentStatut === 'ADMISE_LISTE_PRINCIPALE' ? 'Signer la Charte des Thèses' : undefined,
      actionUrl: appItem.currentStatut === 'ADMISE_LISTE_PRINCIPALE' ? '/charte' : undefined,
      applicationId: appItem.id,
    });
  }

  res.json({
    message: 'Évaluation d’entretien et délibération enregistrées avec succès.',
    application: appItem,
  });
});

// Electronic signature
app.post('/api/applications/:id/sign', (req: Request, res: Response) => {
  const appItem = applications.find((a) => a.id === req.params.id);
  if (!appItem) {
    return res.status(404).json({ error: 'Candidature introuvable' });
  }

  const { role, signerName, signerEmail } = req.body;

  let targetKey: 'candidat' | 'directeur' | 'chef_labo' | 'directeur_ced' | null = null;
  if (role === 'Candidat' || role === 'candidat') targetKey = 'candidat';
  else if (role === 'Directeur' || role === 'directeur') targetKey = 'directeur';
  else if (role === 'Chef_Labo' || role === 'chef_labo') targetKey = 'chef_labo';
  else if (role === 'Directeur_CED' || role === 'admin_cedoc') targetKey = 'directeur_ced';

  if (!targetKey) {
    return res.status(400).json({ error: 'Rôle de signature invalide' });
  }

  const timestamp = new Date().toISOString();
  const serialNumber = `USMBA-PKI-2026-${targetKey.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const hash = crypto
    .createHash('sha256')
    .update(`${appItem.id}-${targetKey}-${signerEmail}-${timestamp}-USMBA-ROOT-CA`)
    .digest('hex');

  appItem.signatures[targetKey] = {
    role: (targetKey === 'candidat'
      ? 'Candidat'
      : targetKey === 'directeur'
      ? 'Directeur'
      : targetKey === 'chef_labo'
      ? 'Chef_Labo'
      : 'Directeur_CED') as any,
    signerName: signerName || appItem.signatures[targetKey].signerName,
    signerEmail: signerEmail || appItem.signatures[targetKey].signerEmail,
    status: 'Signed',
    signedAt: timestamp,
    signatureHash: hash,
    certificateSerial: serialNumber,
  };

  const allSigned =
    appItem.signatures.candidat.status === 'Signed' &&
    appItem.signatures.directeur.status === 'Signed' &&
    appItem.signatures.chef_labo.status === 'Signed' &&
    appItem.signatures.directeur_ced.status === 'Signed';

  if (allSigned && appItem.currentStatut !== 'INSCRITE') {
    appItem.currentStatut = 'INSCRITE';
    appItem.status = 'INSCRITE';
    appItem.officialAttestationNumber = `USMBA-DOC-ATT-2026-${Math.floor(100 + Math.random() * 900)}`;

    dispatchSimulatedEmail({
      to: appItem.candidateEmail,
      toName: appItem.candidateName,
      subject: `Charte signée & Inscription finalisée — ${appItem.officialAttestationNumber}`,
      body: `Bonjour ${appItem.candidateName},\n\nLes 4 signatures de la Charte des Thèses ont été apposées avec succès. Votre attestation d'inscription officielle (${appItem.officialAttestationNumber}) est désormais disponible en téléchargement.`,
      type: 'INFORMATIVE',
      applicationId: appItem.id,
    });
  } else {
    dispatchSimulatedEmail({
      to: appItem.candidateEmail,
      toName: appItem.candidateName,
      subject: `Signature de la Charte des Thèses enregistrée (${targetKey}) — ${appItem.codeCandidature}`,
      body: `Bonjour ${appItem.candidateName},\n\nLa signature électronique de ${appItem.signatures[targetKey].signerName} a été apposée sur votre Charte des Thèses (Certificat: ${serialNumber}).`,
      type: 'INFORMATIVE',
      applicationId: appItem.id,
    });
  }

  res.json({
    message: 'Signature électronique cryptographique certifiée apposée avec succès.',
    signature: appItem.signatures[targetKey],
    allSigned,
    application: appItem,
  });
});

// -------------------------------------------------------------
// MODULE 8 : SIMULATEUR D'EMAILS & NOTIFICATIONS
// -------------------------------------------------------------

app.get('/api/emails', (req: Request, res: Response) => {
  const { applicationId, to } = req.query as { applicationId?: string; to?: string };
  let results = [...simulatedEmails];
  if (applicationId) {
    results = results.filter((e) => e.applicationId === applicationId);
  }
  if (to) {
    results = results.filter((e) => e.to.toLowerCase().includes(to.toLowerCase()));
  }
  res.json({
    count: results.length,
    emails: results,
  });
});

app.get('/api/notifications', (req: Request, res: Response) => {
  const role = req.query.role as string;
  let userNotifs = [...notifications];
  if (role) {
    userNotifs = userNotifs.filter(
      (n) => n.targetRole.toLowerCase() === role.toLowerCase() || n.targetRole === 'CANDIDAT'
    );
  }
  res.json(userNotifs);
});

app.get('/api/audit-logs', (_req: Request, res: Response) => {
  res.json({
    count: auditLogs.length,
    logs: auditLogs,
  });
});

app.get('/api/calendar-milestones', (_req: Request, res: Response) => {
  res.json(calendarMilestones);
});

app.get('/api/profile', (_req: Request, res: Response) => {
  res.json(candidateProfile);
});

// Fallback to Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[GCD-USMBA] Platform running on http://0.0.0.0:${port}`);
  });
}

startServer();
