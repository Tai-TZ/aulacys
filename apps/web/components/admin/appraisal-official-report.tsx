"use client";

import { FileText, Printer, X } from "lucide-react";
import { Button } from "@/components/ui";
import {
  formatReportMoney,
  formatReportPct,
  type AppraisalReportData,
} from "@/lib/appraisal-report";
import { cn } from "@/lib/cn";

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[11rem_1fr] gap-2 border-b border-black/10 py-1.5 text-[13px] leading-snug">
      <dt className="font-semibold text-navy">{label}</dt>
      <dd className="text-foreground">{value || "—"}</dd>
    </div>
  );
}

/** Print-ready sheet — layout inspired by hop-dong-tin-dung formal VN templates. */
export function AppraisalOfficialReportSheet({
  data,
  className,
}: {
  data: AppraisalReportData;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "appraisal-report-sheet mx-auto max-w-[210mm] bg-white text-black shadow-elevated",
        "px-8 py-10 sm:px-12 print:shadow-none print:max-w-none",
        className,
      )}
    >
      <header className="text-center">
        <p className="text-[11px] tracking-wide text-black/55">
          Biểu mẫu báo cáo thẩm định — dùng nội bộ
        </p>
        <p className="mt-4 text-sm font-bold uppercase tracking-wide">
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        </p>
        <p className="text-sm font-semibold">Độc lập – Tự do – Hạnh phúc</p>
        <p className="mt-1 text-xs tracking-[0.35em]">---o0o---</p>
        <h1 className="mt-5 text-xl font-extrabold uppercase tracking-tight sm:text-2xl">
          Báo cáo thẩm định tín dụng
        </h1>
        <p className="mt-2 text-sm">
          (Số: <span className="font-semibold">{data.report_no}</span> ngày{" "}
          <span className="font-semibold">{data.issued_at}</span>)
        </p>
        <p className="mt-1 text-xs text-black/60">
          Mã hồ sơ: {data.application_id}
          {data.ticket_id ? ` · Ticket: ${data.ticket_id}` : ""}
        </p>
      </header>

      <p className="mt-6 text-[13px] leading-relaxed text-justify">
        Báo cáo này được lập sau khi hệ thống Digital Expert Agents hoàn tất đối chiếu tiêu chí
        thẩm định, phục vụ người có thẩm quyền xem xét và quyết định phê duyệt / từ chối giải ngân.
      </p>

      <section className="mt-7">
        <h2 className="border-b-2 border-black pb-1 text-sm font-bold uppercase tracking-wide">
          Điều 1. Thông tin khách hàng
        </h2>
        <dl className="mt-2">
          <FieldRow label="Họ và tên" value={data.customer_name} />
          <FieldRow label="CCCD / CMND" value={data.national_id} />
          <FieldRow label="Ngày sinh" value={data.dob} />
          <FieldRow label="Điện thoại" value={data.phone} />
          <FieldRow label="Địa chỉ" value={data.address} />
          <FieldRow label="Nghề nghiệp" value={data.occupation} />
          <FieldRow label="Thu nhập xác minh" value={formatReportMoney(data.monthly_income)} />
        </dl>
      </section>

      <section className="mt-7">
        <h2 className="border-b-2 border-black pb-1 text-sm font-bold uppercase tracking-wide">
          Điều 2. Phương án vay đề nghị
        </h2>
        <dl className="mt-2">
          <FieldRow label="Sản phẩm" value={data.product_label} />
          <FieldRow label="Mục đích" value={data.purpose} />
          <FieldRow label="Số tiền đề nghị" value={formatReportMoney(data.amount)} />
          <FieldRow label="Kỳ hạn" value={data.term_months ? `${data.term_months} tháng` : "—"} />
          <FieldRow label="Lãi suất đề xuất" value={formatReportPct(data.proposed_rate ?? data.annual_rate)} />
          <FieldRow label="Hạn mức Credit" value={formatReportMoney(data.proposed_limit)} />
          <FieldRow label="Trả hàng tháng" value={formatReportMoney(data.monthly_payment)} />
          <FieldRow label="DTI" value={formatReportPct(data.dti)} />
          <FieldRow label="Khuyến nghị Credit" value={data.recommendation} />
        </dl>
      </section>

      <section className="mt-7">
        <h2 className="border-b-2 border-black pb-1 text-sm font-bold uppercase tracking-wide">
          Điều 3. Kết quả tra cứu lịch sử tín dụng
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-justify">{data.cic_summary}</p>
        <p className="mt-2 text-[13px]">
          Chứng từ: <span className="font-semibold">{data.doc_status}</span>
          {data.missing_docs.length > 0
            ? ` (thiếu: ${data.missing_docs.join(", ")})`
            : ""}
          .
        </p>
      </section>

      <section className="mt-7">
        <h2 className="border-b-2 border-black pb-1 text-sm font-bold uppercase tracking-wide">
          Điều 4. Đối chiếu tiêu chí thẩm định
        </h2>
        <table className="mt-3 w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-2 pr-2 font-bold w-8">STT</th>
              <th className="py-2 pr-2 font-bold">Tiêu chí</th>
              <th className="py-2 pr-2 font-bold w-24">Kết quả</th>
              <th className="py-2 font-bold">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {data.criteria.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-3 text-black/60">
                  Chưa có tiêu chí ghi nhận trên báo cáo.
                </td>
              </tr>
            ) : (
              data.criteria.map((row, idx) => (
                <tr key={`${row.title}-${idx}`} className="border-b border-black/15 align-top">
                  <td className="py-2 pr-2">{idx + 1}</td>
                  <td className="py-2 pr-2 font-medium">{row.title}</td>
                  <td className="py-2 pr-2 font-semibold">{row.status}</td>
                  <td className="py-2 leading-snug">{row.note}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-7">
        <h2 className="border-b-2 border-black pb-1 text-sm font-bold uppercase tracking-wide">
          Điều 5. Nhận định chuyên môn
        </h2>
        <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-justify">
          {data.credit_rationale ? (
            <div>
              <p className="font-semibold">5.1. Credit</p>
              <p className="whitespace-pre-wrap mt-1">{data.credit_rationale}</p>
            </div>
          ) : null}
          {data.operations_rationale ? (
            <div>
              <p className="font-semibold">5.2. Operations (hồ sơ &amp; TSBĐ)</p>
              <p className="whitespace-pre-wrap mt-1">{data.operations_rationale}</p>
            </div>
          ) : null}
          {data.compliance_rationale ? (
            <div>
              <p className="font-semibold">5.3. Compliance (tuân thủ)</p>
              <p className="whitespace-pre-wrap mt-1">{data.compliance_rationale}</p>
            </div>
          ) : null}
          {data.critic_memo ? (
            <div>
              <p className="font-semibold">5.4. Kiểm soát tuyến 3</p>
              <p className="whitespace-pre-wrap mt-1">{data.critic_memo}</p>
            </div>
          ) : null}
          {!data.credit_rationale &&
          !data.operations_rationale &&
          !data.compliance_rationale &&
          !data.critic_memo ? (
            <p className="text-black/60">Không có nhận định văn bản bổ sung.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="border-b-2 border-black pb-1 text-sm font-bold uppercase tracking-wide">
          Điều 6. Kết luận và kiến nghị
        </h2>
        <p className="mt-3 text-[13px]">
          Kết quả luồng: <span className="font-semibold">{data.outcome_label}</span>
          {data.veto ? " (có chặn cứng)." : "."}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-justify">{data.recommendation_text}</p>
      </section>

      <footer className="mt-10 grid gap-8 sm:grid-cols-2 print:break-inside-avoid">
        <div className="text-center text-[13px]">
          <p className="font-semibold">CÁN BỘ THẨM ĐỊNH</p>
          <p className="mt-1 text-xs text-black/55">(Ký, ghi rõ họ tên)</p>
          <div className="mt-16 border-b border-black/40 mx-8" />
        </div>
        <div className="text-center text-[13px]">
          <p className="font-semibold">NGƯỜI PHÊ DUYỆT</p>
          <p className="mt-1 text-xs text-black/55">(Ký, ghi rõ họ tên)</p>
          <div className="mt-16 border-b border-black/40 mx-8" />
        </div>
      </footer>

      <p className="mt-8 text-center text-[10px] text-black/45">
        Ngày lập báo cáo: {data.issued_at} · Tài liệu nội bộ phục vụ phê duyệt
      </p>
    </article>
  );
}

export function AppraisalReportDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AppraisalReportData | null;
}) {
  if (!open || !data) return null;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-navy-deep/55 p-3 sm:p-6 print:static print:bg-transparent print:p-0">
      <div className="relative w-full max-w-[920px] print:max-w-none">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-card print:hidden">
          <p className="text-sm font-semibold text-navy">Báo cáo thẩm định tín dụng</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer size={14} aria-hidden />
              In / PDF
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Đóng báo cáo"
              onClick={() => onOpenChange(false)}
            >
              <X size={16} />
            </Button>
          </div>
        </div>
        <AppraisalOfficialReportSheet data={data} />
        <div className="mt-3 flex justify-end print:hidden">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ViewAppraisalReportButton({
  onClick,
  disabled,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className={cn("gap-2", className)}
    >
      <FileText size={15} aria-hidden />
      Xem báo cáo thẩm định
    </Button>
  );
}
