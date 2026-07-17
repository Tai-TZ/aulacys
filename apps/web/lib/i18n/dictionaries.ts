export type Locale = "vi" | "en";

export type Dictionary = {
  nav: {
    products: string;
    why: string;
    pricing: string;
    process: string;
    registerCta: string;
    login: string;
    register: string;
    openMenu: string;
    closeMenu: string;
    mainNav: string;
  };
  hero: {
    badge: string;
    titleBefore: string;
    titleAccent: string;
    titleAfter: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trust1: string;
    trust2: string;
    trust3: string;
    imageAlt: string;
  };
  products: {
    eyebrow: string;
    title: string;
    subtitle: string;
    viewDetail: string;
    items: {
      "mua-nha": { title: string; desc: string };
      "mua-oto": { title: string; desc: string };
      "du-hoc": { title: string; desc: string };
    };
  };
  why: {
    eyebrow: string;
    title: string;
    viewDetail: string;
    items: { title: string; text: string }[];
  };
  pricing: {
    eyebrow: string;
    title: string;
    subtitle: string;
    colProduct: string;
    colRate: string;
    colTerm: string;
    featured: string;
    perYear: string;
    viewDetail: string;
    rows: { name: string; rate: string; term: string; featured: boolean }[];
  };
  process: {
    eyebrow: string;
    title: string;
    imageAlt: string;
    stepLabel: string;
    steps: { title: string; desc: string }[];
  };
  cta: {
    titleBefore: string;
    titleAccent: string;
    subtitle: string;
    button: string;
    secure: string;
  };
  footer: {
    products: string;
    support: string;
    contact: string;
    productLinks: string[];
    supportLinks: string[];
    license: string;
  };
  calculator: {
    amount: string;
    term: string;
    monthly: string;
    interest: string;
    disclaimer: string;
    register: string;
    amountMin: string;
    amountMax: string;
    termMin: string;
    termMax: string;
    months: string;
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    registerTitle: string;
    registerSubtitle: string;
    loginHeadline: string;
    registerHeadline: string;
    email: string;
    password: string;
    fullName: string;
    phone: string;
    emailPlaceholder: string;
    namePlaceholder: string;
    passwordPlaceholder: string;
    phonePlaceholder: string;
    submitLogin: string;
    submitRegister: string;
    noAccount: string;
    hasAccount: string;
    backHome: string;
    demoNote: string;
    successLogin: string;
    successRegister: string;
    panelBadge: string;
    panelCard1Title: string;
    panelCard1Text: string;
    panelCard2Title: string;
    panelCard2Text: string;
  };
  detail: {
    breadcrumbHome: string;
    breadcrumbLoan: string;
    benefits: string;
    conditions: string;
    process: string;
    faq: string;
    related: string;
    apply: string;
    calcEyebrow: string;
    calcTitle: string;
    back: string;
    notFound: string;
  };
  loading: {
    title: string;
    subtitle: string;
  };
  workspace: {
    shellEyebrow: string;
    shellTitle: string;
    exit: string;
    welcome: string;
    welcomeSub: string;
    tabsNav: string;
    tabs: {
      dashboard: string;
      dossier: string;
      history: string;
      agent: string;
    };
    statLimit: string;
    statLimitHint: string;
    statUsed: string;
    statUsedHint: string;
    statDossier: string;
    statDossierHint: string;
    limitsTitle: string;
    limitsSub: string;
    viewProduct: string;
    limitLabel: string;
    usedLabel: string;
    rateLabel: string;
    dtiTitle: string;
    dtiSub: string;
    dtiStatus: string;
    repayTitle: string;
    repaySub: string;
    pipelineTitle: string;
    dossierTitle: string;
    dossierSub: string;
    dossierReady: string;
    upload: string;
    replace: string;
    dossierAgentCta: string;
    dossierAgentHint: string;
    openAgent: string;
    historyTitle: string;
    historySub: string;
    colId: string;
    colProduct: string;
    colAmount: string;
    colOpened: string;
    colStatus: string;
    agentTitle: string;
    agentOnline: string;
    agentEmpty: string;
    agentEmptyHint: string;
    agentThinking: string;
    agentPlaceholder: string;
    agentSend: string;
    agentPrompts: string;
    agentDisclaimer: string;
    agentFallback: string;
    goWorkspace: string;
  };
};

export const dictionaries: Record<Locale, Dictionary> = {
  vi: {
    nav: {
      products: "Sản phẩm vay",
      why: "Vì sao chọn",
      pricing: "Biểu phí",
      process: "Quy trình",
      registerCta: "Đăng ký ngay",
      login: "Đăng nhập",
      register: "Đăng ký",
      openMenu: "Mở menu",
      closeMenu: "Đóng menu",
      mainNav: "Điều hướng chính",
    },
    hero: {
      badge: "Vay vốn cá nhân · Aulacys",
      titleBefore: "Dễ dàng, Nhanh chóng,",
      titleAccent: "Hiện thực hóa",
      titleAfter: "Ước mơ của Bạn",
      subtitle:
        "Các giải pháp vay vốn linh hoạt của Aulacys giúp bạn tiếp cận nguồn tài chính nhanh chóng, thủ tục đơn giản, phê duyệt trong ngày.",
      ctaPrimary: "Vay Ngay",
      ctaSecondary: "Tìm hiểu sản phẩm",
      trust1: "Phê duyệt 24h",
      trust2: "Lãi suất từ 6.5%",
      trust3: "Bảo mật thông tin",
      imageAlt: "Không gian ngân hàng hiện đại Aulacys",
    },
    products: {
      eyebrow: "Sản phẩm vay",
      title: "Hỗ trợ Mục tiêu Tài chính của Bạn",
      subtitle:
        "Từ tổ ấm, phương tiện, đến hành trình học vấn — Aulacys đồng hành cùng mọi cột mốc quan trọng của bạn.",
      viewDetail: "Xem chi tiết",
      items: {
        "mua-nha": {
          title: "Vay Mua Nhà",
          desc: "Hiện thực hóa tổ ấm của bạn với hạn mức lên đến 20 tỷ, thời hạn 25 năm.",
        },
        "mua-oto": {
          title: "Vay Mua Ô tô",
          desc: "Sở hữu xế yêu chỉ với 20% vốn tự có, thủ tục nhanh gọn trong 48h.",
        },
        "du-hoc": {
          title: "Vay Du học",
          desc: "Đầu tư tri thức toàn cầu với gói vay ưu đãi và ân hạn gốc linh hoạt.",
        },
      },
    },
    why: {
      eyebrow: "Vì sao chọn Aulacys",
      title: "Chúng tôi ở đây để giúp bạn",
      viewDetail: "Xem chi tiết",
      items: [
        {
          title: "Aulacys đồng hành cùng bạn trên mọi nẻo đường.",
          text: "Đội ngũ cố vấn tài chính Aulacys tận tâm tư vấn giải pháp vay tối ưu, phù hợp với nhu cầu và khả năng tài chính của từng khách hàng.",
        },
        {
          title: "Phê duyệt nhanh chóng, thủ tục đơn giản.",
          text: "Đăng ký hoàn toàn trực tuyến qua ứng dụng Aulacys Mobile. Nhận kết quả phê duyệt sơ bộ chỉ trong vài phút và giải ngân trong 24 giờ.",
        },
        {
          title: "Nhiều phương thức thanh toán linh hoạt.",
          text: "Thanh toán khoản vay dễ dàng qua QR, e-Banking, hoặc tự động trích nợ. Chủ động lịch trả, không lo trễ hạn.",
        },
      ],
    },
    pricing: {
      eyebrow: "Biểu phí",
      title: "Cơ cấu lãi suất và Phí linh hoạt",
      subtitle:
        "Ưu đãi lãi suất minh bạch, không phí ẩn — Aulacys cam kết mang lại giá trị thực cho khách hàng.",
      colProduct: "Dịch vụ / Sản phẩm",
      colRate: "Lãi suất",
      colTerm: "Kỳ hạn",
      featured: "Nổi bật",
      perYear: "/năm",
      viewDetail: "Xem chi tiết",
      rows: [
        { name: "Vay Mua Nhà", rate: "6.50%", term: "Đến 25 năm", featured: true },
        { name: "Vay Mua Ô tô", rate: "7.20%", term: "Đến 8 năm", featured: false },
        { name: "Vay Du học", rate: "7.90%", term: "Đến 10 năm", featured: false },
        { name: "Vay Tiêu dùng", rate: "9.50%", term: "Đến 5 năm", featured: false },
        { name: "Vay Sản xuất Kinh doanh", rate: "8.20%", term: "Đến 7 năm", featured: false },
      ],
    },
    process: {
      eyebrow: "Quy trình đơn giản",
      title: "Thủ tục vay vốn chỉ với vài bước đơn giản",
      imageAlt: "Cố vấn Aulacys trao tiền vay",
      stepLabel: "BƯỚC",
      steps: [
        {
          title: "Đăng ký / Đăng nhập",
          desc: "Mở tài khoản Aulacys trực tuyến chỉ trong 2 phút với eKYC.",
        },
        {
          title: "Điền thông tin khoản vay",
          desc: "Nhập số tiền, thời hạn và tải lên giấy tờ theo hướng dẫn.",
        },
        {
          title: "Nhận vốn giải ngân",
          desc: "Nhận tiền vào tài khoản chỉ sau 24 giờ kể từ khi duyệt hồ sơ.",
        },
      ],
    },
    cta: {
      titleBefore: "Nhanh chóng nhận vốn,",
      titleAccent: "Đăng ký ngay!",
      subtitle:
        "Hàng nghìn khách hàng Việt Nam đã tin chọn Aulacys để hiện thực hóa ước mơ. Đến lượt bạn.",
      button: "Vay Ngay",
      secure: "Bảo mật thông tin theo tiêu chuẩn ngân hàng Việt Nam.",
    },
    footer: {
      products: "Sản phẩm",
      support: "Hỗ trợ",
      contact: "Liên hệ",
      productLinks: ["Vay Mua Nhà", "Vay Mua Ô tô", "Vay Du học", "Vay Tiêu dùng", "Thẻ tín dụng"],
      supportLinks: [
        "Trung tâm hỗ trợ",
        "Điểm giao dịch",
        "Câu hỏi thường gặp",
        "Điều khoản",
        "Bảo mật",
      ],
      license: "Được cấp phép bởi Ngân hàng Nhà nước Việt Nam.",
    },
    calculator: {
      amount: "Số tiền vay",
      term: "Thời gian vay",
      monthly: "Ước tính hàng tháng",
      interest: "Tổng tiền lãi",
      disclaimer: "Lãi suất tham khảo 8.9%/năm. Kết quả chỉ mang tính minh họa.",
      register: "Đăng ký ngay",
      amountMin: "50 triệu",
      amountMax: "5 tỷ",
      termMin: "6 tháng",
      termMax: "240 tháng",
      months: "tháng",
    },
    auth: {
      loginTitle: "Đăng nhập",
      loginSubtitle: "Nhập thông tin để truy cập tài khoản của bạn",
      registerTitle: "Đăng ký",
      registerSubtitle: "Nhập thông tin để tạo tài khoản và bắt đầu hồ sơ vay",
      loginHeadline: "Quản lý tài chính thông minh hơn cùng Aulacys",
      registerHeadline: "Bắt đầu hành trình vay vốn dễ dàng cùng Aulacys",
      email: "Email",
      password: "Mật khẩu",
      fullName: "Họ và tên",
      phone: "Số điện thoại",
      emailPlaceholder: "ban@email.com",
      namePlaceholder: "Nguyễn Văn A",
      passwordPlaceholder: "Nhập mật khẩu",
      phonePlaceholder: "0901 234 567",
      submitLogin: "Đăng nhập",
      submitRegister: "Tạo tài khoản",
      noAccount: "Chưa có tài khoản?",
      hasAccount: "Đã có tài khoản?",
      backHome: "Về trang chủ",
      demoNote: "Demo: chưa kết nối backend — thông tin chỉ mang tính minh họa.",
      successLogin: "Đăng nhập demo thành công. Đang mở workspace của bạn…",
      successRegister: "Đăng ký demo thành công. Đang mở workspace vay vốn của bạn…",
      panelBadge: "Vay vốn cá nhân",
      panelCard1Title: "Chủ động kế hoạch tài chính",
      panelCard1Text: "Ước tính khoản vay và lịch trả rõ ràng trước khi đăng ký.",
      panelCard2Title: "Phê duyệt nhanh, bảo mật cao",
      panelCard2Text: "Thủ tục đơn giản, dữ liệu được bảo vệ theo chuẩn ngân hàng.",
    },
    detail: {
      breadcrumbHome: "Trang chủ",
      breadcrumbLoan: "Vay",
      benefits: "Lợi ích sản phẩm",
      conditions: "Điều kiện vay",
      process: "Quy trình đăng ký",
      faq: "Câu hỏi thường gặp",
      related: "Sản phẩm liên quan",
      apply: "Đăng ký vay ngay",
      calcEyebrow: "Tính toán khoản vay",
      calcTitle: "Ước tính phù hợp với bạn",
      back: "Quay lại trang chủ",
      notFound: "Không tìm thấy sản phẩm vay.",
    },
    loading: {
      title: "Đang tải sản phẩm…",
      subtitle: "Aulacys đang chuẩn bị thông tin khoản vay cho bạn.",
    },
    workspace: {
      shellEyebrow: "Không gian khách hàng",
      shellTitle: "Workspace vay vốn",
      exit: "Về trang chủ",
      welcome: "Xin chào, {name}",
      welcomeSub:
        "Theo dõi hạn mức, hoàn thiện hồ sơ và nhờ Digital Expert Agents chuẩn bị khoản vay — đúng quy trình retail_mortgage / tín chấp của Aulacys.",
      tabsNav: "Tab workspace",
      tabs: {
        dashboard: "Dashboard",
        dossier: "Hồ sơ",
        history: "Lịch sử vay",
        agent: "Agent hỗ trợ",
      },
      statLimit: "Tổng hạn mức sơ bộ",
      statLimitHint: "Ước tính từ công cụ (không do LLM tính)",
      statUsed: "Đã sử dụng",
      statUsedHint: "Dư nợ / hạn mức đang mở",
      statDossier: "Độ sẵn sàng hồ sơ",
      statDossierHint: "Trước khi Credit & Compliance chạy",
      limitsTitle: "Hạn mức theo sản phẩm",
      limitsSub: "Hai sản phẩm cấu hình YAML: retail_mortgage và retail_unsecured_salary (+ du học).",
      viewProduct: "Chi tiết",
      limitLabel: "Hạn mức",
      usedLabel: "Đã dùng",
      rateLabel: "LS từ",
      dtiTitle: "DTI hiện tại",
      dtiSub: "Tỷ lệ trả nợ / thu nhập — ngưỡng cứng nằm trong policy/, không trong prompt.",
      dtiStatus: "Trong ngưỡng mềm · còn room để vay thêm",
      repayTitle: "Dự kiến trả nợ (triệu ₫)",
      repaySub: "Minh họa dòng tiền sau khi giải ngân thêm khoản mua nhà.",
      pipelineTitle: "Hồ sơ đang chạy",
      dossierTitle: "Checklist hồ sơ vay",
      dossierSub:
        "Mỗi giấy tờ gắn với agent/tool tương ứng. Thiếu định giá → Compliance không tính được LTV.",
      dossierReady: "sẵn sàng cho agent",
      upload: "Tải lên",
      replace: "Thay file",
      dossierAgentCta: "Thiếu giấy tờ? Hãy hỏi Agent",
      dossierAgentHint: "Digital Expert giúp liệt kê chứng từ và giải thích bước Credit → Compliance.",
      openAgent: "Mở Agent hỗ trợ",
      historyTitle: "Lịch sử quan hệ tín dụng tại ngân hàng",
      historySub: "Dữ liệu demo — minh họa CIF khách bán lẻ.",
      colId: "Mã khoản",
      colProduct: "Sản phẩm",
      colAmount: "Gốc",
      colOpened: "Mở",
      colStatus: "Trạng thái",
      agentTitle: "Digital Expert · hỗ trợ lên hồ sơ",
      agentOnline: "Sẵn sàng hỗ trợ",
      agentEmpty: "Mô tả nhu cầu vay hoặc giấy tờ còn thiếu",
      agentEmptyHint:
        "Agent tư vấn hồ sơ; số liệu DTI/LTV trong hệ thống thật đến từ tool, không từ model.",
      agentThinking: "Các chuyên gia đang phối hợp…",
      agentPlaceholder: "Hỏi về hồ sơ, hạn mức, hoặc quy trình thẩm định…",
      agentSend: "Gửi",
      agentPrompts: "Gợi ý nhanh",
      agentDisclaimer:
        "Demo: phản hồi qua API chat có fallback. Không thay thế tư vấn tín dụng chính thức.",
      agentFallback:
        "Hệ thống đang chạy chế độ dự phòng. Yêu cầu đã được ghi nhận — hãy bổ sung sổ đỏ và báo cáo định giá để Compliance tính LTV.",
      goWorkspace: "Vào workspace của tôi",
    },
  },
  en: {
    nav: {
      products: "Loan products",
      why: "Why Aulacys",
      pricing: "Rates & fees",
      process: "How it works",
      registerCta: "Apply now",
      login: "Log in",
      register: "Sign up",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      mainNav: "Main navigation",
    },
    hero: {
      badge: "Personal loans · Aulacys",
      titleBefore: "Easy, Fast,",
      titleAccent: "Realize",
      titleAfter: "Your Dreams",
      subtitle:
        "Flexible Aulacys loan solutions help you access financing quickly — simple paperwork, same-day approval.",
      ctaPrimary: "Apply now",
      ctaSecondary: "Explore products",
      trust1: "24h approval",
      trust2: "Rates from 6.5%",
      trust3: "Data security",
      imageAlt: "Modern Aulacys banking space",
    },
    products: {
      eyebrow: "Loan products",
      title: "Support for every financial goal",
      subtitle:
        "From a new home to a car or overseas study — Aulacys walks with you at every milestone.",
      viewDetail: "View details",
      items: {
        "mua-nha": {
          title: "Home loan",
          desc: "Build your home with limits up to VND 20bn and terms up to 25 years.",
        },
        "mua-oto": {
          title: "Auto loan",
          desc: "Own your car with only 20% down payment and paperwork done in 48 hours.",
        },
        "du-hoc": {
          title: "Study abroad loan",
          desc: "Invest in global education with preferential rates and flexible grace periods.",
        },
      },
    },
    why: {
      eyebrow: "Why Aulacys",
      title: "We're here to help",
      viewDetail: "View details",
      items: [
        {
          title: "Aulacys beside you every step of the way.",
          text: "Our advisors tailor loan options to each customer's needs and repayment capacity.",
        },
        {
          title: "Fast approval, simple process.",
          text: "Apply fully online via Aulacys Mobile. Get a preliminary decision in minutes and disbursement within 24 hours.",
        },
        {
          title: "Flexible repayment methods.",
          text: "Pay via QR, e-banking, or auto-debit. Stay on schedule without late fees.",
        },
      ],
    },
    pricing: {
      eyebrow: "Rates & fees",
      title: "Transparent rates and flexible fees",
      subtitle: "Clear preferential pricing with no hidden fees — real value for every customer.",
      colProduct: "Product / Service",
      colRate: "Interest rate",
      colTerm: "Term",
      featured: "Featured",
      perYear: "/year",
      viewDetail: "View details",
      rows: [
        { name: "Home loan", rate: "6.50%", term: "Up to 25 years", featured: true },
        { name: "Auto loan", rate: "7.20%", term: "Up to 8 years", featured: false },
        { name: "Study abroad", rate: "7.90%", term: "Up to 10 years", featured: false },
        { name: "Consumer loan", rate: "9.50%", term: "Up to 5 years", featured: false },
        { name: "Business loan", rate: "8.20%", term: "Up to 7 years", featured: false },
      ],
    },
    process: {
      eyebrow: "Simple process",
      title: "Borrow in just a few steps",
      imageAlt: "Aulacys advisor handing over loan funds",
      stepLabel: "STEP",
      steps: [
        {
          title: "Sign up / Log in",
          desc: "Open an Aulacys account online in 2 minutes with eKYC.",
        },
        {
          title: "Enter loan details",
          desc: "Provide amount, term, and upload documents as guided.",
        },
        {
          title: "Receive disbursement",
          desc: "Funds reach your account within 24 hours after approval.",
        },
      ],
    },
    cta: {
      titleBefore: "Get funded fast,",
      titleAccent: "Apply now!",
      subtitle: "Thousands of Vietnamese customers trust Aulacys to realize their dreams. Your turn.",
      button: "Apply now",
      secure: "Information secured to Vietnamese banking standards.",
    },
    footer: {
      products: "Products",
      support: "Support",
      contact: "Contact",
      productLinks: ["Home loan", "Auto loan", "Study abroad", "Consumer loan", "Credit cards"],
      supportLinks: ["Help center", "Branches", "FAQ", "Terms", "Privacy"],
      license: "Licensed by the State Bank of Vietnam.",
    },
    calculator: {
      amount: "Loan amount",
      term: "Loan term",
      monthly: "Estimated monthly payment",
      interest: "Total interest",
      disclaimer: "Reference rate 8.9%/year. Figures are illustrative only.",
      register: "Apply now",
      amountMin: "50 million",
      amountMax: "5 billion",
      termMin: "6 months",
      termMax: "240 months",
      months: "months",
    },
    auth: {
      loginTitle: "Log in",
      loginSubtitle: "Enter your details to access your account",
      registerTitle: "Sign up",
      registerSubtitle: "Enter your details to create an account and start your loan",
      loginHeadline: "Start managing your money smarter with Aulacys",
      registerHeadline: "Start your loan journey easily with Aulacys",
      email: "Email address",
      password: "Password",
      fullName: "Name",
      phone: "Phone number",
      emailPlaceholder: "you@email.com",
      namePlaceholder: "John Doe",
      passwordPlaceholder: "Enter your password",
      phonePlaceholder: "+84 901 234 567",
      submitLogin: "Log in",
      submitRegister: "Create an account",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      backHome: "Back to home",
      demoNote: "Demo only — not connected to a backend.",
      successLogin: "Demo sign-in successful. Opening your workspace…",
      successRegister: "Demo sign-up successful. Opening your loan workspace…",
      panelBadge: "Personal lending",
      panelCard1Title: "Take control of your finances",
      panelCard1Text: "Estimate payments and schedules before you apply.",
      panelCard2Title: "Bank smarter. Move faster.",
      panelCard2Text: "Simple process with bank-grade data protection.",
    },
    detail: {
      breadcrumbHome: "Home",
      breadcrumbLoan: "Loans",
      benefits: "Product benefits",
      conditions: "Eligibility",
      process: "Application process",
      faq: "FAQ",
      related: "Related products",
      apply: "Apply for this loan",
      calcEyebrow: "Loan calculator",
      calcTitle: "Estimate what fits you",
      back: "Back to home",
      notFound: "Loan product not found.",
    },
    loading: {
      title: "Loading product…",
      subtitle: "Aulacys is preparing your loan details.",
    },
    workspace: {
      shellEyebrow: "Customer space",
      shellTitle: "Loan workspace",
      exit: "Back home",
      welcome: "Hello, {name}",
      welcomeSub:
        "Track limits, complete your file, and let Digital Expert Agents prep your loan — retail_mortgage / unsecured flows.",
      tabsNav: "Workspace tabs",
      tabs: {
        dashboard: "Dashboard",
        dossier: "Documents",
        history: "Loan history",
        agent: "Support agent",
      },
      statLimit: "Indicative total limit",
      statLimitHint: "From tools (never computed by the LLM)",
      statUsed: "Already used",
      statUsedHint: "Outstanding vs open limits",
      statDossier: "File readiness",
      statDossierHint: "Before Credit & Compliance run",
      limitsTitle: "Limits by product",
      limitsSub: "YAML-configured products: retail_mortgage and retail_unsecured_salary (+ study).",
      viewProduct: "Details",
      limitLabel: "Limit",
      usedLabel: "Used",
      rateLabel: "From",
      dtiTitle: "Current DTI",
      dtiSub: "Debt service / income — hard caps live in policy/, not in prompts.",
      dtiStatus: "Within soft cap · room to borrow more",
      repayTitle: "Projected repayment (VND m)",
      repaySub: "Illustrative cashflow after an additional home loan.",
      pipelineTitle: "Active application",
      dossierTitle: "Loan document checklist",
      dossierSub:
        "Each document maps to an agent/tool. Missing valuation → Compliance cannot compute LTV.",
      dossierReady: "agent-ready",
      upload: "Upload",
      replace: "Replace",
      dossierAgentCta: "Missing papers? Ask the Agent",
      dossierAgentHint: "Digital Expert lists documents and explains Credit → Compliance.",
      openAgent: "Open support agent",
      historyTitle: "Credit history at the bank",
      historySub: "Demo CIF data for a retail customer.",
      colId: "ID",
      colProduct: "Product",
      colAmount: "Principal",
      colOpened: "Opened",
      colStatus: "Status",
      agentTitle: "Digital Expert · file prep",
      agentOnline: "Ready to help",
      agentEmpty: "Describe your loan need or missing documents",
      agentEmptyHint:
        "The agent advises on the file; real DTI/LTV numbers come from tools, not the model.",
      agentThinking: "Specialists are coordinating…",
      agentPlaceholder: "Ask about documents, limits, or underwriting…",
      agentSend: "Send",
      agentPrompts: "Quick prompts",
      agentDisclaimer:
        "Demo: chat API with fallback. Not a substitute for formal credit advice.",
      agentFallback:
        "Running in fallback mode. Please add the land title and valuation so Compliance can compute LTV.",
      goWorkspace: "Open my workspace",
    },
  },
};
