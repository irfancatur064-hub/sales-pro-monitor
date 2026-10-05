import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { Link, Route, Switch, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CircleAlert,
  ClipboardList,
  Clock3,
  Download,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { auth, firebaseConfigured } from "@/lib/firebase";
import {
  type UserProfile,
  type UserRole,
  type Salesperson,
  type Target as SalesTarget,
  type DailyReport,
  type AuditLog,
  type AccountStatus,
  type Unsubscribe,
  hasSupervisorAccess,
  subscribeProfile,
  subscribeSalespeople,
  subscribeTargets,
  subscribeDailyReports,
  subscribeAuditLogs,
  createSalespersonAccount,
  updateSalesperson,
  saveTarget,
  saveDailyReport,
} from "@/lib/data";
import { text } from "node:stream/consumers";
import indomarcoLogo from "@assets/INDOMARCO.png";
type Feed<T> = { data: T[]; loading: boolean; error: string };
type WindowFilter = "day" | "week" | "month";
type SalesmanPerformanceRow = {
  person: Salesperson;
  effRate: number;
  avgItem: number;
};
const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
const number = (n: number) => new Intl.NumberFormat("id-ID").format(n || 0);
const todayKey = () => new Date().toLocaleDateString("en-CA");
const monthKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const dateText = (d: string) => {
  if (!d) return "—";
  const value = new Date(`${d.slice(0, 10)}T12:00:00`);
  return Number.isNaN(value.getTime())
    ? d
    : new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(value);
};
const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const moneyInput = (n: number) => (n ? String(n) : "");

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }
    return onAuthStateChanged(auth, (current) => {
      console.log("[firebase-auth] currentUser.uid:", current?.uid ?? null);
      setUser(current);
      setAuthReady(true);
    });
  }, []);
  return (
    <Switch>
      <Route path="/">
        <Login user={user} ready={authReady} />
      </Route>
      <Route>
        <Authenticated user={user} ready={authReady} />
      </Route>
    </Switch>
  );
}

function Login({ user, ready }: { user: User | null; ready: boolean }) {
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileReady(true);
      return;
    }
    setProfileReady(false);
    return subscribeProfile(
      user.uid,
      (p) => {
        setProfile(p);
        setProfileReady(true);
      },
      (e) => {
        setError(e.message);
        setProfileReady(true);
      },
    );
  }, [user]);
  useEffect(() => {
    if (ready && user && profileReady && profile?.status === "active")
      navigate("/dashboard");
  }, [ready, user, profileReady, profile, navigate]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(
        auth!,
        String(fields.get("email")).trim(),
        String(fields.get("password")),
      );
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  };
  if (!ready || (user && !profileReady))
    return <LoadingScreen label="Memeriksa sesi Anda" />;
  if (!firebaseConfigured) return <ConfigNotice />;
  if (user && (!profile || profile.status !== "active"))
    return <AccessDenied onSignOut={() => signOut(auth!)} />;
  return (
    <main className="min-h-[100dvh] bg-[#f4f7fb] grid lg:grid-cols-[1.02fr_.98fr]">
      <section className="relative grid-paper px-7 py-8 sm:px-12 lg:px-16 lg:py-12 flex flex-col justify-between overflow-hidden">
        <Brand light />
        <div className="relative z-10 py-14 lg:py-0 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d7d0c2] bg-[#f7f4ed]/80 px-3 py-1.5 text-xs font-semibold text-[#56635f]">
            <span className="h-2 w-2 rounded-full bg-[#ed995f]" />
            Ruang kerja operasional penjualan
          </div>
          <h1 className="font-display text-[clamp(3.4rem,7vw,6.2rem)] font-extrabold leading-[.98] tracking-[-.07em] text-[#23333a] mt-7">
            Hari ini,
            <br />
            <span className="text-[#267764]">lebih terarah.</span>
          </h1>
          <p className="max-w-md mt-6 text-lg leading-8 text-[#5e6967]">
            Satu pandangan untuk target, aktivitas, dan hasil tim penjualan.
          </p>
          <div className="mt-12 flex flex-wrap gap-8 text-sm text-[#596764]">
            <div className="flex items-center gap-2">
              <Target size={17} className="text-[#267764]" />
              Target terpantau
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={17} className="text-[#267764]" />
              Data tersimpan aman
            </div>
          </div>
        </div>
        <div className="font-mono text-[10px] tracking-[.18em] text-[#8a918b] uppercase">
          Sales Pro Monitor · Indonesia
        </div>
        <div className="absolute -bottom-28 -right-28 w-80 h-80 rounded-full border border-[#d7d0c2] opacity-60" />
        <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full border border-[#d7d0c2] opacity-60" />
      </section>
      <section className="px-6 py-10 sm:px-12 lg:px-16 bg-[#f8f6f0] flex items-center justify-center">
        <div className="w-full max-w-md fade-up">
          <div className="mb-8 flex flex-col items-center text-center">
            <img
              src={indomarcoLogo}
              alt="Indomarco"
              className="h-auto w-[min(250px,75%)]"
            />
            <div className="mt-3 text-sm font-bold text-[#174f93]">
              PT Indomarco Adi Prima
            </div>
            <div className="mt-1 text-xs text-[#69798c]">
              Cabang Malang - Depo Jombang
            </div>
          </div>
          <div className="mb-10">
            <div className="text-xs font-bold uppercase tracking-[.2em] text-[#267764]">
              Selamat datang kembali
            </div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight mt-3 text-[#26363b]">
              Masuk ke workspace
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#74807b]">
              Gunakan akun yang diberikan oleh supervisor Anda.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#394943]">
                Email
              </span>
              <div className="relative">
                <Mail
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a948e]"
                />
                <input
                  data-testid="input-email"
                  className="field h-12 w-full rounded-xl border border-[#ddd7cb] bg-[#fffefa] pl-11 pr-4 text-sm text-[#27383c]"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  placeholder="nama@perusahaan.id"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#394943]">
                Kata sandi
              </span>
              <input
                data-testid="input-password"
                className="field h-12 w-full rounded-xl border border-[#ddd7cb] bg-[#fffefa] px-4 text-sm"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                placeholder="Kata sandi"
              />
            </label>
            {error && <AlertBox>{error}</AlertBox>}
            <button
              data-testid="button-auth-submit"
              disabled={busy}
              className="btn flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#267764] text-sm font-bold text-white shadow-[0_7px_18px_rgba(38,119,100,.18)] disabled:opacity-60"
            >
              {busy ? "Memeriksa…" : "Masuk"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="mt-10 border-t border-[#e5dfd3] pt-5 text-center text-xs text-[#8b938e]">
            Akses hanya untuk akun tim yang terdaftar.
          </p>
        </div>
      </section>
    </main>
  );
}

function Authenticated({ user, ready }: { user: User | null; ready: boolean }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setState("ready");
      return;
    }
    setState("loading");
    return subscribeProfile(
      user.uid,
      (p) => {
        setProfile(p);
        setState("ready");
      },
      (e) => {
        setError(e.message);
        setState("error");
      },
    );
  }, [user]);
  useEffect(() => {
    if (ready && !user) navigate("/");
  }, [ready, user, navigate]);
  if (!ready || (user && state === "loading"))
    return <LoadingScreen label="Memuat ruang kerja" />;
  if (!firebaseConfigured) return <ConfigNotice />;
  if (!user) return <LoadingScreen label="Mengalihkan ke halaman masuk" />;
  if (state === "error")
    return (
      <CenteredState
        title="Profil tidak dapat dimuat"
        detail={error}
        action={
          <button
            className="btn rounded-xl bg-[#267764] px-4 py-2 text-sm font-bold text-white"
            onClick={() => window.location.reload()}
          >
            Coba lagi
          </button>
        }
      />
    );
  if (!profile || profile.status !== "active")
    return <AccessDenied onSignOut={() => signOut(auth!)} />;
  return <Workspace user={user} profile={profile} />;
}

function Workspace({ user, profile }: { user: User; profile: UserProfile }) {
  const [path, navigate] = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const supervisor = hasSupervisorAccess(profile.role);
  const pages = [
    {
      href: "/dashboard",
      title: "Monitor tim",
      icon: <LayoutDashboard size={18} />,
    },
    {
      href: "/reports",
      title: "Laporan harian",
      icon: <ClipboardList size={18} />,
    },
    ...(supervisor
      ? [
          {
            href: "/targets",
            title: "Target bulanan",
            icon: <Target size={18} />,
          },
          { href: "/team", title: "Tim penjualan", icon: <Users size={18} /> },
        ]
      : []),
  ];
  const allowed = pages.some((p) => p.href === path);
  useEffect(() => {
    if (!allowed) navigate("/dashboard");
  }, [allowed, navigate]);
  const heading = pages.find((p) => p.href === path)?.title || "Monitor tim";
  return (
    <div className="app-shell md:flex">
      {mobileNav && (
        <button
          aria-label="Tutup navigasi"
          data-testid="button-close-backdrop"
          className="fixed inset-0 z-30 bg-[#17232acc] md:hidden"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        className={`sidebar fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col px-4 py-5 transition-transform duration-300 md:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-2 pb-8 pt-1">
          <Brand />
          <button
            aria-label="Tutup navigasi"
            data-testid="button-close-nav"
            onClick={() => setMobileNav(false)}
            className="md:hidden text-[#d5dfd9]"
          >
            <X size={19} />
          </button>
        </div>
        <div className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[.19em] text-[#899a97]">
          Ruang kerja
        </div>
        <nav className="space-y-1">
          {pages.map((p) => (
            <Link
              key={p.href}
              data-testid={`link-nav-${p.href.slice(1)}`}
              href={p.href}
              onClick={() => setMobileNav(false)}
              className={`sidebar-link flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${path === p.href ? "active" : "text-[#c3cec9]"}`}
            >
              <span>{p.icon}</span>
              {p.title}
              {path === p.href && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#f0a064]" />
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-[#42525a] bg-[#2a3944] p-4">
          <div className="flex items-center gap-2 text-[#f0a064]">
            <Activity size={15} />
            <span className="text-xs font-bold">Laporan harian</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#b3c0bb]">
            Catat aktivitas hari ini agar progres tim selalu terlihat.
          </p>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-[#42525a] px-2 pt-4">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#d3e6dc] text-xs font-extrabold text-[#267764]">
            {profile.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div
              data-testid="text-profile-name"
              className="truncate text-xs font-semibold"
            >
              {profile.name}
            </div>
            <div className="text-[10px] text-[#9caeaa]">
              {profile.role === "admin"
                ? "Admin"
                : supervisor
                  ? "Supervisor"
                  : "Salesperson"}
            </div>
          </div>
          <button
            data-testid="button-signout"
            title="Keluar"
            className="rounded-lg p-2 text-[#b7c4bf] hover:bg-[#3a4b55] hover:text-white"
            onClick={() => signOut(auth!)}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="min-h-[100dvh] min-w-0 flex-1 md:ml-[258px]">
        <header className="sticky top-0 z-20 flex min-h-[74px] items-center justify-between gap-2 border-b border-[#e3ddd1] bg-[#f4f1e9]/95 px-3 py-2 backdrop-blur sm:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              data-testid="button-open-nav"
              className="rounded-lg p-2 hover:bg-[#e9e4d9] md:hidden"
              aria-label="Buka navigasi"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <img
                src={indomarcoLogo}
                alt="Indomarco"
                className="h-auto w-[68px] shrink-0 sm:w-[124px]"
              />
              <div className="min-w-0 max-w-[190px] sm:max-w-none">
                <div className="font-display text-[11px] font-extrabold leading-tight tracking-tight text-[#174f93] sm:text-base">
                  Sales Performance Dashboard
                </div>
                <div className="mt-0.5 text-[9px] leading-tight text-[#68798d] sm:text-xs">
                  PT Indomarco Adi Prima | Cabang Malang - Depo Jombang
                </div>
              </div>
              <span className="sr-only">{heading}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden items-center gap-2 rounded-full border border-[#dfd9cd] bg-[#fbf9f3] px-3 py-2 text-xs text-[#697671] sm:flex">
              <CalendarDays size={14} className="text-[#267764]" />
              {new Intl.DateTimeFormat("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(new Date())}
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#d4e6dc] text-xs font-extrabold text-[#267764]">
              {profile.name.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="workspace-main mx-auto max-w-[1440px] px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
          {path === "/dashboard" && (
            <img
              src={indomarcoLogo}
              alt=""
              aria-hidden="true"
              className="workspace-watermark"
            />
          )}
          <div className="relative z-[1]">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4 fade-up">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[.2em] text-[#267764]">
                  Sales intelligence ·{" "}
                  {new Date().toLocaleDateString("id-ID", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <h1 className="font-display mt-2 text-[clamp(1.8rem,3vw,2.5rem)] font-extrabold tracking-[-.045em] text-[#25353b]">
                  {heading}
                </h1>
                <p className="mt-1 text-sm text-[#74807b]">
                  {supervisor
                    ? "Ritme penjualan tim, tanpa kehilangan detail harian."
                    : "Performa dan laporan penjualan Anda."}
                </p>
              </div>
            </div>
            <Switch>
              <Route path="/dashboard">
                <Dashboard uid={user.uid} profile={profile} />
              </Route>
              <Route path="/reports">
                <ReportsPage uid={user.uid} profile={profile} />
              </Route>
              {supervisor && (
                <Route path="/targets">
                  <TargetsPage uid={user.uid} profile={profile} />
                </Route>
              )}
              {supervisor && (
                <Route path="/team">
                  <TeamPage uid={user.uid} profile={profile} />
                </Route>
              )}
              <Route>
                <NotFound />
              </Route>
            </Switch>
          </div>
        </main>
      </div>
    </div>
  );
}

function useFeed<T>(
  subscribe: (
    success: (rows: T[]) => void,
    fail: (e: Error) => void,
  ) => Unsubscribe,
  deps: unknown[],
): Feed<T> {
  const [feed, setFeed] = useState<Feed<T>>({
    data: [],
    loading: true,
    error: "",
  });
  useEffect(() => {
    setFeed((old) => ({ ...old, loading: true, error: "" }));
    return subscribe(
      (rows) => setFeed({ data: rows, loading: false, error: "" }),
      (e) =>
        setFeed({
          data: [],
          loading: false,
          error: e.message || "Data tidak dapat dimuat.",
        }),
    );
    // caller dependencies identify the signed-in identity and scope
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return feed;
}
function usePeople(uid: string, role: UserRole) {
  return useFeed<Salesperson>(
    (ok, fail) => subscribeSalespeople(uid, role, ok, fail),
    [uid, role],
  );
}
function useReports(uid: string, profile: UserProfile, selected?: string) {
  const scope = profile.role === "salesman" ? profile.salespersonId : selected;
  return useFeed<DailyReport>(
    (ok, fail) => {
      if (profile.role === "salesman" && !scope) {
        queueMicrotask(() =>
          fail(new Error("Akun ini belum terhubung ke salesperson.")),
        );
        return () => undefined;
      }
      return subscribeDailyReports(scope, ok, fail);
    },
    [scope, profile.role],
  );
}
function useTargets(selected?: string, allowed = true) {
  return useFeed<SalesTarget>(
    (ok, fail) => {
      if (!allowed) {
        queueMicrotask(() =>
          fail(new Error("Akun ini belum terhubung ke salesperson.")),
        );
        return () => undefined;
      }
      return subscribeTargets(selected, ok, fail);
    },
    [selected, allowed],
  );
}
function ErrorPanel({ message }: { message: string }) {
  return (
    <div
      data-testid="status-data-error"
      className="flex items-center gap-3 rounded-2xl border border-[#e7c8c0] bg-[#fff0eb] p-4 text-sm text-[#994d41]"
    >
      <CircleAlert size={19} />
      {message}
    </div>
  );
}
function Skeleton({ className = "h-32" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl bg-[#e7e2d8] ${className}`} />
  );
}
function Empty({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="grid min-h-[170px] place-items-center px-5 py-8 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#edf1e9] text-[#698477]">
          {icon}
        </div>
        <div className="mt-3 text-sm font-bold text-[#4b5b55]">{title}</div>
        <p className="mt-1 text-xs text-[#8b958e]">{detail}</p>
      </div>
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
  sub,
  accent = "green",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  const colors: Record<string, string> = {
    green: "bg-[#e2f1e9] text-[#267764]",
    orange: "bg-[#fff0e2] text-[#c1783f]",
    blue: "bg-[#e4eef1] text-[#46798a]",
    gold: "bg-[#f7edcf] text-[#9b7725]",
  };
  return (
    <div className="surface rounded-2xl p-4 sm:p-5 fade-up">
      <div className="flex items-center justify-between">
        <div
          className={`grid h-10 w-10 place-items-center rounded-xl ${colors[accent]}`}
        >
          {icon}
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#9ba19b]">
          LIVE
        </span>
      </div>
      <div className="mt-4 text-xs font-semibold text-[#839089]">{label}</div>
      <div
        data-testid={`metric-${label}`}
        className="font-display mt-1 truncate text-[clamp(1.35rem,2.4vw,1.8rem)] font-extrabold tracking-[-.045em] text-[#283a3d]"
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-[#9aa29b]">{sub}</div>
    </div>
  );
}
function Dashboard({ uid, profile }: { uid: string; profile: UserProfile }) {
  const supervisor = hasSupervisorAccess(profile.role);
  const people = usePeople(uid, profile.role);
  const [selected, setSelected] = useState("");
  const [windowFilter, setWindowFilter] = useState<WindowFilter>("month");
  const [referenceDate, setReferenceDate] = useState(todayKey());
  const scope = supervisor ? selected || undefined : profile.salespersonId;
  const reportFeed = useReports(uid, profile, scope);
  const targetFeed = useTargets(scope, supervisor || !!profile.salespersonId);
  const referenceMonth = monthKey(new Date(`${referenceDate}T12:00:00`));
  const filteredReports = useMemo(() => {
    const reference = new Date(`${referenceDate}T12:00:00`);
    return reportFeed.data.filter((r) => {
      if (windowFilter === "day") return r.date === referenceDate;
      if (windowFilter === "month")
        return r.date.startsWith(referenceMonth) && r.date <= referenceDate;
      const monday = new Date(reference);
      monday.setDate(reference.getDate() - ((reference.getDay() + 6) % 7));
      return (
        r.date >= monday.toLocaleDateString("en-CA") && r.date <= referenceDate
      );
    });
  }, [reportFeed.data, windowFilter, referenceDate, referenceMonth]);
  const monthReports = reportFeed.data.filter(
    (r) => r.date.startsWith(referenceMonth) && r.date <= referenceDate,
  );
  const todaySales = reportFeed.data
    .filter((r) => r.date === referenceDate)
    .reduce((sum, r) => sum + r.salesToday, 0);
  const targetRows = targetFeed.data.filter((t) => t.period === referenceMonth);
  const targetSum = targetRows.reduce((sum, t) => sum + t.targetSales, 0);
  const mtd = monthReports.reduce((sum, r) => sum + r.salesToday, 0);
  const totalCall = filteredReports.reduce((sum, r) => sum + r.call, 0);
  const totalEff = filteredReports.reduce((sum, r) => sum + r.effCall, 0);
  const totalItems = filteredReports.reduce((sum, r) => sum + r.totalItem, 0);
  const collectionTarget = filteredReports.reduce(
    (sum, r) => sum + r.collectionTarget,
    0,
  );
  const collectionReal = filteredReports.reduce(
    (sum, r) => sum + r.collectionReal,
    0,
  );
  const activePeople = people.data.filter(
    (person) => person.status === "active",
  );
  const visiblePeople =
    supervisor && selected
      ? activePeople.filter((person) => person.uid === selected)
      : activePeople;
  const rows = useMemo(
    () =>
      visiblePeople.map((person) => {
        const sales = monthReports
          .filter((r) => r.salespersonId === person.uid)
          .reduce((s, r) => s + r.salesToday, 0);
        const target = targetRows
          .filter((t) => t.salespersonId === person.uid)
          .reduce((s, t) => s + t.targetSales, 0);
        const records = filteredReports.filter(
          (r) => r.salespersonId === person.uid,
        );
        const calls = records.reduce((s, r) => s + r.call, 0),
          eff = records.reduce((s, r) => s + r.effCall, 0);
        const items = records.reduce((s, r) => s + r.totalItem, 0);
        const cTarget = records.reduce((s, r) => s + r.collectionTarget, 0),
          cReal = records.reduce((s, r) => s + r.collectionReal, 0);
        return {
          person,
          sales,
          target,
          achievement: pct(sales, target),
          effRate: pct(eff, calls),
          avgItem: eff ? items / eff : 0,
          collectionRate: pct(cReal, cTarget),
        };
      }),
    [visiblePeople, monthReports, targetRows, filteredReports],
  );
  const ranking = [...rows].sort((a, b) => b.achievement - a.achievement);
  const trend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(`${referenceDate}T12:00:00`);
    date.setDate(date.getDate() - (6 - i));
    const key = date.toLocaleDateString("en-CA");
    const sales = reportFeed.data
      .filter((r) => r.date === key && (!scope || r.salespersonId === scope))
      .reduce((s, r) => s + r.salesToday, 0);
    return {
      key,
      label: new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(
        date,
      ),
      sales,
    };
  });
  const maxTrend = Math.max(...trend.map((x) => x.sales), 1);
  const error = people.error || reportFeed.error || targetFeed.error;
  const loading = people.loading || reportFeed.loading || targetFeed.loading;
  const exportCsv = () => {
    const csv = [
      [
        "Tanggal",
        "Nama sales",
        "Penjualan",
        "Call",
        "Eff call",
        "Item",
        "Target collection",
        "Realisasi collection",
      ],
      ...filteredReports.map((r) => [
        r.date,
        people.data.find((p) => p.uid === r.salespersonId)?.name ||
          r.salespersonId,
        r.salesToday,
        r.call,
        r.effCall,
        r.totalItem,
        r.collectionTarget,
        r.collectionReal,
      ]),
    ]
      .map((row) =>
        row
          .map((cell) => {
            const text = String(cell);
            const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
            return `"${safe.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-penjualan-${referenceDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-5">
      {error && <ErrorPanel message={error} />}
      <div className="flex flex-wrap items-center gap-3">
        {supervisor && (
          <label className="flex items-center gap-2 text-xs font-semibold text-[#697671]">
            Sales
            <select
              data-testid="select-salesperson-dashboard"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="field h-10 rounded-xl border border-[#e4ded2] bg-[#fffefa] px-3 text-sm"
            >
              <option value="">Seluruh tim</option>
              {people.data.map((p) => (
                <option value={p.uid} key={p.uid}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex items-center gap-2 text-xs font-semibold text-[#697671]">
          Tanggal acuan
          <input
            data-testid="input-dashboard-date"
            type="date"
            value={referenceDate}
            onChange={(e) => setReferenceDate(e.target.value || todayKey())}
            className="field h-10 rounded-xl border border-[#e4ded2] bg-[#fffefa] px-3 text-sm"
          />
        </label>
        <div className="ml-auto flex rounded-xl border border-[#ddd7cb] bg-[#fbf9f3] p-1">
          {(["day", "week", "month"] as WindowFilter[]).map((f, i) => (
            <button
              key={f}
              data-testid={`button-filter-${f}`}
              onClick={() => setWindowFilter(f)}
              className={`rounded-lg px-3 py-2 text-xs font-bold ${windowFilter === f ? "bg-[#267764] text-white" : "text-[#68746f]"}`}
            >
              {["Hari", "Minggu", "Bulan"][i]}
            </button>
          ))}
          <button
            data-testid="button-export-csv"
            onClick={exportCsv}
            className="ml-1 flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-[#267764]"
          >
            <Download size={14} />
            CSV
          </button>
        </div>
      </div>
      {loading ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={<TrendingUp size={18} />}
              label="Penjualan MTD"
              value={rupiah(mtd)}
              sub={`Hari ini ${rupiah(todaySales)} · target ${rupiah(targetSum)} · ${pct(mtd, targetSum).toFixed(1)}%`}
              accent="green"
            />
            <Metric
              icon={<Activity size={18} />}
              label="Eff-call"
              value={`${pct(totalEff, totalCall).toFixed(1)}%`}
              sub={`${number(totalEff)} dari ${number(totalCall)} call`}
              accent="blue"
            />
            <Metric
              icon={<BarChart3 size={18} />}
              label="Rata-rata item"
              value={totalEff ? (totalItems / totalEff).toFixed(1) : "0"}
              sub={`${number(totalItems)} item / ${number(totalEff)} eff-call`}
              accent="orange"
            />
            <Metric
              icon={<Target size={18} />}
              label="Collection"
              value={`${pct(collectionReal, collectionTarget).toFixed(1)}%`}
              sub={`${rupiah(collectionReal)} dari ${rupiah(collectionTarget)}`}
              accent="gold"
            />
          </section>
          <section className="grid gap-5 xl:grid-cols-[1.3fr_.8fr]">
            <div className="surface rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[.14em] text-[#87918b]">
                    Ritme tim
                  </div>
                  <h2 className="font-display mt-1 text-xl font-extrabold tracking-tight">
                    Penjualan 7 hari terakhir
                  </h2>
                </div>
                <span className="flex items-center gap-2 rounded-full bg-[#e4f0e9] px-3 py-1.5 text-xs font-semibold text-[#267764]">
                  <span className="h-2 w-2 rounded-full bg-[#267764]" />
                  Realisasi harian
                </span>
              </div>
              {!reportFeed.data.length ? (
                <Empty
                  icon={<BarChart3 size={22} />}
                  title="Belum ada laporan"
                  detail="Laporan yang dikirim akan membentuk tren tim di sini."
                />
              ) : (
                <div className="mt-8">
                  <div className="flex h-44 items-end gap-2 sm:gap-4">
                    {trend.map((bar, i) => (
                      <div
                        key={bar.key}
                        data-testid={`trend-day-${bar.key}`}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                      >
                        <div className="flex w-full flex-1 items-end">
                          <div
                            title={rupiah(bar.sales)}
                            className="w-full rounded-t-md bg-[#267764] transition-all duration-500 hover:bg-[#ed995f]"
                            style={{
                              height: `${Math.max(bar.sales ? 7 : 2, (bar.sales / maxTrend) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-[#929a94]">
                          {bar.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 border-t border-[#eee9df] pt-3 text-xs text-[#8a938d]">
                    Tren penjualan berdasarkan laporan harian.
                  </div>
                </div>
              )}
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-[#263841] p-6 text-[#f6f2e8]">
              <div className="absolute -right-14 -top-16 h-48 w-48 rounded-full border border-[#52636a]" />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-[#bdc9c1]">
                  <Target size={15} className="text-[#f0a064]" />
                  Pencapaian bulan ini
                </div>
                <div className="mt-7 font-display text-5xl font-extrabold tracking-[-.06em]">
                  {pct(mtd, targetSum).toFixed(1)}
                  <span className="text-2xl text-[#f0a064]">%</span>
                </div>
                <div className="mt-2 text-xs text-[#bdc9c1]">
                  penjualan aktual dibanding target terdaftar
                </div>
                <div className="mt-8">
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-[#bdc9c1]">Realisasi</span>
                    <span className="font-mono">{rupiah(mtd)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#4b5a5e]">
                    <div
                      className="h-full rounded-full bg-[#f0a064] transition-all"
                      style={{
                        width: `${Math.min(100, pct(mtd, targetSum))}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-[#99aaa3]">
                    Target: {rupiah(targetSum)}
                  </div>
                </div>
                <Link
                  href={supervisor ? "/targets" : "/reports"}
                  className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#f0a064]"
                >
                  {supervisor ? "Atur target tim" : "Lihat laporan saya"}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </section>
          <SalesmanAchievementOverview rows={rows} />
          <section className="surface overflow-hidden rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee9df] px-5 py-5 sm:px-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[.14em] text-[#87918b]">
                  Peringkat performa
                </div>
                <h2 className="font-display mt-1 text-lg font-extrabold">
                  {supervisor
                    ? "Performa anggota tim"
                    : "Ringkasan performa saya"}
                </h2>
              </div>
              <span className="text-xs text-[#8a938d]">
                Pencapaian = penjualan MTD / target bulan ini
              </span>
            </div>
            {!activePeople.length ? (
              <Empty
                icon={<Users size={22} />}
                title="Tim belum tersedia"
                detail="Anggota tim aktif akan muncul setelah supervisor menambah akun."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[740px] text-left">
                  <thead className="bg-[#f8f6f0] text-[10px] uppercase tracking-wider text-[#87918b]">
                    <tr>
                      <th className="px-5 py-3">Salesperson</th>
                      <th className="px-4 py-3">Penjualan MTD</th>
                      <th className="px-4 py-3">Pencapaian</th>
                      <th className="px-4 py-3">Eff-call</th>
                      <th className="px-4 py-3">Rata-rata item</th>
                      <th className="px-4 py-3">Collection</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee9df]">
                    {ranking.map((r, i) => (
                      <tr
                        data-testid={`row-ranking-${r.person.uid}`}
                        key={r.person.uid}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e5efe8] text-xs font-bold text-[#267764]">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <div className="text-sm font-bold text-[#34443f]">
                                {r.person.name}
                              </div>
                              <div className="text-xs text-[#929a94]">
                                {r.person.area}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs font-bold">
                          {rupiah(r.sales)}
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-mono text-xs font-bold">
                            {r.achievement.toFixed(1)}%
                          </span>
                          <div className="mt-1 h-1.5 w-24 rounded-full bg-[#eee9df]">
                            <div
                              className="h-1.5 rounded-full bg-[#267764]"
                              style={{
                                width: `${Math.min(100, r.achievement)}%`,
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <RankPill
                            value={r.effRate}
                            eligible={r.effRate >= 85}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <RankPill
                            value={r.avgItem}
                            eligible={r.avgItem >= 10}
                            suffix=""
                          />
                        </td>
                        <td className="px-4 py-4 font-mono text-xs font-bold">
                          {r.collectionRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[#eee9df] px-5 py-3 text-[10px] text-[#8a938d]">
              <span>Ranking eff-call dihitung jika ≥85%.</span>
              <span>Ranking item dihitung jika rata-rata ≥10.</span>
              <span>Collection: realisasi / target collection.</span>
            </div>
          </section>
          <section className="grid gap-4 md:grid-cols-2">
            <RankingPanel
              title="Pencapaian penjualan"
              note="MTD ÷ target bulanan"
              rows={[...rows]
                .sort((a, b) => b.achievement - a.achievement)
                .slice(0, 3)
                .map((r) => ({
                  id: r.person.uid,
                  name: r.person.name,
                  value: `${r.achievement.toFixed(1)}%`,
                }))}
            />
            <RankingPanel
              title="Eff-call terbaik"
              note="Hanya yang mencapai ≥85%"
              rows={rows
                .filter((r) => r.effRate >= 85)
                .sort((a, b) => b.effRate - a.effRate)
                .slice(0, 3)
                .map((r) => ({
                  id: r.person.uid,
                  name: r.person.name,
                  value: `${r.effRate.toFixed(1)}%`,
                }))}
            />
            <RankingPanel
              title="Rata-rata item"
              note="Hanya yang mencapai ≥10 item"
              rows={rows
                .filter((r) => r.avgItem >= 10)
                .sort((a, b) => b.avgItem - a.avgItem)
                .slice(0, 3)
                .map((r) => ({
                  id: r.person.uid,
                  name: r.person.name,
                  value: r.avgItem.toFixed(1),
                }))}
            />
            <RankingPanel
              title="Collection terbaik"
              note="Realisasi ÷ target collection"
              rows={[...rows]
                .filter((r) => r.collectionRate > 0)
                .sort((a, b) => b.collectionRate - a.collectionRate)
                .slice(0, 3)
                .map((r) => ({
                  id: r.person.uid,
                  name: r.person.name,
                  value: `${r.collectionRate.toFixed(1)}%`,
                }))}
            />
          </section>
          {supervisor && <AuditPanel />}
        </>
      )}
    </div>
  );
}
function RankPill({
  value,
  eligible,
  suffix = "%",
}: {
  value: number;
  eligible: boolean;
  suffix?: string;
}) {
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] font-bold ${eligible ? "bg-[#e2f1e9] text-[#276b50]" : "bg-[#f3eee2] text-[#907a53]"}`}
    >
      {value.toFixed(1)}
      {suffix}
      {!eligible && (
        <span className="font-sans font-medium">Belum memenuhi standar</span>
      )}
    </span>
  );
}

type AchievementMember = {
  id: string;
  name: string;
  value: string;
};

function SalesmanAchievementOverview({
  rows,
}: {
  rows: SalesmanPerformanceRow[];
}) {
  const categories: {
    id: string;
    title: string;
    target: string;
    achieved: SalesmanPerformanceRow[];
    below: SalesmanPerformanceRow[];
    formatValue: (row: SalesmanPerformanceRow) => string;
  }[] = [
    {
      id: "eff-call",
      title: "Eff Call Performance",
      target: "Target: ≥ 85%",
      achieved: rows.filter((row) => row.effRate >= 85),
      below: rows.filter((row) => row.effRate < 85),
      formatValue: (row) => `${row.effRate.toFixed(1)}%`,
    },
    {
      id: "item",
      title: "Item Performance",
      target: "Target: > 10 item / eff-call",
      achieved: rows.filter((row) => row.avgItem > 10),
      below: rows.filter((row) => row.avgItem <= 10),
      formatValue: (row) => `${row.avgItem.toFixed(1)} avg item`,
    },
  ];

  return (
    <section
      data-testid="section-salesman-achievement-overview"
      className="space-y-4"
    >
      <div>
        <div className="text-xs font-semibold uppercase tracking-[.14em] text-[#87918b]">
          Performance classification
        </div>
        <h2 className="font-display mt-1 text-xl font-extrabold tracking-tight text-[#293b3c]">
          Salesman Achievement Overview
        </h2>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {categories.map((category) => (
          <article
            key={category.id}
            data-testid={`achievement-card-${category.id}`}
            className="surface rounded-2xl p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-extrabold text-[#293b3c]">
                  {category.title}
                </h3>
                <p className="mt-1 text-xs text-[#87918b]">{category.target}</p>
              </div>
              <span className="rounded-full bg-[#f4f1e9] px-3 py-1.5 text-[11px] font-bold text-[#53635e]">
                {category.achieved.length} of {rows.length} salesmen achieved
                target
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <PerformanceGroup
                categoryId={category.id}
                title="Target Achieved"
                achieved
                members={category.achieved.map((row) => ({
                  id: row.person.uid,
                  name: row.person.name,
                  value: category.formatValue(row),
                }))}
              />
              <PerformanceGroup
                categoryId={category.id}
                title="Below Target"
                members={category.below.map((row) => ({
                  id: row.person.uid,
                  name: row.person.name,
                  value: category.formatValue(row),
                }))}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PerformanceGroup({
  categoryId,
  title,
  achieved = false,
  members,
}: {
  categoryId: string;
  title: string;
  achieved?: boolean;
  members: AchievementMember[];
}) {
  const colors = achieved
    ? {
        panel: "border-[#cfe2d5] bg-[#f3faf5]",
        title: "text-[#276b50]",
        badge: "bg-[#e2f1e9] text-[#276b50]",
        icon: "text-[#267764]",
      }
    : {
        panel: "border-[#efd5c7] bg-[#fff7f1]",
        title: "text-[#a85d39]",
        badge: "bg-[#ffeadf] text-[#a85d39]",
        icon: "text-[#c1783f]",
      };

  return (
    <div
      data-testid={`performance-group-${categoryId}-${achieved ? "achieved" : "below"}`}
      className={`rounded-xl border p-3 ${colors.panel}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className={`text-xs font-extrabold ${colors.title}`}>{title}</h4>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#65736d]">
          {members.length}
        </span>
      </div>
      {members.length ? (
        <ul className="mt-3 space-y-2">
          {members.map((member) => (
            <li
              key={member.id}
              data-testid={`achievement-${categoryId}-${achieved ? "achieved" : "below"}-${member.id}`}
              className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-white/80 px-2.5 py-2"
            >
              <span className="min-w-0 truncate text-xs font-semibold text-[#34443f]">
                {member.name}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span
                  className={`font-mono text-[11px] font-bold ${colors.icon}`}
                >
                  {member.value}
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-[9px] font-bold ${colors.badge}`}
                >
                  {achieved ? "Achieved" : "Below Target"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-lg bg-white/70 px-2.5 py-3 text-[11px] text-[#87918b]">
          No salesmen in this group.
        </p>
      )}
    </div>
  );
}

function RankingPanel({
  title,
  note,
  rows,
}: {
  title: string;
  note: string;
  rows: { id: string; name: string; value: string }[];
}) {
  return (
    <section className="surface rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-extrabold">{title}</h3>
          <p className="mt-1 text-xs text-[#87918b]">{note}</p>
        </div>
        <TrendingUp size={17} className="text-[#267764]" />
      </div>
      {rows.length ? (
        <ol className="mt-4 space-y-2">
          {rows.map((r, i) => (
            <li
              data-testid={`rank-${title.replaceAll(" ", "-").toLocaleLowerCase("id")}-${r.id}`}
              key={r.id}
              className="flex items-center gap-3 rounded-xl bg-[#f8f6f0] px-3 py-2.5"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e5efe8] font-mono text-[10px] font-bold text-[#267764]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 truncate text-sm font-semibold text-[#44554e]">
                {r.name}
              </span>
              <span className="font-mono text-xs font-bold text-[#267764]">
                {r.value}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 rounded-xl bg-[#f8f6f0] px-3 py-4 text-xs text-[#8b958e]">
          Belum ada anggota yang memenuhi kriteria.
        </p>
      )}
    </section>
  );
}

function ReportsPage({ uid, profile }: { uid: string; profile: UserProfile }) {
  const supervisor = hasSupervisorAccess(profile.role);
  const people = usePeople(uid, profile.role);
  const [selected, setSelected] = useState("");
  const scope = supervisor ? selected || undefined : profile.salespersonId;
  const feed = useReports(uid, profile, scope);
  const [period, setPeriod] = useState(monthKey());
  const [editing, setEditing] = useState<DailyReport | null>(null);
  const [notice, setNotice] = useState("");
  const [reportSentToday, setReportSentToday] = useState(false);
  const alreadySubmittedToday =
    reportSentToday || feed.data.some((r) => r.date === todayKey());
  const rows = feed.data
    .filter((r) => r.date.startsWith(period))
    .sort((a, b) => b.date.localeCompare(a.date));
  const submitReport = async (values: ReportFormValues) => {
    setNotice("");
    try {
      const salespersonId = supervisor
        ? values.salespersonId
        : profile.salespersonId;
      if (!salespersonId)
        throw new Error("Akun sales belum terhubung ke salesperson.");
      await saveDailyReport(
        { ...values, date: todayKey(), salespersonId },
        { uid, name: profile.name },
        { canCorrect: supervisor },
      );
      setReportSentToday(true);
      setNotice("Laporan berhasil disimpan.");
      return true;
    } catch (e) {
      setNotice((e as Error).message || "Laporan tidak dapat disimpan.");
      return false;
    }
  };
  const correct = async (values: ReportFormValues) => {
    if (!editing) return;
    setNotice("");
    try {
      await saveDailyReport(
        { ...values, salespersonId: editing.salespersonId },
        { uid, name: profile.name },
        { canCorrect: true, previous: editing },
      );
      setEditing(null);
      setNotice("Perubahan laporan berhasil disimpan.");
    } catch (e) {
      setNotice((e as Error).message || "Perubahan tidak dapat disimpan.");
    }
  };
  return (
    <div className="space-y-5">
      {(feed.error || people.error) && (
        <ErrorPanel message={feed.error || people.error} />
      )}
      {notice && (
        <div
          data-testid="status-report-notice"
          className={`rounded-xl px-4 py-3 text-sm ${notice.includes("berhasil") ? "border border-[#cfe2d5] bg-[#eaf4ed] text-[#276b50]" : "border border-[#e7c8c0] bg-[#fff0eb] text-[#994d41]"}`}
        >
          {notice}
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        {!supervisor &&
          (feed.loading ? (
            <Skeleton className="h-80" />
          ) : alreadySubmittedToday ? (
            <section
              data-testid="status-report-already-submitted"
              className="surface rounded-2xl p-5 sm:p-6"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e4f0e9] text-[#267764]">
                  <Check size={18} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-extrabold">
                    Laporan hari ini sudah dikirim
                  </h2>
                  <p className="mt-1 text-xs text-[#87918b]">
                    Salesman hanya dapat mengirim satu laporan per hari. Hubungi
                    supervisor jika perlu koreksi.
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <ReportEntry uid={uid} profile={profile} onSubmit={submitReport} />
          ))}
        <section className="surface overflow-hidden rounded-2xl xl:col-span-1">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee9df] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e4efe8] text-[#267764]">
                <ClipboardList size={18} />
              </div>
              <div>
                <h2 className="font-display text-lg font-extrabold">
                  {supervisor ? "Riwayat laporan tim" : "Riwayat laporan saya"}
                </h2>
                <p className="mt-0.5 text-xs text-[#87918b]">
                  {supervisor
                    ? "Tinjau dan koreksi laporan harian."
                    : "Laporan yang sudah Anda kirim."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {supervisor && (
                <select
                  data-testid="select-salesperson-reports"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="field h-10 rounded-xl border border-[#e4ded2] bg-[#fffefa] px-3 text-sm"
                >
                  <option value="">Seluruh tim</option>
                  {people.data.map((p) => (
                    <option key={p.uid} value={p.uid}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <input
                data-testid="input-report-month"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="field h-10 rounded-xl border border-[#e4ded2] bg-[#fffefa] px-3 text-sm"
              />
            </div>
          </div>
          {feed.loading ? (
            <div className="space-y-3 p-5">
              <Skeleton />
              <Skeleton />
            </div>
          ) : !rows.length ? (
            <Empty
              icon={<ClipboardList size={22} />}
              title="Belum ada laporan pada periode ini"
              detail={
                supervisor
                  ? "Laporan tim akan muncul setelah dikirim."
                  : "Isi formulir untuk mencatat aktivitas harian Anda."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-[#f8f6f0] text-[10px] uppercase tracking-wider text-[#87918b]">
                  <tr>
                    <th className="px-5 py-3">Tanggal / sales</th>
                    <th className="px-3 py-3">Penjualan</th>
                    <th className="px-3 py-3">Call / eff</th>
                    <th className="px-3 py-3">Item</th>
                    <th className="px-3 py-3">Collection</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee9df]">
                  {rows.map((r) => (
                    <tr key={r.id} data-testid={`row-report-${r.id}`}>
                      <td className="px-5 py-4">
                        <div className="text-sm font-bold text-[#34443f]">
                          {dateText(r.date)}
                        </div>
                        {supervisor && (
                          <div className="text-xs text-[#929a94]">
                            {people.data.find((p) => p.uid === r.salespersonId)
                              ?.name || "Salesperson"}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-4 font-mono text-xs font-bold">
                        {rupiah(r.salesToday)}
                      </td>
                      <td className="px-3 py-4 text-xs">
                        {number(r.call)} / {number(r.effCall)}
                      </td>
                      <td className="px-3 py-4 text-xs">
                        {number(r.totalItem)}
                      </td>
                      <td className="px-3 py-4 text-xs">
                        {rupiah(r.collectionReal)}
                        <div className="text-[10px] text-[#929a94]">
                          target {rupiah(r.collectionTarget)}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        {supervisor && (
                          <button
                            data-testid={`button-edit-report-${r.id}`}
                            onClick={() => setEditing(r)}
                            className="rounded-lg p-2 text-[#267764] hover:bg-[#e5efe8]"
                            title="Koreksi laporan"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {supervisor && <AuditPanel />}
      {editing && (
        <ReportEditDialog
          row={editing}
          personName={
            people.data.find((p) => p.uid === editing.salespersonId)?.name || ""
          }
          onClose={() => setEditing(null)}
          onSave={correct}
        />
      )}
    </div>
  );
}

type ReportFormValues = {
  date: string;
  salespersonId: string;
  salesToday: number;
  call: number;
  effCall: number;
  totalItem: number;
  collectionTarget: number;
  collectionReal: number;
};
function ReportEntry({
  uid,
  profile,
  onSubmit,
}: {
  uid: string;
  profile: UserProfile;
  onSubmit: (v: ReportFormValues) => Promise<boolean>;
}) {
  const [saving, setSaving] = useState(false);
  const form = useForm<ReportFormValues>({
    defaultValues: {
      date: todayKey(),
      salespersonId: profile.salespersonId || "",
      salesToday: 0,
      call: 0,
      effCall: 0,
      totalItem: 0,
      collectionTarget: 0,
      collectionReal: 0,
    },
  });
  const submit = form.handleSubmit(async (values) => {
    setSaving(true);
    const ok = await onSubmit(values);
    if (ok)
      form.reset({
        ...values,
        date: todayKey(),
        salesToday: 0,
        call: 0,
        effCall: 0,
        totalItem: 0,
        collectionTarget: 0,
        collectionReal: 0,
      });
    setSaving(false);
  });
  return (
    <section className="surface rounded-2xl p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff0e2] text-[#c1783f]">
          <Plus size={18} />
        </div>
        <div>
          <h2 className="font-display text-lg font-extrabold">
            Laporan harian
          </h2>
          <p className="text-xs text-[#87918b]">
            Masukkan angka aktivitas hari ini.
          </p>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className="text-xs font-semibold text-[#56635f]">
              Tanggal laporan
            </div>
            <div
              data-testid="text-report-date"
              className="mt-1.5 flex h-10 items-center rounded-xl border border-[#e4ded2] bg-[#f4f1e9] px-3 text-sm text-[#53635e]"
            >
              {dateText(todayKey())}
            </div>
          </div>
          <FormNumber
            form={form}
            name="salesToday"
            label="Penjualan hari ini (Rp)"
            testId="input-report-sales"
          />
          <FormNumber
            form={form}
            name="call"
            label="Call"
            testId="input-report-call"
          />
          <FormNumber
            form={form}
            name="effCall"
            label="Eff-call"
            testId="input-report-effcall"
          />
          <FormNumber
            form={form}
            name="totalItem"
            label="Total item"
            testId="input-report-items"
          />
          <FormNumber
            form={form}
            name="collectionTarget"
            label="Target collection (Rp)"
            testId="input-collection-target"
          />
          <FormNumber
            form={form}
            name="collectionReal"
            label="Collection aktual (Rp)"
            testId="input-collection-real"
          />
          <button
            data-testid="button-submit-report"
            disabled={saving}
            className="btn mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#267764] px-4 text-sm font-bold text-white disabled:opacity-60 sm:col-span-2"
          >
            {saving ? "Menyimpan…" : "Kirim laporan"}
            <ArrowRight size={16} />
          </button>
        </form>
      </Form>
    </section>
  );
}
function FormNumber({
  form,
  name,
  label,
  testId,
  type = "number",
  disabled = false,
}: {
  form: ReturnType<typeof useForm<any>>;
  name: string;
  label: string;
  testId: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-semibold text-[#56635f]">
            {label}
          </FormLabel>
          <FormControl>
            <input
              data-testid={testId}
              type={type}
              min={type === "number" ? 0 : undefined}
              step={type === "number" ? 1 : undefined}
              disabled={disabled}
              {...field}
              onChange={(e) => {
                const value = e.target.value;

                field.onChange(
                  type === "number"
                    ? value === ""
                      ? ""
                      : Number(value)
                    : value,
                );
              }}
              className="field h-10 w-full rounded-xl border border-[#e4ded2] bg-[#fffefa] px-3 text-sm disabled:bg-[#f2eee5] disabled:text-[#8b958e]"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
function ReportEditDialog({
  row,
  personName,
  onClose,
  onSave,
}: {
  row: DailyReport;
  personName: string;
  onClose: () => void;
  onSave: (v: ReportFormValues) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const form = useForm<ReportFormValues>({
    defaultValues: {
      date: row.date,
      salespersonId: row.salespersonId,
      salesToday: row.salesToday,
      call: row.call,
      effCall: row.effCall,
      totalItem: row.totalItem,
      collectionTarget: row.collectionTarget,
      collectionReal: row.collectionReal,
    },
  });
  const submit = form.handleSubmit(async (v) => {
    setSaving(true);
    await onSave(v);
    setSaving(false);
  });
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#17232acc] p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-report-title"
        className="surface max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl p-5 sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2
              id="edit-report-title"
              className="font-display text-xl font-extrabold"
            >
              Koreksi laporan
            </h2>
            <p className="mt-1 text-xs text-[#87918b]">
              {personName} · {dateText(row.date)}
            </p>
          </div>
          <button
            data-testid="button-close-edit-report"
            onClick={onClose}
            className="rounded-lg p-2 text-[#718079] hover:bg-[#f2eee5]"
          >
            <X size={18} />
          </button>
        </div>
        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <FormNumber
              form={form}
              name="date"
              label="Tanggal"
              type="date"
              testId="input-edit-report-date"
              disabled
            />
            <FormNumber
              form={form}
              name="salesToday"
              label="Penjualan (Rp)"
              testId="input-edit-report-sales"
            />
            <FormNumber
              form={form}
              name="call"
              label="Call"
              testId="input-edit-report-call"
            />
            <FormNumber
              form={form}
              name="effCall"
              label="Eff-call"
              testId="input-edit-report-effcall"
            />
            <FormNumber
              form={form}
              name="totalItem"
              label="Total item"
              testId="input-edit-report-items"
            />
            <FormNumber
              form={form}
              name="collectionTarget"
              label="Target collection (Rp)"
              testId="input-edit-collection-target"
            />
            <FormNumber
              form={form}
              name="collectionReal"
              label="Collection aktual (Rp)"
              testId="input-edit-collection-real"
            />
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="button"
                data-testid="button-cancel-edit-report"
                onClick={onClose}
                className="h-11 flex-1 rounded-xl border border-[#ddd7cb] text-sm font-bold text-[#62716b]"
              >
                Batal
              </button>
              <button
                data-testid="button-save-edit-report"
                disabled={saving}
                className="h-11 flex-1 rounded-xl bg-[#267764] text-sm font-bold text-white"
              >
                {saving ? "Menyimpan…" : "Simpan koreksi"}
              </button>
            </div>
          </form>
        </Form>
      </section>
    </div>
  );
}

function TargetsPage({ uid, profile }: { uid: string; profile: UserProfile }) {
  const people = usePeople(uid, profile.role);
  const [selected, setSelected] = useState("");
  const targets = useTargets(selected || undefined);
  const [period, setPeriod] = useState(monthKey());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const active = people.data.filter((p) => p.status === "active");
  const form = useForm<{ targets: Record<string, string> }>({
    defaultValues: { targets: {} },
  });
  useEffect(() => {
    const next: Record<string, string> = {};

    for (const person of active) {
      const target = targets.data.find(
        (t) => t.period === period && t.salespersonId === person.uid,
      );

      next[person.uid] = target === undefined ? "" : String(target.targetSales);
    }

    form.reset({ targets: next });
  }, [targets.data, period, active.length]);
  const saveAll = form.handleSubmit(async (values) => {
    setSaving(true);
    setMessage("");
    try {
      const selectedPeople = selected
        ? active.filter((p) => p.uid === selected)
        : active;
      let savedCount = 0;
      for (const p of selectedPeople) {
        const rawTarget = values.targets[p.uid] ?? "";
        if (rawTarget === "") continue;

        const targetSales = Number(rawTarget);
        if (!Number.isSafeInteger(targetSales) || targetSales < 0) {
          throw new Error("Target harus berupa angka bulat nol atau lebih.");
        }
        if (targetSales === 0) continue;

        await saveTarget(
          {
            period,
            salespersonId: p.uid,
            targetSales,
          },
          { uid, name: profile.name },
        );
        savedCount += 1;
      }
      setMessage(
        savedCount
          ? `Target ${savedCount} sales berhasil disimpan.`
          : "Masukkan target lebih dari nol.",
      );
    } catch (e) {
      setMessage((e as Error).message || "Target tidak dapat disimpan.");
    } finally {
      setSaving(false);
    }
  });
  return (
    <div className="space-y-5">
      {(people.error || targets.error) && (
        <ErrorPanel message={people.error || targets.error} />
      )}
      {message && (
        <div
          data-testid="status-target-save"
          className={`rounded-xl px-4 py-3 text-sm ${message.includes("berhasil") ? "border border-[#cfe2d5] bg-[#eaf4ed] text-[#276b50]" : "border border-[#e7c8c0] bg-[#fff0eb] text-[#994d41]"}`}
        >
          {message}
        </div>
      )}
      <section className="surface overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee9df] p-5 sm:p-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.14em] text-[#87918b]">
              Perencanaan
            </div>
            <h2 className="font-display mt-1 text-lg font-extrabold">
              Target penjualan bulanan
            </h2>
            <p className="mt-1 text-xs text-[#87918b]">
              Atur target per anggota. Perubahan tersimpan sebagai riwayat
              target.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              data-testid="input-target-period"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="field h-10 rounded-xl border border-[#e4ded2] bg-[#fffefa] px-3 text-sm"
            />
            <select
              data-testid="select-target-salesperson"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="field h-10 rounded-xl border border-[#e4ded2] bg-[#fffefa] px-3 text-sm"
            >
              <option value="">Semua salesperson</option>
              {people.data.map((p) => (
                <option key={p.uid} value={p.uid}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {people.loading || targets.loading ? (
          <div className="space-y-3 p-5">
            <Skeleton />
            <Skeleton />
          </div>
        ) : !active.length ? (
          <Empty
            icon={<Target size={22} />}
            title="Belum ada salesperson aktif"
            detail="Tambahkan anggota tim sebelum mengatur target."
          />
        ) : (
          <Form {...form}>
            <form onSubmit={saveAll}>
              <div className="divide-y divide-[#eee9df]">
                {active
                  .filter((p) => !selected || p.uid === selected)
                  .map((p) => {
                    const history = targets.data
                      .filter((t) => t.salespersonId === p.uid)
                      .sort((a, b) => b.period.localeCompare(a.period));
                    return (
                      <div
                        key={p.uid}
                        data-testid={`row-target-${p.uid}`}
                        className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_220px_1fr] sm:items-center sm:px-6"
                      >
                        <div>
                          <div className="text-sm font-bold text-[#34443f]">
                            {p.name}
                          </div>
                          <div className="mt-0.5 text-xs text-[#929a94]">
                            {p.area} · {history.length} periode tersimpan
                          </div>
                        </div>
                        <FormField
                          control={form.control}
                          name={`targets.${p.uid}`}
                          rules={{
                            validate: (value) =>
                              value === "" ||
                              /^\d+$/.test(value) ||
                              "Target harus berupa angka bulat nol atau lebih.",
                          }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="sr-only">
                                Target {p.name}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#87918b]">
                                    Rp
                                  </span>
                                  <input
                                    data-testid={"input-target-${p.uid}"}
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    step={1}
                                    name={field.name}
                                    ref={field.ref}
                                    value={field.value ?? ""}
                                    onBlur={field.onBlur}
                                    onChange={(e) => {
                                      const value = e.currentTarget.value;

                                      if (/^\d*$/.test(value)) {
                                        field.onChange(value);
                                      }
                                    }}
                                    className="field h-10 w-full rounded-xl border border-[#e4ded2] bg-[#fffefa] pl-9 pr-3 text-sm"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="text-xs text-[#77847d]">
                          <span className="font-semibold">Riwayat:</span>{" "}
                          {history
                            .slice(0, 3)
                            .map((t) => `${t.period} ${rupiah(t.targetSales)}`)
                            .join(" · ") || "Belum ada"}
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className="flex justify-end border-t border-[#eee9df] p-5">
                <button
                  data-testid="button-save-targets"
                  disabled={saving}
                  className="btn flex h-11 items-center gap-2 rounded-xl bg-[#267764] px-5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {saving ? "Menyimpan…" : "Simpan target"}
                  <Check size={16} />
                </button>
              </div>
            </form>
          </Form>
        )}
      </section>
    </div>
  );
}

function TeamPage({ uid, profile }: { uid: string; profile: UserProfile }) {
  const people = usePeople(uid, profile.role);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Salesperson | null>(null);
  const [message, setMessage] = useState("");
  const filtered = people.data.filter((p) =>
    `${p.name} ${p.email} ${p.employeeId} ${p.area}`
      .toLocaleLowerCase("id")
      .includes(query.toLocaleLowerCase("id")),
  );
  const submitCreate = async (v: TeamFormValues) => {
    setMessage("");
    try {
      await createSalespersonAccount(
        {
          employeeId: v.employeeId,
          name: v.name,
          email: v.email,
          password: v.password,
          area: v.area,
        },
        { uid, name: profile.name },
      );
      setShowForm(false);
      setMessage("Akun salesperson berhasil dibuat.");
    } catch (e) {
      setMessage((e as Error).message || "Akun tidak dapat dibuat.");
    }
  };
  const submitEdit = async (v: TeamFormValues) => {
    if (!editing) return;
    setMessage("");
    try {
      await updateSalesperson(
        {
          uid: editing.uid,
          employeeId: v.employeeId,
          name: v.name,
          area: v.area,
          status: v.status as AccountStatus,
        },
        { uid, name: profile.name },
      );
      setEditing(null);
      setMessage("Data salesperson berhasil diperbarui.");
    } catch (e) {
      setMessage((e as Error).message || "Data tidak dapat diperbarui.");
    }
  };
  return (
    <div className="space-y-5">
      {people.error && <ErrorPanel message={people.error} />}
      {message && (
        <div
          data-testid="status-team-action"
          className={`rounded-xl px-4 py-3 text-sm ${message.includes("berhasil") ? "border border-[#cfe2d5] bg-[#eaf4ed] text-[#276b50]" : "border border-[#e7c8c0] bg-[#fff0eb] text-[#994d41]"}`}
        >
          {message}
        </div>
      )}
      <section className="surface overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee9df] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e4efe8] text-[#267764]">
              <Users size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-extrabold">
                Anggota tim
              </h2>
              <p className="mt-0.5 text-xs text-[#87918b]">
                {people.data.length} dari 6 akun salesperson
              </p>
            </div>
          </div>
          <button
            data-testid="button-add-salesperson"
            disabled={people.data.length >= 6}
            onClick={() => {
              setShowForm(true);
              setMessage("");
            }}
            className="btn flex h-10 items-center gap-2 rounded-xl bg-[#267764] px-4 text-xs font-bold text-white disabled:opacity-50"
          >
            <Plus size={16} />
            Tambah anggota
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee9df] px-5 py-4 sm:px-6">
          <div className="relative w-full max-w-sm">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98a099]"
            />
            <input
              data-testid="input-search-team"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, ID, wilayah…"
              className="field h-10 w-full rounded-xl border border-[#e4ded2] bg-[#fffefa] pl-10 pr-4 text-sm"
            />
          </div>
          <div className="text-xs text-[#89928c]">
            {filtered.length} anggota ditampilkan
          </div>
        </div>
        {people.loading ? (
          <div className="space-y-3 p-5">
            <Skeleton />
            <Skeleton />
          </div>
        ) : !filtered.length ? (
          <Empty
            icon={<Users size={22} />}
            title={query ? "Tidak ada hasil" : "Belum ada anggota tim"}
            detail={
              query
                ? "Coba kata pencarian lain."
                : "Tambahkan salesperson pertama untuk mulai."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="bg-[#f8f6f0] text-[10px] uppercase tracking-wider text-[#87918b]">
                <tr>
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-4 py-3">ID karyawan</th>
                  <th className="px-4 py-3">Wilayah</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee9df]">
                {filtered.map((p) => (
                  <tr data-testid={`row-salesperson-${p.uid}`} key={p.uid}>
                    <td className="px-5 py-4">
                      <div className="text-sm font-bold text-[#34443f]">
                        {p.name}
                      </div>
                      <div className="text-xs text-[#929a94]">{p.email}</div>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs">
                      {p.employeeId}
                    </td>
                    <td className="px-4 py-4 text-sm">{p.area}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${p.status === "active" ? "bg-[#e2f1e9] text-[#276b50]" : "bg-[#f0ede7] text-[#73716a]"}`}
                      >
                        {p.status === "active" ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        data-testid={`button-edit-salesperson-${p.uid}`}
                        onClick={() => setEditing(p)}
                        className="rounded-lg p-2 text-[#267764] hover:bg-[#e5efe8]"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {showForm && (
        <TeamDialog
          title="Tambah salesperson"
          onClose={() => setShowForm(false)}
          onSave={submitCreate}
        />
      )}
      {editing && (
        <TeamDialog
          title="Edit salesperson"
          person={editing}
          onClose={() => setEditing(null)}
          onSave={submitEdit}
        />
      )}
    </div>
  );
}
type TeamFormValues = {
  employeeId: string;
  name: string;
  email: string;
  password: string;
  area: string;
  status: string;
};
function TeamDialog({
  title,
  person,
  onClose,
  onSave,
}: {
  title: string;
  person?: Salesperson;
  onClose: () => void;
  onSave: (v: TeamFormValues) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const form = useForm<TeamFormValues>({
    defaultValues: {
      employeeId: person?.employeeId || "",
      name: person?.name || "",
      email: person?.email || "",
      password: "",
      area: person?.area || "",
      status: person?.status || "active",
    },
  });
  const submit = form.handleSubmit(async (v) => {
    setBusy(true);
    await onSave(v);
    setBusy(false);
  });
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#17232acc] p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        className="surface max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl p-5 sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-extrabold">{title}</h2>
            <p className="mt-1 text-xs text-[#87918b]">
              {person
                ? "Perbarui data akses atau nonaktifkan akun."
                : "Akun baru akan menerima akses laporan harian."}
            </p>
          </div>
          <button
            data-testid="button-close-team-dialog"
            onClick={onClose}
            className="rounded-lg p-2 text-[#718079] hover:bg-[#f2eee5]"
          >
            <X size={18} />
          </button>
        </div>
        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <TeamField
              form={form}
              name="employeeId"
              label="ID karyawan"
              testId="input-team-employeeid"
            />
            <TeamField
              form={form}
              name="name"
              label="Nama lengkap"
              testId="input-team-name"
            />
            <TeamField
              form={form}
              name="email"
              label="Email"
              testId="input-team-email"
              type="email"
            />
            {!person && (
              <TeamField
                form={form}
                name="password"
                label="Kata sandi awal"
                testId="input-team-password"
                type="password"
              />
            )}
            <TeamField
              form={form}
              name="area"
              label="Wilayah / area"
              testId="input-team-area"
            />
            {person && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-[#56635f]">
                      Status akun
                    </FormLabel>
                    <select
                      data-testid="select-team-status"
                      {...field}
                      className="field h-10 w-full rounded-xl border border-[#e4ded2] bg-[#fffefa] px-3 text-sm"
                    >
                      <option value="active">Aktif</option>
                      <option value="inactive">Nonaktif</option>
                    </select>
                  </FormItem>
                )}
              />
            )}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="button"
                data-testid="button-cancel-team-dialog"
                onClick={onClose}
                className="h-11 flex-1 rounded-xl border border-[#ddd7cb] text-sm font-bold text-[#62716b]"
              >
                Batal
              </button>
              <button
                data-testid="button-save-team-member"
                disabled={busy}
                className="h-11 flex-1 rounded-xl bg-[#267764] text-sm font-bold text-white"
              >
                {busy ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </form>
        </Form>
      </section>
    </div>
  );
}
function TeamField({
  form,
  name,
  label,
  testId,
  type = "text",
}: {
  form: ReturnType<typeof useForm<any>>;
  name: string;
  label: string;
  testId: string;
  type?: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      rules={{ required: "Wajib diisi" }}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-semibold text-[#56635f]">
            {label}
          </FormLabel>
          <FormControl>
            <input
              data-testid={testId}
              type="text"
              inputMode="text"
              pattern=".*"
              autoComplete="off"
              value={String(field.value ?? "")}
              onChange={(e) => {
                let value = e.target.value;

                if (value === "") {
                  field.onChange("");
                  return;
                }

                value = value.replace(/^0+/, "");

                field.onChange(value);
              }}
              className="field h-10 w-full rounded-xl border border-[#e4ded2] bg-[#fffefa] px-3 text-sm"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function AuditPanel() {
  const feed = useFeed<AuditLog>(
    (ok, fail) => subscribeAuditLogs(ok, fail),
    [],
  );
  return (
    <section className="surface overflow-hidden rounded-2xl">
      <div className="border-b border-[#eee9df] px-5 py-5 sm:px-6">
        <div className="text-xs font-semibold uppercase tracking-[.14em] text-[#87918b]">
          Jejak perubahan
        </div>
        <h2 className="font-display mt-1 text-lg font-extrabold">
          Riwayat audit
        </h2>
        <p className="mt-1 text-xs text-[#87918b]">
          Perubahan target, laporan, dan akun tim.
        </p>
      </div>
      {feed.loading ? (
        <div className="p-5">
          <Skeleton className="h-24" />
        </div>
      ) : feed.error ? (
        <div className="p-5">
          <ErrorPanel message={feed.error} />
        </div>
      ) : !feed.data.length ? (
        <Empty
          icon={<Clock3 size={22} />}
          title="Belum ada aktivitas tercatat"
          detail="Perubahan berikutnya akan tercatat di sini."
        />
      ) : (
        <div className="divide-y divide-[#eee9df]">
          {[...feed.data].slice(0, 12).map((log) => (
            <div
              data-testid={`row-audit-${log.id}`}
              key={log.id}
              className="flex gap-3 px-5 py-4 sm:px-6"
            >
              <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f3eee2] text-[#9a7941]">
                <Clock3 size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[#34443f]">
                  {log.summary}
                </div>
                <div className="mt-1 text-xs text-[#929a94]">
                  {log.actorName} · {log.entityType} · {log.action}
                </div>
              </div>
              <time className="shrink-0 text-[10px] text-[#929a94]">
                {dateText(String(log.createdAt || "").slice(0, 10))}
              </time>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src={indomarcoLogo}
        alt="Indomarco"
        className={`h-auto shrink-0 ${light ? "w-[156px] sm:w-[190px]" : "w-[118px]"}`}
      />
      <div className="min-w-0">
        <div
          className={`font-display text-[11px] font-bold leading-tight ${light ? "text-[#174f93]" : "text-white"}`}
        >
          PT Indomarco Adi Prima
        </div>
        <div
          className={`mt-1 text-[9px] leading-tight ${light ? "text-[#63758a]" : "text-[#c2d2e5]"}`}
        >
          Cabang Malang - Depo Jombang
        </div>
      </div>
    </div>
  );
}
function AlertBox({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      data-testid="status-auth-error"
      className="rounded-xl border border-[#eac9c1] bg-[#fff0eb] px-4 py-3 text-sm text-[#9d4239] flex gap-2"
    >
      <CircleAlert size={17} className="mt-0.5 shrink-0" />
      {children}
    </div>
  );
}
function ConfigNotice() {
  return (
    <CenteredState
      title="Firebase belum dikonfigurasi"
      detail="Tambahkan konfigurasi Firebase pada environment aplikasi untuk mengaktifkan autentikasi dan sinkronisasi data."
    />
  );
}
function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="min-h-[100dvh] bg-[#f4f1e9] grid place-items-center">
      <div className="flex items-center gap-3 text-sm text-[#66736e]">
        <span className="h-8 w-8 animate-pulse rounded-xl bg-[#d7e5dd]" />
        {label}
      </div>
    </div>
  );
}
function CenteredState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <main className="min-h-[100dvh] bg-[#f4f1e9] grid place-items-center p-6">
      <div className="surface max-w-lg rounded-2xl p-8">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff0d9] text-[#a36d20]">
          <CircleAlert />
        </div>
        <h1 className="font-display mt-5 text-2xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#697671]">{detail}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </main>
  );
}
function AccessDenied({ onSignOut }: { onSignOut: () => void }) {
  return (
    <CenteredState
      title="Akses belum tersedia"
      detail="Akun ini belum memiliki profil aktif. Hubungi supervisor untuk memeriksa akses Anda."
      action={
        <button
          data-testid="button-denied-signout"
          onClick={onSignOut}
          className="rounded-xl bg-[#267764] px-4 py-2 text-sm font-bold text-white"
        >
          Keluar
        </button>
      }
    />
  );
}
function NotFound() {
  return (
    <div className="surface rounded-2xl p-8 text-center">
      <div className="font-mono text-xs uppercase tracking-[.2em] text-[#267764]">
        404 · Tidak ditemukan
      </div>
      <h2 className="font-display mt-3 text-2xl font-extrabold">
        Halaman ini tidak tersedia
      </h2>
      <p className="mt-2 text-sm text-[#74807b]">
        Periksa alamat atau kembali ke monitor penjualan.
      </p>
      <Link
        data-testid="link-not-found-dashboard"
        href="/dashboard"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#267764] px-4 py-2.5 text-sm font-bold text-white"
      >
        Ke monitor
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
function authError(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found"
  )
    return "Email atau kata sandi tidak sesuai.";
  if (code === "auth/invalid-email") return "Format email tidak valid.";
  return (
    (error as Error)?.message ||
    "Tidak dapat memproses permintaan. Coba kembali."
  );
}

export default App;
