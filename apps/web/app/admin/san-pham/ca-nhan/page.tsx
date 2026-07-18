"use client";

import { useState } from "react";
import { Coins, Plus, Settings, Grid, List } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { 
  INITIAL_GROUPS, 
  INITIAL_PRODUCTS, 
  LoanProduct, 
  LoanProductGroup, 
  ProductStatus 
} from "@/components/admin/loan-products/mock-data";
import { 
  IndividualProductOverview, 
  LoanProductGroupList, 
  IndividualLoanProductTable, 
  IndividualLoanProductFilters,
  ProductPreview,
  ActivationConfirmDialog,
  ProductGroupManagement
} from "@/components/admin/loan-products/product-list";
import { IndividualLoanProductForm } from "@/components/admin/loan-products/product-form";

type ViewMode = "LIST" | "CREATE" | "EDIT";

export default function IndividualLoanProductPage() {
  // Main data states (in-memory mock)
  const [products, setProducts] = useState<LoanProduct[]>(INITIAL_PRODUCTS);
  const [groups, setGroups] = useState<LoanProductGroup[]>(INITIAL_GROUPS);

  // Layout states
  const [viewMode, setViewMode] = useState<ViewMode>("LIST");
  const [viewType, setViewType] = useState<"GROUP" | "TABLE">("GROUP"); // Default: GROUP
  
  // Selected items for drawers/dialogs
  const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(null);
  const [previewProduct, setPreviewProduct] = useState<LoanProduct | null>(null);
  const [editingProduct, setEditingProduct] = useState<LoanProduct | null>(null);

  // Open triggers for management overlay
  const [groupMgmtOpen, setGroupMgmtOpen] = useState(false);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);

  // Filters state
  const [filterGroupId, setFilterGroupId] = useState("");
  const [filterSecuredType, setFilterSecuredType] = useState("");
  const [filterSegment, setFilterSegment] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Toasts state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" }[]>([]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const handleClearFilters = () => {
    setFilterGroupId("");
    setFilterSecuredType("");
    setFilterSegment("");
    setFilterStatus("");
    setSearchQuery("");
    showToast("Đã xóa tất cả bộ lọc");
  };

  // Actions: Add/Edit Product
  const handleSaveProduct = (prod: LoanProduct) => {
    if (viewMode === "CREATE") {
      setProducts(prev => [prod, ...prev]);
      showToast(`Đã tạo sản phẩm vay "${prod.productName}" thành công.`);
    } else if (viewMode === "EDIT") {
      setProducts(prev => prev.map(p => p.id === prod.id ? prod : p));
      showToast(`Đã lưu thay đổi cho sản phẩm "${prod.productName}".`);
    }
    setViewMode("LIST");
    setEditingProduct(null);
  };

  // Actions: Toggle status confirmation
  const handleStatusConfirm = (id: string, nextStatus: ProductStatus) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status: nextStatus, updatedAt: new Date().toISOString().split("T")[0] } : p));
    setStatusConfirmOpen(false);
    setSelectedProduct(null);
    showToast("Cập nhật trạng thái sản phẩm thành công.");
  };

  // Actions: Group management callbacks
  const handleSaveGroup = (group: LoanProductGroup, isNew: boolean) => {
    if (isNew) {
      setGroups(prev => [...prev, group]);
    } else {
      setGroups(prev => prev.map(g => g.id === group.id ? group : g));
      // Sync names of products if group name changed
      setProducts(prev => prev.map(p => p.productGroupId === group.id ? { ...p, productGroupName: group.name } : p));
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
  };

  // Filter logic
  const filteredProducts = products.filter(p => {
    if (filterGroupId && p.productGroupId !== filterGroupId) return false;
    if (filterSecuredType && p.securedType !== filterSecuredType) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterSegment && !p.segments.includes(filterSegment)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const codeMatch = p.productCode.toLowerCase().includes(q);
      const nameMatch = p.productName.toLowerCase().includes(q);
      if (!codeMatch && !nameMatch) return false;
    }
    return true;
  });

  return (
    <AdminShell 
      activeHref="/admin/san-pham/ca-nhan" 
      eyebrow="Sản phẩm vay / Khách hàng cá nhân" 
      title="Quản lý sản phẩm vay khách hàng cá nhân"
    >
      {/* Toast container */}
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

      <div className="space-y-6">
        
        {/* ========================================== */}
        {/* VIEW MODE: LIST */}
        {/* ========================================== */}
        {viewMode === "LIST" && (
          <>
            {/* Header section with desc & action buttons */}
            <div className="bg-white border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
              <div className="space-y-1 md:max-w-xl">
                <div className="flex items-center gap-2 text-[#003B71]">
                  <Coins className="h-5 w-5 text-[#F58220]" />
                  <h2 className="text-xl font-extrabold">Khách hàng cá nhân</h2>
                </div>
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  Quản lý các sản phẩm tín dụng dành cho khách hàng cá nhân theo nhu cầu vay, hình thức cấp tín dụng và chính sách sản phẩm.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Button 
                  onClick={() => setGroupMgmtOpen(true)}
                  variant="outline"
                  className="h-11 rounded-xl border-[#003B71]/20 text-[#003B71] hover:bg-[#003B71]/5 font-bold text-xs"
                >
                  <Settings size={15} className="mr-1.5" />
                  Quản lý nhóm sản phẩm
                </Button>
                <Button 
                  onClick={() => {
                    setEditingProduct(null);
                    setViewMode("CREATE");
                  }}
                  className="h-11 rounded-xl bg-[#F58220] hover:bg-[#F58220]/95 text-on-primary font-bold text-xs shadow-md"
                >
                  <Plus size={16} className="mr-1.5" />
                  Tạo sản phẩm vay cá nhân
                </Button>
              </div>
            </div>

            {/* Product overview summary cards */}
            <IndividualProductOverview products={products} groups={groups} />

            {/* Filter and search bar wrapper */}
            <IndividualLoanProductFilters 
              groups={groups}
              filterGroupId={filterGroupId}
              setFilterGroupId={setFilterGroupId}
              filterSecuredType={filterSecuredType}
              setFilterSecuredType={setFilterSecuredType}
              filterSegment={filterSegment}
              setFilterSegment={setFilterSegment}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onClear={handleClearFilters}
            />

            {/* View mode toggle: Group vs Table list */}
            <div className="flex justify-between items-center bg-white border border-border/80 rounded-2xl p-3.5 shadow-xs">
              <span className="text-xs font-bold text-navy">
                Hiển thị kết quả: <strong className="text-[#F58220] font-bold">{filteredProducts.length}</strong> sản phẩm
              </span>
              <div className="flex bg-secondary p-1 rounded-xl gap-1">
                <button
                  onClick={() => setViewType("GROUP")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition",
                    viewType === "GROUP" ? "bg-white text-navy shadow-xs" : "text-muted-foreground hover:text-navy"
                  )}
                >
                  <Grid size={13} />
                  Xem theo nhóm
                </button>
                <button
                  onClick={() => setViewType("TABLE")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition",
                    viewType === "TABLE" ? "bg-white text-navy shadow-xs" : "text-muted-foreground hover:text-navy"
                  )}
                >
                  <List size={13} />
                  Xem dạng danh sách
                </button>
              </div>
            </div>

            {/* Primary content area */}
            {viewType === "GROUP" ? (
              <LoanProductGroupList 
                groups={groups.filter(g => g.isActive)} 
                products={filteredProducts} 
                onViewProducts={(groupId) => {
                  setFilterGroupId(groupId);
                  setViewType("TABLE");
                  showToast(`Đang hiển thị nhóm sản phẩm.`);
                }}
                onEditGroup={(group) => {
                  setEditingGroupForEdit(group);
                }}
              />
            ) : (
              <IndividualLoanProductTable 
                products={filteredProducts} 
                onViewDetail={(prod) => setPreviewProduct(prod)}
                onEditDetail={(prod) => {
                  setEditingProduct(prod);
                  setViewMode("EDIT");
                }}
                onToggleStatus={(prod) => {
                  setSelectedProduct(prod);
                  setStatusConfirmOpen(true);
                }}
              />
            )}

            {/* Modals & Overlays */}
            <ProductPreview 
              product={previewProduct} 
              onClose={() => setPreviewProduct(null)} 
              onEdit={(prod) => {
                setEditingProduct(prod);
                setViewMode("EDIT");
                setPreviewProduct(null);
              }}
            />

            <ActivationConfirmDialog 
              product={selectedProduct}
              onConfirm={handleStatusConfirm}
              onClose={() => {
                setStatusConfirmOpen(false);
                setSelectedProduct(null);
              }}
            />

            <ProductGroupManagement 
              groups={groups}
              products={products}
              isOpen={groupMgmtOpen}
              onClose={() => setGroupMgmtOpen(false)}
              onSaveGroup={handleSaveGroup}
              onDeleteGroup={handleDeleteGroup}
              showToast={showToast}
            />
          </>
        )}

        {/* ========================================== */}
        {/* VIEW MODE: CREATE / EDIT */}
        {/* ========================================== */}
        {(viewMode === "CREATE" || viewMode === "EDIT") && (
          <div className="space-y-4">
            <div className="bg-white border border-border/80 rounded-2xl p-5 shadow-xs">
              <h2 className="text-lg font-extrabold text-[#003B71]">
                {viewMode === "CREATE" ? "Tạo mới sản phẩm vay khách hàng cá nhân" : `Cập nhật thông tin sản phẩm: ${editingProduct?.productName}`}
              </h2>
            </div>
            <IndividualLoanProductForm 
              groups={groups}
              editingProduct={editingProduct}
              onSave={handleSaveProduct}
              onCancel={() => {
                setViewMode("LIST");
                setEditingProduct(null);
              }}
            />
          </div>
        )}

      </div>
    </AdminShell>
  );

  // Helper setter
  function setEditingGroupForEdit(group: LoanProductGroup) {
    setGroupMgmtOpen(true);
    // Focus or trigger will be automatically set inside ProductGroupManagement
  }
}
