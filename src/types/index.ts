// State Machine Lifecycle for Candidatures (strictly adheres to specification 8)
export type StatutCandidature =
  | 'BROUILLON'
  | 'EN_COMPLETION'
  | 'EN_ATTENTE_PIECES'
  | 'SOUMISE'
  | 'SOUMIS'
  | 'COMPLEMENT_REQUIS'
  | 'MODIFICATION_REQUISE'
  | 'EN_ATTENTE_VERIFICATION'
  | 'VERIFICATION_CONFORME'
  | 'EN_ATTENTE_VALIDATION_ENCADRANT'
  | 'VALIDE_ENCADRANT'
  | 'VALIDE_LABO'
  | 'INSCRIPTION_DEFINITIVE'
  | 'INSCRIT_DEFINITIF'
  | 'REJETEE'
  | 'EN_EVALUATION'
  | 'CONVOQUEE'
  | 'ENTRETIEN_REALISE'
  | 'ADMISE_LISTE_PRINCIPALE'
  | 'LISTE_ATTENTE'
  | 'REFUSEE'
  | 'INSCRIPTION_EN_COURS'
  | 'INSCRITE'
  | 'RETIREE'
  | 'EXPIREE';

// Document Status strictly from specification 3
export type StatutPiece =
  | 'DEPOSEE'
  | 'EN_CONTROLE'
  | 'CONFORME'
  | 'NON_CONFORME'
  | 'COMPLEMENT_DEMANDE'
  | 'REMPLACEE'
  | 'VUE_AU_GUICHET'
  | 'MANQUANTE';

export type StatutConformite = StatutPiece;

// Strict Roles (spec 1)
export type RoleName =
  | 'VISITEUR'
  | 'CANDIDAT'
  | 'DIRECTEUR_THESE'
  | 'DIRECTEUR_LABO'
  | 'RESPONSABLE_CED'
  | 'ADMINISTRATION'
  | 'SUPER_ADMIN';

export type UserRole =
  | 'visiteur'
  | 'candidat'
  | 'agent_pedagogique'
  | 'directeur'
  | 'coencadrant'
  | 'chef_labo'
  | 'admin_cedoc'
  | 'administration'
  | 'super_admin';

export interface Personne {
  cin: string;
  cne: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
}

export interface Candidat extends Personne {
  diplomeObtenu: string;
  etablissementOrigine: string;
  moyenneGenerale: number;
}

export interface Enseignant extends Personne {
  som: string; // Statut d'occupation ministérielle
  grade: string; // PES, PH, PA
  specialite: string;
}

export type AccountStatus = 'ACTIF' | 'INACTIF';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: RoleName;
  status: AccountStatus;
  isEnabled: boolean;
  avatarUrl?: string;
  establishmentId?: string;
  establishment?: string;
  laboratoryId?: string;
  laboratory?: string;
  cinNumber?: string;
  cneNumber?: string;
  ssoProvider?: string;
  ocrVerified?: boolean;
  createdAt?: string;
  deactivatedAt?: string;
  deactivatedBy?: string;
  lastLoginAt?: string;
  linkedSubjectsCount?: number;
  linkedApplicationsCount?: number;
}

export interface CampaignRules {
  id: string;
  code: string;
  label: string;
  startDate: string;
  endDate: string;
  isOpen: boolean;
  maxChoicesPerCandidate: number;
  maxPdfSizeMB: number;
  allowedFileExtensions: string[];
}

export interface DocumentRule {
  type: 'CIN' | 'DIPLOME_BAC' | 'DIPLOME_LICENCE' | 'DIPLOME_MASTER' | 'RELEVE_NOTES' | 'PHOTO_IDENTITE' | 'CHARTE_SIGNEE';
  label: string;
  allowedExtensions: string[];
  maxSizeMB: number;
  required: boolean;
  contentRule: string;
}

export interface CandidatureDocument {
  id: string;
  docId: string;
  docType: 'CIN' | 'DIPLOME_BAC' | 'DIPLOME_LICENCE' | 'DIPLOME_MASTER' | 'RELEVE_NOTES' | 'PHOTO_IDENTITE' | 'CHARTE_SIGNEE' | 'PROJET';
  title: string;
  fileType: string;
  storagePath: string;
  dateUploaded?: string;
  conformite: StatutPiece;
  rejectionReason?: string;
  fileSize?: string;
  verifiedByGuichet?: boolean;
  guichetAgentName?: string;
  guichetDate?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  uploadedFileName?: string;
  fileUrl?: string;
  fileDataUrl?: string;
  isRealUpload?: boolean;
}

export interface Notification {
  id: string;
  type: 'INFORMATIVE' | 'ACTION';
  title: string;
  message: string;
  dateSent: string;
  isRead: boolean;
  targetRole: RoleName;
  targetUserId?: string;
  dateLimitAction?: string;
  actionCompleted?: boolean;
  actionUrl?: string;
}

export interface SimulatedEmail {
  id: string;
  to: string;
  toName: string;
  from: string;
  subject: string;
  body: string;
  type: 'INFORMATIVE' | 'ACTION';
  actionLabel?: string;
  actionUrl?: string;
  deadline?: string;
  sentAt: string;
  applicationId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: RoleName;
  action: string;
  affectedEntityName: string;
  affectedEntityId: string;
  details: string;
  beforeState?: string;
  afterState?: string;
}

export interface EcheanceCalendrier {
  id: string;
  stageName: string;
  startDate: string;
  deadline: string;
  status: 'ACCOMPLIE' | 'EN_COURS' | 'A_VENIR' | 'EN_RETARD';
  description: string;
  isCurrent: boolean;
}

export interface Subject {
  id: string;
  code: string;
  title: string;
  laboratory: string;
  establishment: string;
  cedoc: string;
  professorId: string;
  professorName: string;
  professorEmail: string;
  keywords: string[];
  description: string;
  requiredDiplomaField: string;
  minMasterAverage: number;
  quota: number;
  status: 'open' | 'assigned' | 'closed';
  candidateCount: number;
  axis: string;
}

export interface BasketChoice {
  subjectId: string;
  rank: number;
  addedAt: string;
}

export interface DigitalSignature {
  role: 'Candidat' | 'Directeur' | 'Chef_Labo' | 'Directeur_CED';
  signerName: string;
  signerEmail: string;
  signedAt?: string;
  status: 'Pending' | 'Signed' | 'Rejected';
  signatureHash?: string;
  certificateSerial?: string;
}

export interface FormationDoctorale {
  intitule: string;
  axeRecherche: string;
}

export interface StructureRecherche {
  nom: string;
  acronyme: string;
  type: string;
}

export interface ApplicationBasket {
  id: string;
  codeCandidature: string;
  candidateId: string;
  candidateEmail: string;
  candidateName: string;
  candidatePhone?: string;
  candidateCin: string;
  candidateCne: string;
  choices: BasketChoice[];
  currentStatut: StatutCandidature;
  status?: string;
  submittedAt?: string;
  meritScore?: number;
  matchingScore?: number;
  meritJustification?: string[];
  assignedSubjectId?: string;
  documents: CandidatureDocument[];
  candidat: Candidat;
  directeurThese: Enseignant;
  coEncadrant?: Enseignant;
  formationDoctorale: FormationDoctorale;
  structureRecherche: StructureRecherche;
  interview?: {
    specialite: number;
    motivation: number;
    projet: number;
    langues: number;
    total: number;
    juryNotes: string;
    juryMembers: string[];
    scheduledDate?: string;
    scheduledTime?: string;
    room?: string;
    evaluatedAt?: string;
    decision?: 'ADMISE_LISTE_PRINCIPALE' | 'LISTE_ATTENTE' | 'REFUSEE';
    decisionReason?: string;
  };
  signatures: {
    candidat: DigitalSignature;
    directeur: DigitalSignature;
    chef_labo: DigitalSignature;
    directeur_ced: DigitalSignature;
  };
  charterDocumentHash?: string;
  officialAttestationNumber?: string;
  qrCodeVerificationUrl?: string;
  isProvisionalWithoutDocuments?: boolean;
  avisDirecteur?: {
    avis: 'FAVORABLE' | 'DEFAVORABLE' | 'COMPLEMENT';
    commentaire?: string;
    evaluatedAt: string;
    evaluatorName: string;
  };
}

export interface CandidateProfile {
  id: string;
  userId: string;
  fullName?: string;
  nom?: string;
  prenom?: string;
  cinNumber: string;
  cneNumber: string;
  birthDate: string;
  birthPlace: string;
  nationality: string;
  baccalaureat: {
    series: string;
    mention: string;
    year: number;
    center: string;
  };
  licence: {
    field: string;
    university: string;
    year: number;
    mention: string;
  };
  master: {
    title: string;
    university: string;
    faculty: string;
    year: number;
    s1Grade: number;
    s2Grade: number;
    s3Grade: number;
    s4Grade: number;
    averageGrade: number;
    mention: string;
  };
  ocrVerification: {
    status: 'not_started' | 'processing' | 'verified' | 'flagged';
    cinConfidence: number;
    diplomaConfidence: number;
    transcriptConfidence: number;
    mrzDetected: boolean;
    chipPresent: boolean;
    sharpnessScore: number;
    timestamp?: string;
    verifiedFields: string[];
  };
  meritScoreCalculated: number;
}

export interface ThesisExchangeMessage {
  id: string;
  applicationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'Candidat' | 'Directeur' | 'Chef_Labo';
  sentAt: string;
  message: string;
  attachmentName?: string;
  attachmentType?: 'manuscript' | 'progress_report' | 'correction' | 'paper_draft';
  attachmentSize?: string;
}

export interface OcrDataExtraction {
  fullName: string;
  fullNameArabic?: string;
  cinNumber: string;
  cneNumber: string;
  birthDate: string;
  birthPlace: string;
  nationality: string;
  diplomaTitle: string;
  university: string;
  faculty: string;
  graduationYear: number;
  mention: string;
  s1Grade: number;
  s2Grade: number;
  s3Grade: number;
  s4Grade: number;
  averageGrade: number;
  documentType: 'cin' | 'diplome_master' | 'releve_notes';
  readabilityScore: number;
  mrzDetected: boolean;
  chipPresent: boolean;
  sharpnessScore: number;
  cornersDetected: boolean;
  rawConfidence: number;
}
