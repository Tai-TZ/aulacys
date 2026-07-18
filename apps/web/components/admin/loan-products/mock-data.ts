export type ProductStatus = "ACTIVE" | "DRAFT" | "SUSPENDED";

export interface LoanProduct {
  id: string;
  customerType: "INDIVIDUAL" | "BUSINESS";
  customerTypeName: string;
  productGroupId: string;
  productGroupName: string;
  productCode: string;
  productName: string;
  loanMethod: string; // e.g. "Cho vay trả góp", "Hạn mức thấu chi", "Cho vay từng lần"
  securedType: "SECURED" | "UNSECURED"; // Có tài sản bảo đảm / Không có tài sản bảo đảm
  minAmount: number;
  maxAmount: number;
  minTerm: number; // months
  maxTerm: number; // months
  status: ProductStatus;
  updatedAt: string;
  interestRate: number; // %/year
  segments: string[]; // Phân khúc khách hàng
  purpose: string; // Mục đích vay

  // Rich details configuration structures
  shortName?: string;
  collateralType?: "SECURED" | "UNSECURED";
  currency?: string;
  purposeDescription?: string;

  loanStructure?: {
    loanMethodName?: string;
    securedTypeName?: string;
    minAmount?: number | null;
    maxAmount?: number | null;
    minTerm?: number | null;
    maxTerm?: number | null;
    minTermMonths?: number | null;
    maxTermMonths?: number | null;
    currency?: string;
    maxLtv?: number;
    disbursementMethod?: string;
    disbursementTimes?: string;
    creditMethods?: string[];
  };
  interestConfig?: {
    rateType?: string;
    promoRate?: number | null;
    publishedRate?: number | null;
    displayText?: string;
    promoTermMonths?: number;
    postPromoRateType?: string;
    spread?: number;
    interestMethod?: string;
    prepaymentFeePolicy?: string;
  };
  repaymentConfig?: {
    method?: string;
    principalRepaymentMethod?: string;
    interestRepaymentMethod?: string;
    frequency?: string;
    gracePeriodMaxMonths?: number;
    prepaymentAllowed?: boolean;
    collectionDay?: string;
  };
  collateralConfig?: {
    acceptedTypes?: string[];
    futureAssetAllowed?: boolean;
    maxLtv?: number;
    valuationRequired?: boolean;
    insuranceRequired?: boolean;
    owners?: string[];
  };
  documentGroups?: {
    title: string;
    items: string[];
    code?: string;
    name?: string;
    required?: boolean;
  }[];
  effectivePeriod?: {
    startDate?: string;
    endDate?: string | null;
    channels?: string[];
  };
  eligibility?: {
    nationality?: string;
    customerTypes?: string[];
    minimumAgeAtApplication?: number;
    maximumAgeAtMaturity?: number;
    stableIncomeRequired?: boolean;
    goodCreditHistoryRequired?: boolean;
    repaymentCapacityProofRequired?: boolean;
  };
}

export interface LoanProductGroup {
  id: string;
  name: string;
  description: string;
  iconName: string; // e.g. "Home", "Car", "Briefcase", "ShoppingBag", "GraduationCap", "Key"
  isActive: boolean;
  displayOrder: number;
}

export const INITIAL_GROUPS: LoanProductGroup[] = [
  {
    id: "vay-nha",
    name: "Vay nhà ở",
    description: "Các sản phẩm vay phục vụ mua, xây dựng, sửa chữa và hoàn thiện nhà ở.",
    iconName: "Home",
    isActive: true,
    displayOrder: 1,
  },
  {
    id: "vay-oto",
    name: "Vay mua ô tô",
    description: "Các sản phẩm tài trợ nhu cầu mua ô tô phục vụ sinh hoạt hoặc kinh doanh.",
    iconName: "Car",
    isActive: true,
    displayOrder: 2,
  },
  {
    id: "vay-kinh-doanh",
    name: "Vay sản xuất kinh doanh",
    description: "Các sản phẩm vay bổ sung vốn lưu động và phục vụ hoạt động kinh doanh của khách hàng cá nhân.",
    iconName: "Briefcase",
    isActive: true,
    displayOrder: 3,
  },
  {
    id: "vay-tieu-dung",
    name: "Vay tiêu dùng",
    description: "Các sản phẩm vay phục vụ nhu cầu tiêu dùng hợp pháp của khách hàng.",
    iconName: "ShoppingBag",
    isActive: true,
    displayOrder: 4,
  },
  {
    id: "vay-hoc-tap",
    name: "Vay phục vụ học tập",
    description: "Các sản phẩm hỗ trợ chi phí học tập trong nước và nước ngoài.",
    iconName: "GraduationCap",
    isActive: true,
    displayOrder: 5,
  },
  {
    id: "vay-cam-co",
    name: "Vay cầm cố tài sản",
    description: "Các sản phẩm vay được bảo đảm bằng tiền gửi, sổ tiết kiệm hoặc tài sản tài chính.",
    iconName: "Key",
    isActive: true,
    displayOrder: 6,
  },
];

export const INITIAL_PRODUCTS: LoanProduct[] = [
  {
    id: "prod-1",
    customerType: "INDIVIDUAL",
    customerTypeName: "Khách hàng cá nhân",
    productGroupId: "vay-nha",
    productGroupName: "Vay nhà ở",
    productCode: "IND_HOME_01",
    productName: "Vay mua nhà đất thổ cư",
    loanMethod: "Cho vay từng lần",
    securedType: "SECURED",
    minAmount: 500000000,
    maxAmount: 15000000000,
    minTerm: 12,
    maxTerm: 300,
    status: "ACTIVE",
    updatedAt: "2026-07-15",
    interestRate: 6.9,
    segments: ["Khách hàng cá nhân phổ thông", "Người nhận lương"],
    purpose: "Mua nhà đất thổ cư",
    
    // Configured details
    loanStructure: {
      loanMethodName: "Cho vay từng lần",
      securedTypeName: "Có tài sản bảo đảm",
      minAmount: 500000000,
      maxAmount: 15000000000,
      minTerm: 12,
      maxTerm: 300,
      currency: "VNĐ",
      maxLtv: 80,
      disbursementMethod: "Chuyển khoản cho bên bán",
      disbursementTimes: "Một lần hoặc theo tiến độ"
    },
    interestConfig: {
      rateType: "Ưu đãi sau đó thả nổi",
      promoRate: 6.9,
      promoTermMonths: 12,
      postPromoRateType: "Lãi suất tham chiếu + biên độ",
      spread: 3.5,
      interestMethod: "Theo dư nợ giảm dần",
      prepaymentFeePolicy: "Theo chính sách từng thời kỳ"
    },
    repaymentConfig: {
      method: "Trả góp",
      principalRepaymentMethod: "Gốc trả đều hàng tháng",
      interestRepaymentMethod: "Trả hàng tháng theo dư nợ thực tế",
      frequency: "Hàng tháng",
      gracePeriodMaxMonths: 12,
      prepaymentAllowed: true,
      collectionDay: "Theo ngày giải ngân hoặc thỏa thuận"
    },
    collateralConfig: {
      acceptedTypes: ["Nhà ở", "Quyền sử dụng đất", "Nhà đất hình thành từ vốn vay"],
      futureAssetAllowed: true,
      maxLtv: 80,
      valuationRequired: true,
      insuranceRequired: true,
      owners: ["Khách hàng", "Vợ/chồng", "Người thân được SHB chấp thuận"]
    },
    documentGroups: [
      {
        title: "Hồ sơ nhân thân",
        items: ["CCCD còn hiệu lực", "Thông tin cư trú", "Giấy đăng ký kết hôn hoặc xác nhận độc thân"]
      },
      {
        title: "Hồ sơ chứng minh thu nhập",
        items: ["Hợp đồng lao động", "Sao kê tài khoản nhận lương", "Hồ sơ nguồn thu nhập khác"]
      },
      {
        title: "Hồ sơ mục đích vay",
        items: ["Hợp đồng đặt cọc", "Hợp đồng mua bán hoặc chuyển nhượng", "Giấy tờ liên quan đến bất động sản"]
      },
      {
        title: "Hồ sơ tài sản bảo đảm",
        items: ["Giấy chứng nhận quyền sử dụng đất", "Hồ sơ pháp lý của tài sản", "Hồ sơ định giá"]
      }
    ],
    effectivePeriod: {
      startDate: "01/07/2026",
      endDate: null,
      channels: ["Tại quầy", "Website", "Ứng dụng"]
    }
  },
  {
    id: "prod-2",
    customerType: "INDIVIDUAL",
    customerTypeName: "Khách hàng cá nhân",
    productGroupId: "vay-nha",
    productGroupName: "Vay nhà ở",
    productCode: "IND_HOME_02",
    productName: "Vay mua nhà dự án",
    loanMethod: "Cho vay trả góp",
    securedType: "SECURED",
    minAmount: 200000000,
    maxAmount: 20000000000,
    minTerm: 12,
    maxTerm: 420,
    status: "DRAFT",
    updatedAt: "2026-07-16",
    interestRate: 7.2,
    segments: ["Khách hàng cá nhân phổ thông", "Khách hàng ưu tiên"],
    purpose: "Mua nhà dự án chung cư/biệt thự",
  },
  {
    id: "prod-3",
    customerType: "INDIVIDUAL",
    customerTypeName: "Khách hàng cá nhân",
    productGroupId: "vay-nha",
    productGroupName: "Vay nhà ở",
    productCode: "IND_HOME_03",
    productName: "Vay xây dựng và sửa chữa nhà",
    loanMethod: "Cho vay trả góp",
    securedType: "SECURED",
    minAmount: 50000000,
    maxAmount: 5000000000,
    minTerm: 12,
    maxTerm: 180,
    status: "SUSPENDED",
    updatedAt: "2026-07-10",
    interestRate: 7.5,
    segments: ["Khách hàng cá nhân phổ thông", "Người tự doanh"],
    purpose: "Xây dựng, cải tạo và sửa chữa nhà ở",
  },
  {
    id: "prod-4",
    customerType: "INDIVIDUAL",
    customerTypeName: "Khách hàng cá nhân",
    productGroupId: "vay-oto",
    productGroupName: "Vay mua ô tô",
    productCode: "IND_CAR_01",
    productName: "Vay mua ô tô mới",
    loanMethod: "Cho vay trả góp",
    securedType: "SECURED",
    minAmount: 100000000,
    maxAmount: 5000000000,
    minTerm: 12,
    maxTerm: 96,
    status: "ACTIVE",
    updatedAt: "2026-07-14",
    interestRate: 7.9,
    segments: ["Khách hàng cá nhân phổ thông", "Người nhận lương", "Người tự doanh"],
    purpose: "Mua xe ô tô mới phục vụ đi lại hoặc kinh doanh",
  },
  {
    id: "prod-5",
    customerType: "INDIVIDUAL",
    customerTypeName: "Khách hàng cá nhân",
    productGroupId: "vay-oto",
    productGroupName: "Vay mua ô tô",
    productCode: "IND_CAR_02",
    productName: "Vay mua ô tô đã qua sử dụng",
    loanMethod: "Cho vay trả góp",
    securedType: "SECURED",
    minAmount: 80000000,
    maxAmount: 2000000000,
    minTerm: 12,
    maxTerm: 72,
    status: "ACTIVE",
    updatedAt: "2026-07-12",
    interestRate: 8.5,
    segments: ["Khách hàng cá nhân phổ thông", "Hộ kinh doanh"],
    purpose: "Mua ô tô cũ đã qua sử dụng",
  },
  {
    id: "prod-6",
    customerType: "INDIVIDUAL",
    customerTypeName: "Khách hàng cá nhân",
    productGroupId: "vay-kinh-doanh",
    productGroupName: "Vay sản xuất kinh doanh",
    productCode: "IND_BIZ_01",
    productName: "Vay bổ sung vốn kinh doanh thường xuyên",
    loanMethod: "Cho vay hạn mức",
    securedType: "SECURED",
    minAmount: 50000000,
    maxAmount: 10000000000,
    minTerm: 6,
    maxTerm: 12,
    status: "ACTIVE",
    updatedAt: "2026-07-17",
    interestRate: 6.5,
    segments: ["Hộ kinh doanh", "Cá nhân có hoạt động sản xuất kinh doanh"],
    purpose: "Bổ sung vốn lưu động sản xuất kinh doanh",
  },
  {
    id: "prod-7",
    customerType: "INDIVIDUAL",
    customerTypeName: "Khách hàng cá nhân",
    productGroupId: "vay-tieu-dung",
    productGroupName: "Vay tiêu dùng",
    productCode: "IND_CONSUME_01",
    productName: "Vay tiêu dùng có tài sản bảo đảm",
    loanMethod: "Cho vay trả góp",
    securedType: "SECURED",
    minAmount: 50000000,
    maxAmount: 3000000000,
    minTerm: 12,
    maxTerm: 120,
    status: "ACTIVE",
    updatedAt: "2026-07-16",
    interestRate: 8.9,
    segments: ["Khách hàng cá nhân phổ thông", "Người nhận lương", "Người tự doanh"],
    purpose: "Tiêu dùng cá nhân phục vụ đời sống",
  },
  {
    id: "prod-8",
    customerType: "INDIVIDUAL",
    customerTypeName: "Khách hàng cá nhân",
    productGroupId: "vay-hoc-tap",
    productGroupName: "Vay phục vụ học tập",
    productCode: "IND_STUDY_01",
    productName: "Vay du học",
    loanMethod: "Cho vay trả góp",
    securedType: "SECURED",
    minAmount: 50000000,
    maxAmount: 2500000000,
    minTerm: 12,
    maxTerm: 120,
    status: "ACTIVE",
    updatedAt: "2026-07-15",
    interestRate: 7.0,
    segments: ["Khách hàng cá nhân phổ thông"],
    purpose: "Thanh toán học phí và chi phí du học nước ngoài",
  },
  {
    id: "prod-9",
    customerType: "INDIVIDUAL",
    customerTypeName: "Khách hàng cá nhân",
    productGroupId: "vay-cam-co",
    productGroupName: "Vay cầm cố tài sản",
    productCode: "IND_COLLATERAL_01",
    productName: "Vay cầm cố sổ tiết kiệm",
    loanMethod: "Cho vay hạn mức",
    securedType: "SECURED",
    minAmount: 10000000,
    maxAmount: 50000000000,
    minTerm: 1,
    maxTerm: 12,
    status: "ACTIVE",
    updatedAt: "2026-07-17",
    interestRate: 5.5,
    segments: ["Khách hàng cá nhân phổ thông", "Khách hàng ưu tiên", "Hộ kinh doanh"],
    purpose: "Cầm cố sổ tiết kiệm mở tại SHB hoặc tổ chức tín dụng khác",
  },
  {
    id: "IND_CONS_UNSECURED_01",
    customerType: "INDIVIDUAL",
    customerTypeName: "Khách hàng cá nhân",
    productGroupId: "vay-tieu-dung",
    productGroupName: "Vay tiêu dùng",
    productCode: "IND_CONS_UNSECURED_01",
    productName: "Vay tiêu dùng không tài sản bảo đảm",
    shortName: "Vay tiêu dùng tín chấp",
    loanMethod: "Cho vay theo món / hạn mức tín dụng",
    securedType: "UNSECURED",
    minAmount: 0,
    maxAmount: 500000000,
    minTerm: 0,
    maxTerm: 60,
    status: "ACTIVE",
    updatedAt: "2026-07-18",
    interestRate: 0,
    segments: ["Cá nhân", "Hộ gia đình"],
    purpose: "Phục vụ các nhu cầu tiêu dùng của khách hàng",
    
    // Rich details mapping
    loanStructure: {
      minAmount: null,
      maxAmount: 500000000,
      minTermMonths: null,
      maxTermMonths: 60,
      creditMethods: ["TERM_LOAN", "CREDIT_LIMIT"],
      loanMethodName: "Cho vay theo món / hạn mức tín dụng",
      securedTypeName: "Không có tài sản bảo đảm",
    },
    interestConfig: {
      publishedRate: null,
      displayText: "Theo chính sách SHB từng thời kỳ"
    },
    repaymentConfig: {
      method: "Theo thỏa thuận và chính sách SHB từng thời kỳ"
    },
    eligibility: {
      nationality: "VIETNAMESE",
      customerTypes: ["INDIVIDUAL", "HOUSEHOLD"],
      minimumAgeAtApplication: 22,
      maximumAgeAtMaturity: 70,
      stableIncomeRequired: true,
      goodCreditHistoryRequired: true,
      repaymentCapacityProofRequired: true
    },
    documentGroups: [
      {
        title: "Hồ sơ pháp lý",
        items: ["CCCD còn hiệu lực", "Thông tin cư trú", "Giấy tờ chứng minh mối quan hệ (nếu có)"],
        code: "LEGAL_DOCUMENTS",
        name: "Hồ sơ pháp lý",
        required: true
      },
      {
        title: "Hồ sơ chứng minh thu nhập trả nợ",
        items: ["Hợp đồng lao động", "Sao kê lương 3 tháng gần nhất", "Xác nhận thu nhập khác (nếu có)"],
        code: "INCOME_DOCUMENTS",
        name: "Hồ sơ chứng minh thu nhập trả nợ",
        required: true
      },
      {
        title: "Hồ sơ chứng minh mục đích vay vốn",
        items: ["Phương án sử dụng vốn kiêm cam kết trả nợ", "Giấy đề nghị vay vốn kiêm phương án trả nợ"],
        code: "LOAN_PURPOSE_DOCUMENTS",
        name: "Hồ sơ chứng minh mục đích vay vốn",
        required: true
      }
    ],
    effectivePeriod: {
      startDate: "2026-07-18",
      endDate: null,
      channels: ["Tại quầy", "Website", "Ứng dụng"]
    }
  }
];
