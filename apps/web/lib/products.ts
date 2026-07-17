export type ProductSlug = "mua-nha" | "mua-oto" | "du-hoc";

export type ProductDetail = {
  slug: ProductSlug;
  rate: string;
  maxTerm: string;
  heroTaglineVi: string;
  heroTaglineEn: string;
  heroDescVi: string;
  heroDescEn: string;
  benefits: { labelVi: string; labelEn: string; valueVi: string; valueEn: string }[];
  conditionsVi: string[];
  conditionsEn: string[];
  processVi: { title: string; desc: string }[];
  processEn: { title: string; desc: string }[];
  faqVi: { q: string; a: string }[];
  faqEn: { q: string; a: string }[];
  image: string;
};

export const PRODUCTS: Record<ProductSlug, ProductDetail> = {
  "mua-nha": {
    slug: "mua-nha",
    rate: "6.50%",
    maxTerm: "25 năm / 25 years",
    heroTaglineVi: "Làm chủ căn hộ — Trọn vẹn ước mơ",
    heroTaglineEn: "Own your home — Complete the dream",
    heroDescVi: "Giải pháp tài chính giúp gia đình an cư với hạn mức lớn và kỳ hạn dài.",
    heroDescEn: "Financing that helps families settle in with high limits and long terms.",
    benefits: [
      {
        labelVi: "Hạn mức lên đến",
        labelEn: "Limit up to",
        valueVi: "20 tỷ",
        valueEn: "VND 20bn",
      },
      {
        labelVi: "Thời hạn vay",
        labelEn: "Loan term",
        valueVi: "Đến 25 năm",
        valueEn: "Up to 25 years",
      },
      {
        labelVi: "Vốn tự có từ",
        labelEn: "Down payment from",
        valueVi: "20%",
        valueEn: "20%",
      },
      {
        labelVi: "Phê duyệt",
        labelEn: "Approval",
        valueVi: "Trong 24–72h",
        valueEn: "Within 24–72h",
      },
    ],
    conditionsVi: [
      "Công dân Việt Nam hoặc người nước ngoài cư trú hợp pháp tại Việt Nam",
      "Độ tuổi từ 18 đến 70 tại thời điểm kết thúc khoản vay",
      "Có thu nhập ổn định và khả năng trả nợ",
      "Có tài sản bảo đảm (BĐS mua hoặc tài sản khác)",
    ],
    conditionsEn: [
      "Vietnamese citizen or foreigner legally residing in Vietnam",
      "Age 18–70 at loan maturity",
      "Stable income and repayment capacity",
      "Eligible collateral (purchased property or other assets)",
    ],
    processVi: [
      { title: "Tư vấn & chuẩn bị hồ sơ", desc: "Cố vấn Aulacys hỗ trợ lựa chọn hạn mức và giấy tờ." },
      { title: "Thẩm định tín dụng", desc: "Định giá tài sản bảo đảm và kiểm tra hồ sơ." },
      { title: "Phê duyệt & ký hợp đồng", desc: "Nhận thông báo phê duyệt và hoàn thiện thủ tục." },
      { title: "Giải ngân", desc: "Nhận vốn theo tiến độ mua nhà / nhận nhà." },
    ],
    processEn: [
      { title: "Advice & documents", desc: "An Aulacys advisor helps pick the limit and paperwork." },
      { title: "Credit assessment", desc: "Collateral valuation and file review." },
      { title: "Approval & contract", desc: "Receive approval and complete procedures." },
      { title: "Disbursement", desc: "Funds released to match your purchase timeline." },
    ],
    faqVi: [
      {
        q: "Tôi có thể vay mua nhà dự án và nhà thổ cư không?",
        a: "Có. Aulacys hỗ trợ cả nhà dự án và nhà đất thổ cư theo chính sách sản phẩm hiện hành.",
      },
      {
        q: "Tài sản thế chấp có bắt buộc là căn nhà đang mua không?",
        a: "Không bắt buộc. Có thể dùng BĐS khác hoặc sổ tiết kiệm tùy phương án.",
      },
    ],
    faqEn: [
      {
        q: "Can I finance both project and existing homes?",
        a: "Yes. Aulacys supports both under the current product policy.",
      },
      {
        q: "Must collateral be the home being purchased?",
        a: "Not always — other property or savings books may qualify depending on the case.",
      },
    ],
    image: "/aulacys/help-1.png",
  },
  "mua-oto": {
    slug: "mua-oto",
    rate: "7.20%",
    maxTerm: "8 năm / 8 years",
    heroTaglineVi: "Thêm tiện nghi — thêm yêu cuộc sống",
    heroTaglineEn: "More convenience — more love for life",
    heroDescVi: "Giải pháp tài chính cho chiếc xe mơ ước với giải ngân nhanh.",
    heroDescEn: "Financing for your dream car with fast disbursement.",
    benefits: [
      {
        labelVi: "Tài trợ tới",
        labelEn: "Finance up to",
        valueVi: "90% giá trị xe",
        valueEn: "90% of car value",
      },
      {
        labelVi: "Thời hạn vay",
        labelEn: "Loan term",
        valueVi: "Đến 8 năm",
        valueEn: "Up to 8 years",
      },
      {
        labelVi: "Giải ngân",
        labelEn: "Disbursement",
        valueVi: "Tức thì khi đủ điều kiện",
        valueEn: "Instant when eligible",
      },
      {
        labelVi: "Lãi suất",
        labelEn: "Interest rate",
        valueVi: "Từ 7.20%/năm",
        valueEn: "From 7.20%/year",
      },
    ],
    conditionsVi: [
      "Khách hàng cá nhân từ 18 đến 75 tuổi tại thời điểm kết thúc khoản vay",
      "Có thu nhập ổn định đảm bảo khả năng trả nợ",
      "Có tài sản thế chấp (xe mua hoặc tài sản khác)",
      "Giấy tờ xe / hợp đồng mua bán hợp lệ",
    ],
    conditionsEn: [
      "Individual customer aged 18–75 at loan maturity",
      "Stable income supporting repayment",
      "Eligible collateral (vehicle or other assets)",
      "Valid purchase contract / vehicle documents",
    ],
    processVi: [
      { title: "Tư vấn & chuẩn bị hồ sơ", desc: "Chọn hạn mức, kỳ hạn và giấy tờ cần thiết." },
      { title: "Thẩm định & định giá", desc: "Đánh giá khả năng trả nợ và tài sản bảo đảm." },
      { title: "Phê duyệt & hoàn thiện", desc: "Ký hợp đồng vay và thế chấp." },
      { title: "Giải ngân", desc: "Nhận vốn ngay khi đủ điều kiện đăng ký xe." },
    ],
    processEn: [
      { title: "Advice & documents", desc: "Choose limit, term, and required papers." },
      { title: "Assessment & valuation", desc: "Review repayment capacity and collateral." },
      { title: "Approval & completion", desc: "Sign loan and security contracts." },
      { title: "Disbursement", desc: "Receive funds once vehicle registration conditions are met." },
    ],
    faqVi: [
      {
        q: "Aulacys có hỗ trợ vay mua ô tô cho người thân không?",
        a: "Có thể xem xét theo mục đích sử dụng và khả năng trả nợ của người vay chính.",
      },
      {
        q: "Có tài trợ xe phục vụ kinh doanh (xe công nghệ) không?",
        a: "Có — phương án kinh doanh được thẩm định riêng theo chính sách hiện hành.",
      },
    ],
    faqEn: [
      {
        q: "Can I finance a car for a family member?",
        a: "Yes, subject to purpose and the primary borrower's repayment capacity.",
      },
      {
        q: "Do you finance vehicles for ride-hailing business?",
        a: "Yes — business use cases are assessed under the current policy.",
      },
    ],
    image: "/aulacys/help-2.png",
  },
  "du-hoc": {
    slug: "du-hoc",
    rate: "7.90%",
    maxTerm: "10 năm / 10 years",
    heroTaglineVi: "Đầu tư tri thức — vươn ra thế giới",
    heroTaglineEn: "Invest in knowledge — go global",
    heroDescVi: "Gói vay du học ưu đãi với ân hạn gốc linh hoạt cho hành trình học tập.",
    heroDescEn: "Preferential study-abroad loans with flexible principal grace periods.",
    benefits: [
      {
        labelVi: "Thời hạn vay",
        labelEn: "Loan term",
        valueVi: "Đến 10 năm",
        valueEn: "Up to 10 years",
      },
      {
        labelVi: "Ân hạn gốc",
        labelEn: "Principal grace",
        valueVi: "Linh hoạt theo khóa học",
        valueEn: "Flexible by program",
      },
      {
        labelVi: "Mục đích",
        labelEn: "Purpose",
        valueVi: "Học phí & sinh hoạt",
        valueEn: "Tuition & living costs",
      },
      {
        labelVi: "Lãi suất",
        labelEn: "Interest rate",
        valueVi: "Từ 7.90%/năm",
        valueEn: "From 7.90%/year",
      },
    ],
    conditionsVi: [
      "Học viên hoặc người bảo lãnh đáp ứng điều kiện tuổi và cư trú",
      "Có thư nhập học / xác nhận từ cơ sở đào tạo",
      "Chứng minh nguồn trả nợ ổn định",
      "Tài sản bảo đảm theo yêu cầu sản phẩm",
    ],
    conditionsEn: [
      "Student or guarantor meets age and residency rules",
      "Admission letter / confirmation from the school",
      "Proof of stable repayment sources",
      "Collateral as required by the product",
    ],
    processVi: [
      { title: "Tư vấn gói vay", desc: "Xác định hạn mức theo học phí và chi phí sinh hoạt." },
      { title: "Nộp hồ sơ", desc: "Giấy tờ cá nhân, thư nhập học và chứng minh tài chính." },
      { title: "Thẩm định & phê duyệt", desc: "Đánh giá hồ sơ và thông báo kết quả." },
      { title: "Giải ngân theo tiến độ", desc: "Giải ngân theo kỳ học phí nếu cần." },
    ],
    processEn: [
      { title: "Package advice", desc: "Size the limit to tuition and living costs." },
      { title: "Submit documents", desc: "ID, admission letter, and financial proof." },
      { title: "Assessment & approval", desc: "File review and decision notice." },
      { title: "Staged disbursement", desc: "Funds released by tuition schedule when needed." },
    ],
    faqVi: [
      {
        q: "Có hỗ trợ cả bậc đại học và sau đại học không?",
        a: "Có, tùy quốc gia và chương trình được công nhận.",
      },
      {
        q: "Người bảo lãnh có cần đứng tên khoản vay không?",
        a: "Tùy phương án — cố vấn sẽ hướng dẫn cấu trúc phù hợp.",
      },
    ],
    faqEn: [
      {
        q: "Do you cover undergraduate and graduate programs?",
        a: "Yes, depending on the country and recognized program.",
      },
      {
        q: "Must a guarantor be co-borrower?",
        a: "It depends on the case — advisors will recommend a suitable structure.",
      },
    ],
    image: "/aulacys/help-3.png",
  },
};

export const PRODUCT_SLUGS = Object.keys(PRODUCTS) as ProductSlug[];

export function isProductSlug(value: string): value is ProductSlug {
  return value in PRODUCTS;
}
