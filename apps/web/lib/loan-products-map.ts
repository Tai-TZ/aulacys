/** Map API catalog DTOs ↔ admin LoanProduct / LoanProductGroup UI types. */

import type { LoanProduct, LoanProductGroup, ProductStatus } from "@/components/admin/loan-products/mock-data";
import type { LoanProductDto, LoanProductWriteBody, ProductGroupDto } from "@/lib/api";

export function groupFromDto(dto: ProductGroupDto): LoanProductGroup {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    iconName: dto.icon_name,
    isActive: dto.is_active,
    displayOrder: dto.display_order,
  };
}

export function groupToWrite(group: LoanProductGroup) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    icon_name: group.iconName,
    is_active: group.isActive,
    display_order: group.displayOrder,
  };
}

export function productFromDto(dto: LoanProductDto): LoanProduct {
  return {
    id: dto.id,
    customerType: (dto.customer_type as "INDIVIDUAL" | "BUSINESS") || "INDIVIDUAL",
    customerTypeName: dto.customer_type_name || "Khách hàng cá nhân",
    productGroupId: dto.product_group_id,
    productGroupName: dto.product_group_name,
    productCode: dto.product_code,
    productName: dto.product_name,
    shortName: dto.short_name ?? undefined,
    loanMethod: dto.loan_method || "",
    securedType: (dto.secured_type as "SECURED" | "UNSECURED") || "SECURED",
    minAmount: dto.min_amount ?? 0,
    maxAmount: dto.max_amount ?? 0,
    minTerm: dto.min_term ?? 0,
    maxTerm: dto.max_term ?? 0,
    status: (dto.status as ProductStatus) || "DRAFT",
    updatedAt: dto.updated_at || "",
    interestRate: dto.interest_rate ?? 0,
    segments: dto.segments || [],
    purpose: dto.purpose || "",
    currency: dto.currency,
    loanStructure: dto.loan_structure as LoanProduct["loanStructure"],
    interestConfig: dto.interest_config as LoanProduct["interestConfig"],
    repaymentConfig: dto.repayment_config as LoanProduct["repaymentConfig"],
    collateralConfig: dto.collateral_config as LoanProduct["collateralConfig"],
    eligibility: dto.eligibility as LoanProduct["eligibility"],
    documentGroups: dto.document_groups as LoanProduct["documentGroups"],
    effectivePeriod: {
      startDate: dto.effective_start ?? undefined,
      endDate: dto.effective_end ?? null,
      channels: dto.channels ?? undefined,
    },
  };
}

export function productToWrite(prod: LoanProduct): LoanProductWriteBody {
  return {
    customer_type: prod.customerType,
    product_group_id: prod.productGroupId,
    product_code: prod.productCode,
    product_name: prod.productName,
    short_name: prod.shortName ?? null,
    loan_method: prod.loanMethod,
    secured_type: prod.securedType,
    min_amount: prod.minAmount,
    max_amount: prod.maxAmount,
    min_term: prod.minTerm,
    max_term: prod.maxTerm,
    status: prod.status,
    interest_rate: prod.interestRate,
    purpose: prod.purpose,
    currency: prod.currency ?? "VND",
    segments: prod.segments,
    loan_structure: (prod.loanStructure as Record<string, unknown>) ?? null,
    interest_config: (prod.interestConfig as Record<string, unknown>) ?? null,
    repayment_config: (prod.repaymentConfig as Record<string, unknown>) ?? null,
    collateral_config: (prod.collateralConfig as Record<string, unknown>) ?? null,
    eligibility: (prod.eligibility as Record<string, unknown>) ?? null,
    document_groups: prod.documentGroups ?? null,
    channels: prod.effectivePeriod?.channels ?? null,
    effective_start: prod.effectivePeriod?.startDate ?? null,
    effective_end: prod.effectivePeriod?.endDate ?? null,
  };
}
