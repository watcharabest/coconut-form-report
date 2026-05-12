// src/pages/TablePage.jsx
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { ListFilter, Calendar, ArrowUpDown, Filter, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Pencil, Trash2 } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function TablePage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalItem, setModalItem] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({ date: '', purchasePrice: '', soldQuantity: '', sellPrice: '' });
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        try {
            const response = await axios.get('/api/transactions');
            setData(response.data);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { setCurrentPage(1); }, [filterType, selectedDate, sortConfig]);

    const filteredAndSortedData = useMemo(() => {
        let result = [...data];
        if (filterType !== 'all') {
            result = result.filter(item => {
                const itemDate = new Date(item['วันที่']);
                const targetDate = new Date(selectedDate);
                if (filterType === 'day') return itemDate.toDateString() === targetDate.toDateString();
                if (filterType === 'month') return itemDate.getMonth() === targetDate.getMonth() && itemDate.getFullYear() === targetDate.getFullYear();
                if (filterType === 'year') return itemDate.getFullYear() === targetDate.getFullYear();
                return true;
            });
        }
        const getSortValue = (item, key) => {
            const qty = item['จำนวนขายมะพร้าว'];
            const buyPrice = item['ราคาซื้อมะพร้าว'];
            const sellPrice = item['ราคาขายมะพร้าว'];
            switch (key) {
                case 'date': return new Date(item['วันที่']).getTime();
                case 'qty': return qty;
                case 'buyPrice': return buyPrice;
                case 'sellPrice': return sellPrice;
                case 'totalCost': return qty * buyPrice;
                case 'totalRevenue': return qty * sellPrice;
                case 'profit': return (qty * sellPrice) - (qty * buyPrice);
                default: return 0;
            }
        };
        result.sort((a, b) => {
            const valueA = getSortValue(a, sortConfig.key);
            const valueB = getSortValue(b, sortConfig.key);
            const dir = sortConfig.direction === 'asc' ? 1 : -1;
            if (valueA === valueB) return 0;
            return valueA > valueB ? dir : -dir;
        });
        return result;
    }, [data, filterType, selectedDate, sortConfig]);

    const requestSort = (key) => {
        setSortConfig((prev) => {
            if (prev.key !== key) return { key, direction: 'desc' };
            return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        });
    };

    const summary = useMemo(() => {
        return filteredAndSortedData.reduce((acc, item) => {
            const qty = item['จำนวนขายมะพร้าว'];
            const cost = qty * item['ราคาซื้อมะพร้าว'];
            const rev = qty * item['ราคาขายมะพร้าว'];
            return { totalCost: acc.totalCost + cost, totalRevenue: acc.totalRevenue + rev, totalProfit: acc.totalProfit + (rev - cost) };
        }, { totalCost: 0, totalRevenue: 0, totalProfit: 0 });
    }, [filteredAndSortedData]);

    const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
    const currentTableData = filteredAndSortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const formatNumber = (num) => (num || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    // --- Modal handlers ---
    const openModal = (item) => {
        setModalItem(item);
        setEditMode(false);
        setEditForm({
            date: new Date(item['วันที่']).toISOString().split('T')[0],
            purchasePrice: item['ราคาซื้อมะพร้าว'],
            soldQuantity: item['จำนวนขายมะพร้าว'],
            sellPrice: item['ราคาขายมะพร้าว'],
        });
        setModalOpen(true);
    };

    const closeModal = () => { setModalOpen(false); setModalItem(null); setEditMode(false); };

    const handleUpdate = async () => {
        setSaving(true);
        try {
            const payload = {
                _id: modalItem._id,
                'วันที่': editForm.date,
                'ราคาซื้อมะพร้าว': parseFloat(editForm.purchasePrice),
                'จำนวนขายมะพร้าว': parseFloat(editForm.soldQuantity),
                'ราคาขายมะพร้าว': parseFloat(editForm.sellPrice),
            };
            await axios.put('/api/transactions', payload);
            await Swal.fire({ title: 'แก้ไขสำเร็จ!', icon: 'success', confirmButtonColor: '#16a34a', timer: 1500 });
            closeModal();
            fetchData();
        } catch (error) {
            Swal.fire({ title: 'เกิดข้อผิดพลาด', text: error.message, icon: 'error', confirmButtonColor: '#d33' });
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ?',
            text: 'ข้อมูลนี้จะถูกลบถาวร',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'ลบเลย',
            cancelButtonText: 'ยกเลิก',
        });
        if (!result.isConfirmed) return;
        setSaving(true);
        try {
            await axios.delete('/api/transactions', { data: { _id: modalItem._id } });
            await Swal.fire({ title: 'ลบสำเร็จ!', icon: 'success', confirmButtonColor: '#16a34a', timer: 1500 });
            closeModal();
            fetchData();
        } catch (error) {
            Swal.fire({ title: 'เกิดข้อผิดพลาด', text: error.message, icon: 'error', confirmButtonColor: '#d33' });
        } finally { setSaving(false); }
    };

    const SortIcon = ({ col }) => sortConfig.key === col ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null;

    return (
        <div className="p-4 pb-24 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <ListFilter className="text-green-600" /> รายการสรุปล่าสุด
            </h1>

            {/* Control Bar & Summary */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                    {['all', 'day', 'month', 'year'].map((type) => (
                        <button key={type} onClick={() => setFilterType(type)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${filterType === type ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {type === 'all' && 'ทั้งหมด'}{type === 'day' && 'รายวัน'}{type === 'month' && 'รายเดือน'}{type === 'year' && 'รายปี'}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {filterType !== 'all' && (
                            <div className="relative w-full sm:w-auto">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar size={16} className="text-gray-500" /></div>
                                <DatePicker selected={selectedDate} onChange={(date) => setSelectedDate(date)} locale="th"
                                    dateFormat={filterType === 'year' ? "yyyy" : (filterType === 'month' ? "MM/yyyy" : "dd/MM/yyyy")}
                                    showYearPicker={filterType === 'year'} showMonthYearPicker={filterType === 'month'}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-green-500 cursor-pointer" />
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <ArrowUpDown size={16} className="text-gray-500" />
                        <select value={`${sortConfig.key}-${sortConfig.direction}`}
                            onChange={(e) => { const [key, direction] = e.target.value.split('-'); setSortConfig({ key, direction }); }}
                            className="w-full sm:w-auto p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white">
                            <option value="date-desc">วันที่ (ใหม่ล่าสุด)</option>
                            <option value="date-asc">วันที่ (เก่าสุด)</option>
                            <option value="qty-desc">จำนวนขาย (มากไปน้อย)</option>
                            <option value="qty-asc">จำนวนขาย (น้อยไปมาก)</option>
                            <option value="profit-desc">กำไร (มากไปน้อย)</option>
                            <option value="profit-asc">กำไร (น้อยไปมาก)</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-green-50 p-3 rounded-lg border border-green-100">
                    <div className="text-center"><div className="text-xs text-gray-500">รายการ</div><div className="font-bold text-gray-800">{filteredAndSortedData.length}</div></div>
                    <div className="text-center border-l border-green-200"><div className="text-xs text-gray-500">ยอดขายรวม</div><div className="font-bold text-blue-600">{formatNumber(summary.totalRevenue)}</div></div>
                    <div className="text-center border-l border-green-200"><div className="text-xs text-gray-500">กำไรสุทธิ</div><div className={`font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatNumber(summary.totalProfit)}</div></div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center mt-10 text-gray-500"><span className="animate-pulse">กำลังโหลดข้อมูล...</span></div>
            ) : (
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[600px]">
                            <thead className="bg-gray-200 text-gray-900 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="p-3 w-24 cursor-pointer" onClick={() => requestSort('date')}><span className="inline-flex items-center gap-1">วันที่ <SortIcon col="date" /></span></th>
                                    <th className="p-3 text-right cursor-pointer" onClick={() => requestSort('qty')}><span className="inline-flex items-center gap-1">จำนวนขาย <SortIcon col="qty" /></span></th>
                                    <th className="p-3 text-right cursor-pointer" onClick={() => requestSort('buyPrice')}><span className="inline-flex items-center gap-1">ราคาซื้อ <SortIcon col="buyPrice" /></span></th>
                                    <th className="p-3 text-right cursor-pointer" onClick={() => requestSort('sellPrice')}><span className="inline-flex items-center gap-1">ราคาขาย <SortIcon col="sellPrice" /></span></th>
                                    <th className="p-3 text-right cursor-pointer" onClick={() => requestSort('totalCost')}><span className="inline-flex items-center gap-1">รวมต้นทุน <SortIcon col="totalCost" /></span></th>
                                    <th className="p-3 text-right cursor-pointer" onClick={() => requestSort('totalRevenue')}><span className="inline-flex items-center gap-1">รวมยอดขาย <SortIcon col="totalRevenue" /></span></th>
                                    <th className="p-3 text-right cursor-pointer" onClick={() => requestSort('profit')}><span className="inline-flex items-center gap-1">กำไร <SortIcon col="profit" /></span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {currentTableData.map((item, index) => {
                                    const qty = item['จำนวนขายมะพร้าว'];
                                    const buyPrice = item['ราคาซื้อมะพร้าว'];
                                    const sellPrice = item['ราคาขายมะพร้าว'];
                                    const totalCost = qty * buyPrice;
                                    const totalRevenue = qty * sellPrice;
                                    const profit = totalRevenue - totalCost;
                                    return (
                                        <tr key={item._id} onClick={() => openModal(item)}
                                            className={`transition-colors cursor-pointer ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 active:bg-green-100`}>
                                            <td className="p-3 font-medium text-gray-700 whitespace-nowrap">{new Date(item['วันที่']).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                                            <td className="p-3 text-right text-gray-600">{formatNumber(qty)}</td>
                                            <td className="p-3 text-right text-gray-600">{formatNumber(buyPrice)}</td>
                                            <td className="p-3 text-right text-gray-600">{formatNumber(sellPrice)}</td>
                                            <td className="p-3 text-right text-red-600 font-medium">{formatNumber(totalCost)}</td>
                                            <td className="p-3 text-right text-blue-600 font-medium">{formatNumber(totalRevenue)}</td>
                                            <td className={`p-3 text-right font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{profit >= 0 ? '+' : ''}{formatNumber(profit)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {filteredAndSortedData.length === 0 ? (
                        <div className="p-10 text-center text-gray-400"><Filter className="mx-auto h-8 w-8 text-gray-300 mb-2" /> ไม่พบข้อมูล</div>
                    ) : (
                        <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                                <ChevronLeft size={16} /> ก่อนหน้า
                            </button>
                            <span className="text-sm text-gray-600 font-medium">หน้า {currentPage} จาก {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                                ถัดไป <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ===== MODAL ===== */}
            {modalOpen && modalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    {/* Modal Content */}
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeInUp_0.25s_ease-out]" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                            <h2 className="text-lg font-bold text-gray-800">{editMode ? 'แก้ไขรายการ' : 'รายละเอียด'}</h2>
                            <button onClick={closeModal} className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"><X size={20} className="text-gray-500" /></button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">
                            {editMode ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
                                        <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ราคาซื้อมะพร้าว (บาท)</label>
                                        <input type="number" step="0.1" value={editForm.purchasePrice} onChange={(e) => setEditForm({ ...editForm, purchasePrice: e.target.value })}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนขาย (ลูก)</label>
                                        <input type="number" value={editForm.soldQuantity} onChange={(e) => setEditForm({ ...editForm, soldQuantity: e.target.value })}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ราคาขายมะพร้าว (บาท)</label>
                                        <input type="number" step="0.1" value={editForm.sellPrice} onChange={(e) => setEditForm({ ...editForm, sellPrice: e.target.value })}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <span className="text-gray-500 text-sm">วันที่</span>
                                        <span className="font-semibold text-gray-800">{new Date(modalItem['วันที่']).toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <span className="text-gray-500 text-sm">ราคาซื้อ</span>
                                        <span className="font-semibold text-gray-800">{formatNumber(modalItem['ราคาซื้อมะพร้าว'])} บาท</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <span className="text-gray-500 text-sm">จำนวนขาย</span>
                                        <span className="font-semibold text-gray-800">{formatNumber(modalItem['จำนวนขายมะพร้าว'])} ลูก</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <span className="text-gray-500 text-sm">ราคาขาย</span>
                                        <span className="font-semibold text-gray-800">{formatNumber(modalItem['ราคาขายมะพร้าว'])} บาท</span>
                                    </div>
                                    {(() => {
                                        const q = modalItem['จำนวนขายมะพร้าว'];
                                        const profit = (q * modalItem['ราคาขายมะพร้าว']) - (q * modalItem['ราคาซื้อมะพร้าว']);
                                        return (
                                            <div className={`flex justify-between items-center py-3 px-4 rounded-lg ${profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                                                <span className="text-gray-600 text-sm font-medium">กำไร</span>
                                                <span className={`font-bold text-lg ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{profit >= 0 ? '+' : ''}{formatNumber(profit)} บาท</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-5 border-t border-gray-100 bg-gray-50">
                            {editMode ? (
                                <div className="flex gap-3">
                                    <button onClick={() => setEditMode(false)} disabled={saving}
                                        className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">ยกเลิก</button>
                                    <button onClick={handleUpdate} disabled={saving}
                                        className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                        {saving ? 'กำลังบันทึก...' : <><Pencil size={16} /> บันทึก</>}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <button onClick={() => setEditMode(true)}
                                        className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center justify-center gap-2">
                                        <Pencil size={16} /> แก้ไข
                                    </button>
                                    <button onClick={handleDelete} disabled={saving}
                                        className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                        <Trash2 size={16} /> ลบ
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal animation keyframe */}
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}