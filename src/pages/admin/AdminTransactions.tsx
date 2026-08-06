import React, { useState, useRef, useEffect } from 'react';
import {
  Search, Filter, Eye, Download, RefreshCw, CreditCard,
  Building2, User, CheckCircle2, Clock, XCircle,
  FileText, DollarSign, ChevronLeft, ChevronRight, PawPrint, X,
  ChevronDown, Check, Layers, Tag, RotateCcw, FileSpreadsheet
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminService, AdminTransactionResponse } from '../../services/admin.service';
import { useTheme } from '../../contexts/ThemeContext';
import { format, parseISO } from 'date-fns';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import XLSX from 'xlsx-js-style';

function getStatusBadge(status: string, isDark: boolean) {
  const s = status ? status.toUpperCase() : 'PENDING';
  if (s === 'SUCCESS' || s === 'COMPLETED' || s === 'PAID') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
        isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      }`}>
        <CheckCircle2 size={12} /> Thành công
      </span>
    );
  }
  if (s === 'PENDING' || s === 'PROCESSING' || s === 'WAITING') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
        isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
      }`}>
        <Clock size={12} /> Đang xử lý
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
      isDark ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-700 border border-rose-200'
    }`}>
      <XCircle size={12} /> Thất bại / Hủy
    </span>
  );
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'WALLET_CREDIT': return 'Nạp ví / Doanh thu';
    case 'BOOKING_PAYMENT': return 'Thanh toán Booking';
    case 'WITHDRAWAL': return 'Rút tiền';
    case 'REFUND': return 'Hoàn tiền';
    default: return type || 'Giao dịch';
  }
}

function getPaymentMethodLabel(method?: string) {
  if (!method) return 'PAYOS (Thanh toán 100% online)';
  const m = method.toUpperCase();
  switch (m) {
    case 'PAYOS':
    case 'MOCK':
      return 'PAYOS (Thanh toán 100% online)';
    case 'CASH_DEPOSIT':
    case 'CASH':
      return 'CASH_DEPOSIT (Đặt cọc online, thanh toán tại quầy)';
    default:
      return method;
  }
}

// ─── Custom Sleek Dropdown Component ──────────────────────────────────────────
interface SelectOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

function CustomSelect({
  label,
  value,
  options,
  onChange,
  isDark,
  icon: HeaderIcon
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (val: string) => void;
  isDark: boolean;
  icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 shadow-sm ${
          isOpen
            ? 'ring-2 ring-indigo-500/20 border-indigo-500 bg-indigo-50/10'
            : isDark
            ? 'bg-slate-800/90 border-slate-700 hover:bg-slate-800 text-white'
            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{HeaderIcon}</span>
          <span className="truncate max-w-[140px]">{selectedOption.label}</span>
        </div>
        <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`} />
      </button>

      {isOpen && (
        <div className={`absolute right-0 sm:right-auto sm:left-0 mt-2 w-56 rounded-2xl border shadow-2xl z-40 py-2 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
          isDark ? 'bg-slate-900/95 border-slate-800 text-slate-200' : 'bg-white/95 border-slate-100 text-slate-800'
        }`}>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/60 mb-1 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-[9px] font-normal text-slate-500">{options.length} tùy chọn</span>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold'
                      : isDark
                      ? 'hover:bg-slate-800 text-slate-300'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {opt.icon}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminTransactions() {
  const { isDark } = useTheme();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [shopFilter, setShopFilter] = useState('');
  const [selectedTx, setSelectedTx] = useState<AdminTransactionResponse | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Load Paged Transactions
  const { data: pagedData, isLoading, refetch } = useQuery({
    queryKey: ['admin-transactions', page, search, statusFilter, typeFilter, shopFilter],
    queryFn: () => adminService.getAllTransactions({
      page,
      size: 10,
      search: search.trim() || undefined,
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      shopId: shopFilter ? Number(shopFilter) : undefined
    }),
    staleTime: 1000 * 30,
  });

  // Load active Shops list for filter
  const { data: shopsPaged } = useQuery({
    queryKey: ['admin-shops-filter'],
    queryFn: () => adminService.getShopsPaged(0),
  });

  const transactions = pagedData?.content || [];
  const totalElements = pagedData?.totalElements || 0;
  const totalPages = pagedData?.totalPages || 1;

  // Stats calculation
  const totalAmountOnPage = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  const successCountOnPage = transactions.filter(t => t.status === 'SUCCESS' || t.status === 'PAID').length;

  const handleExportPDF = async () => {
    const element = document.getElementById('admin-receipt-modal-content');
    if (!element) return;
    try {
      setIsExportingPDF(true);
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `Bien-Lai-Giao-Dich-${selectedTx?.payosOrderCode || selectedTx?.id}.png`;
      link.click();
      toast.success('Tải biên lai giao dịch thành công!');
    } catch (err) {
      toast.error('Có lỗi xảy ra khi tải biên lai.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = () => {
    if (!transactions || transactions.length === 0) {
      toast.error('Không có dữ liệu giao dịch để xuất file Excel.');
      return;
    }

    try {
      const exportTime = format(new Date(), 'dd/MM/yyyy HH:mm:ss');
      const ws: any = {};

      const setCell = (r: number, c: number, v: any, style: any = {}, numFmt?: string) => {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const isNum = typeof v === 'number';
        const cell: any = { v, t: isNum ? 'n' : 's', s: style };
        if (numFmt) cell.z = numFmt;
        ws[cellRef] = cell;
      };

      const titleStyle = {
        font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: '1A2B4C' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      };

      const metaStyle = {
        font: { name: 'Calibri', sz: 9, italic: true, color: { rgb: '64748B' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      };

      const headerStyle = {
        fill: { fgColor: { rgb: '1A2B4C' } },
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'medium', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '334155' } },
          right: { style: 'thin', color: { rgb: '334155' } }
        }
      };

      const thinBorder = {
        top: { style: 'thin', color: { rgb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } }
      };

      const getRowBg = (idx: number) => (idx % 2 === 0 ? 'FFFFFF' : 'F8FAFC');

      // 1. Header Information
      setCell(0, 0, 'PETEYE SYSTEM — BÁO CÁO & BẢNG KÊ CHI TIẾT GIAO DỊCH', titleStyle);
      setCell(1, 0, `Thời gian xuất: ${exportTime} | Người xuất: Admin PetEye System`, metaStyle);
      setCell(2, 0, `Bộ lọc: Tìm kiếm="${search || 'Tất cả'}" | Trạng thái="${statusFilter || 'Tất cả'}" | Loại="${typeFilter || 'Tất cả'}" | Shop="${shopFilter || 'Tất cả'}"`, metaStyle);

      // 2. Table Headers
      const headers = [
        'STT',
        'Mã Giao Dịch',
        'Thời Gian Thanh Toán',
        'Cửa Hàng (Shop)',
        'Tên Khách Hàng',
        'Email Khách Hàng',
        'Số Tiền (VNĐ)',
        'Phương Thức',
        'Loại Giao Dịch',
        'Trạng Thái',
        'Nội Dung Giao Dịch'
      ];

      headers.forEach((h, colIdx) => {
        setCell(4, colIdx, h, headerStyle);
      });

      // 3. Data Rows
      let currentRow = 5;
      transactions.forEach((tx, idx) => {
        const bg = getRowBg(idx);

        const cellCenter = {
          fill: { fgColor: { rgb: bg } },
          font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder
        };

        const cellCode = {
          fill: { fgColor: { rgb: bg } },
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '1E293B' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder
        };

        const cellLeft = {
          fill: { fgColor: { rgb: bg } },
          font: { name: 'Calibri', sz: 10, color: { rgb: '334155' } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: thinBorder
        };

        const cellAmount = {
          fill: { fgColor: { rgb: bg } },
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '059669' } },
          alignment: { horizontal: 'right', vertical: 'center' },
          border: thinBorder
        };

        const s = tx.status ? tx.status.toUpperCase() : 'PENDING';
        let statusStyle = cellCenter;
        if (s === 'SUCCESS' || s === 'COMPLETED' || s === 'PAID') {
          statusStyle = {
            fill: { fgColor: { rgb: 'DEF7EC' } },
            font: { name: 'Calibri', sz: 9, bold: true, color: { rgb: '03543F' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: thinBorder
          };
        } else if (s === 'PENDING' || s === 'PROCESSING' || s === 'WAITING') {
          statusStyle = {
            fill: { fgColor: { rgb: 'FEF3C7' } },
            font: { name: 'Calibri', sz: 9, bold: true, color: { rgb: '92400E' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: thinBorder
          };
        } else {
          statusStyle = {
            fill: { fgColor: { rgb: 'FDE8E8' } },
            font: { name: 'Calibri', sz: 9, bold: true, color: { rgb: '9B1C1C' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: thinBorder
          };
        }

        const code = tx.payosOrderCode ? `PAYOS-${tx.payosOrderCode}` : `TXN-${tx.id}`;
        const timeStr = format(parseISO(tx.completedAt || tx.createdAt), 'dd/MM/yyyy HH:mm:ss');
        const shop = tx.shopName || 'Hệ thống PetEye';
        const customer = tx.customerName || 'Khách hàng';
        const email = tx.customerEmail || '—';
        const amount = tx.amount || 0;
        const method = getPaymentMethodLabel(tx.paymentMethod);
        const type = getTypeLabel(tx.type);
        const statusText = s === 'SUCCESS' || s === 'PAID' ? 'Thành công' : s === 'PENDING' ? 'Đang xử lý' : 'Thất bại / Hủy';
        const desc = tx.description || `Thanh toán dịch vụ #${tx.id}`;

        setCell(currentRow, 0, idx + 1, cellCenter);
        setCell(currentRow, 1, code, cellCode);
        setCell(currentRow, 2, timeStr, cellCenter);
        setCell(currentRow, 3, shop, cellLeft);
        setCell(currentRow, 4, customer, cellLeft);
        setCell(currentRow, 5, email, cellLeft);
        setCell(currentRow, 6, amount, cellAmount, '#,##0"đ"');
        setCell(currentRow, 7, method, cellCenter);
        setCell(currentRow, 8, type, cellLeft);
        setCell(currentRow, 9, statusText, statusStyle);
        setCell(currentRow, 10, desc, cellLeft);

        currentRow++;
      });

      // 4. Summary Row
      currentRow++;
      const totalSum = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);

      const summaryLabelStyle = {
        fill: { fgColor: { rgb: 'E2E8F0' } },
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0F172A' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'medium', color: { rgb: '0F172A' } },
          bottom: { style: 'double', color: { rgb: '0F172A' } },
          left: thinBorder.left,
          right: thinBorder.right
        }
      };

      const summaryAmountStyle = {
        fill: { fgColor: { rgb: 'D1FAE5' } },
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '065F46' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: {
          top: { style: 'medium', color: { rgb: '0F172A' } },
          bottom: { style: 'double', color: { rgb: '0F172A' } },
          left: thinBorder.left,
          right: thinBorder.right
        }
      };

      setCell(currentRow, 0, 'TỔNG CỘNG', summaryLabelStyle);
      for (let c = 1; c <= 5; c++) setCell(currentRow, c, '', summaryLabelStyle);
      setCell(currentRow, 6, totalSum, summaryAmountStyle, '#,##0"đ"');
      for (let c = 7; c <= 9; c++) setCell(currentRow, c, '', summaryLabelStyle);
      setCell(currentRow, 10, `Tổng số: ${transactions.length} giao dịch đối soát`, summaryLabelStyle);

      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRow, c: 10 } });
      ws['!cols'] = [
        { wch: 8 },  // STT
        { wch: 24 }, // Mã GD
        { wch: 22 }, // Thời gian
        { wch: 30 }, // Cửa hàng
        { wch: 26 }, // Khách hàng
        { wch: 32 }, // Email
        { wch: 20 }, // Số tiền
        { wch: 18 }, // Phương thức
        { wch: 25 }, // Loại GD
        { wch: 20 }, // Trạng thái
        { wch: 52 }  // Nội dung
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, ws, 'Danh Sách Giao Dịch');

      const fileName = `Bao_Cao_Giao_Dich_PetEye_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success('Xuất file Excel báo cáo đẹp mắt thành công!');
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi xuất file Excel.');
    }
  };

  // Status Filter Options
  const statusOptions: SelectOption[] = [
    { label: 'Trạng thái: Tất cả', value: '', icon: <Layers size={13} /> },
    { label: 'Thành công (SUCCESS)', value: 'SUCCESS', icon: <CheckCircle2 size={13} className="text-emerald-500" /> },
    { label: 'Đang xử lý (PENDING)', value: 'PENDING', icon: <Clock size={13} className="text-amber-500" /> },
    { label: 'Thất bại / Hủy (FAILED)', value: 'FAILED', icon: <XCircle size={13} className="text-rose-500" /> },
  ];

  // Type Filter Options
  const typeOptions: SelectOption[] = [
    { label: 'Loại: Tất cả', value: '', icon: <Tag size={13} /> },
    { label: 'Nạp ví / Doanh thu', value: 'WALLET_CREDIT', icon: <DollarSign size={13} className="text-emerald-500" /> },
    { label: 'Thanh toán Booking', value: 'BOOKING_PAYMENT', icon: <CreditCard size={13} className="text-blue-500" /> },
    { label: 'Rút tiền', value: 'WITHDRAWAL', icon: <Building2 size={13} className="text-purple-500" /> },
  ];

  // Shop Filter Options
  const shopOptions: SelectOption[] = [
    { label: 'Shop: Tất cả', value: '', icon: <Building2 size={13} /> },
    ...(shopsPaged?.content || []).map(s => ({
      label: s.shopName,
      value: s.id.toString(),
      icon: <Building2 size={13} className="text-indigo-500" />
    }))
  ];

  const hasActiveFilter = !!(search || statusFilter || typeFilter || shopFilter);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setShopFilter('');
    setPage(1);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Quản lý Giao dịch
          </h1>
          <p className={`text-sm mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Truy vết, kiểm tra và xuất biên lai giao dịch của các Cửa hàng trên toàn hệ thống
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md hover:shadow-lg active:scale-95"
            title="Xuất danh sách giao dịch ra file Excel chuẩn định dạng"
          >
            <FileSpreadsheet size={15} />
            Xuất Excel
          </button>

          <button
            onClick={() => refetch()}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all border ${
              isDark ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tổng số giao dịch</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <CreditCard size={18} />
            </div>
          </div>
          <p className={`text-2xl font-black mt-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalElements.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1">Toàn bộ trên hệ thống</p>
        </div>

        <div className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Giá trị trên trang</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <DollarSign size={18} />
            </div>
          </div>
          <p className={`text-2xl font-black mt-3 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{totalAmountOnPage.toLocaleString()}đ</p>
          <p className="text-[11px] text-slate-400 mt-1">10 giao dịch hiện tại</p>
        </div>

        <div className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Thành công (trang)</span>
            <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className={`text-2xl font-black mt-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>{successCountOnPage} / {transactions.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Giao dịch đã xác thực</p>
        </div>

        <div className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Số trang hiện tại</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
              <FileText size={18} />
            </div>
          </div>
          <p className={`text-2xl font-black mt-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>{page} / {totalPages}</p>
          <p className="text-[11px] text-slate-400 mt-1">Trang hiện tại</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center gap-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <input
            type="text"
            placeholder="Tìm theo Mã GD, Tên khách hàng, Email, Nội dung..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium transition-colors border ${
              isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
            }`}
          />
        </div>

        {/* Custom Sleek Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          <CustomSelect
            label="Trạng thái giao dịch"
            value={statusFilter}
            options={statusOptions}
            onChange={(val) => { setStatusFilter(val); setPage(1); }}
            isDark={isDark}
            icon={<Filter size={13} />}
          />

          <CustomSelect
            label="Loại giao dịch"
            value={typeFilter}
            options={typeOptions}
            onChange={(val) => { setTypeFilter(val); setPage(1); }}
            isDark={isDark}
            icon={<Tag size={13} />}
          />

          <CustomSelect
            label="Cửa hàng (Shop)"
            value={shopFilter}
            options={shopOptions}
            onChange={(val) => { setShopFilter(val); setPage(1); }}
            isDark={isDark}
            icon={<Building2 size={13} />}
          />

          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className={`p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
              }`}
              title="Đặt lại bộ lọc"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b text-[11px] uppercase font-bold tracking-wider ${
                isDark ? 'bg-slate-800/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-3.5 px-4">Mã Giao Dịch</th>
                <th className="py-3.5 px-4">Cửa hàng (Shop)</th>
                <th className="py-3.5 px-4">Khách hàng</th>
                <th className="py-3.5 px-4">Số tiền</th>
                <th className="py-3.5 px-4">Phương thức</th>
                <th className="py-3.5 px-4">Loại</th>
                <th className="py-3.5 px-4">Nội dung chuyển khoản</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <RefreshCw className="animate-spin mx-auto mb-2" size={20} />
                    Đang tải dữ liệu giao dịch...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    Không tìm thấy giao dịch nào phù hợp.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    {/* Mã GD */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {tx.payosOrderCode ? `PAYOS-${tx.payosOrderCode}` : `TXN-${tx.id}`}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5" title="Thời gian thanh toán">
                        {format(parseISO(tx.completedAt || tx.createdAt), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </td>

                    {/* Shop */}
                    <td className="py-3.5 px-4 font-semibold">
                      <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                        <Building2 size={13} />
                        <span>{tx.shopName || 'Hệ thống / PetEye'}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {tx.customerName || 'Khách hàng'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {tx.customerEmail || '—'}
                      </p>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4">
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        +{(tx.amount || 0).toLocaleString()}đ
                      </span>
                    </td>

                    {/* Method */}
                    <td className="py-3.5 px-4 font-bold text-[11px] text-slate-700 dark:text-slate-300">
                      {getPaymentMethodLabel(tx.paymentMethod)}
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 font-medium text-[11px]">
                      {getTypeLabel(tx.type)}
                    </td>

                    {/* Description / Nội dung chuyển khoản */}
                    <td className="py-3.5 px-4 font-medium text-[11px]">
                      <span className="truncate max-w-[220px] block font-mono text-[11px] text-slate-600 dark:text-slate-300" title={tx.description || `Thanh toán dịch vụ #${tx.bookingId || tx.id}`}>
                        {tx.description || `Thanh toán dịch vụ #${tx.bookingId || tx.id}`}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(tx.status, isDark)}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                        title="Xem biên lai & thông tin chi tiết"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className={`px-4 py-3 border-t flex items-center justify-between text-xs ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <span>Hiển thị {transactions.length} trên tổng số {totalElements} giao dịch</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-slate-900 dark:text-white px-2">Trang {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal View & Export PDF Receipt */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
            isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'
          }`}>
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Chi tiết giao dịch đối soát</h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Receipt printable area */}
            <div className="flex-1 overflow-y-auto p-6">
              <div id="admin-receipt-modal-content" className="p-6 bg-white rounded-2xl border border-slate-200 text-slate-900 space-y-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-[#1a2b4c] rounded-full flex items-center justify-center mx-auto mb-2 shadow-md">
                    <PawPrint className="text-white" size={24} fill="white" />
                  </div>
                  <h2 className="text-lg font-black text-[#1a2b4c] uppercase tracking-wider">PetEye System</h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Biên lai xác nhận giao dịch</p>

                  <p className="text-xs text-slate-500 mt-4 font-medium">Số tiền giao dịch</p>
                  <h1 className="text-3xl font-black text-[#1a2b4c] my-1">
                    {(selectedTx.amount || 0).toLocaleString()}đ
                  </h1>
                  <div className="inline-block px-3 py-0.5 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                    Thành công (SUCCESS)
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-4 space-y-3 text-xs">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-slate-500">Mã giao dịch</span>
                    <span className="font-bold text-[#1a2b4c] text-right break-all">
                      {selectedTx.payosOrderCode ? `PAYOS-${selectedTx.payosOrderCode}` : `TXN-${selectedTx.id}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-slate-500">Thời gian thanh toán</span>
                    <span className="font-bold text-[#1a2b4c] text-right">
                      {format(parseISO(selectedTx.completedAt || selectedTx.createdAt), "dd/MM/yyyy HH:mm:ss")}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-slate-500">Cửa hàng (Shop)</span>
                    <span className="font-bold text-[#1a2b4c] text-right uppercase">
                      {selectedTx.shopName || 'Hệ thống PetEye'}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-slate-500">Khách hàng</span>
                    <span className="font-bold text-[#1a2b4c] text-right">
                      {selectedTx.customerName || 'Khách hàng'}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-slate-500">Email</span>
                    <span className="font-bold text-[#1a2b4c] text-right">
                      {selectedTx.customerEmail || 'N/A'}
                    </span>
                  </div>
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-500">Phương thức</span>
                      <span className="font-bold text-[#1a2b4c] text-right">
                        {getPaymentMethodLabel(selectedTx.paymentMethod)}
                      </span>
                    </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-slate-500">Loại giao dịch</span>
                    <span className="font-bold text-[#1a2b4c] text-right">
                      {getTypeLabel(selectedTx.type)}
                    </span>
                  </div>
                  {selectedTx.serviceName && (
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-500">Dịch vụ</span>
                      <span className="font-bold text-[#1a2b4c] text-right">
                        {selectedTx.serviceName}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-slate-500">Nội dung</span>
                    <span className="font-bold text-[#1a2b4c] text-right">
                      {selectedTx.description || `Thanh toán dịch vụ PetEye #${selectedTx.id}`}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 text-center text-[9px] text-slate-400">
                  <p>Hệ thống Quản trị PetEye Admin - Biên lai tự động xác thực</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={() => setSelectedTx(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className="flex-1 py-2.5 rounded-xl bg-[#1a2b4c] hover:bg-[#111d33] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
              >
                <Download size={14} />
                {isExportingPDF ? 'Đang xuất...' : 'Tải Biên Lai'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
