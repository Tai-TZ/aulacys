"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ShieldCheck, 
  TrendingUp, 
  Wallet, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { BrandMark } from "@/components/client/brand-mark";
import { writeDemoSession } from "@/lib/demo-session";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/cn";

type Mode = "login" | "register";

type Screen = 
  | "login" 
  | "register" 
  | "register_otp" 
  | "register_success" 
  | "forgot_phone" 
  | "forgot_otp" 
  | "forgot_password";

interface RegisterFormData {
  fullName: string;
  dateOfBirth: string;
  phoneNumber: string;
  email: string;
  isExistingSHBCustomer: boolean | null;
  acceptedTerms: boolean;
  acceptedPrivacyPolicy: boolean;
  marketingConsent: boolean;
}

export function AuthPage({ mode }: { mode: Mode }) {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  
  // Current active screen
  const [screen, setScreen] = useState<Screen>(mode === "login" ? "login" : "register");
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" }[]>([]);
  
  // Form states - Registration
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isExistingSHBCustomer, setIsExistingSHBCustomer] = useState<boolean | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Form states - Login
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // OTP Verification details
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [otpTimer, setOtpTimer] = useState(60);
  const [otpError, setOtpError] = useState("");
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Modal display states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"terms" | "privacy" | null>(null);

  // Load registration form data from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("aulacys-register-form");
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<RegisterFormData>;
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.dateOfBirth) setDateOfBirth(parsed.dateOfBirth);
        if (parsed.phoneNumber) setPhoneNumber(parsed.phoneNumber);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.isExistingSHBCustomer !== undefined) setIsExistingSHBCustomer(parsed.isExistingSHBCustomer ?? null);
        if (parsed.acceptedTerms) setAcceptedTerms(parsed.acceptedTerms);
        if (parsed.acceptedPrivacyPolicy) setAcceptedPrivacyPolicy(parsed.acceptedPrivacyPolicy);
        if (parsed.marketingConsent) setMarketingConsent(parsed.marketingConsent);
      }
    } catch (e) {
      console.error("Failed to load registration data from session storage", e);
    }
  }, []);

  // Save registration form data to sessionStorage when states change
  useEffect(() => {
    if (screen === "register" || screen === "register_otp") {
      const data: RegisterFormData = {
        fullName,
        dateOfBirth,
        phoneNumber,
        email,
        isExistingSHBCustomer,
        acceptedTerms,
        acceptedPrivacyPolicy,
        marketingConsent
      };
      sessionStorage.setItem("aulacys-register-form", JSON.stringify(data));
    }
  }, [fullName, dateOfBirth, phoneNumber, email, isExistingSHBCustomer, acceptedTerms, acceptedPrivacyPolicy, marketingConsent, screen]);

  // Sync route mode changes with internal screen state
  useEffect(() => {
    setScreen(mode === "login" ? "login" : "register");
    setErrors({});
  }, [mode]);

  // OTP Timer countdown logic
  useEffect(() => {
    if (screen !== "register_otp" && screen !== "forgot_otp") return;
    if (otpTimer <= 0) return;
    
    const interval = setInterval(() => {
      setOtpTimer(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, otpTimer]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const isDev = process.env.NODE_ENV === "development";

  // Password rules validation helper
  const getPasswordValidation = (pass: string) => {
    return {
      minLength: pass.length >= 8,
      hasUpper: /[A-Z]/.test(pass),
      hasLower: /[a-z]/.test(pass),
      hasDigit: /[0-9]/.test(pass),
      hasSpecial: /[^A-Za-z0-9]/.test(pass)
    };
  };

  const passRules = getPasswordValidation(password);
  const isPasswordValid = Object.values(passRules).every(Boolean);

  // Check if date of birth meets 18+ requirements
  const validateAge = (dobString: string): { isValid: boolean; message?: string } => {
    if (!dobString) return { isValid: false, message: "Ngày sinh không được để trống." };
    const dob = new Date(dobString);
    const today = new Date();
    
    if (dob > today) {
      return { isValid: false, message: "Ngày sinh không hợp lệ." };
    }

    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      return { isValid: false, message: "Bạn cần từ đủ 18 tuổi để sử dụng dịch vụ tư vấn vay." };
    }

    return { isValid: true };
  };

  // VN Phone number format helper
  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\s+/g, "");
    if (cleaned.startsWith("0")) {
      return /^0(3|5|7|8|9)[0-9]{8}$/.test(cleaned);
    }
    return /^(3|5|7|8|9)[0-9]{8}$/.test(cleaned);
  };

  // Check if all registration form requirements are met
  const isRegisterFormValid = () => {
    const isNameOk = fullName.trim().length > 0;
    const isAgeOk = validateAge(dateOfBirth).isValid;
    const isPhoneOk = validatePhone(phoneNumber);
    const isEmailOk = !email ? true : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isPasswordOk = isPasswordValid;
    const isConfirmOk = password === confirmPassword;
    const isCustomerSelected = isExistingSHBCustomer !== null;

    return (
      isNameOk &&
      isAgeOk &&
      isPhoneOk &&
      isEmailOk &&
      isPasswordOk &&
      isConfirmOk &&
      isCustomerSelected &&
      acceptedTerms &&
      acceptedPrivacyPolicy
    );
  };

  // REGISTRATION ACTIONS
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRegisterFormValid()) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOtp(Array(6).fill(""));
      setOtpTimer(60);
      setOtpError("");
      setScreen("register_otp");
      showToast("Mã xác thực OTP đã được gửi!");
    }, 700);
  };

  const handleRegisterOtpChange = (val: string, index: number) => {
    const numeric = val.replace(/\D/g, "");
    if (!numeric) {
      const nextOtp = [...otp];
      nextOtp[index] = "";
      setOtp(nextOtp);
      return;
    }

    const digit = numeric[numeric.length - 1];
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);

    // Focus next input element
    if (index < 5 && digit) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleRegisterOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleRegisterOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const nextOtp = Array(6).fill("");
    for (let i = 0; i < pastedData.length; i++) {
      nextOtp[i] = pastedData[i];
    }
    setOtp(nextOtp);

    const nextFocusIndex = Math.min(pastedData.length, 5);
    otpInputsRef.current[nextFocusIndex]?.focus();
  };

  const handleResendOtp = () => {
    setOtp(Array(6).fill(""));
    setOtpTimer(60);
    setOtpError("");
    showToast("Mã xác thực mới đã được gửi.");
  };

  const handleConfirmRegisterOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) return;

    if (otpTimer <= 0) {
      setOtpError("Mã xác thực đã hết hạn.");
      return;
    }

    if (code === "123456") {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setScreen("register_success");
        // Save demo session
        writeDemoSession({ name: fullName.trim(), email: email.trim() || `${phoneNumber}@shb-loan.com` });
      }, 700);
    } else {
      setOtpError("Mã xác thực không chính xác.");
    }
  };

  // LOGIN ACTIONS
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const cleanPhone = loginPhone.replace(/\s+/g, "");
    if (!cleanPhone) {
      setErrors(prev => ({ ...prev, loginPhone: "Số điện thoại không được để trống." }));
      return;
    }
    if (!validatePhone(cleanPhone)) {
      setErrors(prev => ({ ...prev, loginPhone: "Số điện thoại không hợp lệ." }));
      return;
    }
    if (!loginPassword) {
      setErrors(prev => ({ ...prev, loginPassword: "Mật khẩu không được để trống." }));
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);

      const isDefaultDemoAccount = 
        (cleanPhone === "0912345678" || cleanPhone === "912345678") && 
        loginPassword === "Shb@123456";

      if (isDefaultDemoAccount) {
        writeDemoSession({ name: "Nguyễn Văn An", email: "an.nguyen@shb-loan.com" });
        showToast("Đăng nhập thành công.");
        router.push("/customer-portal");
      } else {
        setErrors(prev => ({ ...prev, general: "Số điện thoại hoặc mật khẩu không chính xác." }));
      }
    }, 700);
  };

  // FORGOT PASSWORD ACTIONS
  const handleForgotPhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = loginPhone.replace(/\s+/g, "");
    if (!cleanPhone) {
      setErrors(prev => ({ ...prev, loginPhone: "Số điện thoại không được để trống." }));
      return;
    }
    if (!validatePhone(cleanPhone)) {
      setErrors(prev => ({ ...prev, loginPhone: "Số điện thoại không hợp lệ." }));
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (cleanPhone === "0912345678" || cleanPhone === "912345678") {
        setOtp(Array(6).fill(""));
        setOtpTimer(60);
        setOtpError("");
        setScreen("forgot_otp");
        showToast("Mã xác thực đặt lại mật khẩu đã được gửi!");
      } else {
        setErrors(prev => ({ ...prev, loginPhone: "Không thể xác thực thông tin. Vui lòng kiểm tra và thử lại." }));
      }
    }, 700);
  };

  const handleConfirmForgotOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) return;

    if (otpTimer <= 0) {
      setOtpError("Mã xác thực đã hết hạn.");
      return;
    }

    if (code === "123456") {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setPassword("");
        setConfirmPassword("");
        setScreen("forgot_password");
      }, 700);
    } else {
      setOtpError("Mã xác thực không chính xác.");
    }
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!isPasswordValid) {
      setErrors(prev => ({ ...prev, password: "Mật khẩu chưa đạt yêu cầu bảo mật tối thiểu." }));
      return;
    }
    if (password !== confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: "Mật khẩu xác nhận không khớp." }));
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast("Mật khẩu đã được cập nhật.");
      setLoginPassword(""); // Clear password field
      setScreen("login"); // Route back to login page
    }, 700);
  };

  // Click handler to open terms/privacy modal
  const openModal = (type: "terms" | "privacy") => {
    setModalType(type);
    setModalOpen(true);
  };

  // CHECKS FOR FIELD LEVEL ERRORS ON BLUR OR CHANGE
  const handleNameBlur = () => {
    const trimmed = fullName.trim();
    setFullName(trimmed);
    if (!trimmed) {
      setErrors(prev => ({ ...prev, fullName: "Họ và tên không được để trống." }));
    } else {
      setErrors(prev => {
        const next = { ...prev };
        delete next.fullName;
        return next;
      });
    }
  };

  const handleDobChange = (val: string) => {
    setDateOfBirth(val);
    const check = validateAge(val);
    if (!check.isValid && check.message) {
      setErrors(prev => ({ ...prev, dateOfBirth: check.message! }));
    } else {
      setErrors(prev => {
        const next = { ...prev };
        delete next.dateOfBirth;
        return next;
      });
    }
  };

  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    setPhoneNumber(clean);
    if (clean && !validatePhone(clean)) {
      setErrors(prev => ({ ...prev, phoneNumber: "Số điện thoại không hợp lệ." }));
    } else {
      setErrors(prev => {
        const next = { ...prev };
        delete next.phoneNumber;
        return next;
      });
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setErrors(prev => ({ ...prev, email: "Email không hợp lệ." }));
    } else {
      setErrors(prev => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
    }
  };

  const formatPhoneHidden = (num: string) => {
    const clean = num.replace(/\s+/g, "");
    if (clean.length < 5) return clean;
    // Format e.g. 091***5678
    if (clean.startsWith("0")) {
      return `${clean.slice(0, 3)}***${clean.slice(-4)}`;
    }
    return `0${clean.slice(0, 2)}***${clean.slice(-4)}`;
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-12 bg-[#F7F9FC]">
      {/* Toast popup */}
      {toasts.length > 0 && (
        <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div 
              key={t.id} 
              className={cn(
                "px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold pointer-events-auto transition-all duration-300 transform translate-y-0",
                t.type === "success" 
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                  : "bg-rose-50 text-rose-800 border-rose-200"
              )}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* Loading overlay spinner */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/35 backdrop-blur-xs">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-4">
            <div className="h-7 w-7 border-4 border-brand border-t-transparent animate-spin rounded-full" />
            <span className="text-sm font-bold text-navy">Vui lòng chờ...</span>
          </div>
        </div>
      )}

      {/* Clickable Terms & Conditions Modal Overlay */}
      {modalOpen && modalType && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-border w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-border flex justify-between items-center bg-[#F7F9FC]">
              <h3 className="font-bold text-[#003B71] text-base">
                {modalType === "terms" ? "Điều khoản sử dụng" : "Chính sách bảo vệ và xử lý dữ liệu cá nhân"}
              </h3>
              <button 
                type="button" 
                onClick={() => setModalOpen(false)} 
                className="text-muted-foreground hover:text-foreground"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-sm text-[#1F2937]/80 space-y-4 leading-relaxed">
              {modalType === "terms" ? (
                <>
                  <p className="font-bold text-[#003B71]">1. Điều khoản sử dụng hệ thống trợ lý ảo SHB</p>
                  <p>Hệ thống trợ lý vay vốn thông minh SHB (SHB Multi-Agent Loan Assistant) được thiết kế nhằm mục đích hỗ trợ người dùng tìm kiếm sản phẩm tín dụng, ước tính hạn mức sơ bộ và hỗ trợ kiểm tra tài liệu cần thiết trước khi gửi cho ngân hàng.</p>
                  <p className="font-bold text-[#003B71]">2. Giá trị tham khảo</p>
                  <p>Mọi kết quả, biểu mẫu tính toán và tài liệu kiểm tra được thực hiện bởi Trợ lý ảo AI chỉ mang giá trị tham khảo. Không cấu thành một cam kết cấp tín dụng chính thức từ Ngân hàng TMCP Sài Gòn - Hà Nội (SHB).</p>
                  <p className="font-bold text-[#003B71]">3. Tính trung thực</p>
                  <p>Người sử dụng chịu trách nhiệm về tính trung thực, chính xác của thông tin kê khai trên hệ thống nhằm đảm bảo kết quả tư vấn hồ sơ được tối ưu nhất.</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-[#003B71]">1. Quy định thu thập dữ liệu</p>
                  <p>Ngân hàng SHB bảo mật tuyệt đối các thông tin cá nhân bao gồm số điện thoại, họ tên, ngày sinh và các tài liệu hồ sơ bạn chia sẻ trực tiếp với Trợ lý ảo của chúng tôi.</p>
                  <p className="font-bold text-[#003B71]">2. Mục đích xử lý</p>
                  <p>Thông tin thu thập được sử dụng để phân tích năng lực tài chính, đề xuất các gói vay phù hợp và chuẩn bị hồ sơ vay. Chúng tôi cam kết bảo mật theo quy định tại Nghị định số 13/2023/NĐ-CP của Chính phủ về bảo vệ dữ liệu cá nhân.</p>
                  <p className="font-bold text-[#003B71]">3. Chia sẻ dữ liệu</p>
                  <p>Hệ thống không chia sẻ thông tin cá nhân của bạn cho bên thứ ba ngoại trừ các bộ phận nghiệp vụ liên quan chịu trách nhiệm thẩm định của ngân hàng hoặc khi có yêu cầu hợp pháp từ cơ quan nhà nước có thẩm quyền.</p>
                </>
              )}
            </div>
            <div className="p-4 border-t border-border flex justify-end">
              <Button onClick={() => setModalOpen(false)} variant="primary" size="sm">Đồng ý</Button>
            </div>
          </div>
        </div>
      )}

      {/* Form column (Mobile: spans 12 cols, Desktop: 7 cols) */}
      <div className="lg:col-span-7 flex flex-col justify-between min-h-screen px-6 py-8 sm:px-12 md:px-16 xl:px-24">
        {/* Mobile top header with logo */}
        <header className="flex items-center justify-between lg:hidden shrink-0 pb-6 border-b border-border/20">
          <BrandMark size="md" />
        </header>

        {/* Center content wrapper */}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          
          {/* ========================================== */}
          {/* SCREEN: REGISTER */}
          {/* ========================================== */}
          {screen === "register" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-[#003B71]">Tạo tài khoản</h1>
                <p className="mt-2 text-sm text-[#6B7280]">
                  Tạo tài khoản để lưu kết quả tư vấn và theo dõi hồ sơ vay của bạn.
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* Full name */}
                <div>
                  <label htmlFor="fullName" className="mb-2 block text-sm font-semibold text-[#003B71]">
                    Họ và tên <span className="text-[#DC2626]">*</span>
                  </label>
                  <Input 
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={handleNameBlur}
                    placeholder="Nhập họ và tên"
                    className="h-12 rounded-xl border-border focus-visible:ring-2 focus-visible:ring-[#F58220]/25"
                  />
                  {errors.fullName && <div className="mt-1 flex items-center gap-1 text-xs text-[#DC2626]"><AlertTriangle size={12} /> {errors.fullName}</div>}
                </div>

                {/* Date of birth */}
                <div>
                  <label htmlFor="dob" className="mb-2 block text-sm font-semibold text-[#003B71]">
                    Ngày sinh <span className="text-[#DC2626]">*</span>
                  </label>
                  <Input 
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => handleDobChange(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="h-12 rounded-xl border-border focus-visible:ring-2 focus-visible:ring-[#F58220]/25"
                  />
                  {errors.dateOfBirth && <div className="mt-1 flex items-center gap-1 text-xs text-[#DC2626]"><AlertTriangle size={12} /> {errors.dateOfBirth}</div>}
                </div>

                {/* Phone number */}
                <div>
                  <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-[#003B71]">
                    Số điện thoại <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#6B7280] pr-3 border-r border-border">
                      +84
                    </span>
                    <input 
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="912 345 678"
                      className="w-full h-12 rounded-xl pl-16 pr-4 bg-background text-foreground border border-border outline-none focus-visible:ring-2 focus-visible:ring-[#F58220]/25 focus-visible:border-transparent transition text-sm"
                    />
                  </div>
                  {errors.phoneNumber && <div className="mt-1 flex items-center gap-1 text-xs text-[#DC2626]"><AlertTriangle size={12} /> {errors.phoneNumber}</div>}
                </div>

                {/* Email (Optional) */}
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#003B71]">
                    Email <span className="text-muted-foreground font-normal">(Không bắt buộc)</span>
                  </label>
                  <Input 
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="example@email.com"
                    className="h-12 rounded-xl border-border focus-visible:ring-2 focus-visible:ring-[#F58220]/25"
                  />
                  {errors.email && <div className="mt-1 flex items-center gap-1 text-xs text-[#DC2626]"><AlertTriangle size={12} /> {errors.email}</div>}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="pass" className="mb-2 block text-sm font-semibold text-[#003B71]">
                    Mật khẩu <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      id="pass"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu"
                      className="w-full h-12 rounded-xl pl-4 pr-12 bg-background text-foreground border border-border outline-none focus-visible:ring-2 focus-visible:ring-[#F58220]/25 focus-visible:border-transparent transition text-sm"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  {/* Realtime password rule checklist */}
                  {password.length > 0 && (
                    <div className="mt-3 bg-secondary/30 p-3 rounded-xl border border-border/30 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("h-3.5 w-3.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white", passRules.minLength ? "bg-emerald-500" : "bg-neutral-300")}>
                          ✓
                        </span>
                        <span className={cn(passRules.minLength ? "text-[#003B71] font-medium" : "")}>Ít nhất 8 ký tự</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("h-3.5 w-3.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white", passRules.hasUpper ? "bg-emerald-500" : "bg-neutral-300")}>
                          ✓
                        </span>
                        <span className={cn(passRules.hasUpper ? "text-[#003B71] font-medium" : "")}>Chứa chữ hoa (A-Z)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("h-3.5 w-3.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white", passRules.hasLower ? "bg-emerald-500" : "bg-neutral-300")}>
                          ✓
                        </span>
                        <span className={cn(passRules.hasLower ? "text-[#003B71] font-medium" : "")}>Chứa chữ thường (a-z)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("h-3.5 w-3.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white", passRules.hasDigit ? "bg-emerald-500" : "bg-neutral-300")}>
                          ✓
                        </span>
                        <span className={cn(passRules.hasDigit ? "text-[#003B71] font-medium" : "")}>Chứa chữ số (0-9)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground col-span-1 sm:col-span-2">
                        <span className={cn("h-3.5 w-3.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white", passRules.hasSpecial ? "bg-emerald-500" : "bg-neutral-300")}>
                          ✓
                        </span>
                        <span className={cn(passRules.hasSpecial ? "text-[#003B71] font-medium" : "")}>Chứa ký tự đặc biệt (@, $, !, ...)</span>
                      </div>
                    </div>
                  )}
                  {errors.password && <div className="mt-1 flex items-center gap-1 text-xs text-[#DC2626]"><AlertTriangle size={12} /> {errors.password}</div>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPass" className="mb-2 block text-sm font-semibold text-[#003B71]">
                    Xác nhận mật khẩu <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      id="confirmPass"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) {
                          setErrors(prev => {
                            const next = { ...prev };
                            delete next.confirmPassword;
                            return next;
                          });
                        }
                      }}
                      placeholder="Nhập lại mật khẩu"
                      className="w-full h-12 rounded-xl pl-4 pr-12 bg-background text-foreground border border-border outline-none focus-visible:ring-2 focus-visible:ring-[#F58220]/25 focus-visible:border-transparent transition text-sm"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-[#DC2626]">
                      <AlertTriangle size={12} /> Mật khẩu xác nhận không khớp.
                    </div>
                  )}
                  {errors.confirmPassword && <div className="mt-1 flex items-center gap-1 text-xs text-[#DC2626]"><AlertTriangle size={12} /> {errors.confirmPassword}</div>}
                </div>

                {/* SHB Customer Status Question */}
                <div className="space-y-2">
                  <span className="block text-sm font-semibold text-[#003B71]">
                    Bạn đã là khách hàng SHB? <span className="text-[#DC2626]">*</span>
                  </span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-[#1F2937] font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="shbCustomer" 
                        checked={isExistingSHBCustomer === false} 
                        onChange={() => setIsExistingSHBCustomer(false)}
                        className="h-4 w-4 accent-[#F58220]"
                      />
                      <span>Chưa là khách hàng</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-[#1F2937] font-medium cursor-pointer">
                      <input 
                        type="radio" 
                        name="shbCustomer" 
                        checked={isExistingSHBCustomer === true} 
                        onChange={() => setIsExistingSHBCustomer(true)}
                        className="h-4 w-4 accent-[#F58220]"
                      />
                      <span>Đã là khách hàng SHB</span>
                    </label>
                  </div>
                </div>

                {/* Checkboxes Terms */}
                <div className="space-y-2 pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs leading-normal select-none">
                    <input 
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 accent-[#F58220]"
                    />
                    <span>
                      Tôi đã đọc và đồng ý với{" "}
                      <button 
                        type="button" 
                        onClick={() => openModal("terms")}
                        className="font-bold text-[#003B71] hover:text-[#F58220] underline"
                      >
                        Điều khoản sử dụng
                      </button>.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer text-xs leading-normal select-none">
                    <input 
                      type="checkbox"
                      checked={acceptedPrivacyPolicy}
                      onChange={(e) => setAcceptedPrivacyPolicy(e.target.checked)}
                      className="mt-0.5 accent-[#F58220]"
                    />
                    <span>
                      Tôi đã đọc và đồng ý với{" "}
                      <button 
                        type="button" 
                        onClick={() => openModal("privacy")}
                        className="font-bold text-[#003B71] hover:text-[#F58220] underline"
                      >
                        Chính sách bảo vệ và xử lý dữ liệu cá nhân
                      </button>.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer text-xs leading-normal select-none">
                    <input 
                      type="checkbox"
                      checked={marketingConsent}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      className="mt-0.5 accent-[#F58220]"
                    />
                    <span className="text-[#6B7280]">
                      Tôi đồng ý nhận thông tin về sản phẩm, dịch vụ và chương trình ưu đãi.
                    </span>
                  </label>
                </div>

                {/* Submit button */}
                <Button 
                  type="submit"
                  disabled={!isRegisterFormValid()}
                  className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold transition shadow-md hover:shadow-[#F58220]/15 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Tạo tài khoản
                </Button>
              </form>

              <div className="text-center text-sm text-[#6B7280] pt-4 border-t border-border/40">
                Đã có tài khoản?{" "}
                <button 
                  type="button" 
                  onClick={() => setScreen("login")}
                  className="font-bold text-[#003B71] hover:text-[#F58220] transition"
                >
                  Đăng nhập
                </button>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* SCREEN: REGISTER OTP */}
          {/* ========================================== */}
          {screen === "register_otp" && (
            <div className="space-y-6">
              <button 
                onClick={() => setScreen("register")} 
                className="flex items-center gap-1.5 text-sm font-semibold text-[#003B71] hover:text-[#F58220] transition"
              >
                <ArrowLeft size={16} /> Quay lại
              </button>

              <div>
                <h1 className="text-3xl font-extrabold text-[#003B71]">Xác thực số điện thoại</h1>
                <p className="mt-2 text-sm text-[#6B7280]">
                  Mã xác thực đã được gửi đến <strong className="text-navy">{formatPhoneHidden(phoneNumber)}</strong>.
                </p>
              </div>

              <form onSubmit={handleConfirmRegisterOtp} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex gap-2 justify-between">
                    {Array(6).fill(0).map((_, idx) => (
                      <input 
                        key={idx}
                        ref={(el) => { otpInputsRef.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={otp[idx]}
                        onChange={(e) => handleRegisterOtpChange(e.target.value, idx)}
                        onKeyDown={(e) => handleRegisterOtpKeyDown(e, idx)}
                        onPaste={handleRegisterOtpPaste}
                        className={cn(
                          "w-12 h-14 border border-border rounded-xl text-center text-lg font-bold bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F58220]/25 focus-visible:border-transparent transition-all",
                          otpError ? "border-[#DC2626]" : ""
                        )}
                        aria-label={`OTP Digit ${idx + 1}`}
                      />
                    ))}
                  </div>
                  {otpError && <div className="mt-1 flex items-center gap-1 text-xs text-[#DC2626]"><AlertTriangle size={12} /> {otpError}</div>}
                </div>

                {/* Timer text display */}
                <div className="text-center text-xs text-[#6B7280]">
                  {otpTimer > 0 ? (
                    <span>Gửi lại mã sau <strong className="text-navy font-bold">{otpTimer}s</strong></span>
                  ) : (
                    <button 
                      type="button" 
                      onClick={handleResendOtp}
                      className="font-bold text-[#F58220] hover:underline"
                    >
                      Gửi lại mã OTP
                    </button>
                  )}
                </div>

                <Button 
                  type="submit"
                  disabled={otp.join("").length < 6}
                  className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold transition disabled:opacity-40 disabled:pointer-events-none"
                >
                  Xác nhận
                </Button>
              </form>
            </div>
          )}

          {/* ========================================== */}
          {/* SCREEN: REGISTER SUCCESS */}
          {/* ========================================== */}
          {screen === "register_success" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto h-16 w-16 bg-emerald-50 text-[#16A34A] rounded-full flex items-center justify-center border border-emerald-100 shadow-xs">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h1 className="text-3xl font-extrabold text-[#003B71]">Đăng ký thành công</h1>
                <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
                  Tài khoản của bạn đã được tạo. Hãy bắt đầu tìm khoản vay phù hợp với nhu cầu của bạn.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Button 
                  onClick={() => router.push("/customer-portal")}
                  className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold transition shadow-md hover:shadow-[#F58220]/15"
                >
                  Bắt đầu tư vấn vay
                </Button>
                <Button 
                  onClick={() => router.push("/")}
                  variant="outline"
                  className="w-full h-12 border-border text-foreground hover:bg-muted font-bold rounded-xl transition"
                >
                  Về trang chủ
                </Button>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* SCREEN: LOGIN */}
          {/* ========================================== */}
          {screen === "login" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-[#003B71]">Đăng nhập</h1>
                <p className="mt-2 text-sm text-[#6B7280]">
                  Đăng nhập để tiếp tục tư vấn và theo dõi hồ sơ vay.
                </p>
              </div>

              {errors.general && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl flex items-start gap-2.5">
                  <AlertTriangle className="text-[#DC2626] mt-0.5 shrink-0" size={16} />
                  <span className="text-xs font-semibold text-[#DC2626]">{errors.general}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Phone */}
                <div>
                  <label htmlFor="logPhone" className="mb-2 block text-sm font-semibold text-[#003B71]">
                    Số điện thoại
                  </label>
                  <Input 
                    id="logPhone"
                    type="tel"
                    value={loginPhone}
                    onChange={(e) => {
                      setLoginPhone(e.target.value.replace(/\D/g, ""));
                      if (errors.loginPhone) setErrors(prev => {
                        const next = { ...prev };
                        delete next.loginPhone;
                        return next;
                      });
                    }}
                    placeholder="Nhập số điện thoại"
                    className={cn("h-12 rounded-xl border-border", errors.loginPhone ? "border-[#DC2626]" : "")}
                  />
                  {errors.loginPhone && <div className="mt-1 flex items-center gap-1 text-xs text-[#DC2626]"><AlertTriangle size={12} /> {errors.loginPhone}</div>}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="logPass" className="mb-2 block text-sm font-semibold text-[#003B71]">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input 
                      id="logPass"
                      type={showPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        if (errors.loginPassword) setErrors(prev => {
                          const next = { ...prev };
                          delete next.loginPassword;
                          return next;
                        });
                      }}
                      placeholder="Nhập mật khẩu"
                      className={cn(
                        "w-full h-12 rounded-xl pl-4 pr-12 bg-background text-foreground border border-border outline-none focus-visible:ring-2 focus-visible:ring-[#F58220]/25 focus-visible:border-transparent transition text-sm",
                        errors.loginPassword ? "border-[#DC2626]" : ""
                      )}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.loginPassword && <div className="mt-1 flex items-center gap-1 text-xs text-[#DC2626]"><AlertTriangle size={12} /> {errors.loginPassword}</div>}
                </div>

                {/* Checkbox and link */}
                <div className="flex justify-between items-center text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[#6B7280] font-medium">
                    <input 
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="accent-[#F58220]"
                    />
                    Ghi nhớ đăng nhập
                  </label>
                  <button 
                    type="button" 
                    onClick={() => {
                      setErrors({});
                      setScreen("forgot_phone");
                    }}
                    className="font-bold text-[#F58220] hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                <Button 
                  type="submit"
                  className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold transition shadow-md hover:shadow-[#F58220]/15"
                >
                  Đăng nhập
                </Button>
              </form>

              {/* Development Helper Box */}
              {isDev && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl space-y-2">
                  <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">Tài khoản demo</span>
                  <div className="grid grid-cols-2 text-xs gap-y-1">
                    <span className="text-muted-foreground font-medium">Số điện thoại:</span>
                    <span className="font-bold text-[#003B71] text-right select-all">0912345678</span>
                    <span className="text-muted-foreground font-medium">Mật khẩu:</span>
                    <span className="font-bold text-[#003B71] text-right select-all">Shb@123456</span>
                    <span className="text-muted-foreground font-medium">OTP:</span>
                    <span className="font-bold text-[#003B71] text-right select-all">123456</span>
                  </div>
                </div>
              )}

              <div className="text-center text-sm text-[#6B7280] pt-4 border-t border-border/40">
                Chưa có tài khoản?{" "}
                <button 
                  type="button" 
                  onClick={() => setScreen("register")}
                  className="font-bold text-[#003B71] hover:text-[#F58220] transition"
                >
                  Đăng ký
                </button>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* SCREEN: FORGOT PASSWORD PHONE */}
          {/* ========================================== */}
          {screen === "forgot_phone" && (
            <div className="space-y-6">
              <button 
                onClick={() => setScreen("login")} 
                className="flex items-center gap-1.5 text-sm font-semibold text-[#003B71] hover:text-[#F58220] transition"
              >
                <ArrowLeft size={16} /> Quay lại đăng nhập
              </button>

              <div>
                <h1 className="text-3xl font-extrabold text-[#003B71]">Quên mật khẩu</h1>
                <p className="mt-2 text-sm text-[#6B7280]">
                  Nhập số điện thoại đã đăng ký để đặt lại mật khẩu.
                </p>
              </div>

              <form onSubmit={handleForgotPhoneSubmit} className="space-y-6">
                <div>
                  <label htmlFor="forgotPhone" className="mb-2 block text-sm font-semibold text-[#003B71]">
                    Số điện thoại
                  </label>
                  <Input 
                    id="forgotPhone"
                    type="tel"
                    value={loginPhone}
                    onChange={(e) => {
                      setLoginPhone(e.target.value.replace(/\D/g, ""));
                      if (errors.loginPhone) setErrors(prev => {
                        const next = { ...prev };
                        delete next.loginPhone;
                        return next;
                      });
                    }}
                    placeholder="Nhập số điện thoại"
                    className={cn("h-12 rounded-xl border-border", errors.loginPhone ? "border-[#DC2626]" : "")}
                  />
                  {errors.loginPhone && <div className="mt-1 flex items-center gap-1 text-xs text-[#DC2626]"><AlertTriangle size={12} /> {errors.loginPhone}</div>}
                </div>

                <Button 
                  type="submit"
                  className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold transition shadow-md hover:shadow-[#F58220]/15"
                >
                  Tiếp tục
                </Button>
              </form>
            </div>
          )}

          {/* ========================================== */}
          {/* SCREEN: FORGOT PASSWORD OTP */}
          {/* ========================================== */}
          {screen === "forgot_otp" && (
            <div className="space-y-6">
              <button 
                onClick={() => setScreen("forgot_phone")} 
                className="flex items-center gap-1.5 text-sm font-semibold text-[#003B71] hover:text-[#F58220] transition"
              >
                <ArrowLeft size={16} /> Quay lại
              </button>

              <div>
                <h1 className="text-3xl font-extrabold text-[#003B71]">Xác thực yêu cầu đặt lại mật khẩu</h1>
                <p className="mt-2 text-sm text-[#6B7280]">
                  Mã xác thực đã được gửi đến <strong className="text-navy">{formatPhoneHidden(loginPhone)}</strong>.
                </p>
              </div>

              <form onSubmit={handleConfirmForgotOtp} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex gap-2 justify-between">
                    {Array(6).fill(0).map((_, idx) => (
                      <input 
                        key={idx}
                        ref={(el) => { otpInputsRef.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={otp[idx]}
                        onChange={(e) => handleRegisterOtpChange(e.target.value, idx)}
                        onKeyDown={(e) => handleRegisterOtpKeyDown(e, idx)}
                        onPaste={handleRegisterOtpPaste}
                        className={cn(
                          "w-12 h-14 border border-border rounded-xl text-center text-lg font-bold bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F58220]/25 focus-visible:border-transparent transition-all",
                          otpError ? "border-[#DC2626]" : ""
                        )}
                        aria-label={`OTP Digit ${idx + 1}`}
                      />
                    ))}
                  </div>
                  {otpError && <div className="mt-1 flex items-center gap-1 text-xs text-[#DC2626]"><AlertTriangle size={12} /> {otpError}</div>}
                </div>

                {/* Timer display */}
                <div className="text-center text-xs text-[#6B7280]">
                  {otpTimer > 0 ? (
                    <span>Gửi lại mã sau <strong className="text-navy font-bold">{otpTimer}s</strong></span>
                  ) : (
                    <button 
                      type="button" 
                      onClick={handleResendOtp}
                      className="font-bold text-[#F58220] hover:underline"
                    >
                      Gửi lại mã OTP
                    </button>
                  )}
                </div>

                <Button 
                  type="submit"
                  disabled={otp.join("").length < 6}
                  className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold transition disabled:opacity-40 disabled:pointer-events-none"
                >
                  Xác nhận
                </Button>
              </form>
            </div>
          )}

          {/* ========================================== */}
          {/* SCREEN: FORGOT PASSWORD RESET */}
          {/* ========================================== */}
          {screen === "forgot_password" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-[#003B71]">Đặt lại mật khẩu</h1>
                <p className="mt-2 text-sm text-[#6B7280]">
                  Thiết lập mật khẩu bảo mật mới cho tài khoản của bạn.
                </p>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                {/* Password */}
                <div>
                  <label htmlFor="resetPass" className="mb-2 block text-sm font-semibold text-[#003B71]">
                    Mật khẩu mới <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      id="resetPass"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mật khẩu mới"
                      className="w-full h-12 rounded-xl pl-4 pr-12 bg-background text-foreground border border-border outline-none focus-visible:ring-2 focus-visible:ring-[#F58220]/25 focus-visible:border-transparent transition text-sm"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  {/* Realtime password rule checklist */}
                  {password.length > 0 && (
                    <div className="mt-3 bg-secondary/30 p-3 rounded-xl border border-border/30 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("h-3.5 w-3.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white", passRules.minLength ? "bg-emerald-500" : "bg-neutral-300")}>
                          ✓
                        </span>
                        <span className={cn(passRules.minLength ? "text-[#003B71] font-medium" : "")}>Ít nhất 8 ký tự</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("h-3.5 w-3.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white", passRules.hasUpper ? "bg-emerald-500" : "bg-neutral-300")}>
                          ✓
                        </span>
                        <span className={cn(passRules.hasUpper ? "text-[#003B71] font-medium" : "")}>Chứa chữ hoa (A-Z)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("h-3.5 w-3.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white", passRules.hasLower ? "bg-emerald-500" : "bg-neutral-300")}>
                          ✓
                        </span>
                        <span className={cn(passRules.hasLower ? "text-[#003B71] font-medium" : "")}>Chứa chữ thường (a-z)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("h-3.5 w-3.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white", passRules.hasDigit ? "bg-emerald-500" : "bg-neutral-300")}>
                          ✓
                        </span>
                        <span className={cn(passRules.hasDigit ? "text-[#003B71] font-medium" : "")}>Chứa chữ số (0-9)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground col-span-1 sm:col-span-2">
                        <span className={cn("h-3.5 w-3.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white", passRules.hasSpecial ? "bg-emerald-500" : "bg-neutral-300")}>
                          ✓
                        </span>
                        <span className={cn(passRules.hasSpecial ? "text-[#003B71] font-medium" : "")}>Chứa ký tự đặc biệt (@, $, !, ...)</span>
                      </div>
                    </div>
                  )}
                  {errors.password && <div className="mt-1 flex items-center gap-1 text-xs text-[#DC2626]"><AlertTriangle size={12} /> {errors.password}</div>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="resetConfirmPass" className="mb-2 block text-sm font-semibold text-[#003B71]">
                    Xác nhận mật khẩu mới <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      id="resetConfirmPass"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) {
                          setErrors(prev => {
                            const next = { ...prev };
                            delete next.confirmPassword;
                            return next;
                          });
                        }
                      }}
                      placeholder="Nhập lại mật khẩu"
                      className="w-full h-12 rounded-xl pl-4 pr-12 bg-background text-foreground border border-border outline-none focus-visible:ring-2 focus-visible:ring-[#F58220]/25 focus-visible:border-transparent transition text-sm"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-[#DC2626]">
                      <AlertTriangle size={12} /> Mật khẩu xác nhận không khớp.
                    </div>
                  )}
                  {errors.confirmPassword && <div className="mt-1 flex items-center gap-1 text-xs text-[#DC2626]"><AlertTriangle size={12} /> {errors.confirmPassword}</div>}
                </div>

                <Button 
                  type="submit"
                  disabled={!isPasswordValid || password !== confirmPassword}
                  className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold transition shadow-md hover:shadow-[#F58220]/15 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Đặt lại mật khẩu
                </Button>
              </form>
            </div>
          )}

        </div>

        {/* Bottom copyright block */}
        <footer className="text-center text-[10px] text-muted-foreground shrink-0 pt-6">
          Thông tin mang tính chất mô phỏng demo. Bảo mật dữ liệu cá nhân theo Quy định số 13/2023/NĐ-CP.
        </footer>
      </div>

      {/* Visual informational side panel (Mobile: hidden, Desktop: 5 cols) */}
      <aside className="relative hidden overflow-hidden bg-navy lg:block lg:col-span-5">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-deep to-navy" />
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-cream/10 blur-2xl" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-on-primary/15 bg-on-primary/10 px-3 py-1 text-xs font-semibold text-brand-soft backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" />
            Bảo mật thông tin chuẩn ngân hàng
          </div>

          <div className="relative mx-auto flex w-full max-w-sm flex-col items-center py-16">
            <BrandMark href={null} variant="light" size="hero" />
            <div className="brand-underline mt-4 h-1 w-16 rounded-full bg-brand" />

            <div className="mt-12 grid w-full gap-3">
              <div className="rounded-2xl border border-on-primary/15 bg-on-primary/10 p-4 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-on-primary">
                    <Wallet className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-on-primary">Chủ động kế hoạch tài chính</p>
                    <p className="mt-1 text-xs leading-relaxed text-on-primary/70">
                      Ước tính khoản vay và lịch trả nợ rõ ràng trước khi đăng ký chính thức.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-on-primary/15 bg-on-primary/10 p-4 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream text-brand">
                    <TrendingUp className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-on-primary">Quy trình thẩm định minh bạch</p>
                    <p className="mt-1 text-xs leading-relaxed text-on-primary/70">
                      Các tác tử tự động kiểm tra điều kiện vay DTI & LTV từ chính sách thực tế của NHNN.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-on-primary/50">Kết nối bảo mật 256-bit SSL</p>
        </div>
      </aside>
    </div>
  );
}
