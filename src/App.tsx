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
import indomarcoLogo from "@/assets/INDOMARCO.png";

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

export default App;

