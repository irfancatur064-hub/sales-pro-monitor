import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
  type User,
} from "firebase/auth";
import { deleteApp, initializeApp } from "firebase/app";

import { db, firebaseConfig, firebaseConfigured } from "./firebase";

export type UserRole = "admin" | "supervisor" | "salesman";
export type AccountStatus = "active" | "inactive";

export function hasSupervisorAccess(role: UserRole): boolean {
  return role === "admin" || role === "supervisor";
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  salespersonId?: string;
}

export interface Salesperson {
  uid: string;
  employeeId: string;
  name: string;
  email: string;
  area: string;
  status: AccountStatus;
  createdAt?: string;
}

export interface Target {
  id: string;
  period: string;
  salespersonId: string;
  targetSales: number;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyReport {
  id: string;
  date: string;
  salespersonId: string;
  salesToday: number;
  call: number;
  effCall: number;
  totalItem: number;
  collectionTarget: number;
  collectionReal: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export interface AuditActor {
  uid: string;
  name: string;
}

export interface SalespersonAccountInput {
  employeeId: string;
  name: string;
  email: string;
  password: string;
  area: string;
}

export interface SalespersonUpdateInput {
  uid: string;
  employeeId: string;
  name: string;
  area: string;
  status: AccountStatus;
}

export interface TargetInput {
  period: string;
  salespersonId: string;
  targetSales: number;
}

export interface DailyReportInput {
  date: string;
  salespersonId: string;
  salesToday: number;
  call: number;
  effCall: number;
  totalItem: number;
  collectionTarget: number;
  collectionReal: number;
}

type Listener<T> = (records: T[]) => void;
type ListenerError = (error: Error) => void;
type ProfileListener = (profile: UserProfile | null) => void;

function requireDb(): Firestore {
  if (!db) {
    throw new Error("Firebase belum dikonfigurasi.");
  }
  return db;
}

function toIso(value: unknown): string | undefined {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

function mapProfile(uid: string, data: DocumentData): UserProfile | null {
  if (
    data.role !== "admin" &&
    data.role !== "supervisor" &&
    data.role !== "salesman"
  ) return null;
  return {
    uid,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    role: data.role,
    status: data.status === "inactive" ? "inactive" : "active",
    salespersonId:
      typeof data.salespersonId === "string" ? data.salespersonId : undefined,
  };
}

function mapSalesperson(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): Salesperson {
  return mapSalespersonData(snapshot.id, snapshot.data());
}

function mapSalespersonData(uid: string, data: DocumentData): Salesperson {
  return {
    uid,
    employeeId: String(data.employeeId ?? ""),
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    area: String(data.area ?? ""),
    status: data.status === "inactive" ? "inactive" : "active",
    createdAt: toIso(data.createdAt),
  };
}

function mapTarget(snapshot: QueryDocumentSnapshot<DocumentData>): Target {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    period: String(data.period ?? ""),
    salespersonId: String(data.salespersonId ?? ""),
    targetSales: Number(data.targetSales ?? 0),
    createdBy: String(data.createdBy ?? ""),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapDailyReport(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): DailyReport {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    date: String(data.date ?? ""),
    salespersonId: String(data.salespersonId ?? ""),
    salesToday: Number(data.salesToday ?? 0),
    call: Number(data.call ?? 0),
    effCall: Number(data.effCall ?? 0),
    totalItem: Number(data.totalItem ?? 0),
    collectionTarget: Number(data.collectionTarget ?? 0),
    collectionReal: Number(data.collectionReal ?? 0),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapAuditLog(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): AuditLog {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    actorUid: String(data.actorUid ?? ""),
    actorName: String(data.actorName ?? ""),
    action: String(data.action ?? ""),
    entityType: String(data.entityType ?? ""),
    entityId: String(data.entityId ?? ""),
    summary: String(data.summary ?? ""),
    createdAt: toIso(data.createdAt),
    before: (data.before as Record<string, unknown> | null | undefined) ?? null,
    after: (data.after as Record<string, unknown> | null | undefined) ?? null,
  };
}

function subscribeCollection<T>(
  source: Query<DocumentData>,
  mapper: (snapshot: QueryDocumentSnapshot<DocumentData>) => T,
  onData: Listener<T>,
  onError: ListenerError,
): Unsubscribe {
  return onSnapshot(
    source,
    (snapshot) => onData(snapshot.docs.map(mapper)),
    onError,
  );
}

export function subscribeProfile(
  uid: string,
  onData: ProfileListener,
  onError: ListenerError,
): Unsubscribe {
  const profileRef = doc(requireDb(), "users", uid);
  const profilePath = `users/${uid}`;
  console.log("[firebase-profile] Firestore path:", profilePath);

  void getDoc(profileRef)
    .then((snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : undefined;
      console.log("[firebase-profile] getDoc() result:", {
        uid,
        path: profilePath,
        projectId: firebaseConfig.projectId ?? null,
        exists: snapshot.exists(),
        documentId: snapshot.id,
        fields: data ? Object.keys(data) : [],
        role: data?.role ?? null,
        status: data?.status ?? "(missing; defaults to active in app)",
      });
    })
    .catch((error: unknown) => {
      const firebaseError = error as { code?: string; message?: string };
      console.error("[firebase-profile] getDoc() failed:", {
        uid,
        path: profilePath,
        projectId: firebaseConfig.projectId ?? null,
        code: firebaseError.code ?? null,
        message: firebaseError.message ?? String(error),
      });
    });

  return onSnapshot(
    profileRef,
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : undefined;
      const profile = data ? mapProfile(uid, data) : null;
      console.log("[firebase-profile] onSnapshot() result:", {
        uid,
        path: profilePath,
        projectId: firebaseConfig.projectId ?? null,
        exists: snapshot.exists(),
        documentId: snapshot.id,
        role: data?.role ?? null,
        mappedRole: profile?.role ?? null,
        status: data?.status ?? "(missing; defaults to active in app)",
        profileAccepted: profile !== null,
      });
      onData(profile);
    },
    (error) => {
      console.error("[firebase-profile] onSnapshot() failed:", {
        uid,
        path: profilePath,
        projectId: firebaseConfig.projectId ?? null,
        code: error.code,
        message: error.message,
      });
      onError(error);
    },
  );
}

export function subscribeSalespeople(
  uid: string,
  role: UserRole,
  onData: Listener<Salesperson>,
  onError: ListenerError,
): Unsubscribe {
  const store = requireDb();
  if (hasSupervisorAccess(role)) {
    return subscribeCollection(
      collection(store, "salespeople"),
      mapSalesperson,
      onData,
      onError,
    );
  }
  return onSnapshot(
    doc(store, "salespeople", uid),
    (snapshot) =>
      onData(
        snapshot.exists()
          ? [mapSalespersonData(snapshot.id, snapshot.data())]
          : [],
      ),
    onError,
  );
}

export function subscribeTargets(
  salespersonId: string | undefined,
  onData: Listener<Target>,
  onError: ListenerError,
): Unsubscribe {
  const base = collection(requireDb(), "targets");
  const source = salespersonId
    ? query(base, where("salespersonId", "==", salespersonId))
    : base;
  return subscribeCollection(source, mapTarget, onData, onError);
}

export function subscribeDailyReports(
  salespersonId: string | undefined,
  onData: Listener<DailyReport>,
  onError: ListenerError,
): Unsubscribe {
  const base = collection(requireDb(), "daily_reports");
  const source = salespersonId
    ? query(base, where("salespersonId", "==", salespersonId))
    : base;
  return subscribeCollection(source, mapDailyReport, onData, onError);
}

export function subscribeAuditLogs(
  onData: Listener<AuditLog>,
  onError: ListenerError,
): Unsubscribe {
  const source = query(
    collection(requireDb(), "audit_logs"),
    orderBy("createdAt", "desc"),
    limit(200),
  );
  return subscribeCollection(source, mapAuditLog, onData, onError);
}

function newAuditRef() {
  return doc(collection(requireDb(), "audit_logs"));
}

function auditValues(
  actor: AuditActor,
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  return {
    actorUid: actor.uid,
    actorName: actor.name,
    action,
    entityType,
    entityId,
    summary,
    before,
    after,
    createdAt: serverTimestamp(),
  };
}

export async function createSalespersonAccount(
  input: SalespersonAccountInput,
  actor: AuditActor,
): Promise<void> {
  if (!firebaseConfigured) {
    throw new Error("Firebase belum dikonfigurasi.");
  }
  const store = requireDb();
  const currentSalespeople = await getDocs(collection(store, "salespeople"));
  if (currentSalespeople.size >= 6) {
    throw new Error("Maksimal enam akun salesman dapat dibuat.");
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const secondaryApp = initializeApp(
    firebaseConfig,
    `salesperson-creation-${crypto.randomUUID()}`,
  );
  const secondaryAuth = getAuth(secondaryApp);
  let createdUser: User | null = null;

  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      normalizedEmail,
      input.password,
    );
    createdUser = credential.user;
    const uid = credential.user.uid;
    const salesperson = {
      uid,
      employeeId: input.employeeId.trim(),
      name: input.name.trim(),
      email: normalizedEmail,
      area: input.area.trim(),
      status: "active" as const,
    };
    const batch = writeBatch(store);
    batch.set(doc(store, "users", uid), {
      name: salesperson.name,
      email: salesperson.email,
      role: "salesman",
      status: "active",
      salespersonId: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(store, "salespeople", uid), {
      ...salesperson,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(
      newAuditRef(),
      auditValues(
        actor,
        "salesperson.create",
        "salesperson",
        uid,
        `Membuat akun salesman ${salesperson.name}.`,
        null,
        {
          employeeId: salesperson.employeeId,
          name: salesperson.name,
          email: salesperson.email,
          area: salesperson.area,
          status: salesperson.status,
        },
      ),
    );
    await batch.commit();
  } catch (error) {
    if (createdUser) {
      await deleteUser(createdUser).catch(() => undefined);
    }
    throw error;
  } finally {
    await signOut(secondaryAuth).catch(() => undefined);
    await deleteApp(secondaryApp).catch(() => undefined);
  }
}

export async function updateSalesperson(
  input: SalespersonUpdateInput,
  actor: AuditActor,
): Promise<void> {
  const store = requireDb();
  const profileRef = doc(store, "users", input.uid);
  const salespersonRef = doc(store, "salespeople", input.uid);
  const [profileSnapshot, salespersonSnapshot] = await Promise.all([
    getDoc(profileRef),
    getDoc(salespersonRef),
  ]);
  if (!profileSnapshot.exists() || !salespersonSnapshot.exists()) {
    throw new Error("Akun salesman tidak ditemukan.");
  }
  const before = {
    employeeId: salespersonSnapshot.data().employeeId ?? "",
    name: salespersonSnapshot.data().name ?? "",
    area: salespersonSnapshot.data().area ?? "",
    status: salespersonSnapshot.data().status ?? "active",
  };
  const next = {
    employeeId: input.employeeId.trim(),
    name: input.name.trim(),
    area: input.area.trim(),
    status: input.status,
  };
  const batch = writeBatch(store);
  batch.update(profileRef, {
    name: next.name,
    status: next.status,
    updatedAt: serverTimestamp(),
  });
  batch.update(salespersonRef, {
    ...next,
    updatedAt: serverTimestamp(),
  });
  batch.set(
    newAuditRef(),
    auditValues(
      actor,
      "salesperson.update",
      "salesperson",
      input.uid,
      `Memperbarui data salesman ${next.name}.`,
      before,
      next,
    ),
  );
  await batch.commit();
}

export async function saveTarget(
  input: TargetInput,
  actor: AuditActor,
): Promise<void> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.period)) {
    throw new Error("Pilih periode target bulanan yang valid.");
  }
  if (!Number.isFinite(input.targetSales) || input.targetSales < 0) {
    throw new Error("Target sales harus berupa angka nol atau lebih.");
  }
  const store = requireDb();
  const id = `${input.period}_${input.salespersonId}`;
  const targetRef = doc(store, "targets", id);
  const snapshot = await getDoc(targetRef);
  const before = snapshot.exists()
    ? {
        period: snapshot.data().period,
        salespersonId: snapshot.data().salespersonId,
        targetSales: Number(snapshot.data().targetSales ?? 0),
      }
    : null;
  const after = {
    period: input.period,
    salespersonId: input.salespersonId,
    targetSales: Math.max(0, Number(input.targetSales) || 0),
  };
  const batch = writeBatch(store);
  batch.set(
    targetRef,
    {
      ...after,
      createdBy: snapshot.exists()
        ? String(snapshot.data().createdBy ?? actor.uid)
        : actor.uid,
      createdAt: snapshot.exists()
        ? snapshot.data().createdAt ?? serverTimestamp()
        : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  batch.set(
    newAuditRef(),
    auditValues(
      actor,
      snapshot.exists() ? "target.update" : "target.create",
      "target",
      id,
      `${snapshot.exists() ? "Memperbarui" : "Menetapkan"} target ${input.period}.`,
      before,
      after,
    ),
  );
  await batch.commit();
}

function auditReportValues(report: DailyReportInput) {
  return {
    date: report.date,
    salespersonId: report.salespersonId,
    salesToday: report.salesToday,
    call: report.call,
    effCall: report.effCall,
    totalItem: report.totalItem,
    collectionTarget: report.collectionTarget,
    collectionReal: report.collectionReal,
  };
}

export async function saveDailyReport(
  input: DailyReportInput,
  actor: AuditActor,
  options?: { canCorrect: boolean; previous?: DailyReport },
): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error("Tanggal laporan tidak valid.");
  }
  const values = [
    input.salesToday,
    input.call,
    input.effCall,
    input.totalItem,
    input.collectionTarget,
    input.collectionReal,
  ];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("Semua nilai laporan harus berupa angka nol atau lebih.");
  }
  if (input.effCall > input.call) {
    throw new Error("Eff-call tidak boleh melebihi jumlah call.");
  }
  if (options?.previous && !options.canCorrect) {
    throw new Error("Salesman tidak dapat mengubah laporan yang sudah dikirim.");
  }
  const store = requireDb();
  const id = `${input.salespersonId}_${input.date}`;
  const reportRef = doc(store, "daily_reports", id);
  const snapshot = await getDoc(reportRef);
  const before = snapshot.exists() ? auditReportValues(snapshot.data() as DailyReportInput) : null;
  const after = auditReportValues(input);
  const batch = writeBatch(store);
  batch.set(reportRef, {
    ...after,
    createdAt: snapshot.exists()
      ? snapshot.data().createdAt ?? serverTimestamp()
      : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(
    newAuditRef(),
    auditValues(
      actor,
      snapshot.exists() ? "report.correct" : "report.create",
      "daily_report",
      id,
      `${snapshot.exists() ? "Mengoreksi" : "Mencatat"} laporan ${input.date}.`,
      before,
      after,
    ),
  );
  await batch.commit();
}

export type { Unsubscribe };
