import { runAuditedProcess, auditUiError, auditCaughtError } from "../../../lib/processAudit";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { User, Mail, Phone, Lock, Eye, EyeOff, MapPin, Camera, Wrench, CheckCircle2, ShieldCheck, ArrowLeft, Search, Loader2, } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents, } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import CaptchaVerificationModal from "../../../components/auth/CaptchaVerificationModal";
import EmailOtpModal from "../../../components/auth/EmailOtpModal";
import { registerUser } from "../../../services/authService";
import { isDisposableEmail } from "../../../utils/disposableEmail";
import { savePendingProfilePicture } from "../../../utils/pendingProfilePicture";
// ======================================================
// LEAFLET MARKER FIX
// ======================================================
delete (L.Icon.Default.prototype as unknown as {
    _getIconUrl?: unknown;
})._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
// ======================================================
// STYLES
// ======================================================
const inputWrap = "flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 transition focus-within:border-[#2937f0] focus-within:ring-4 focus-within:ring-[#2937f0]/10 dark:border-slate-700 dark:bg-slate-800";
const inputBase = "w-full bg-transparent py-3.5 text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:text-white";
const selectBase = "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 dark:text-white outline-none transition focus:border-[#2937f0] focus:ring-4 focus:ring-[#2937f0]/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const label = "text-sm font-semibold text-slate-700 dark:text-slate-200";
const RELIGION_OPTIONS = [
    "Roman Catholic",
    "Iglesia ni Cristo",
    "Islam",
    "Born Again Christian",
    "Protestant",
    "Seventh-day Adventist",
    "Jehovah's Witness",
    "Buddhist",
    "Hindu",
    "Indigenous belief",
    "Other",
    "Prefer not to say",
] as const;
// ======================================================
// MAP TYPES
// ======================================================
interface MapSearchResult {
    display_name: string;
    lat: string;
    lon: string;
}
interface AddressDetails {
    houseNo?: string;
    street?: string;
    barangay?: string;
    municipality?: string;
    province?: string;
}
// ======================================================
// DEFAULT MAP CENTER
// General Philippines location only.
// ======================================================
const DEFAULT_MAP_CENTER: [
    number,
    number
] = [14.5995, 120.9842];
// ======================================================
// MAP VIEW CONTROLLER
// ======================================================
function MapViewController({ latitude, longitude, }: {
    latitude: number | null;
    longitude: number | null;
}) {
    const map = useMap();
    useEffect(() => {
        if (latitude !== null && longitude !== null) {
            map.flyTo([latitude, longitude], 17, {
                animate: true,
                duration: 0.8,
            });
        }
    }, [latitude, longitude, map]);
    return null;
}
// ======================================================
// MAP CLICK HANDLER
// ======================================================
function MapClickHandler({ onSelect, }: {
    onSelect: (latitude: number, longitude: number) => void;
}) {
    useMapEvents({
        click(event) {
            onSelect(event.latlng.lat, event.latlng.lng);
        },
    });
    return null;
}
// ======================================================
// CUSTOMER REGISTER
// ======================================================
export default function CustomerRegister() {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    // ======================================================
    // PERSONAL INFORMATION
    // ======================================================
    const [firstName, setFirstName] = useState("");
    const [middleName, setMiddleName] = useState("");
    const [lastName, setLastName] = useState("");
    const [gender, setGender] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [civilStatus, setCivilStatus] = useState("");
    const [religion, setReligion] = useState("");
    // ======================================================
    // CONTACT
    // ======================================================
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    // ======================================================
    // ADDRESS
    // ======================================================
    const [houseNo, setHouseNo] = useState("");
    const [street, setStreet] = useState("");
    const [barangay, setBarangay] = useState("");
    const [municipality, setMunicipality] = useState("");
    const [province, setProvince] = useState("");
    // ======================================================
    // MAP LOCATION
    // ======================================================
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [mapAddress, setMapAddress] = useState("");
    const [mapSearch, setMapSearch] = useState("");
    const [mapSearchResults, setMapSearchResults] = useState<MapSearchResult[]>([]);
    const [mapSearching, setMapSearching] = useState(false);
    const [mapResolving, setMapResolving] = useState(false);
    const [locationConfirmed, setLocationConfirmed] = useState(false);
    // ======================================================
    // PROFILE
    // ======================================================
    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    // ======================================================
    // PASSWORD
    // ======================================================
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    // ======================================================
    // REGISTRATION STATE
    // ======================================================
    const [loading, setLoading] = useState(false);
    const [captchaWidgetKey, setCaptchaWidgetKey] = useState(0);
    const [captchaOpen, setCaptchaOpen] = useState(false);
    const [pendingRegistration, setPendingRegistration] = useState(false);
    const [otpModalOpen, setOtpModalOpen] = useState(false);
    const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
    // ======================================================
    // SEARCH ADDRESS
    // ======================================================
    async function searchAddress() {
        const query = mapSearch.trim();
        if (!query) {
            toast.warning("Please enter an address to search.");
            return;
        }
        try {
            setMapSearching(true);
            setMapSearchResults([]);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=ph&limit=5&addressdetails=1`, {
                headers: {
                    Accept: "application/json",
                    "Accept-Language": "en",
                },
            });
            if (!response.ok) {
                throw new Error("Address search failed.");
            }
            const results = (await response.json()) as MapSearchResult[];
            if (!results.length) {
                toast.warning("No matching address was found. Try entering a more complete address.");
                return;
            }
            setMapSearchResults(results);
        }
        catch (error) {
            auditCaughtError({ module: "Authentication", process: "searchAddress", action: "CREATE" }, error);
            console.error("Address search error:", error);
            auditUiError({ module: "Authentication", process: "searchAddress", action: "CREATE" }, toast.error, "Unable to search the address. Please try again.");
        }
        finally {
            setMapSearching(false);
        }
    }
    // ======================================================
    // REVERSE GEOCODE
    // ======================================================
    async function reverseGeocode(lat: number, lon: number) {
        try {
            setMapResolving(true);
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1`, {
                headers: {
                    Accept: "application/json",
                    "Accept-Language": "en",
                },
            });
            if (!response.ok) {
                throw new Error("Reverse geocoding failed.");
            }
            const data = await response.json();
            const address = data?.address ?? {};
            const details: AddressDetails = {
                houseNo: address.house_number ?? "",
                street: address.road ?? address.pedestrian ?? address.residential ?? "",
                barangay: address.suburb ?? address.sublocality ?? address.quarter ?? "",
                municipality: address.city ??
                    address.town ??
                    address.municipality ??
                    address.city_district ??
                    "",
                province: address.state ?? address.province ?? "",
            };
            if (details.houseNo) {
                setHouseNo(details.houseNo);
            }
            if (details.street) {
                setStreet(details.street);
            }
            if (details.barangay) {
                setBarangay(details.barangay);
            }
            if (details.municipality) {
                setMunicipality(details.municipality);
            }
            if (details.province) {
                setProvince(details.province);
            }
            if (data?.display_name) {
                setMapAddress(data.display_name);
            }
            return data?.display_name ?? "";
        }
        catch (error) {
            auditCaughtError({ module: "Authentication", process: "reverseGeocode", action: "EXECUTE" }, error);
            console.error("Reverse geocoding error:", error);
            toast.warning("The location was selected, but the address details could not be retrieved. You may enter them manually.");
            return "";
        }
        finally {
            setMapResolving(false);
        }
    }
    // ======================================================
    // SELECT MAP LOCATION
    // ======================================================
    async function selectMapLocation(lat: number, lon: number, providedAddress?: string) {
        setLatitude(lat);
        setLongitude(lon);
        // New location must be confirmed again.
        setLocationConfirmed(false);
        if (providedAddress) {
            setMapAddress(providedAddress);
        }
        const resolvedAddress = await reverseGeocode(lat, lon);
        if (!providedAddress && resolvedAddress) {
            setMapAddress(resolvedAddress);
        }
    }
    // ======================================================
    // SEARCH RESULT SELECTION
    // ======================================================
    async function selectSearchResult(result: MapSearchResult) {
        const lat = Number(result.lat);
        const lon = Number(result.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            auditUiError({ module: "Authentication", process: "selectSearchResult", action: "READ" }, toast.error, "Invalid map location.");
            return;
        }
        setMapSearchResults([]);
        setMapSearch(result.display_name);
        await selectMapLocation(lat, lon, result.display_name);
    }
    // ======================================================
    // USE CURRENT LOCATION
    // ======================================================
    function useCurrentLocation() {
        if (!navigator.geolocation) {
            auditUiError({ module: "Authentication", process: "useCurrentLocation", action: "EXECUTE" }, toast.error, "Your browser does not support location services.");
            return;
        }
        setMapResolving(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            await selectMapLocation(position.coords.latitude, position.coords.longitude);
            setMapResolving(false);
        }, () => {
            setMapResolving(false);
            auditUiError({ module: "Authentication", process: "validation", action: "EXECUTE" }, toast.error, "Unable to get your current location. Please allow location access or select your address manually on the map.");
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        });
    }
    // ======================================================
    // CONFIRM LOCATION
    // ======================================================
    function confirmLocation() {
        if (latitude === null || longitude === null) {
            toast.warning("Please select your exact location on the map first.");
            return;
        }
        setLocationConfirmed(true);
        toast.success("Address location confirmed.");
    }
    // ======================================================
    // REGISTER VALIDATION
    // ======================================================
    function validateRegistration(): boolean {
        const errors: Record<string, string> = {};
        if (!firstName.trim()) errors.firstName = "First name is required.";
        if (!lastName.trim()) errors.lastName = "Last name is required.";
        if (!gender) errors.gender = "Gender is required.";
        if (!birthDate) errors.birthDate = "Birth date is required.";
        if (!civilStatus) errors.civilStatus = "Civil status is required.";
        if (!religion) errors.religion = "Religion is required.";
        if (!email.trim()) errors.email = "Email address is required.";
        if (!phone.trim()) errors.phone = "Phone number is required.";
        else if (!/^09\d{9}$/.test(phone)) errors.phone = "Enter a valid 11-digit Philippine mobile number starting with 09.";
        if (email.trim() && isDisposableEmail(email)) errors.email = "Temporary or disposable email addresses are not allowed.";
        if (!password) errors.password = "Password is required.";
        else if (password.length < 6) errors.password = "Password must be at least 6 characters.";
        if (!confirmPassword) errors.confirmPassword = "Please confirm your password.";
        else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
        if (latitude === null || longitude === null || !locationConfirmed) errors.location = "Select and confirm your exact address location.";

        setFieldErrors(errors);
        const firstInvalid = Object.keys(errors)[0];
        if (firstInvalid) {
            toast.warning(errors[firstInvalid]);
            window.setTimeout(() => {
                const target = document.querySelector<HTMLElement>(`[data-register-field="${firstInvalid}"]`);
                target?.scrollIntoView({ behavior: "smooth", block: "center" });
                target?.querySelector<HTMLElement>("input, select, button")?.focus({ preventScroll: true });
            }, 50);
            return false;
        }
        if (!turnstileSiteKey) {
            auditUiError({ module: "Authentication", process: "validateRegistration", action: "READ" }, toast.error, "Turnstile is not configured. Add VITE_TURNSTILE_SITE_KEY to the environment variables.");
            return false;
        }
        return true;
    }
    // ======================================================
    // START REGISTER
    // ======================================================
    function handleRegister() {
        if (loading || pendingRegistration || !validateRegistration()) {
            return;
        }
        setCaptchaWidgetKey((current) => current + 1);
        setCaptchaOpen(true);
    }
    // ======================================================
    // COMPLETE REGISTER
    // ======================================================
    async function completeRegistration(token: string) {
        return await runAuditedProcess({ module: "Authentication", process: "completeRegistration", action: "COMPLETE", parameters: { token } }, async (__activityProcessScope) => {
            try {
                setPendingRegistration(true);
                setLoading(true);
                const { error } = await registerUser({
                    firstName,
                    middleName,
                    lastName,
                    email,
                    phone,
                    password,
                    gender,
                    birthDate,
                    civilStatus,
                    religion,
                    houseNo,
                    street,
                    barangay,
                    municipality,
                    province,
                    // ============================================
                    // MAP COORDINATES
                    // ============================================
                    latitude,
                    longitude,
                    profilePicture,
                    role: "customer",
                    captchaToken: token,
                });
                if (error) {
                    throw error;
                }
                await savePendingProfilePicture(email, profilePicture);
                setCaptchaOpen(false);
                toast.success("Account created. Enter the OTP code sent to your email.");
                setOtpModalOpen(true);
            }
            catch (error) {
                __activityProcessScope.caught(error);
                setCaptchaWidgetKey((current) => current + 1);
                setCaptchaOpen(false);
                __activityProcessScope.failAndNotify(toast.error, error instanceof Error ? error.message : "Registration failed.");
            }
            finally {
                setPendingRegistration(false);
                setLoading(false);
            }
        });
    }
    // ======================================================
    // RENDER
    // ======================================================
    return (<main className="min-h-dvh bg-[linear-gradient(180deg,#eef2ff_0%,#f8fafc_34%,#f8fafc_100%)] text-slate-900 dark:bg-[linear-gradient(180deg,#111827_0%,#020617_40%,#020617_100%)] dark:text-white" style={{
            fontFamily: "'Inter', sans-serif",
        }}>
      {/* BACKGROUND */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[32rem] opacity-[0.06] dark:opacity-[0.035]" style={{
            backgroundImage: "linear-gradient(#2937f0 1px,transparent 1px),linear-gradient(90deg,#2937f0 1px,transparent 1px)",
            backgroundSize: "42px 42px",
        }}/>

        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#5b3df1]/20 blur-3xl"/>

        <div className="absolute -right-24 top-20 h-96 w-96 rounded-full bg-[#3292ec]/20 blur-3xl"/>

        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#2937f0]/10 blur-3xl"/>
      </div>

      {/* TOP BAR */}
      <header className="relative z-20 border-b border-white/70 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 shadow-sm">
              <Wrench className="h-5 w-5 text-slate-950"/>
            </div>

            <div>
              <p className="font-black leading-none text-slate-950 dark:text-white" style={{
            fontFamily: "'Sora', sans-serif",
        }}>
                SerbisyoGo
              </p>

              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Trusted local services
              </p>
            </div>
          </Link>

          <Link to="/register-choice" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 transition hover:border-[#2937f0]/40 hover:bg-indigo-50 hover:text-[#2937f0] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <ArrowLeft className="h-4 w-4"/>
            Account type
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-[linear-gradient(135deg,#2937f0_0%,#5b3df1_55%,#3292ec_100%)] px-5 py-6 text-white shadow-[0_24px_70px_rgba(41,55,240,0.24)] sm:px-8 sm:py-8 lg:px-10 lg:py-9">
          <div className="pointer-events-none absolute inset-0 opacity-[0.09]" style={{
            backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
            backgroundSize: "38px 38px",
        }}/>

          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"/>

          <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl"/>

          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-amber-300 backdrop-blur sm:text-xs">
                Customer registration
              </div>

              <h1 className="mt-3 max-w-3xl text-3xl font-black leading-[1.08] sm:text-4xl lg:text-5xl" style={{
            fontFamily: "'Sora', sans-serif",
        }}>
                Create your customer account.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                Complete your information once, then book trusted workers,
                manage services, and track every request from one account.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:w-[30rem]">
              {[
            {
                icon: ShieldCheck,
                title: "Secure",
                text: "Protected registration",
            },
            {
                icon: CheckCircle2,
                title: "Verified",
                text: "Trusted professionals",
            },
            {
                icon: MapPin,
                title: "Local",
                text: "Nearby services",
            },
        ].map(({ icon: Icon, title, text }) => (<div key={title} className="flex min-w-0 flex-col items-center rounded-xl border border-white/15 bg-white/10 px-2 py-3 text-center backdrop-blur-sm sm:items-start sm:rounded-2xl sm:p-4 sm:text-left">
                  <Icon className="h-4 w-4 shrink-0 text-amber-300 sm:h-5 sm:w-5"/>

                  <p className="mt-2 truncate text-[11px] font-black sm:mt-3 sm:text-sm">
                    {title}
                  </p>

                  <p className="mt-1 hidden text-xs text-blue-100/80 sm:block">
                    {text}
                  </p>
                </div>))}
            </div>
          </div>
        </section>

        {/* FORM SHELL */}
        <section className="relative -mt-5 overflow-hidden rounded-[2rem] border border-white/90 bg-white/96 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/96 sm:-mt-7">
          <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#2937f0] dark:text-indigo-400">
                  Customer profile
                </p>

                <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white" style={{
            fontFamily: "'Sora', sans-serif",
        }}>
                  Registration details
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Complete the required fields to create your account.
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-[#2937f0] dark:bg-indigo-500/10 dark:text-indigo-300">
                <ShieldCheck className="h-4 w-4"/>
                Secure form
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-2 xl:p-8">
            {/* ======================================================
            PERSONAL INFORMATION
        ====================================================== */}

            <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
                  <User className="h-5 w-5"/>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white" style={{
            fontFamily: "'Sora', sans-serif",
        }}>
                    Personal information
                  </h3>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Basic details used for your customer profile.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div data-register-field="firstName">
                  <label className={label}>First Name <span className="text-red-500">*</span></label>
                  {fieldErrors.firstName && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.firstName}</p>}

                  <div className={`${inputWrap} mt-2 ${fieldErrors.firstName ? "!border-red-500 ring-4 ring-red-500/10" : ""}`}>
                    <User className="h-4.5 w-4.5 shrink-0 text-slate-400"/>

                    <input type="text" value={firstName} onChange={(event) => { setFirstName(event.target.value); setFieldErrors((current) => ({ ...current, firstName: "" })); }} placeholder="Enter first name" className={inputBase}/>
                  </div>
                </div>

                <div>
                  <label className={label}>Middle Name</label>

                  <div className={`${inputWrap} mt-2`}>
                    <User className="h-4.5 w-4.5 shrink-0 text-slate-400"/>

                    <input type="text" value={middleName} onChange={(event) => setMiddleName(event.target.value)} placeholder="Optional" className={inputBase}/>
                  </div>
                </div>

                <div data-register-field="lastName" className="sm:col-span-2">
                  <label className={label}>Last Name <span className="text-red-500">*</span></label>
                  {fieldErrors.lastName && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.lastName}</p>}

                  <div className={`${inputWrap} mt-2 ${fieldErrors.lastName ? "!border-red-500 ring-4 ring-red-500/10" : ""}`}>
                    <User className="h-4.5 w-4.5 shrink-0 text-slate-400"/>

                    <input type="text" value={lastName} onChange={(event) => { setLastName(event.target.value); setFieldErrors((current) => ({ ...current, lastName: "" })); }} placeholder="Enter last name" className={inputBase}/>
                  </div>
                </div>

                <div data-register-field="gender">
                  <label className={label}>Gender <span className="text-red-500">*</span></label>
                  {fieldErrors.gender && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.gender}</p>}

                  <select value={gender} onChange={(event) => { setGender(event.target.value); setFieldErrors((current) => ({ ...current, gender: "" })); }} className={`${selectBase} ${fieldErrors.gender ? "!border-red-500 ring-4 ring-red-500/10 focus:!border-red-500 focus:ring-red-500/20" : ""}`}>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div data-register-field="birthDate">
                  <label className={label}>Birth Date <span className="text-red-500">*</span></label>
                  {fieldErrors.birthDate && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.birthDate}</p>}

                  <input type="date" value={birthDate} onChange={(event) => { setBirthDate(event.target.value); setFieldErrors((current) => ({ ...current, birthDate: "" })); }} className={`${selectBase} ${fieldErrors.birthDate ? "!border-red-500 ring-4 ring-red-500/10 focus:!border-red-500 focus:ring-red-500/20" : ""}`}/>
                </div>

                <div data-register-field="civilStatus">
                  <label className={label}>Civil Status <span className="text-red-500">*</span></label>
                  {fieldErrors.civilStatus && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.civilStatus}</p>}

                  <select value={civilStatus} onChange={(event) => { setCivilStatus(event.target.value); setFieldErrors((current) => ({ ...current, civilStatus: "" })); }} className={`${selectBase} ${fieldErrors.civilStatus ? "!border-red-500 ring-4 ring-red-500/10 focus:!border-red-500 focus:ring-red-500/20" : ""}`}>
                    <option value="">Select status</option>

                    <option value="Single">Single</option>

                    <option value="Married">Married</option>

                    <option value="Widowed">Widowed</option>

                    <option value="Separated">Separated</option>
                  </select>
                </div>

                <div data-register-field="religion">
                  <label className={label}>Religion <span className="text-red-500">*</span></label>
                  {fieldErrors.religion && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.religion}</p>}

                  <select value={religion} onChange={(event) => { setReligion(event.target.value); setFieldErrors((current) => ({ ...current, religion: "" })); }} className={`${selectBase} ${fieldErrors.religion ? "!border-red-500 ring-4 ring-red-500/10 focus:!border-red-500 focus:ring-red-500/20" : ""}`}>
                    <option value="">Select religion</option>

                    {RELIGION_OPTIONS.map((option) => (<option key={option} value={option}>
                        {option}
                      </option>))}
                  </select>
                </div>
              </div>
            </section>

            {/* ======================================================
            ADDRESS INFORMATION + MAP
        ====================================================== */}

            <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                  <MapPin className="h-5 w-5"/>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white" style={{
            fontFamily: "'Sora', sans-serif",
        }}>
                    Address information
                  </h3>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Search and select your exact address location on the map.
                  </p>
                </div>
              </div>

              {/* ADDRESS FIELDS */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={label}>House No.</label>

                  <input type="text" value={houseNo} onChange={(event) => {
            setHouseNo(event.target.value);
            setLocationConfirmed(false);
        }} placeholder="House number" className={selectBase}/>
                </div>

                <div>
                  <label className={label}>Street</label>

                  <input type="text" value={street} onChange={(event) => {
            setStreet(event.target.value);
            setLocationConfirmed(false);
        }} placeholder="Street" className={selectBase}/>
                </div>

                <div className="sm:col-span-2">
                  <label className={label}>Barangay</label>

                  <input type="text" value={barangay} onChange={(event) => {
            setBarangay(event.target.value);
            setLocationConfirmed(false);
        }} placeholder="Barangay" className={selectBase}/>
                </div>

                <div>
                  <label className={label}>Municipality</label>

                  <input type="text" value={municipality} onChange={(event) => {
            setMunicipality(event.target.value);
            setLocationConfirmed(false);
        }} placeholder="Municipality" className={selectBase}/>
                </div>

                <div>
                  <label className={label}>Province</label>

                  <input type="text" value={province} onChange={(event) => {
            setProvince(event.target.value);
            setLocationConfirmed(false);
        }} placeholder="Province" className={selectBase}/>
                </div>
              </div>

              {/* ==================================================
            MAP SEARCH
        ================================================== */}

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-200 p-4 dark:border-slate-700">
                  <div className="mb-3">
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      Verify address on map
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Search your address, select a result, or click directly on
                      the map to place the pin on the exact location.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
                      <Search className="h-4 w-4 shrink-0 text-slate-400"/>

                      <input type="text" value={mapSearch} onChange={(event) => setMapSearch(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                void searchAddress();
            }
        }} placeholder="Search complete address" className="w-full bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"/>
                    </div>

                    <button type="button" onClick={() => {
            void searchAddress();
        }} disabled={mapSearching} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2937f0] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#202dcc] disabled:cursor-not-allowed disabled:opacity-60">
                      {mapSearching ? (<>
                          <Loader2 className="h-4 w-4 animate-spin"/>
                          Searching...
                        </>) : (<>
                          <Search className="h-4 w-4"/>
                          Search
                        </>)}
                    </button>
                  </div>

                  <button type="button" onClick={useCurrentLocation} className="mt-3 text-xs font-bold text-[#2937f0] hover:underline dark:text-indigo-300">
                    Use my current location
                  </button>
                </div>

                {/* SEARCH RESULTS */}
                {mapSearchResults.length > 0 && (<div className="border-b border-slate-200 dark:border-slate-700">
                    {mapSearchResults.map((result, index) => (<button type="button" key={`${result.lat}-${result.lon}-${index}`} onClick={() => {
                    void selectSearchResult(result);
                }} className="flex w-full items-start gap-3 border-b border-slate-100 p-4 text-left transition last:border-b-0 hover:bg-indigo-50 dark:border-slate-800 dark:hover:bg-slate-800">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2937f0]"/>

                        <span className="text-sm leading-5 text-slate-700 dark:text-slate-200">
                          {result.display_name}
                        </span>
                      </button>))}
                  </div>)}

                {/* MAP */}
                <div className="h-[360px] w-full">
                  <MapContainer center={latitude !== null && longitude !== null
            ? [latitude, longitude]
            : DEFAULT_MAP_CENTER} zoom={latitude !== null && longitude !== null ? 17 : 12} scrollWheelZoom className="h-full w-full">
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>

                    <MapViewController latitude={latitude} longitude={longitude}/>

                    <MapClickHandler onSelect={(lat, lon) => {
            void selectMapLocation(lat, lon);
        }}/>

                    {latitude !== null && longitude !== null && (<Marker position={[latitude, longitude]} draggable eventHandlers={{
                dragend: async (event) => {
                    const marker = event.target as L.Marker;
                    const position = marker.getLatLng();
                    await selectMapLocation(position.lat, position.lng);
                },
            }}/>)}
                  </MapContainer>
                </div>

                {/* MAP STATUS */}
                <div className="border-t border-slate-200 p-4 dark:border-slate-700">
                  {latitude !== null && longitude !== null ? (<div className="space-y-3">
                      <div className={`rounded-xl border p-4 ${locationConfirmed
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                : "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10"}`}>
                        <div className="flex items-start gap-3">
                          {locationConfirmed ? (<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"/>) : (<MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"/>)}

                          <div className="min-w-0">
                            <p className={`text-sm font-black ${locationConfirmed
                ? "text-emerald-800 dark:text-emerald-300"
                : "text-amber-800 dark:text-amber-300"}`}>
                              {locationConfirmed
                ? "Location confirmed"
                : "Location selected"}
                            </p>

                            {mapResolving ? (<div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                                Reading address...
                              </div>) : (<>
                                {mapAddress && (<p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                                    {mapAddress}
                                  </p>)}

                                <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                  Latitude: {latitude.toFixed(6)}
                                  <br />
                                  Longitude: {longitude.toFixed(6)}
                                </p>
                              </>)}
                          </div>
                        </div>
                      </div>

                      {!locationConfirmed && (<button type="button" onClick={confirmLocation} disabled={mapResolving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                          <CheckCircle2 className="h-4 w-4"/>
                          Confirm Exact Location
                        </button>)}

                      {locationConfirmed && (<div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white">
                          <CheckCircle2 className="h-4 w-4"/>
                          Exact Location Confirmed
                        </div>)}
                    </div>) : (<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                      Please search for your address or click on the map to
                      select your exact location.
                    </div>)}
                </div>
              </div>
            </section>

            {/* ======================================================
            CONTACT DETAILS
        ====================================================== */}

            <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  <Mail className="h-5 w-5"/>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white" style={{
            fontFamily: "'Sora', sans-serif",
        }}>
                    Contact details
                  </h3>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Used for sign-in, updates, and booking communication.
                  </p>
                </div>
              </div>

              <div className="grid gap-5">
                <div data-register-field="email">
                  <label className={label}>Email Address <span className="text-red-500">*</span></label>
                  {fieldErrors.email && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.email}</p>}

                  <div className={`${inputWrap} mt-2 ${fieldErrors.email ? "!border-red-500 ring-4 ring-red-500/10" : ""}`}>
                    <Mail className="h-4.5 w-4.5 shrink-0 text-slate-400"/>

                    <input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setFieldErrors((current) => ({ ...current, email: "" })); }} placeholder="you@example.com" className={inputBase}/>
                  </div>
                </div>

                <div data-register-field="phone">
                  <label className={label}>Phone Number <span className="text-red-500">*</span></label>
                  {fieldErrors.phone && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.phone}</p>}

                  <div className={`${inputWrap} mt-2 ${fieldErrors.phone ? "!border-red-500 ring-4 ring-red-500/10" : ""}`}>
                    <Phone className="h-4.5 w-4.5 shrink-0 text-slate-400"/>

                    <input type="tel" inputMode="numeric" autoComplete="tel" maxLength={11} value={phone} onChange={(event) => { setPhone(event.target.value.replace(/\D/g, "").slice(0, 11)); setFieldErrors((current) => ({ ...current, phone: "" })); }} placeholder="09XXXXXXXXX" className={inputBase}/>
                  </div>
                </div>
              </div>
            </section>

            {/* ======================================================
            PROFILE PICTURE
        ====================================================== */}

            <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <Camera className="h-5 w-5"/>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white" style={{
            fontFamily: "'Sora', sans-serif",
        }}>
                    Profile picture
                  </h3>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Optional, but recommended for easy recognition.
                  </p>
                </div>
              </div>

              <div className="flex min-h-44 flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center dark:border-slate-600 dark:bg-slate-900 sm:flex-row sm:justify-start sm:text-left">
                {profilePicture ? (<img src={URL.createObjectURL(profilePicture)} alt="Profile preview" className="h-24 w-24 shrink-0 rounded-full border-4 border-white object-cover shadow-lg dark:border-slate-800"/>) : (<div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-3xl font-black text-[#2937f0] ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20">
                    {firstName ? firstName.charAt(0).toUpperCase() : "?"}
                  </div>)}

                <div>
                  <label htmlFor="profile-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#2937f0] shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300">
                    <Camera className="h-4 w-4"/>
                    Choose photo
                  </label>

                  <input id="profile-upload" type="file" accept="image/*" onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (file &&
                !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                toast.warning("Please select a JPG, PNG, or WEBP image.");
                event.target.value = "";
                setProfilePicture(null);
                return;
            }
            if (file && file.size > 5 * 1024 * 1024) {
                toast.warning("Profile picture must be 5 MB or smaller.");
                event.target.value = "";
                setProfilePicture(null);
                return;
            }
            setProfilePicture(file);
        }} className="hidden"/>

                  <p className="mt-2 text-xs text-slate-400">
                    PNG or JPG, up to 5MB.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* ======================================================
            ACCOUNT SECURITY
        ====================================================== */}

          <section className="border-t border-slate-200 bg-[linear-gradient(135deg,#eef2ff_0%,#f8fafc_100%)] px-5 py-6 dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(49,46,129,.18),rgba(15,23,42,.85))] sm:px-7 sm:py-7 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-end">
              <div>
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-[#2937f0] dark:text-indigo-300">
                    <Lock className="h-5 w-5"/>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-950 dark:text-white" style={{
            fontFamily: "'Sora', sans-serif",
        }}>
                      Account security
                    </h3>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Create a password with at least 6 characters.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div data-register-field="password">
                    <label className={label}>Password <span className="text-red-500">*</span></label>
                  {fieldErrors.password && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.password}</p>}

                    <div className={`${inputWrap} mt-2 ${fieldErrors.password ? "!border-red-500 ring-4 ring-red-500/10" : ""}`}>
                      <Lock className="h-4.5 w-4.5 shrink-0 text-slate-400"/>

                      <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); setFieldErrors((current) => ({ ...current, password: "" })); }} placeholder="Enter password" className={inputBase}/>

                      <button type="button" onClick={() => setShowPassword((current) => !current)} className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? (<EyeOff className="h-4.5 w-4.5"/>) : (<Eye className="h-4.5 w-4.5"/>)}
                      </button>
                    </div>
                  </div>

                  <div data-register-field="confirmPassword">
                    <label className={label}>Confirm Password <span className="text-red-500">*</span></label>
                  {fieldErrors.confirmPassword && <p className="mt-1 text-xs font-semibold text-red-500">{fieldErrors.confirmPassword}</p>}

                    <div className={`${inputWrap} mt-2 ${fieldErrors.confirmPassword ? "!border-red-500 ring-4 ring-red-500/10" : ""}`}>
                      <Lock className="h-4.5 w-4.5 shrink-0 text-slate-400"/>

                      <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setFieldErrors((current) => ({ ...current, confirmPassword: "" })); }} placeholder="Confirm password" className={inputBase}/>
                    </div>
                  </div>
                </div>

                <p className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500"/>
                  Use at least 6 characters.
                </p>
              </div>

              <div>
                {fieldErrors.location && <p data-register-field="location" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{fieldErrors.location}</p>}
                <button type="button" onClick={handleRegister} disabled={loading || pendingRegistration} className="flex min-h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#2937f0] via-[#523cf0] to-[#3784ed] px-5 py-4 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60">
                  {loading || pendingRegistration
            ? "Creating Account..."
            : "Create Customer Account"}
                </button>

                <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
                  Already registered?{" "}
                  <Link to="/" className="font-bold text-[#2937f0] hover:underline dark:text-indigo-400">
                    Back to login
                  </Link>
                </p>
              </div>
            </div>
          </section>
        </section>
      </div>

      {/* ======================================================
            EMAIL OTP
        ====================================================== */}

      <EmailOtpModal open={otpModalOpen} email={email} accountType="customer" onClose={() => {
            if (!pendingRegistration) {
                setOtpModalOpen(false);
            }
        }} onVerified={() => {
            setOtpModalOpen(false);
            navigate("/", {
                replace: true,
                state: {
                    verifiedEmail: email.trim().toLowerCase(),
                },
            });
        }}/>

      {/* ======================================================
            CAPTCHA
        ====================================================== */}

      <CaptchaVerificationModal open={captchaOpen} siteKey={turnstileSiteKey ?? ""} widgetKey={captchaWidgetKey} processing={pendingRegistration} title="Verify before creating your account" description="Complete this quick security check to continue with customer registration." onClose={() => {
            if (!pendingRegistration) {
                setCaptchaOpen(false);
            }
        }} onSuccess={(token) => {
            void completeRegistration(token);
        }} onExpire={() => undefined} onError={() => {
            setCaptchaWidgetKey((current) => current + 1);
            auditUiError({ module: "Authentication", process: "onError", action: "EXECUTE" }, toast.error, "Security verification failed. Please try again.");
        }}/>
    </main>);
}
