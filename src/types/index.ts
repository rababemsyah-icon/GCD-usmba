// StatutCandidature enumeration strictly from GCD State Transition & Class diagrams
export type StatutCandidature =
  | 'BROUILLON_INCOMPLET'
  | 'BROUILLON_COMPLET'
  | 'SOUMIS'
  | 'EN_ATTENTE_VERIFICATION'
  | 'CONFORME'
  | 'NON_CONFORME'
  | 'MODIFICATION_REQUISE'
  | 'EN_ATTENTE_VALIDATION_ENCADRANT'
  | 'VALIDE_ENCADRANT'
  | 'VALIDE_LABO'
  | 'INSCRIPTION_DEFINITIVE'
  | 'REJETE';

// StatutConformite enumeration for document management
export type StatutConformite =
  | 'EN_ATTENTE'
  | 'CONFORME'
  | 'NON_CONFORME'
  | 'REMPLACEMENT_REQUIS';

// RoleName enumeration from Security & Authorization (RBAC) diagram
export type RoleName =
  | 'CANDIDAT'
  | 'ENSEIGNANT'
  | 'DIRECTEUR_THESE'
  | 'COENCADRANT'
  | 'DIRECTEUR_LABO'
  | 'DIRECTEUR_CED'
  | 'ADMINISTRATEUR'
  | 'AGENT_PEDAGOGIQUE';

// Backward compatibility alias for UI role switcher
export type UserRole =
  | 'candidat'
  | 'agent_pedagogique'
  | 'directeur'
  | 'coencadrant'
  | 'chef_labo'
  | 'admin_cedoc';

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
  som: string; // Statut d'occupation ministérielle (matricule)
  grade: string; // PES, PH, PA
  specialite: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: RoleName;
  isEnabled: boolean;
  avatarUrl?: string;
  establishment?: string;
  laboratory?: string;
  cinNumber?: string;
  cneNumber?: string;
  ssoProvider?: string;
  ocrVerified?: boolean;
}

export interface CandidatureDocument {
  id: string;
  docId: string;
  title: string;
  fileType: string;
  storagePath: string;
  dateUploaded: string;
  conformite: StatutConformite;
  rejectionReason?: string;
  fileSize?: string;
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
}

export interface EcheanceCalendrier {
  id: string;
  stageName: string;
  startDate: string;
  deadline: string;
  isMilestone: boolean;
  isCompleted: boolean;
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
  rank: 1 | 2 | 3;
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
  type: string; // Laboratoire, Équipe, Centre
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
  status: string; // legacy UI adapter
  submittedAt?: string;
  meritScore?: number;
  matchingScore?: number;
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
  };
  signatures: {
    candidat: DigitalSignature;
    directeur: DigitalSignature;
    chef_labo: DigitalSignature;
    directeur_ced: DigitalSignature;
  };
  charterDocumentHash?: string;
  officialAttestationNumber?: string;
}

export interface CandidateProfile {
  id: string;
  userId: string;
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
