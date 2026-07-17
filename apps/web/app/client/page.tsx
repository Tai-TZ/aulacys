import Image from "next/image";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CarFront,
  ChevronDown,
  Headphones,
  Landmark,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button, Card } from "@/components/ui";
import { LoanChatbot } from "@/components/client/loan-chatbot";
import { ServiceMonitor } from "@/components/client/service-monitor";

const needs = [
  { label: "Vay mua nhà", icon: Landmark },
  { label: "Vay mua ô tô", icon: CarFront },
  { label: "Vay tiêu dùng", icon: Users },
  { label: "Vay du học", icon: Building2 },
  { label: "Tính khoản vay", icon: BriefcaseBusiness },
];

const features = [
  ["Mua nhà", "Hiện thực hóa tổ ấm", "Ước tính hạn mức, khoản trả hàng tháng và phương án vay phù hợp với thu nhập."],
  ["Mua xe", "Chủ động mọi hành trình", "So sánh thời hạn vay, vốn tự có và lịch thanh toán theo nhu cầu cá nhân."],
  ["Tiêu dùng", "Linh hoạt cho mọi kế hoạch", "Tư vấn điều kiện, hồ sơ cần chuẩn bị và các bước đăng ký khoản vay."],
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="relative z-20">
        <div className="hidden bg-brand px-6 text-on-primary lg:block">
          <div className="mx-auto flex h-12 max-w-7xl items-center justify-between text-sm">
            <div className="flex h-full items-center gap-8">
              <span className="opacity-80">Bạn đang ở</span>
              <button className="flex h-full items-center gap-3 border-x border-on-primary/25 px-8 font-semibold">
                Khách hàng cá nhân <ChevronDown size={15} />
              </button>
              <span className="font-semibold">Giới thiệu SHB</span>
            </div>
            <div className="flex items-center gap-7 font-medium">
              <span className="flex items-center gap-2"><MapPin size={16} /> Tìm ATM & Chi nhánh</span>
              <span className="flex items-center gap-2"><MessageCircle size={16} /> Nhắn tin với SHB</span>
              <span className="flex items-center gap-2"><Phone size={16} /> *6688</span>
              <span>🇻🇳 Tiếng Việt</span>
            </div>
          </div>
        </div>
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-8">
            <Image src="/shb/logo.svg" alt="SHB" width={91} height={43} priority />
            <div className="hidden items-center gap-2 font-semibold text-brand lg:flex"><CarFront size={22} /> Digital Expert <ChevronDown size={16} /></div>
          </div>
          <Button variant="ghost" className="hidden gap-3 text-base font-semibold lg:flex"><ArrowRight size={19} /> Đăng nhập</Button>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Mở menu"><Menu /></Button>
        </div>
      </header>

      <section className="relative mx-auto min-h-[600px] max-w-[1440px] overflow-hidden rounded-br-[88px] bg-muted lg:min-h-[640px]">
        <Image src="/shb/loan-hero.jpg" alt="SHB đồng hành cùng kế hoạch tài chính cá nhân" fill priority className="object-cover object-center" />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative z-10 mx-auto flex min-h-[600px] max-w-7xl flex-col justify-center px-5 pb-10 pt-14 lg:min-h-[640px] lg:px-12">
          <div className="mb-8 flex items-center gap-3 text-sm font-bold uppercase text-navy"><span>Khách hàng cá nhân</span><ArrowRight size={15} className="text-brand"/><span className="text-brand">Trợ lý khoản vay</span></div>
          <h1 className="max-w-3xl text-4xl font-light leading-[1.12] tracking-tight text-navy md:text-6xl">
            Đồng hành cùng bạn với<br /><span className="text-brand">mọi quyết định tương lai</span>
          </h1>
          <p className="mt-7 text-lg font-semibold text-navy">Bạn đang có kế hoạch tài chính nào?</p>
          <div className="mt-5 grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
            {needs.map(({ label, icon: Icon }) => (
              <Card key={label} className="flex min-h-28 flex-col justify-between border-0 p-4 shadow-lg transition hover:-translate-y-1 md:min-h-32">
                <Icon className="text-navy" size={25} />
                <span className="text-sm font-medium leading-snug text-navy">{label}</span>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-12 lg:py-28">
        <div className="flex items-center gap-2 text-sm font-bold uppercase text-navy"><Sparkles size={18} className="text-brand" /> Khám phá giải pháp</div>
        <h2 className="mt-5 max-w-2xl text-4xl font-light leading-tight text-navy md:text-5xl">Lựa chọn tối ưu cho<br /><span className="text-brand">mọi hồ sơ tín dụng</span></h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map(([eyebrow, title, description], index) => (
            <Card key={title} className="group overflow-hidden border-0 bg-secondary p-7 shadow-none">
              <div className="mb-16 flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-brand">{eyebrow}</span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-navy transition group-hover:bg-brand group-hover:text-on-primary"><ArrowRight size={19}/></span>
              </div>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-card text-brand">{index === 0 ? <Landmark/> : index === 1 ? <ShieldCheck/> : <Users/>}</div>
              <h3 className="text-xl font-semibold text-navy">{title}</h3>
              <p className="mt-3 leading-7 text-muted-foreground">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <ServiceMonitor />

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-12">
        <div className="grid gap-5 md:grid-cols-3">
          {[[Headphones, "Bạn cần trợ giúp?", "SHB hỗ trợ 24/7", "Liên hệ ngay"], [BriefcaseBusiness, "Theo dõi hồ sơ", "Xem tiến trình chuyên gia", "Khám phá"], [MapPin, "Bạn cần đến SHB?", "Tìm điểm giao dịch gần nhất", "Mở bản đồ"]].map(([Icon, title, sub, action]) => {
            const ItemIcon = Icon as typeof Headphones;
            return <Card key={title as string} className="flex items-center gap-5 border-0 bg-secondary p-6 shadow-none"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-card text-brand"><ItemIcon/></span><div className="flex-1"><h3 className="font-semibold text-navy">{title as string}</h3><p className="mt-1 text-sm text-muted-foreground">{sub as string}</p></div><Button variant="ghost" size="icon" aria-label={action as string}><ArrowRight/></Button></Card>;
          })}
        </div>
      </section>

      <footer className="bg-navy py-12 text-on-primary">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-5 lg:flex-row lg:px-12">
          <div><Image src="/shb/logo.svg" alt="SHB" width={91} height={43} className="brightness-0 invert"/><p className="mt-5 max-w-sm text-sm leading-6 text-on-primary/65">Trợ lý khoản vay SHB — đồng hành cùng mọi kế hoạch tài chính cá nhân của bạn.</p></div>
          <div className="grid grid-cols-2 gap-x-16 gap-y-4 text-sm text-on-primary/75"><span className="font-semibold text-on-primary">TRỤ SỞ CHÍNH</span><span>HOTLINE</span><span>77 Trần Hưng Đạo, Hà Nội</span><span>*6688 (24/7)</span></div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-on-primary/15 px-5 pt-7 text-xs text-on-primary/50 lg:px-12">© Bản quyền thuộc về Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)</div>
      </footer>
      <LoanChatbot />
    </main>
  );
}
