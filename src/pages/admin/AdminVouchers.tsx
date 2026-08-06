import React, { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, Ticket, X, Users, Star, UserPlus } from "lucide-react";
import { toast } from "react-hot-toast";
import { adminService } from "../../services/admin.service";
import { useTheme } from "../../contexts/ThemeContext";

type VoucherType = "TIER" | "NEWCOMER";

interface TierFormData {
  code: string;
  targetTierName: string;
  requiredSpending: number;
  discountType: string;
  discountValue: number;
  minOrderValue: number;
  issueQuantity: number;
  validDays: number;
  voucherType: VoucherType;
  targetServiceCategory: string;
}

const defaultTierForm: TierFormData = {
  code: "", targetTierName: "Vàng", requiredSpending: 1000000,
  discountType: "PERCENTAGE", discountValue: 10, minOrderValue: 0,
  issueQuantity: 1, validDays: 30, voucherType: "TIER", targetServiceCategory: "",
};

const defaultNewcomerForm: TierFormData = {
  code: "", targetTierName: "", requiredSpending: 0,
  discountType: "PERCENTAGE", discountValue: 15, minOrderValue: 0,
  issueQuantity: 100, validDays: 30, voucherType: "NEWCOMER", targetServiceCategory: "",
};

export default function AdminVouchers() {
  const { isDark } = useTheme();

  const [allVouchers, setAllVouchers] = useState<any[]>([]);
  const [isVoucherServiceEnabled, setIsVoucherServiceEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<VoucherType>("TIER");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<any>(null);
  const [formData, setFormData] = useState<TierFormData>(defaultTierForm);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadAll = async () => {
    try {
      const [vData, enabled] = await Promise.all([
        adminService.getAllVouchers(),
        adminService.getVoucherServiceConfig(),
      ]);
      setAllVouchers(vData);
      setIsVoucherServiceEnabled(enabled);
    } catch {
      toast.error("Lỗi tải dữ liệu");
    }
  };
  useEffect(() => { loadAll(); }, []);

  const tierVouchers = allVouchers.filter(
    (v) => (!v.voucherType || v.voucherType === "TIER") &&
      v.code.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const newcomerVouchers = allVouchers.filter(
    (v) => v.voucherType === "NEWCOMER" &&
      v.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleVoucherService = async () => {
    const next = !isVoucherServiceEnabled;
    try {
      await adminService.setVoucherServiceConfig(next);
      setIsVoucherServiceEnabled(next);
      toast.success(next ? "Đã bật hệ thống Voucher" : "Đã tắt hệ thống Voucher");
    } catch { toast.error("Lỗi cập nhật trạng thái"); }
  };

  const handleToggleVoucher = async (v: any) => {
    setTogglingId(v.id);
    try {
      const updated = await adminService.toggleVoucher(v.id);
      setAllVouchers(prev => prev.map(x => x.id === v.id ? { ...x, active: updated.active } : x));
      toast.success(updated.active ? `Đã bật voucher ${v.code}` : `Đã tắt voucher ${v.code}`);
    } catch {
      toast.error("Không thể thay đổi trạng thái voucher");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa?")) return;
    try {
      await adminService.deleteVoucher(id);
      toast.success("Đã xóa");
      loadAll();
    } catch { toast.error("Xóa thất bại"); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code) { toast.error("Vui lòng nhập mã voucher"); return; }
    if (formData.voucherType === "NEWCOMER" && formData.discountType === "PERCENTAGE" && (formData.discountValue < 10 || formData.discountValue > 20)) {
      toast.error("Voucher tân thủ chỉ cho phép giảm 10% - 20%");
      return;
    }
    try {
      const payload = {
        ...formData,
        targetTierName: formData.voucherType === "NEWCOMER" ? undefined : formData.targetTierName,
      };
      if (editingVoucher) {
        await adminService.updateVoucher(editingVoucher.id, payload);
        toast.success("Đã cập nhật");
      } else {
        await adminService.createVoucher(payload);
        toast.success("Đã tạo mới");
      }
      setIsModalOpen(false);
      setEditingVoucher(null);
      loadAll();
    } catch { toast.error(editingVoucher ? "Cập nhật thất bại" : "Tạo thất bại"); }
  };

  const openModal = (voucher: any = null, type: VoucherType = activeTab) => {
    setEditingVoucher(voucher);
    if (voucher) {
      setFormData({
        code: voucher.code,
        targetTierName: voucher.targetTier?.name || "Vàng",
        requiredSpending: voucher.targetTier?.requiredSpending || 0,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        minOrderValue: voucher.minOrderValue || 0,
        issueQuantity: voucher.issueQuantity || 1,
        validDays: voucher.validDays || 30,
        voucherType: voucher.voucherType || "TIER",
        targetServiceCategory: voucher.targetServiceCategory || "",
      });
    } else {
      setFormData(type === "NEWCOMER" ? { ...defaultNewcomerForm } : { ...defaultTierForm });
    }
    setIsModalOpen(true);
  };

  const inp = `w-full rounded-xl px-4 py-3 font-semibold transition outline-none ${isDark ? "admin-glass-input" : "bg-white border border-slate-200 text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
    }`;
  const lbl = `block text-[11px] font-bold uppercase tracking-widest mb-2 ${isDark ? "text-slate-500" : "text-slate-500"}`;

  const tierBadge = (name: string) => {
    const map: Record<string, string> = isDark
      ? { "Bạc": "bg-slate-500/10 text-slate-400 border-slate-500/20", "Vàng": "bg-amber-500/10 text-amber-400 border-amber-500/20", "Kim Cương": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" }
      : { "Bạc": "bg-slate-100 text-slate-700", "Vàng": "bg-amber-100 text-amber-700", "Kim Cương": "bg-sky-100 text-sky-700" };
    return map[name] ?? (isDark ? "bg-slate-500/10 text-slate-400 border-slate-500/20" : "bg-slate-100 text-slate-700");
  };
  const catLabel = (cat: string) =>
    !cat ? "Tất cả dịch vụ" : cat === "SPA" ? "Dịch vụ Spa" : cat === "GROOMING" ? "Dịch vụ Grooming" : cat;

  const ToggleSwitch = ({ voucher }: { voucher: any }) => {
    const isActive = voucher.active !== false;
    const isLoading = togglingId === voucher.id;
    return (
      <button
        onClick={() => handleToggleVoucher(voucher)}
        disabled={isLoading}
        title={isActive ? "Đang bật - Nhấn để tắt" : "Đang tắt - Nhấn để bật"}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${isLoading ? "opacity-50 cursor-wait" : "cursor-pointer"
          } ${isActive ? "bg-green-500" : isDark ? "bg-slate-600" : "bg-slate-300"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${isActive ? "translate-x-6" : "translate-x-1"
          }`} />
      </button>
    );
  };

  const ActionBtns = ({ v }: { v: any }) => (
    <div className="flex items-center justify-end gap-3">
      <ToggleSwitch voucher={v} />
      <button onClick={() => openModal(v)}
        className={`p-2 rounded-xl transition ${isDark ? "text-slate-500 hover:text-blue-400 hover:bg-blue-500/10" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"}`}>
        <Edit2 className="w-4 h-4" />
      </button>
      <button onClick={() => handleDelete(v.id)}
        className={`p-2 rounded-xl transition ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-slate-400 hover:text-red-600 hover:bg-red-50"}`}>
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-3 ${isDark ? "text-white" : "text-slate-900"}`}>
            <Ticket className={`w-7 h-7 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
            Cấu Hình Voucher & Hạng
          </h1>
          <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Quản lý voucher theo hạng thành viên và voucher dành cho khách hàng mới.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl shadow-sm border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <span className={`text-sm font-bold ${isVoucherServiceEnabled ? "text-green-600" : "text-slate-400"}`}>Hệ thống Voucher</span>
            <button onClick={toggleVoucherService}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isVoucherServiceEnabled ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isVoucherServiceEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <button onClick={() => openModal(null, activeTab)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-2xl font-semibold flex items-center gap-2 transition">
            <Plus className="w-5 h-5" />
            {activeTab === "NEWCOMER" ? "Tạo Voucher Tân Thủ" : "Tạo Cấu Hình Mới"}
          </button>
        </div>
      </div>

      {!isVoucherServiceEnabled && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined">warning</span>
          <p className="text-sm font-semibold">Hệ thống Voucher đang TẮT toàn bộ. Tất cả voucher đều bị vô hiệu hóa.</p>
        </div>
      )}

      <div className={`flex gap-1 p-1 rounded-2xl w-fit ${isDark ? "bg-slate-800/60" : "bg-slate-100"}`}>
        <button onClick={() => setActiveTab("TIER")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === "TIER"
              ? isDark ? "bg-white/10 text-white shadow" : "bg-white text-slate-900 shadow"
              : isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"
            }`}>
          <Star className="w-4 h-4" />
          Voucher Theo Hạng
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${activeTab === "TIER" ? "bg-blue-500/20 text-blue-500" : isDark ? "bg-white/5 text-slate-500" : "bg-slate-200 text-slate-500"}`}>
            {allVouchers.filter(v => !v.voucherType || v.voucherType === "TIER").length}
          </span>
        </button>
        <button onClick={() => setActiveTab("NEWCOMER")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === "NEWCOMER"
              ? isDark ? "bg-white/10 text-white shadow" : "bg-white text-slate-900 shadow"
              : isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"
            }`}>
          <UserPlus className="w-4 h-4" />
          Voucher Tân Thủ
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${activeTab === "NEWCOMER" ? "bg-violet-500/20 text-violet-500" : isDark ? "bg-white/5 text-slate-500" : "bg-slate-200 text-slate-500"}`}>
            {allVouchers.filter(v => v.voucherType === "NEWCOMER").length}
          </span>
        </button>
      </div>

      <div className={`flex gap-4 p-4 rounded-2xl ${isDark ? "admin-glass-card" : "bg-white border border-slate-200/60 shadow-sm"}`}>
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input type="text" placeholder="Tìm theo mã voucher..."
            className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm font-medium transition-all ${isDark ? "admin-glass-input" : "bg-slate-50 border-none focus:ring-2 focus:ring-blue-500/20"}`}
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className={`flex items-center gap-4 px-4 py-2.5 rounded-xl text-xs font-medium ${isDark ? "bg-white/[0.03] text-slate-500" : "bg-slate-50 text-slate-400"}`}>
        <span className="flex items-center gap-2">
          <span className="inline-flex h-5 w-9 items-center rounded-full bg-green-500 px-0.5">
            <span className="h-3.5 w-3.5 rounded-full bg-white translate-x-4" />
          </span>
          Voucher đang HOẠT ĐỘNG
        </span>
        <span className="flex items-center gap-2">
          <span className={`inline-flex h-5 w-9 items-center rounded-full px-0.5 ${isDark ? "bg-slate-600" : "bg-slate-300"}`}>
            <span className="h-3.5 w-3.5 rounded-full bg-white translate-x-0.5" />
          </span>
          Voucher đang TẮT
        </span>
      </div>

      {activeTab === "TIER" && (
        <div className={`rounded-2xl overflow-hidden ${isDark ? "admin-glass-card" : "bg-white border border-slate-200/60 shadow-sm"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b ${isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50/50 border-slate-200/60"}`}>
                  {["Trạng Thái", "Hạng & Mốc Đạt", "Mã Voucher", "Giảm Giá", "Số Lượng", "Thao Tác"].map((h, i) => (
                    <th key={h} className={`px-6 py-4 text-[11px] uppercase tracking-widest font-bold ${isDark ? "text-slate-500" : "text-slate-500"} ${i === 5 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-slate-100"}`}>
                {tierVouchers.map((v) => (
                  <tr key={v.id} className={`transition-colors ${v.active === false ? (isDark ? "opacity-40" : "opacity-50") : ""} ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/50"}`}>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${v.active !== false ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"}`}>
                        {v.active !== false ? "ĐANG BẬT" : "ĐÃ TẮT"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${tierBadge(v.targetTier?.name)}`}>
                        Hạng {v.targetTier?.name}
                      </span>
                      <span className={`block text-sm font-semibold mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        Cần {(v.targetTier?.requiredSpending || 0).toLocaleString()}đ
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold px-3 py-1.5 rounded-lg text-sm ${isDark ? "bg-white/5 text-white" : "bg-slate-100 text-slate-900"}`}>{v.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                        {v.discountType === "PERCENTAGE" ? `${v.discountValue}%` : `${v.discountValue?.toLocaleString()}đ`}
                      </span>
                      {v.minOrderValue > 0 && <span className={`block text-[11px] mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Đơn tối thiểu: {v.minOrderValue.toLocaleString()}đ</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {v.issuedQuantity !== undefined ? v.issuedQuantity : "—"} / {v.issueQuantity} bản sao
                      </span>
                      <span className={`block text-[11px] mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Hạn {v.validDays} ngày</span>
                    </td>
                    <td className="px-6 py-4"><ActionBtns v={v} /></td>
                  </tr>
                ))}
                {tierVouchers.length === 0 && (
                  <tr><td colSpan={6} className={`px-6 py-10 text-center ${isDark ? "text-slate-500" : "text-slate-500"}`}>Chưa có cấu hình nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "NEWCOMER" && (
        <div className="space-y-6">
          <div className={`p-5 rounded-2xl border flex items-start gap-4 ${isDark ? "bg-violet-500/5 border-violet-500/15" : "bg-violet-50 border-violet-100"}`}>
            <div className={`p-3 rounded-xl ${isDark ? "bg-violet-500/10" : "bg-violet-100"}`}>
              <Users className={`w-5 h-5 ${isDark ? "text-violet-400" : "text-violet-600"}`} />
            </div>
            <div>
              <p className={`font-bold text-sm ${isDark ? "text-violet-300" : "text-violet-800"}`}>Voucher Tân Thủ hoạt động như thế nào?</p>
              <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Voucher này tự động phát cho <strong>N khách đầu tiên</strong> ngay khi họ <strong>nhập mã giới thiệu</strong>. Chỉ voucher đang BẬT mới được phát.
              </p>
            </div>
          </div>

          <div className={`rounded-2xl overflow-hidden ${isDark ? "admin-glass-card" : "bg-white border border-slate-200/60 shadow-sm"}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b ${isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50/50 border-slate-200/60"}`}>
                    {["Trạng Thái", "Mã Voucher", "Giảm Giá", "Áp Dụng Cho", "Số Lượng", "Thời Hạn", "Thao Tác"].map((h, i) => (
                      <th key={h} className={`px-6 py-4 text-[11px] uppercase tracking-widest font-bold ${isDark ? "text-slate-500" : "text-slate-500"} ${i === 6 ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-slate-100"}`}>
                  {newcomerVouchers.map((v) => (
                    <tr key={v.id} className={`transition-colors ${v.active === false ? (isDark ? "opacity-40" : "opacity-50") : ""} ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/50"}`}>
                      <td className="px-6 py-4">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${v.active !== false ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"}`}>
                          {v.active !== false ? "ĐANG BẬT" : "ĐÃ TẮT"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${isDark ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" : "bg-violet-100 text-violet-700"}`}>
                            <UserPlus className="w-3 h-3" /> TÂN THỦ
                          </span>
                          <span className={`font-bold px-3 py-1.5 rounded-lg text-sm ${isDark ? "bg-white/5 text-white" : "bg-slate-100 text-slate-900"}`}>{v.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-lg font-extrabold ${isDark ? "text-violet-400" : "text-violet-600"}`}>
                          {v.discountType === "PERCENTAGE" ? `${v.discountValue}%` : `${v.discountValue?.toLocaleString()}đ`}
                        </span>
                        {v.minOrderValue > 0 && <span className={`block text-[11px] mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Đơn tối thiểu: {v.minOrderValue.toLocaleString()}đ</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${isDark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                          {catLabel(v.targetServiceCategory)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                          {v.issuedQuantity !== undefined ? v.issuedQuantity : "—"} / {v.issueQuantity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>{v.validDays} ngày</span>
                      </td>
                      <td className="px-6 py-4"><ActionBtns v={v} /></td>
                    </tr>
                  ))}
                  {newcomerVouchers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <p className={`font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Chưa có Voucher Tân Thủ nào</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className={`rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${isDark ? "admin-glass-card bg-slate-900/95" : "bg-white border border-slate-100"}`}>
            <div className={`px-8 py-6 border-b flex justify-between items-center flex-shrink-0 ${isDark ? "border-white/5" : "border-slate-100 bg-slate-50/50"}`}>
              <div className="flex items-center gap-3">
                {formData.voucherType === "NEWCOMER"
                  ? <div className={`p-2 rounded-xl ${isDark ? "bg-violet-500/10" : "bg-violet-100"}`}><UserPlus className={`w-5 h-5 ${isDark ? "text-violet-400" : "text-violet-600"}`} /></div>
                  : <div className={`p-2 rounded-xl ${isDark ? "bg-blue-500/10" : "bg-blue-100"}`}><Star className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-blue-600"}`} /></div>
                }
                <div>
                  <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {editingVoucher ? "Chỉnh Sửa" : "Tạo Mới"} {formData.voucherType === "NEWCOMER" ? "Voucher Tân Thủ" : "Cấu Hình Hạng"}
                  </h2>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className={`p-2 rounded-full transition ${isDark ? "text-slate-500 hover:bg-white/5" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto">
              {formData.voucherType === "TIER" && (
                <div className={`p-4 rounded-2xl ${isDark ? "bg-blue-500/5 border border-blue-500/10" : "bg-blue-50/50 border border-blue-100"}`}>
                  <h3 className={`text-sm font-bold mb-3 ${isDark ? "text-blue-400" : "text-blue-800"}`}>1. Cấu hình Hạng (Tiêu chí đạt)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={lbl}>Hạng Áp Dụng</label>
                      <select value={formData.targetTierName} onChange={e => setFormData({ ...formData, targetTierName: e.target.value })} className={inp}>
                        <option>Bạc</option><option>Vàng</option><option>Kim Cương</option>
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Mức Chi Tiêu Cần Đạt (VND) *</label>
                      <input required type="number" min="0" value={formData.requiredSpending}
                        onChange={e => setFormData({ ...formData, requiredSpending: Number(e.target.value) })}
                        className={inp} placeholder="VD: 1000000" />
                    </div>
                  </div>
                </div>
              )}

              {formData.voucherType === "NEWCOMER" && (
                <div className={`p-4 rounded-2xl ${isDark ? "bg-violet-500/5 border border-violet-500/10" : "bg-violet-50/50 border border-violet-100"}`}>
                  <h3 className={`text-sm font-bold mb-1 ${isDark ? "text-violet-400" : "text-violet-800"}`}>Giới hạn Dịch vụ Áp Dụng</h3>
                  <select value={formData.targetServiceCategory} onChange={e => setFormData({ ...formData, targetServiceCategory: e.target.value })} className={inp}>
                    <option value="">Tất cả dịch vụ</option>
                    <option value="SPA">Chỉ Dịch vụ Spa</option>
                    <option value="GROOMING">Chỉ Dịch vụ Grooming</option>
                    <option value="BOARDING">Chỉ Dịch vụ Boarding / Hotel</option>
                  </select>
                </div>
              )}

              <div className={`p-4 rounded-2xl ${isDark ? "bg-emerald-500/5 border border-emerald-500/10" : "bg-emerald-50/50 border border-emerald-100"}`}>
                <h3 className={`text-sm font-bold mb-3 ${isDark ? "text-emerald-400" : "text-emerald-800"}`}>
                  {formData.voucherType === "NEWCOMER" ? "Thông tin Voucher" : "2. Phần thưởng Voucher"}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={lbl}>Mã Voucher *</label>
                    <input required type="text" value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className={`${inp} uppercase`} placeholder="VD: WELCOME15" />
                  </div>
                  <div>
                    <label className={lbl}>Loại Giảm Giá</label>
                    <select value={formData.discountType} onChange={e => setFormData({ ...formData, discountType: e.target.value })} className={inp}>
                      <option value="PERCENTAGE">Phần trăm (%)</option>
                      <option value="FIXED">Số tiền (VND)</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Giá Trị Giảm{formData.voucherType === "NEWCOMER" && formData.discountType === "PERCENTAGE" ? " (10%-20%)" : ""}</label>
                    <input required type="number"
                      min={formData.voucherType === "NEWCOMER" ? 10 : 1}
                      max={formData.voucherType === "NEWCOMER" && formData.discountType === "PERCENTAGE" ? 20 : undefined}
                      value={formData.discountValue}
                      onChange={e => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                      className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Đơn Tối Thiểu (VND)</label>
                    <input type="number" min="0" value={formData.minOrderValue}
                      onChange={e => setFormData({ ...formData, minOrderValue: Number(e.target.value) })} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Thời Hạn Sử Dụng (Ngày)</label>
                    <input required type="number" min="1" value={formData.validDays}
                      onChange={e => setFormData({ ...formData, validDays: Number(e.target.value) })} className={inp} />
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>{formData.voucherType === "NEWCOMER" ? "Số Khách Đầu Tiên Được Nhận" : "Số Lượng Cấp Phát"}</label>
                    <input required type="number" min="1" value={formData.issueQuantity}
                      onChange={e => setFormData({ ...formData, issueQuantity: Number(e.target.value) })} className={inp} />
                  </div>
                </div>
              </div>

              <div className={`pt-6 border-t flex justify-end gap-3 ${isDark ? "border-white/5" : "border-slate-100"}`}>
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className={`px-6 py-3 rounded-2xl font-semibold transition ${isDark ? "bg-white/5 text-slate-400 hover:bg-white/10" : "text-slate-600 bg-slate-100 hover:bg-slate-200"}`}>
                  Hủy
                </button>
                <button type="submit"
                  className={`px-8 py-3 rounded-2xl text-white font-semibold transition ${formData.voucherType === "NEWCOMER" ? "bg-violet-600 hover:bg-violet-500" : "bg-blue-600 hover:bg-blue-500"}`}>
                  {editingVoucher ? "Lưu Thay Đổi" : "Tạo Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}