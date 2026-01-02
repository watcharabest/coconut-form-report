// src/pages/TablePage.jsx
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ListFilter, Calendar, ArrowUpDown, Filter, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';

export default function TablePage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- State Filter & Sort ---
    const [filterType, setFilterType] = useState('all');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    // --- State สำหรับ Pagination ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

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

    useEffect(() => {
        fetchData();
    }, []);

    // เมื่อมีการเปลี่ยน Filter ให้กลับไปหน้า 1 เสมอ
    useEffect(() => {
        setCurrentPage(1);
    }, [filterType, selectedDate, sortConfig]);

    // --- Logic กรองและเรียง ---
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
            const totalCost = qty * buyPrice;
            const totalRevenue = qty * sellPrice;
            const profit = totalRevenue - totalCost;

            switch (key) {
                case 'date':
                    return new Date(item['วันที่']).getTime();
                case 'qty':
                    return qty;
                case 'buyPrice':
                    return buyPrice;
                case 'sellPrice':
                    return sellPrice;
                case 'totalCost':
                    return totalCost;
                case 'totalRevenue':
                    return totalRevenue;
                case 'profit':
                    return profit;
                default:
                    return 0;
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

    // --- Summary ---
    const summary = useMemo(() => {
        return filteredAndSortedData.reduce((acc, item) => {
            const qty = item['จำนวนขายมะพร้าว'];
            const cost = qty * item['ราคาซื้อมะพร้าว'];
            const rev = qty * item['ราคาขายมะพร้าว'];
            return {
                totalCost: acc.totalCost + cost,
                totalRevenue: acc.totalRevenue + rev,
                totalProfit: acc.totalProfit + (rev - cost)
            };
        }, { totalCost: 0, totalRevenue: 0, totalProfit: 0 });
    }, [filteredAndSortedData]);

    // --- Logic ตัดแบ่งหน้า (Pagination) ---
    const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
    const currentTableData = filteredAndSortedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const formatNumber = (num) => num.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    return (
        <div className="p-4 pb-24 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <ListFilter className="text-green-600" /> รายการสรุปล่าสุด
            </h1>

            {/* Control Bar & Summary */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                    {['all', 'day', 'month', 'year'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                ${filterType === type ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {type === 'all' && 'ทั้งหมด'}
                            {type === 'day' && 'รายวัน'}
                            {type === 'month' && 'รายเดือน'}
                            {type === 'year' && 'รายปี'}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {filterType !== 'all' && (
                            <div className="relative w-full sm:w-auto">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Calendar size={16} className="text-gray-500" />
                                </div>
                                <input
                                    type={filterType === 'year' ? "number" : (filterType === 'month' ? "month" : "date")}
                                    value={filterType === 'year' ? selectedDate.split('-')[0] : (filterType === 'month' ? selectedDate.slice(0, 7) : selectedDate)}
                                    onChange={(e) => {
                                        let val = e.target.value;
                                        if (filterType === 'year') val = `${val}-01-01`;
                                        if (filterType === 'month') val = `${val}-01`;
                                        setSelectedDate(val);
                                    }}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <ArrowUpDown size={16} className="text-gray-500" />
                        <select
                            value={`${sortConfig.key}-${sortConfig.direction}`}
                            onChange={(e) => {
                                const [key, direction] = e.target.value.split('-');
                                setSortConfig({ key, direction });
                            }}
                            className="w-full sm:w-auto p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
                        >
                            <option value="date-desc">วันที่ (ใหม่ล่าสุด)</option>
                            <option value="date-asc">วันที่ (เก่าสุด)</option>
                            <option value="qty-desc">จำนวนขาย (มากไปน้อย)</option>
                            <option value="qty-asc">จำนวนขาย (น้อยไปมาก)</option>
                            <option value="buyPrice-desc">ราคาซื้อ (มากไปน้อย)</option>
                            <option value="buyPrice-asc">ราคาซื้อ (น้อยไปมาก)</option>
                            <option value="sellPrice-desc">ราคาขาย (มากไปน้อย)</option>
                            <option value="sellPrice-asc">ราคาขาย (น้อยไปมาก)</option>
                            <option value="totalCost-desc">รวมต้นทุน (มากไปน้อย)</option>
                            <option value="totalCost-asc">รวมต้นทุน (น้อยไปมาก)</option>
                            <option value="totalRevenue-desc">รวมยอดขาย (มากไปน้อย)</option>
                            <option value="totalRevenue-asc">รวมยอดขาย (น้อยไปมาก)</option>
                            <option value="profit-desc">กำไร (มากไปน้อย)</option>
                            <option value="profit-asc">กำไร (น้อยไปมาก)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-green-50 p-3 rounded-lg border border-green-100">
                    <div className="text-center">
                        <div className="text-xs text-gray-500">รายการ</div>
                        <div className="font-bold text-gray-800">{filteredAndSortedData.length}</div>
                    </div>
                    <div className="text-center border-l border-green-200">
                        <div className="text-xs text-gray-500">ยอดขายรวม</div>
                        <div className="font-bold text-blue-600">{formatNumber(summary.totalRevenue)}</div>
                    </div>
                    <div className="text-center border-l border-green-200">
                        <div className="text-xs text-gray-500">กำไรสุทธิ</div>
                        <div className={`font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatNumber(summary.totalProfit)}
                        </div>
                    </div>
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
                                    <th
                                        className="p-3 w-24 cursor-pointer"
                                        onClick={() => requestSort('date')}
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            วันที่
                                            {sortConfig.key === 'date' && (
                                                sortConfig.direction === 'asc'
                                                    ? <ChevronUp size={14} />
                                                    : <ChevronDown size={14} />
                                            )}
                                        </span>
                                    </th>
                                    <th className="p-3 text-right cursor-pointer"
                                        onClick={() => requestSort('qty')}>
                                        <span className="inline-flex items-center gap-1">
                                            จำนวนขาย
                                            {sortConfig.key === 'qty' && (
                                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                            )}
                                        </span>
                                    </th>
                                    <th className="p-3 text-right cursor-pointer"
                                        onClick={() => requestSort('buyPrice')}>
                                        <span className="inline-flex items-center gap-1">
                                            ราคาซื้อ
                                            {sortConfig.key === 'buyPrice' && (
                                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                            )}
                                        </span>
                                    </th>
                                    <th className="p-3 text-right cursor-pointer"
                                        onClick={() => requestSort('sellPrice')}>
                                        <span className="inline-flex items-center gap-1">
                                            ราคาขาย
                                            {sortConfig.key === 'sellPrice' && (
                                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                            )}
                                        </span>
                                    </th>
                                    <th className="p-3 text-right cursor-pointer"
                                        onClick={() => requestSort('totalCost')}>
                                            <span className="inline-flex items-center gap-1">
                                                รวมต้นทุน
                                                {sortConfig.key === 'totalCost' && (
                                                    sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                )}
                                            </span>
                                    </th>
                                    <th className="p-3 text-right cursor-pointer"
                                        onClick={() => requestSort('totalRevenue')}>
                                        <span className="inline-flex items-center gap-1">
                                            รวมยอดขาย
                                            {sortConfig.key === 'totalRevenue' && (
                                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                            )}
                                        </span>
                                    </th>
                                    <th className="p-3 text-right cursor-pointer"
                                        onClick={() => requestSort('profit')}>
                                        <span className="inline-flex items-center gap-1">
                                            กำไร
                                            {sortConfig.key === 'profit' && (
                                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                            )}
                                        </span>
                                    </th>
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
                                        <tr key={item._id} className={`transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}>
                                            <td className="p-3 font-medium text-gray-700 whitespace-nowrap">
                                                {new Date(item['วันที่']).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                                            </td>
                                            <td className="p-3 text-right text-gray-600">{formatNumber(qty)}</td>
                                            <td className="p-3 text-right text-gray-600">{formatNumber(buyPrice)}</td>
                                            <td className="p-3 text-right text-gray-600">{formatNumber(sellPrice)}</td>
                                            <td className="p-3 text-right text-red-600 font-medium">{formatNumber(totalCost)}</td>
                                            <td className="p-3 text-right text-blue-600 font-medium">{formatNumber(totalRevenue)}</td>
                                            <td className={`p-3 text-right font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {profit >= 0 ? '+' : ''}{formatNumber(profit)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {filteredAndSortedData.length === 0 ? (
                        <div className="p-10 text-center text-gray-400">
                            <Filter className="mx-auto h-8 w-8 text-gray-300 mb-2" /> ไม่พบข้อมูล
                        </div>
                    ) : (
                        <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} /> ก่อนหน้า
                            </button>

                            <span className="text-sm text-gray-600 font-medium">
                                หน้า {currentPage} จาก {totalPages}
                            </span>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ถัดไป <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}