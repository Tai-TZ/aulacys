"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, Lock, Save, ShieldAlert } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  listPolicyRules,
  patchPolicyAppetite,
  validatePolicyRules,
  type PolicyRuleDto,
} from "@/lib/api";

type Props = {
  securedType: "SECURED" | "UNSECURED";
  productCode?: string;
};

export function ProductPolicyRulesPanel({ securedType, productCode }: Props) {
  const [rules, setRules] = useState<PolicyRuleDto[]>([]);
  const [profile, setProfile] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [validateMsg, setValidateMsg] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const code = productCode?.trim() || undefined;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPolicyRules(securedType, code);
      setRules(res.rules);
      setProfile(res.profile);
      const next: Record<string, string> = {};
      for (const r of res.rules) {
        if (r.editable) next[r.id] = String(r.threshold);
      }
      setDrafts(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được quy tắc");
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [securedType, code]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onSave = async (rule: PolicyRuleDto) => {
    const raw = drafts[rule.id];
    const threshold = Number(raw);
    if (!Number.isFinite(threshold)) {
      setError("Ngưỡng không hợp lệ");
      return;
    }
    setSavingId(rule.id);
    setError(null);
    try {
      const updated = await patchPolicyAppetite(rule.id, threshold, securedType, code);
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setDrafts((prev) => ({ ...prev, [updated.id]: String(updated.threshold) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được ngưỡng");
    } finally {
      setSavingId(null);
    }
  };

  const onValidateDemo = async () => {
    setValidating(true);
    setValidateMsg(null);
    setError(null);
    try {
      const metrics: Record<string, number> =
        securedType === "SECURED"
          ? {
              prohibited_purpose_refinance_other_bank: 1,
              dti: 0.35,
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
              dti: 0.35,
              cic_group: 1,
              has_bad_debt: 0,
              docs_complete: 1,
              term_within_product_max: 1,
              income_verified: 1,
              sanctions_match_count: 0,
              pep_match_count: 0,
              amount_within_product_ceiling: 1,
            };
      const res = await validatePolicyRules(securedType, metrics, { productCode: code });
      if (res.veto) {
        setValidateMsg(
          `Veto: ${res.rule_ids.join(", ") || "blocking"} — đúng nhánh demo policy-as-code.`,
        );
      } else if (res.rule_ids.length) {
        setValidateMsg(`Cảnh báo: ${res.rule_ids.join(", ")}`);
      } else {
        setValidateMsg("Pass — không có rule nào fire với metrics thử.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thử rule thất bại");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-border/40 pb-3">
        <div>
          <h3 className="font-extrabold text-foreground text-base">
            7. Quy tắc thẩm định (Rule Engineer)
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1 font-medium max-w-xl">
            Policy lấy từ gói vay (
            <span className="text-foreground font-bold">
              {securedType === "SECURED" ? "có TSBĐ" : "tín chấp"}
            </span>
            {profile ? ` · profile ${profile}` : ""}
            {code ? ` · mã ${code}` : ""}
            ). Rule luật không nới; khẩu vị (DTI, CIC…) chỉnh được
            {code ? " theo mã sản phẩm này" : " theo nhóm gói"}. So sánh = tool + evaluate — không
            dùng RAG cho ngưỡng.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-xl text-xs font-bold shrink-0"
          disabled={validating || loading}
          onClick={() => void onValidateDemo()}
        >
          <FlaskConical size={14} className="mr-1.5" />
          {validating ? "Đang thử…" : "Thử rule demo"}
        </Button>
      </div>

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2">
          {error}
        </div>
      )}
      {validateMsg && (
        <div className="text-xs text-foreground bg-muted border border-border rounded-xl px-3 py-2 font-semibold">
          {validateMsg}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Đang tải quy tắc…</p>
      ) : rules.length === 0 ? (
        <p className="text-xs text-muted-foreground">Chưa có rule cho gói này.</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                "rounded-xl border px-3 py-3 flex flex-col sm:flex-row sm:items-center gap-3",
                rule.severity === "blocking"
                  ? "border-destructive/25 bg-destructive/5"
                  : "border-border bg-background",
              )}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold text-foreground">{rule.label_vi}</span>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md",
                      rule.kind === "legal"
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/15 text-foreground",
                    )}
                  >
                    {rule.kind === "legal" ? "luật" : "khẩu vị"}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {rule.severity === "blocking" ? "chặn" : "cảnh báo"}
                  </span>
                  {!rule.verified && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-warning-foreground">
                      <ShieldAlert size={12} /> chưa verify
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground font-medium truncate">
                  {rule.metric} {rule.operator} {rule.threshold} · v{rule.version}
                </p>
              </div>

              {rule.editable ? (
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    aria-label={`Ngưỡng ${rule.label_vi}`}
                    value={drafts[rule.id] ?? String(rule.threshold)}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [rule.id]: e.target.value }))
                    }
                    className="h-9 w-24 rounded-lg text-xs"
                  />
                  <Button
                    type="button"
                    className="h-9 rounded-lg text-xs font-bold"
                    disabled={savingId === rule.id}
                    onClick={() => void onSave(rule)}
                  >
                    <Save size={14} className="mr-1" />
                    {savingId === rule.id ? "…" : "Lưu"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground shrink-0">
                  <Lock size={12} />
                  {rule.unit === "boolean_flag"
                    ? "Theo giới hạn gói vay"
                    : "Không chỉnh trên UI"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
