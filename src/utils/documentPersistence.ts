import { ApplicationBasket, CandidatureDocument, StatutPiece } from '../types';

const DB_NAME = 'gcd_usmba_persistence_v1';
const DB_VERSION = 1;
const DOCS_STORE = 'uploaded_documents';
const APPS_STORE = 'persisted_applications';
const LS_DOCS_FALLBACK_KEY = 'gcd_usmba_uploaded_documents_v1';
const LS_APPS_FALLBACK_KEY = 'gcd_usmba_persisted_applications_v1';

export interface PersistedDocumentRecord {
  storageKey: string;
  candidateId?: string;
  candidateEmail?: string;
  candidateName?: string;
  applicationId?: string;
  docType: string;
  title: string;
  fileName: string;
  fileSize: string;
  fileSizeBytes?: number;
  mimeType: string;
  dataUrl: string;
  conformite: StatutPiece;
  uploadedAt: string;
  isCameraScan?: boolean;
  removed?: boolean;
}

// Cache of blob: URLs generated from persisted Base64 DataURLs to avoid leaks and allow target="_blank" opening
const objectUrlCache = new Map<string, string>();

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '1.0 Mo';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

export function normalizeCandidateKey(params: {
  candidateId?: string;
  candidateEmail?: string;
  applicationId?: string;
}): string {
  if (params.candidateEmail && params.candidateEmail.trim()) {
    return params.candidateEmail.trim().toLowerCase();
  }
  if (params.candidateId && params.candidateId.trim()) {
    return params.candidateId.trim().toLowerCase();
  }
  if (params.applicationId && params.applicationId.trim()) {
    return params.applicationId.trim().toLowerCase();
  }
  return 'default-candidate';
}

export function buildDocumentStorageKey(
  params: { candidateId?: string; candidateEmail?: string; applicationId?: string },
  docType: string
): string {
  return `${normalizeCandidateKey(params)}::${docType.toUpperCase()}`;
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binaryStr = atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

export function dataUrlToObjectUrl(dataUrl: string, cacheKey: string, fallbackMime = 'application/pdf'): string {
  if (!dataUrl) return '';
  if (!dataUrl.startsWith('data:')) return dataUrl;

  const existing = objectUrlCache.get(cacheKey);
  if (existing) return existing;

  try {
    const header = dataUrl.split(',')[0] || '';
    const mimeMatch = header.match(/data:([^;]+);base64/i);
    const mimeType = mimeMatch ? mimeMatch[1] : fallbackMime;
    const bytes = dataUrlToUint8Array(dataUrl);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    objectUrlCache.set(cacheKey, url);
    return url;
  } catch (err) {
    console.warn('Failed to create blob URL from DataURL:', err);
    return dataUrl;
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DOCS_STORE)) {
          db.createObjectStore(DOCS_STORE, { keyPath: 'storageKey' });
        }
        if (!db.objectStoreNames.contains(APPS_STORE)) {
          db.createObjectStore(APPS_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('IndexedDB unavailable, falling back to localStorage.');
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

function readLocalFallback<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalFallback<T>(key: string, items: T[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    console.warn('localStorage fallback write failed (quota exceeded?):', err);
  }
}

export async function savePersistedDocument(
  input: Omit<PersistedDocumentRecord, 'storageKey' | 'removed'>
): Promise<PersistedDocumentRecord> {
  const normalizedEmail = input.candidateEmail?.trim().toLowerCase();
  const normalizedDocType = input.docType.toUpperCase();
  const storageKey = buildDocumentStorageKey(
    {
      candidateId: input.candidateId,
      candidateEmail: normalizedEmail,
      applicationId: input.applicationId,
    },
    normalizedDocType
  );

  const record: PersistedDocumentRecord = {
    ...input,
    candidateEmail: normalizedEmail,
    docType: normalizedDocType,
    storageKey,
    removed: false,
  };

  // Invalidate any stale cached object URLs for this key prefix
  for (const [k, url] of objectUrlCache.entries()) {
    if (k.startsWith(`${storageKey}::`)) {
      URL.revokeObjectURL(url);
      objectUrlCache.delete(k);
    }
  }

  const db = await openDatabase();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(DOCS_STORE, 'readwrite');
        tx.objectStore(DOCS_STORE).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } else {
    const existing = readLocalFallback<PersistedDocumentRecord>(LS_DOCS_FALLBACK_KEY);
    const filtered = existing.filter((r) => r.storageKey !== storageKey);
    filtered.push(record);
    writeLocalFallback(LS_DOCS_FALLBACK_KEY, filtered);
  }

  return record;
}

export async function markPersistedDocumentRemoved(params: {
  candidateId?: string;
  candidateEmail?: string;
  applicationId?: string;
  docType: string;
}): Promise<void> {
  const normalizedEmail = params.candidateEmail?.trim().toLowerCase();
  const normalizedDocType = params.docType.toUpperCase();
  const storageKey = buildDocumentStorageKey(
    {
      candidateId: params.candidateId,
      candidateEmail: normalizedEmail,
      applicationId: params.applicationId,
    },
    normalizedDocType
  );

  for (const [k, url] of objectUrlCache.entries()) {
    if (k.startsWith(`${storageKey}::`)) {
      URL.revokeObjectURL(url);
      objectUrlCache.delete(k);
    }
  }

  const tombstone: PersistedDocumentRecord = {
    storageKey,
    candidateId: params.candidateId,
    candidateEmail: normalizedEmail,
    applicationId: params.applicationId,
    docType: normalizedDocType,
    title: normalizedDocType,
    fileName: '',
    fileSize: '',
    mimeType: 'application/pdf',
    dataUrl: '',
    conformite: 'MANQUANTE',
    uploadedAt: new Date().toISOString(),
    removed: true,
  };

  const db = await openDatabase();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(DOCS_STORE, 'readwrite');
        tx.objectStore(DOCS_STORE).put(tombstone);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } else {
    const existing = readLocalFallback<PersistedDocumentRecord>(LS_DOCS_FALLBACK_KEY);
    const filtered = existing.filter((r) => r.storageKey !== storageKey);
    filtered.push(tombstone);
    writeLocalFallback(LS_DOCS_FALLBACK_KEY, filtered);
  }
}

export async function getAllPersistedDocuments(): Promise<PersistedDocumentRecord[]> {
  const db = await openDatabase();
  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(DOCS_STORE, 'readonly');
        const req = tx.objectStore(DOCS_STORE).getAll();
        req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }
  return readLocalFallback<PersistedDocumentRecord>(LS_DOCS_FALLBACK_KEY);
}

export function doesRecordMatchCandidate(
  rec: PersistedDocumentRecord,
  target: { candidateId?: string; candidateEmail?: string; applicationId?: string }
): boolean {
  const targetEmail = target.candidateEmail?.trim().toLowerCase();
  const recEmail = rec.candidateEmail?.trim().toLowerCase();

  if (targetEmail && recEmail && targetEmail === recEmail) return true;
  if (target.candidateId && rec.candidateId && target.candidateId === rec.candidateId) return true;
  if (target.applicationId && rec.applicationId && target.applicationId === rec.applicationId) return true;
  return false;
}

export async function getPersistedDocumentsForCandidate(target: {
  candidateId?: string;
  candidateEmail?: string;
  applicationId?: string;
}): Promise<PersistedDocumentRecord[]> {
  const all = await getAllPersistedDocuments();
  return all
    .filter((rec) => doesRecordMatchCandidate(rec, target))
    .sort((a, b) => (a.uploadedAt || '').localeCompare(b.uploadedAt || ''));
}

export async function savePersistedApplication(app: ApplicationBasket): Promise<void> {
  // Strip transient blob: URLs before saving; keep fileDataUrl so blob: URLs are recreated cleanly on load
  const cleanApp: ApplicationBasket = {
    ...app,
    documents: (app.documents || []).map((doc) => ({
      ...doc,
      fileUrl: doc.fileUrl?.startsWith('blob:') ? undefined : doc.fileUrl,
    })),
  };

  const db = await openDatabase();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(APPS_STORE, 'readwrite');
        tx.objectStore(APPS_STORE).put(cleanApp);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } else {
    const existing = readLocalFallback<ApplicationBasket>(LS_APPS_FALLBACK_KEY);
    const filtered = existing.filter((a) => a.id !== cleanApp.id);
    filtered.unshift(cleanApp);
    writeLocalFallback(LS_APPS_FALLBACK_KEY, filtered);
  }
}

export async function getAllPersistedApplications(): Promise<ApplicationBasket[]> {
  const db = await openDatabase();
  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(APPS_STORE, 'readonly');
        const req = tx.objectStore(APPS_STORE).getAll();
        req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }
  return readLocalFallback<ApplicationBasket>(LS_APPS_FALLBACK_KEY);
}

export function applyPersistedDocumentsToApplication(
  app: ApplicationBasket,
  allPersistedDocs: PersistedDocumentRecord[]
): ApplicationBasket {
  const matching = allPersistedDocs
    .filter((rec) =>
      doesRecordMatchCandidate(rec, {
        candidateId: app.candidateId,
        candidateEmail: app.candidateEmail,
        applicationId: app.id,
      })
    )
    .sort((a, b) => (a.uploadedAt || '').localeCompare(b.uploadedAt || ''));

  if (matching.length === 0) {
    // Still ensure any embedded fileDataUrl on existing documents has a working blob URL
    const hasEmbeddedDataUrl = (app.documents || []).some((d) => Boolean(d.fileDataUrl));
    if (!hasEmbeddedDataUrl) return app;
    return {
      ...app,
      documents: app.documents.map((d) =>
        d.fileDataUrl
          ? {
              ...d,
              fileUrl: dataUrlToObjectUrl(
                d.fileDataUrl,
                `${app.id}::${d.docType}::${d.dateUploaded || 'v1'}`,
                d.fileType || 'application/pdf'
              ),
              isRealUpload: true,
            }
          : d
      ),
    };
  }

  const nextDocs: CandidatureDocument[] = [...(app.documents || [])];

  for (const rec of matching) {
    const docTypeUpper = rec.docType.toUpperCase();
    const existingIdx = nextDocs.findIndex(
      (d) =>
        d.docType?.toUpperCase() === docTypeUpper ||
        d.docId?.toUpperCase() === docTypeUpper ||
        d.docId?.toUpperCase() === `DOC-${docTypeUpper}`
    );

    if (rec.removed) {
      if (existingIdx >= 0) {
        nextDocs[existingIdx] = {
          ...nextDocs[existingIdx],
          conformite: 'MANQUANTE',
          storagePath: '',
          uploadedFileName: undefined,
          fileUrl: undefined,
          fileDataUrl: undefined,
          fileSize: undefined,
          isRealUpload: false,
          dateUploaded: undefined,
        };
      }
      continue;
    }

    const blobUrl = dataUrlToObjectUrl(
      rec.dataUrl,
      `${rec.storageKey}::${rec.uploadedAt}`,
      rec.mimeType || 'application/pdf'
    );

    if (existingIdx >= 0) {
      const current = nextDocs[existingIdx];
      // Preserve explicit admin/supervisor verification states if already validated/rejected, otherwise restore CONFORME
      const preservedStatus: StatutPiece =
        current.conformite === 'NON_CONFORME' ||
        current.conformite === 'COMPLEMENT_DEMANDE' ||
        current.conformite === 'VUE_AU_GUICHET'
          ? current.conformite
          : rec.conformite || 'CONFORME';

      nextDocs[existingIdx] = {
        ...current,
        uploadedFileName: rec.fileName,
        storagePath: `/uploads/${rec.fileName}`,
        fileSize: rec.fileSize,
        fileType: rec.mimeType || 'application/pdf',
        dateUploaded: rec.uploadedAt,
        conformite: preservedStatus,
        isRealUpload: true,
        fileDataUrl: rec.dataUrl,
        fileUrl: blobUrl,
      };
    } else {
      nextDocs.push({
        id: `doc-persisted-${docTypeUpper}-${app.id}`,
        docId: `DOC-${docTypeUpper}`,
        docType: docTypeUpper as CandidatureDocument['docType'],
        title: rec.title || docTypeUpper,
        fileType: rec.mimeType || 'application/pdf',
        storagePath: `/uploads/${rec.fileName}`,
        uploadedFileName: rec.fileName,
        fileSize: rec.fileSize,
        dateUploaded: rec.uploadedAt,
        conformite: rec.conformite || 'CONFORME',
        isRealUpload: true,
        fileDataUrl: rec.dataUrl,
        fileUrl: blobUrl,
      });
    }
  }

  return {
    ...app,
    documents: nextDocs,
  };
}
