"use client";

import { useCallback, useEffect, useState } from "react";
import { 
  ClipboardCheck, 
  Search, 
  ShieldAlert, 
  Lock, 
  Save, 
  RotateCcw, 
  FlaskConical, 
  CheckCircle,
  AlertTriangle,
  Layers,
  Shield,
  Sliders,
  AlertCircle,
  HelpCircle,
  FileText
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  listPolicyRules,
  patchPolicyAppetite,
  deletePolicyAppetite,
  validatePolicyRules,
  listLoanProducts,
  type PolicyRuleDto,
} from "@/lib/api";
import { ruleLabelVi } from "@/lib/labels";

export default function AppraisalCriteriaPage() {
  const [securedType, setSecuredType] = useState<"SECURED" | "UNSECURED">("SECURED");
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductCode, setSelectedProductCode] = useState<string>("");
  
  const [rules, setRules] = useState<PolicyRuleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editableFilter, setEditableFilter] = useState<"ALL" | "EDITABLE" | "LOCKED">("ALL");
  
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  
  // Validation dry-run state
  const [validating, setValidating] = useState(false);
  const [validateResult, setValidateResult] = useState<{
    veto: boolean;
    rule_ids: string[];
    violations: any[];
  } | null>(null);

  // Load products catalog for filter dropdown
  useEffect(() => {
    listLoanProducts("INDIVIDUAL")
      .then((res) => {
        setProducts(res);
      })
      .catch((err) => {
        console.error("Không tải được danh sách sản phẩm:", err);
      });
  }, []);

  const refreshRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    setValidateResult(null);
    try {
      const code = selectedProductCode.trim() || undefined;
      const res = await listPolicyRules(securedType, code);
      setRules(res.rules);
      
      const nextDrafts: Record<string, string> = {};
      for (const r of res.rules) {
        if (r.editable) {
          nextDrafts[r.id] = String(r.threshold);
        }
      }
      setDrafts(nextDrafts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách tiêu chí");
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [securedType, selectedProductCode]);

  useEffect(() => {
    void refreshRules();
  }, [refreshRules]);

  const showToast = (msg: string, isSuccess = true) => {
    if (isSuccess) {
      setSuccess(msg);
      setError(null);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(msg);
      setSuccess(null);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSave = async (rule: PolicyRuleDto) => {
    const raw = drafts[rule.id];
    const threshold = Number(raw);
    if (isNaN(threshold) || !isFinite(threshold)) {
      showToast("Ngưỡng nhập vào không hợp lệ", false);
      return;
    }
    
    setSavingId(rule.id);
    try {
      const code = selectedProductCode.trim() || undefined;
      const updated = await patchPolicyAppetite(rule.id, threshold, securedType, code);
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setDrafts((prev) => ({ ...prev, [updated.id]: String(updated.threshold) }));
      showToast(`Đã lưu thay đổi cho tiêu chí "${rule.label_vi || rule.id}"`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Lỗi lưu ngưỡng", false);
    } finally {
      setSavingId(null);
    }
  };

  const handleRevert = async (rule: PolicyRuleDto) => {
    if (!confirm(`Bạn có chắc muốn khôi phục tiêu chí "${rule.label_vi || rule.id}" về mặc định?`)) {
      return;
    }
    
    setRevertingId(rule.id);
    try {
      const code = selectedProductCode.trim() || undefined;
      await deletePolicyAppetite(rule.id, securedType, code);
      showToast(`Đã khôi phục tiêu chí "${rule.label_vi || rule.id}" về mặc định`);
      void refreshRules();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Lỗi khôi phục", false);
    } finally {
      setRevertingId(null);
    }
  };

  const handleValidateDemo = async () => {
    setValidating(true);
    setValidateResult(null);
    try {
      const code = selectedProductCode.trim() || undefined;
      const testMetrics: Record<string, number> =
        securedType === "SECURED"
          ? {
              prohibited_purpose_refinance_other_bank: 1, // Will veto
              dti: 0.55,
              cic_group: 1,
              has_bad_debt: 0,
              docs_complete: 1,
              term_within_product_max: 1,
              income_verified: 1,
              land_registry_ok: 1,
              sanctions_match_count: 0,
              pep_match_count: 0,
              ltv_within_product_cap: 1,
            }
          : {
              prohibited_purpose_refinance_other_bank: 0,
              dti: 0.35,
              cic_group: 3, // Will block
              has_bad_debt: 0,
              docs_complete: 1,
              term_within_product_max: 1,
              income_verified: 1,
              sanctions_match_count: 0,
              pep_match_count: 0,
              amount_within_product_ceiling: 1,
            };
      const res = await validatePolicyRules(securedType, testMetrics, { productCode: code });
      setValidateResult(res);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Thử nghiệm quy tắc thất bại", false);
    } finally {
      setValidating(false);
    }
  };

  const filteredProducts = products.filter(p => p.secured_type === securedType);

  const searchedRules = rules.filter(r => {
    const term = searchQuery.toLowerCase().trim();
    const matchesSearch = !term || (
      r.id.toLowerCase().includes(term) ||
      (r.label_vi || "").toLowerCase().includes(term) ||
      (r.description || "").toLowerCase().includes(term) ||
      r.metric.toLowerCase().includes(term)
    );
    
    const matchesEditable = 
      editableFilter === "ALL" ||
      (editableFilter === "EDITABLE" && r.editable) ||
      (editableFilter === "LOCKED" && !r.editable);
      
    return matchesSearch && matchesEditable;
  });

  // Stats computation
  const totalCount = rules.length;
  const legalCount = rules.filter(r => r.kind === "legal").length;
  const appetiteCount = rules.filter(r => r.kind === "appetite").length;
  const unverifiedCount = rules.filter(r => !r.verified).length;

  return (
    <AdminShell 
      activeHref="/admin/tieu-chi" 
      eyebrow="Aulacys · Cấu hình chính sách" 
      title="Tiêu chí thẩm định & Quy tắc"
    >
      <div className="space-y-6">
        
        {/* Top Header Actions */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card border border-border/70 rounded-2xl p-6 shadow-card relative overflow-hidden">
          <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-brand/5 blur-3xl" aria-hidden />
          <div className="space-y-1 relative z-10">
            <h2 className="text-lg font-bold text-navy flex items-center gap-2">
              <ClipboardCheck className="text-brand" size={20} />
              Cấu hình Tiêu chí thẩm định
            </h2>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Thiết lập các ngưỡng kiểm soát rủi ro, phân loại chi tiết giữa các luật định chung của Ngân hàng Nhà nước và khẩu vị rủi ro có thể tùy chỉnh theo từng gói vay của SHB.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl font-bold border-brand/30 text-brand hover:bg-brand/5 shadow-xs shrink-0 transition relative z-10"
            disabled={validating || loading}
            onClick={() => void handleValidateDemo()}
          >
            <FlaskConical size={14} className="mr-2" />
            {validating ? "Đang đánh giá thử..." : "Thử nghiệm quy tắc Demo"}
          </Button>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-card flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tổng tiêu chí</p>
              <h3 className="text-lg font-bold text-navy mt-0.5">{totalCount}</h3>
            </div>
          </div>
          
          <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-card flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
              <Shield size={18} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Luật định (Cố định)</p>
              <h3 className="text-lg font-bold text-navy mt-0.5">{legalCount}</h3>
            </div>
          </div>

          <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-card flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0">
              <Sliders size={18} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Khẩu vị (Chỉnh sửa)</p>
              <h3 className="text-lg font-bold text-navy mt-0.5">{appetiteCount}</h3>
            </div>
          </div>

          <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-card flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
              unverifiedCount > 0 ? "bg-amber-500/10 text-amber-600" : "bg-green-500/10 text-green-600"
            )}>
              <ShieldAlert size={18} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Chưa xác minh</p>
              <h3 className="text-lg font-bold text-navy mt-0.5">{unverifiedCount}</h3>
            </div>
          </div>
        </div>

        {/* Global Success / Error Messages */}
        {success && (
          <div className="bg-success/10 border border-success/30 rounded-xl px-4 py-3 text-xs text-success-foreground font-semibold flex items-center gap-2 transition-all">
            <CheckCircle size={16} /> {success}
          </div>
        )}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-xs text-destructive flex items-center gap-2 transition-all">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* Validate Result Box */}
        {validateResult && (
          <div className={cn(
            "border rounded-2xl p-5 shadow-md text-left space-y-3 transition-all",
            validateResult.veto 
              ? "border-destructive/30 bg-destructive/5" 
              : validateResult.rule_ids.length > 0 
                ? "border-warning-foreground/30 bg-warning-soft/10" 
                : "border-success/30 bg-success/5"
          )}>
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-navy">Kết quả thử nghiệm quy tắc</h4>
              <button 
                type="button" 
                className="text-xs text-muted-foreground hover:text-navy underline"
                onClick={() => setValidateResult(null)}
              >
                Đóng
              </button>
            </div>
            
            {validateResult.veto ? (
              <p className="text-xs text-destructive font-bold flex items-center gap-1.5">
                <AlertTriangle size={14} /> BỊ CHẶN CỨNG (VETO) — Phát hiện {validateResult.rule_ids.length} vi phạm chính sách ngăn chặn.
              </p>
            ) : validateResult.rule_ids.length > 0 ? (
              <p className="text-xs text-warning-foreground font-bold flex items-center gap-1.5">
                <AlertTriangle size={14} /> CẢNH BÁO — Phát hiện các tiêu chí cần xem xét bổ sung.
              </p>
            ) : (
              <p className="text-xs text-success-foreground font-bold flex items-center gap-1.5">
                <CheckCircle size={14} /> ĐẠT YÊU CẦU — Tất cả quy tắc đều thông qua đối với metrics giả lập.
              </p>
            )}

            <div className="space-y-1.5 pt-1">
              {validateResult.violations.map((v: any, index: number) => (
                <div key={v.rule_id || index} className="text-xs leading-relaxed text-navy border-l-2 border-brand/50 pl-3">
                  <span className="font-bold">{v.rule_id}:</span> {v.description || "Vi phạm quy tắc"} · Thực tế: <span className="font-semibold">{v.actual}</span> (Hạn mức {v.operator} {v.threshold})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-6 items-start">
          
          {/* Left Panel: Profile and Product Selection */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-card space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Phân loại bảo đảm</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => { setSecuredType("SECURED"); setSelectedProductCode(""); }}
                    className={cn(
                      "py-2.5 rounded-xl text-xs font-bold transition ring-1",
                      securedType === "SECURED"
                        ? "bg-brand text-on-brand ring-brand shadow-sm"
                        : "bg-background text-navy ring-border hover:bg-muted/40"
                    )}
                  >
                    Thế chấp
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSecuredType("UNSECURED"); setSelectedProductCode(""); }}
                    className={cn(
                      "py-2.5 rounded-xl text-xs font-bold transition ring-1",
                      securedType === "UNSECURED"
                        ? "bg-brand text-on-brand ring-brand shadow-sm"
                        : "bg-background text-navy ring-border hover:bg-muted/40"
                    )}
                  >
                    Tín chấp
                  </button>
                </div>
              </div>

              <div className="border-t border-border/60 pt-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Phạm vi áp dụng</label>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {selectedProductCode ? "Riêng gói vay" : "Dùng chung"}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => setSelectedProductCode("")}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition",
                      !selectedProductCode 
                        ? "bg-brand/10 text-brand"
                        : "text-muted-foreground hover:bg-muted/30"
                    )}
                  >
                    <span>Dùng chung (Hệ thống)</span>
                    {!selectedProductCode && <CheckCircle size={14} />}
                  </button>
                  
                  {filteredProducts.map((p) => (
                    <button
                      key={p.product_code}
                      type="button"
                      onClick={() => setSelectedProductCode(p.product_code)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition",
                        selectedProductCode === p.product_code 
                          ? "bg-brand/10 text-brand font-bold"
                          : "text-muted-foreground hover:bg-muted/30 hover:text-navy"
                      )}
                    >
                      <span className="truncate pr-2">{p.product_name}</span>
                      {selectedProductCode === p.product_code && <CheckCircle size={14} className="shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border/60 pt-3.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Quyền cấu hình</label>
                <div className="mt-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => setEditableFilter("ALL")}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition",
                      editableFilter === "ALL" 
                        ? "bg-brand/10 text-brand"
                        : "text-muted-foreground hover:bg-muted/30"
                    )}
                  >
                    <span>Tất cả tiêu chí</span>
                    {editableFilter === "ALL" && <CheckCircle size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditableFilter("EDITABLE")}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition",
                      editableFilter === "EDITABLE" 
                        ? "bg-brand/10 text-brand"
                        : "text-muted-foreground hover:bg-muted/30"
                    )}
                  >
                    <span>Được phép sửa</span>
                    {editableFilter === "EDITABLE" && <CheckCircle size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditableFilter("LOCKED")}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition",
                      editableFilter === "LOCKED" 
                        ? "bg-brand/10 text-brand"
                        : "text-muted-foreground hover:bg-muted/30"
                    )}
                  >
                    <span>Cố định (Không được sửa)</span>
                    {editableFilter === "LOCKED" && <CheckCircle size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Rules List */}
          <div className="space-y-4">
            
            {/* Search and Metadata */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-card border border-border/70 rounded-2xl p-4 shadow-card">
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Search size={14} />
                </span>
                <Input
                  aria-label="Tìm kiếm tiêu chí"
                  placeholder="Tìm theo mã, tên, mô tả..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-xs rounded-xl border-border/80 focus-visible:ring-brand"
                />
              </div>
              
              <div className="text-xs text-muted-foreground font-semibold shrink-0">
                Hiển thị <span className="text-brand font-extrabold">{searchedRules.length}</span> trên <span className="text-navy font-extrabold">{rules.length}</span> quy tắc
              </div>
            </div>

            {/* Rules Cards Loop */}
            {loading ? (
              <div className="bg-card border border-border/70 rounded-2xl p-12 text-center text-xs text-muted-foreground">
                Đang tải danh sách tiêu chí thẩm định...
              </div>
            ) : searchedRules.length === 0 ? (
              <div className="bg-card border border-border/70 rounded-2xl p-12 text-center text-xs text-muted-foreground">
                Không tìm thấy tiêu chí nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              <div className="space-y-4">
                {searchedRules.map((rule) => {
                  const isLegal = rule.kind === "legal";
                  const isBlocking = rule.severity === "blocking";
                  const hasOverride = rule.editable && rule.threshold !== rules.find(r => r.id === rule.id)?.threshold; // simple check
                  
                  return (
                    <div 
                      key={rule.id}
                      className={cn(
                        "bg-card border rounded-2xl shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md relative overflow-hidden flex",
                        isBlocking ? "border-l-4 border-l-destructive border-border/70" : "border-l-4 border-l-amber-500 border-border/70"
                      )}
                    >
                      {/* Card Content Grid */}
                      <div className="p-5 flex-1 grid grid-cols-1 md:grid-cols-[1fr_16rem] gap-5 items-center">
                        
                        {/* Main Rule Data Column */}
                        <div className="space-y-3 min-w-0">
                          {/* Top Badges and Title */}
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-extrabold text-sm text-navy">{ruleLabelVi(rule.id)}</h4>
                            
                            <span className={cn(
                              "text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md tracking-wider",
                              isLegal ? "bg-purple-500/10 text-purple-600" : "bg-orange-500/10 text-orange-600"
                            )}>
                              {isLegal ? "Luật định" : "Khẩu vị"}
                            </span>

                            <span className={cn(
                              "text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md tracking-wider",
                              isBlocking ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"
                            )}>
                              {isBlocking ? "Chặn cứng" : "Cảnh báo"}
                            </span>

                            {!rule.verified && (
                              <span className="text-[9px] font-extrabold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 tracking-wider">
                                <ShieldAlert size={10} /> Chưa verify
                              </span>
                            )}
                          </div>
                          
                          {/* Description */}
                          <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                            {rule.description}
                          </p>
                          
                          {/* Metadata Structured Table/Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/40 pt-3 text-[11px]">
                            <div>
                              <span className="block text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Mã chỉ số</span>
                              <code className="text-navy font-bold">{rule.metric}</code>
                            </div>
                            <div>
                              <span className="block text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Phiên bản quy tắc</span>
                              <span className="text-navy font-semibold">{rule.version}</span>
                            </div>
                            <div className="col-span-1 sm:col-span-3 lg:col-span-1">
                              <span className="block text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Căn cứ pháp lý</span>
                              <span className="text-navy font-medium italic truncate block" title={rule.legal_basis}>
                                {rule.legal_basis || "Chưa quy định"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Values and Controls */}
                        <div className="bg-muted/30 border border-border/40 rounded-2xl p-4 flex flex-col justify-center h-full space-y-2 md:max-w-xs w-full justify-self-end">
                          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block text-center">
                            Giá trị kiểm soát
                          </span>
                          
                          {rule.editable ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1 bg-background border border-border/80 rounded-xl px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-brand">
                                <span className="text-xs font-bold text-navy">{rule.operator}</span>
                                <Input
                                  aria-label={`Giá trị ngưỡng cho ${rule.id}`}
                                  value={drafts[rule.id] ?? String(rule.threshold)}
                                  onChange={(e) => setDrafts(prev => ({ ...prev, [rule.id]: e.target.value }))}
                                  className="h-7 w-full border-none focus-visible:ring-0 p-0 text-center text-xs font-extrabold text-navy"
                                />
                                <span className="text-[10px] font-extrabold text-muted-foreground">
                                  {rule.unit === "ratio" || rule.unit === "ratio_of_own_capital" ? "%" : rule.unit}
                                </span>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="primary"
                                  className="flex-1 h-8 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                                  disabled={savingId === rule.id}
                                  onClick={() => void handleSave(rule)}
                                >
                                  <Save size={12} />
                                  Lưu
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-navy border-border/70"
                                  disabled={revertingId === rule.id}
                                  onClick={() => void handleRevert(rule)}
                                  title="Khôi phục mặc định"
                                >
                                  <RotateCcw size={12} />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-2">
                              <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy/5 border border-navy/10 text-xs font-extrabold text-navy">
                                <Lock size={12} className="text-muted-foreground shrink-0" />
                                <span>{rule.operator} {rule.threshold}</span>
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  {rule.unit === "boolean_flag" ? "Đạt" : rule.unit}
                                </span>
                              </div>
                              <p className="text-[9px] text-muted-foreground font-medium mt-2">
                                Quy tắc luật định cố định toàn hệ thống
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
