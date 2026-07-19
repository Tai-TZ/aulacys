"use client";

import { FileText, Printer, X } from "lucide-react";
import { Button, Card } from "@/components/ui";
import {
  formatContractMoney,
  formatContractPct,
  type CreditContractData,
} from "@/lib/credit-contract";
import { cn } from "@/lib/cn";

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[12rem_1fr] gap-2 border-b border-black/10 py-1.5 text-[13px]">
      <dt className="font-semibold">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

export function CreditContractSheet({
  data,
  className,
}: {
  data: CreditContractData;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "credit-contract-sheet mx-auto max-w-[210mm] bg-white text-black shadow-elevated",
        "px-8 py-10 sm:px-12 print:shadow-none print:max-w-none",
        className,
      )}
    >
      <header className="text-center">
        <p className="text-[11px] text-black/55">
          Biểu mẫu hợp đồng tín dụng — bản dự thảo sau phê duyệt (demo)
        </p>
        <p className="mt-4 text-sm font-bold uppercase tracking-wide">
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        </p>
        <p className="text-sm font-semibold">Độc lập – Tự do – Hạnh phúc</p>
        <p className="mt-1 text-xs tracking-[0.35em]">---o0o---</p>
        <h1 className="mt-5 text-xl font-extrabold uppercase tracking-tight sm:text-2xl">
          Hợp đồng tín dụng
        </h1>
        <p className="mt-2 text-sm">
          (Số: <span className="font-semibold">{data.contract_no}</span> ngày{" "}
          {data.signed_day}/{data.signed_month}/{data.signed_year})
        </p>
        <p className="mt-1 text-xs text-black/60">
          Hồ sơ: {data.application_id}
          {data.ticket_id ? ` · Ticket: ${data.ticket_id}` : ""}
        </p>
      </header>

      <p className="mt-6 text-[13px] leading-relaxed text-justify">
        Hợp đồng tín dụng này được lập và ký kết vào ngày {data.signed_day} tháng {data.signed_month}{" "}
        năm {data.signed_year}, tại {data.signed_place}, bởi và giữa:
      </p>

      <section className="mt-5 text-[13px] leading-relaxed">
        <p className="font-bold uppercase">Bên cho vay</p>
        <p className="mt-1">{data.lender_name}</p>
        <p>Địa chỉ: {data.lender_address}</p>
        <p className="mt-1 text-xs text-black/55">
          (Bản demo — thông tin pháp lý đầy đủ bổ sung khi nối hệ thống lõi.)
        </p>
      </section>

      <section className="mt-5 text-[13px] leading-relaxed">
        <p className="font-bold uppercase">Bên vay</p>
        <dl className="mt-1">
          <Line label="Họ và tên" value={data.borrower_name} />
          <Line label="CCCD / CMND" value={data.national_id} />
          <Line label="Ngày sinh" value={data.dob} />
          <Line label="Điện thoại" value={data.phone} />
          <Line label="Địa chỉ" value={data.address} />
        </dl>
      </section>

      <p className="mt-5 text-[13px] leading-relaxed text-justify">
        Căn cứ nhu cầu và thỏa thuận giữa hai Bên, hai Bên thống nhất ký kết Hợp đồng tín dụng này với
        các điều kiện và điều khoản như sau.
      </p>

      <section className="mt-7">
        <h2 className="border-b-2 border-black pb-1 text-sm font-bold uppercase">
          Điều 1. Định nghĩa
        </h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-justify">
          <li>
            <span className="font-semibold">Bên Cho Vay</span> là tổ chức tín dụng nêu tại phần đầu
            Hợp đồng này.
          </li>
          <li>
            <span className="font-semibold">Bên Vay / Khách Hàng</span> là cá nhân có thông tin nêu tại
            phần đầu Hợp đồng.
          </li>
          <li>
            <span className="font-semibold">Số Tiền Vay</span> là nợ gốc được nêu tại Điều 2.
          </li>
          <li>
            <span className="font-semibold">Lãi Suất</span> là mức lãi suất thỏa thuận nêu tại Điều 2.
          </li>
          <li>
            <span className="font-semibold">Thời Hạn Cho Vay</span> là kỳ hạn tính bằng tháng nêu tại
            Điều 2.
          </li>
        </ol>
      </section>

      <section className="mt-7">
        <h2 className="border-b-2 border-black pb-1 text-sm font-bold uppercase">
          Điều 2. Các thỏa thuận vay
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-justify">
          Khách Hàng đề nghị vay và Bên Cho Vay đồng ý cho vay theo chi tiết sau:
        </p>
        <dl className="mt-2">
          <Line label="Sản phẩm" value={data.product_label} />
          <Line label="Mục đích sử dụng vốn" value={data.purpose} />
          <Line label="Số tiền vay" value={formatContractMoney(data.amount)} />
          <Line
            label="Hạn mức được duyệt"
            value={formatContractMoney(data.proposed_limit ?? data.amount)}
          />
          <Line
            label="Thời hạn cho vay"
            value={data.term_months ? `${data.term_months} tháng` : "—"}
          />
          <Line label="Lãi suất" value={formatContractPct(data.annual_rate)} />
          <Line label="Số tiền trả hàng tháng" value={formatContractMoney(data.monthly_payment)} />
        </dl>
        <p className="mt-3 text-[12px] leading-relaxed text-black/70 text-justify">
          Lịch thanh toán chi tiết, hướng dẫn thanh toán và các loại phí (nếu có) được cung cấp kèm
          theo hoặc trên kênh giao dịch của Bên Cho Vay tại thời điểm giải ngân.
        </p>
      </section>

      <section className="mt-7">
        <h2 className="border-b-2 border-black pb-1 text-sm font-bold uppercase">
          Điều 3. Cam kết của các bên
        </h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-justify">
          <li>
            Bên Vay cam kết sử dụng vốn đúng mục đích, trả nợ gốc và lãi đúng hạn theo thỏa thuận.
          </li>
          <li>
            Bên Cho Vay thực hiện giải ngân sau khi hoàn tất thủ tục theo quy định nội bộ và pháp luật
            liên quan.
          </li>
          <li>
            Hai Bên cam kết thực hiện đúng các điều khoản của Hợp đồng; mọi sửa đổi phải bằng văn bản
            có chữ ký của người có thẩm quyền.
          </li>
        </ol>
      </section>

      <section className="mt-7">
        <h2 className="border-b-2 border-black pb-1 text-sm font-bold uppercase">
          Điều 4. Hiệu lực
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-justify">
          Hợp đồng có hiệu lực kể từ ngày các Bên ký kết (hoặc ngày giải ngân theo quy định sản phẩm)
          và chấm dứt khi Bên Vay hoàn thành toàn bộ nghĩa vụ nợ hoặc theo thỏa thuận/pháp luật.
        </p>
      </section>

      <footer className="mt-12 grid gap-10 sm:grid-cols-2 print:break-inside-avoid">
        <div className="text-center text-[13px]">
          <p className="font-semibold">BÊN VAY</p>
          <p className="mt-1 text-xs text-black/55">(Ký, ghi rõ họ tên)</p>
          <div className="mx-8 mt-16 border-b border-black/40" />
        </div>
        <div className="text-center text-[13px]">
          <p className="font-semibold">BÊN CHO VAY</p>
          <p className="mt-1 text-xs text-black/55">(Ký, ghi rõ họ tên / đóng dấu)</p>
          <div className="mx-8 mt-16 border-b border-black/40" />
        </div>
      </footer>
    </article>
  );
}

export function CreditContractDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CreditContractData | null;
}) {
  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-navy-deep/55 p-3 sm:p-6 print:static print:bg-transparent print:p-0">
      <div className="relative w-full max-w-[920px] print:max-w-none">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-card print:hidden">
          <p className="text-sm font-semibold text-navy">Hợp đồng tín dụng</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => window.print()}
            >
              <Printer size={14} aria-hidden />
              In / PDF
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Đóng hợp đồng"
              onClick={() => onOpenChange(false)}
            >
              <X size={16} />
            </Button>
          </div>
        </div>
        <CreditContractSheet data={data} />
        <div className="mt-3 flex justify-end print:hidden">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Stage-5 panel: generate / view HĐTD after approval. */
export function DisbursementContractPanel({
  onViewContract,
}: {
  onViewContract: () => void;
}) {
  return (
    <Card className="border border-success-foreground/20 bg-success-soft/30 p-4 shadow-card text-left sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-navy">Bước 5 · Giải ngân — Hợp đồng tín dụng</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Theo quy trình nghiệp vụ, hợp đồng tín dụng được lập <span className="font-medium">sau khi
            đã phê duyệt</span>, gắn với bước giải ngân / khế ước nhận nợ.
          </p>
        </div>
        <Button type="button" variant="primary" className="gap-2 shrink-0" onClick={onViewContract}>
          <FileText size={15} aria-hidden />
          Xem hợp đồng tín dụng
        </Button>
      </div>
    </Card>
  );
}
