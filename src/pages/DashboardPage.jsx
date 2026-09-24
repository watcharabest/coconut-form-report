// src/pages/DashboardPage.jsx
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, LabelList
} from 'recharts';
import { LayoutDashboard, TrendingUp, TrendingDown, DollarSign, Package, Filter, Trophy, AlertTriangle, Sparkles, Target, CheckCircle2, Award } from 'lucide-react';

export default function DashboardPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState('All');

    const thaiMonths = [
        { id: 1, name: 'มกราคม' }, { id: 2, name: 'กุมภาพันธ์' }, { id: 3, name: 'มีนาคม' },
        { id: 4, name: 'เมษายน' }, { id: 5, name: 'พฤษภาคม' }, { id: 6, name: 'มิถุนายน' },
        { id: 7, name: 'กรกฎาคม' }, { id: 8, name: 'สิงหาคม' }, { id: 9, name: 'กันยายน' },
        { id: 10, name: 'ตุลาคม' }, { id: 11, name: 'พฤศจิกายน' }, { id: 12, name: 'ธันวาคม' }
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('/api/transactions');
                const sortedData = response.data.sort((a, b) => new Date(a['วันที่']) - new Date(b['วันที่']));
                setData(sortedData);
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatK = (num) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
        return num;
    };

    const availableYears = useMemo(() => {
        const currentYearNum = new Date().getFullYear();
        const years = [...new Set(data.map(item => new Date(item['วันที่']).getFullYear()))];
        if (!years.includes(currentYearNum)) {
            years.push(currentYearNum);
        }
        return years.sort((a, b) => b - a);
    }, [data]);

    const filteredData = useMemo(() => {
        return data.filter(item => {
            const date = new Date(item['วันที่']);
            const matchYear = selectedYear === 'All' || date.getFullYear() === parseInt(selectedYear);
            const matchMonth = selectedMonth === 'All' || (date.getMonth() + 1) === parseInt(selectedMonth);
            return matchYear && matchMonth;
        });
    }, [data, selectedYear, selectedMonth]);

    // --- กราฟเส้น Price Trend ---
    const lineChartData = useMemo(() => {
        return filteredData.map(item => ({
            date: new Date(item['วันที่']).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }),
            fullDate: new Date(item['วันที่']).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: '2-digit' }),
            buyPrice: item['ราคาซื้อมะพร้าว'],
            sellPrice: item['ราคาขายมะพร้าว'],
            profitPerUnit: item['ราคาขายมะพร้าว'] - item['ราคาซื้อมะพร้าว']
        }));
    }, [filteredData]);

    // --- กราฟแท่งรายเดือน ---
    const monthlyData = useMemo(() => {
        const grouped = {};
        filteredData.forEach(item => {
            const date = new Date(item['วันที่']);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            const monthName = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
            if (!grouped[monthKey]) {
                grouped[monthKey] = { name: monthName, totalQty: 0, totalCost: 0, totalRevenue: 0, netProfit: 0, rawSort: date.getTime() };
            }
            const qty = item['จำนวนขายมะพร้าว'];
            const cost = qty * item['ราคาซื้อมะพร้าว'];
            const revenue = qty * item['ราคาขายมะพร้าว'];
            grouped[monthKey].totalQty += qty;
            grouped[monthKey].totalCost += cost;
            grouped[monthKey].totalRevenue += revenue;
            grouped[monthKey].netProfit += (revenue - cost);
        });
        return Object.values(grouped).sort((a, b) => a.rawSort - b.rawSort);
    }, [filteredData]);

    // --- KPI Summary ---
    const summary = useMemo(() => {
        const totalRevenue = filteredData.reduce((acc, item) => acc + (item['จำนวนขายมะพร้าว'] * item['ราคาขายมะพร้าว']), 0);
        const totalCost = filteredData.reduce((acc, item) => acc + (item['จำนวนขายมะพร้าว'] * item['ราคาซื้อมะพร้าว']), 0);
        const totalProfit = totalRevenue - totalCost;
        const totalQty = filteredData.reduce((acc, item) => acc + item['จำนวนขายมะพร้าว'], 0);
        const avgProfitPerUnit = totalQty > 0 ? totalProfit / totalQty : 0;
        const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        return { totalRevenue, totalProfit, totalQty, avgProfitPerUnit, marginPct };
    }, [filteredData]);

    // --- สรุปภาพรวมเชิงบวก & หมุดหมายความสำเร็จ ---
    const positiveInsight = useMemo(() => {
        const { totalQty, totalProfit, marginPct, avgProfitPerUnit } = summary;

        // ระบุรอบเป้าหมาย (สปรินต์ประจำเดือน หรือเป้าหมายประจำปี)
        const currentMonthObj = selectedMonth !== 'All'
            ? thaiMonths.find(m => m.id === parseInt(selectedMonth))
            : null;
        const targetPeriodLabel = currentMonthObj
            ? `ประจำเดือน${currentMonthObj.name}`
            : (selectedYear !== 'All' ? `ประจำปี ${parseInt(selectedYear) + 543}` : 'ภาพรวม');

        if (totalQty === 0) {
            return {
                title: 'พร้อมเริ่มต้นบันทึกผลประกอบการ',
                subtitle: `เริ่มต้นบันทึกรายการขาย${targetPeriodLabel} เพื่อติดตามการเติบโตของธุรกิจ`,
                badges: [],
                targetPeriodLabel,
                nextTarget: selectedMonth !== 'All' ? 500 : 2000,
                progress: 0,
                remaining: selectedMonth !== 'All' ? 500 : 2000,
                totalQty: 0,
            };
        }

        // ข้อความไฮไลต์เชิงบวกตามผลงานที่โดดเด่น
        let title = 'การดำเนินงานมีความก้าวหน้าที่มั่นคง';
        let subtitle = `ยอดขายและผลประกอบการ${targetPeriodLabel} ขับเคลื่อนธุรกิจไปข้างหน้าอย่างต่อเนื่อง`;

        if (marginPct >= 35) {
            title = 'ประสิทธิภาพการบริหารต้นทุนยอดเยี่ยม';
            subtitle = `ทำกำไรเฉลี่ยได้ถึง ฿${avgProfitPerUnit.toFixed(1)} ต่อลูก คิดเป็นอัตรากำไร ${marginPct.toFixed(1)}%`;
        } else if (totalQty >= 2000) {
            title = 'ยอดกระจายผลผลิตคึกคักอย่างโดดเด่น';
            subtitle = `ส่งมอบผลผลิตไปแล้วถึง ${totalQty.toLocaleString('th-TH')} ลูก สร้างการหมุนเวียนต่อเนื่อง`;
        } else if (totalProfit > 0) {
            title = 'สร้างผลกำไรสุทธิได้อย่างต่อเนื่อง';
            subtitle = `สะสมกำไรสุทธิในรอบนี้รวม ฿${totalProfit.toLocaleString('th-TH')} จากความมุ่งมั่นในทุกขั้นตอน`;
        }

        // เหรียญความสำเร็จเชิงบวก (แสดงเฉพาะเมื่อผ่านเกณฑ์ ไม่มีการติดลบ)
        const badges = [];
        if (marginPct >= 30) {
            badges.push({ id: 'margin', label: 'บริหารกำไรดีเยี่ยม', desc: `Margin ${marginPct.toFixed(1)}%` });
        }
        if (totalQty >= (selectedMonth !== 'All' ? 300 : 1000)) {
            badges.push({ id: 'volume', label: 'ผลผลิตทะลุเป้า', desc: `${totalQty.toLocaleString('th-TH')} ลูก` });
        }
        if (totalProfit > 0) {
            badges.push({ id: 'profit', label: 'ผลประกอบการเป็นบวก', desc: 'กำไรสุทธิเติบโต' });
        }
        if (avgProfitPerUnit >= 5) {
            badges.push({ id: 'unitProfit', label: 'มูลค่าต่อหน่วยสูง', desc: `฿${avgProfitPerUnit.toFixed(1)}/ลูก` });
        }

        // บันไดเป้าหมายระยะสั้น (Short-term Sprint Steps)
        const sprintSteps = selectedMonth !== 'All'
            ? [300, 500, 800, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000]
            : [1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 50000];

        const nextTarget = sprintSteps.find(step => step > totalQty)
            || (Math.ceil(totalQty / (selectedMonth !== 'All' ? 1000 : 5000)) + 1) * (selectedMonth !== 'All' ? 1000 : 5000);
        const prevTarget = sprintSteps.filter(step => step <= totalQty).pop() || 0;
        const progress = Math.min(100, Math.max(5, Math.round(((totalQty - prevTarget) / (nextTarget - prevTarget)) * 100)));
        const remaining = Math.max(0, nextTarget - totalQty);

        return {
            title,
            subtitle,
            badges,
            targetPeriodLabel,
            nextTarget,
            progress,
            remaining,
            totalQty,
        };
    }, [summary, selectedMonth, selectedYear]);

    // --- วันขายดีที่สุด ---
    const bestWorstDays = useMemo(() => {
        // กรองข้อมูลตั้งแต่เมษายน 68 (ค.ศ. 2025) เป็นต้นไป
        const validData = filteredData.filter(item => new Date(item['วันที่']) >= new Date('2025-04-01'));
        if (validData.length === 0) return null;
        const dailyMap = {};
        validData.forEach(item => {
            const dateKey = new Date(item['วันที่']).toDateString();
            const dateTH = new Date(item['วันที่']).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
            if (!dailyMap[dateKey]) dailyMap[dateKey] = { dateTH, qty: 0, profit: 0 };
            const qty = item['จำนวนขายมะพร้าว'];
            dailyMap[dateKey].qty += qty;
            dailyMap[dateKey].profit += (qty * item['ราคาขายมะพร้าว']) - (qty * item['ราคาซื้อมะพร้าว']);
        });
        const days = Object.values(dailyMap);
        const best = days.reduce((a, b) => a.profit > b.profit ? a : b);
        return { best };
    }, [filteredData]);

    // --- เดือนทำสถิติสูงสุด ---
    const bestMonth = useMemo(() => {
        if (monthlyData.length === 0) return null;
        return monthlyData.reduce((a, b) => a.netProfit > b.netProfit ? a : b);
    }, [monthlyData]);

    // --- Profit Margin % รายเดือน ---
    const marginData = useMemo(() => {
        return monthlyData.map(m => ({
            name: m.name,
            margin: m.totalRevenue > 0 ? parseFloat(((m.netProfit / m.totalRevenue) * 100).toFixed(1)) : 0,
            avgProfitPerUnit: m.totalQty > 0 ? parseFloat((m.netProfit / m.totalQty).toFixed(1)) : 0,
        }));
    }, [monthlyData]);

    const formatNumber = (num) => (num || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 });
    const formatDecimal = (num) => (num || 0).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    if (loading) return <div className="p-10 text-center text-gray-500">กำลังโหลด Dashboard...</div>;

    return (
        <div className="p-4 pb-24 max-w-5xl mx-auto space-y-4">

            {/* Header & Filters */}
            <div className="flex flex-col gap-3">
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <LayoutDashboard className="text-green-600" size={22} /> ภาพรวมธุรกิจ
                </h1>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                    <Filter size={16} className="text-gray-500 ml-1" />
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
                        className="text-sm border-none focus:ring-0 text-gray-700 font-medium cursor-pointer outline-none bg-transparent flex-1">
                        <option value="All">ทุกปี</option>
                        {availableYears.map(year => (<option key={year} value={year}>{year + 543}</option>))}
                    </select>
                    <span className="text-gray-300">|</span>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                        className="text-sm border-none focus:ring-0 text-gray-700 font-medium cursor-pointer outline-none bg-transparent flex-1">
                        <option value="All">ทุกเดือน</option>
                        {thaiMonths.map(month => (<option key={month.id} value={month.id}>{month.name}</option>))}
                    </select>
                </div>
            </div>

            {/* --- KPI Cards (2x2 grid for mobile) --- */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                    <p className="text-xs text-gray-500 mb-1">กำไรสุทธิ</p>
                    <h3 className="text-lg font-bold text-green-600">฿{formatNumber(summary.totalProfit)}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                    <p className="text-xs text-gray-500 mb-1">รายได้รวม</p>
                    <h3 className="text-lg font-bold text-blue-600">฿{formatNumber(summary.totalRevenue)}</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                    <p className="text-xs text-gray-500 mb-1">ขายได้</p>
                    <h3 className="text-lg font-bold text-orange-600">{formatNumber(summary.totalQty)} ลูก</h3>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100">
                    <p className="text-xs text-gray-500 mb-1">กำไรเฉลี่ย/ลูก</p>
                    <h3 className="text-lg font-bold text-purple-600">฿{formatDecimal(summary.avgProfitPerUnit)}</h3>
                </div>
            </div>

            {/* --- บล็อกข้อความเชิงบวกและหมุดหมายความสำเร็จ --- */}
            {positiveInsight && (
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-4 rounded-xl shadow-sm border border-emerald-200">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                            <Sparkles size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-600 text-white tracking-wide">
                                    ไฮไลต์ผลงาน
                                </span>
                            </div>
                            <h2 className="text-sm font-bold text-gray-800 leading-snug">
                                {positiveInsight.title}
                            </h2>
                            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                                {positiveInsight.subtitle}
                            </p>
                        </div>
                    </div>

                    {/* รายการเหรียญความสำเร็จ */}
                    {positiveInsight.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3 pt-2.5 border-t border-emerald-100/80">
                            {positiveInsight.badges.map(b => (
                                <span
                                    key={b.id}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-white text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-200 shadow-xs"
                                >
                                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                    <span>{b.label}</span>
                                    <span className="text-emerald-600 font-semibold text-[10px]">({b.desc})</span>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* แถบวัดความก้าวหน้าสู่เป้าหมายระยะสั้น */}
                    <div className="bg-white/90 backdrop-blur-xs p-3 rounded-lg border border-emerald-100 shadow-2xs">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                                <Target size={14} className="text-emerald-600" />
                                เป้าหมาย{positiveInsight.targetPeriodLabel} {formatNumber(positiveInsight.nextTarget)} ลูก
                            </span>
                            <span className="text-xs font-semibold text-emerald-700">
                                ขาดอีก {formatNumber(positiveInsight.remaining)} ลูก
                            </span>
                        </div>
                        <div className="w-full bg-emerald-100/70 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${positiveInsight.progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1.5">
                            <span>ยอดในรอบนี้: {formatNumber(positiveInsight.totalQty)} ลูก</span>
                            <span>{positiveInsight.progress}% สู่หมุดหมายถัดไป</span>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Motivation Cards (วันขายดีสุด + เดือนปังสุด) --- */}
            <div className="grid grid-cols-2 gap-3">
                {bestWorstDays && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                        <div className="flex items-center gap-1 mb-2">
                            <Trophy size={14} className="text-green-600" />
                            <p className="text-xs font-semibold text-green-700">วันขายดีสุด</p>
                        </div>
                        <p className="text-sm font-bold text-gray-800">{bestWorstDays.best.dateTH}</p>
                        <p className="text-xs text-gray-600">{formatNumber(bestWorstDays.best.qty)} ลูก</p>
                        <p className="text-xs text-gray-600">กำไร ฿{formatNumber(bestWorstDays.best.profit)}</p>
                    </div>
                )}
                {bestMonth && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                        <div className="flex items-center gap-1 mb-2">
                            <TrendingUp size={14} className="text-purple-600" />
                            <p className="text-xs font-semibold text-purple-700">เดือนขายดีสุด</p>
                        </div>
                        <p className="text-sm font-bold text-gray-800">{bestMonth.name}</p>
                        <p className="text-xs text-gray-600">{formatNumber(bestMonth.totalQty)} ลูก</p>
                        <p className="text-xs text-gray-600">กำไร ฿{formatNumber(bestMonth.netProfit)}</p>
                    </div>
                )}
            </div>

            {/* --- กราฟสรุปยอดรายเดือน --- */}
            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                <h2 className="text-sm font-bold text-gray-700 mb-3">
                    สรุปยอด {selectedYear === 'All' ? 'ทุกปี' : `ปี ${parseInt(selectedYear) + 543}`}
                    {selectedMonth !== 'All' && ` เดือน${thaiMonths.find(m => m.id == selectedMonth)?.name}`}
                </h2>
                <div className="h-[280px] w-full text-xs min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthlyData} margin={{ top: 20, right: 0, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" tick={{ fontSize: 10 }} />
                            <YAxis yAxisId="right" orientation="right" stroke="#ff7300" tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(value, name) => [formatNumber(value), name]} labelStyle={{ color: '#333' }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar yAxisId="left" dataKey="totalCost" name="ต้นทุน" fill="#fca5a5" radius={[4, 4, 0, 0]} barSize={16}>
                                <LabelList dataKey="totalCost" position="top" formatter={formatK} fill="#9ca3af" fontSize={9} />
                            </Bar>
                            <Bar yAxisId="left" dataKey="netProfit" name="กำไร" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={16}>
                                <LabelList dataKey="netProfit" position="top" formatter={formatK} fill="#16a34a" fontSize={9} fontWeight="bold" />
                            </Bar>
                            <Area yAxisId="right" type="monotone" dataKey="totalQty" name="จำนวน (ลูก)" fill="#ffedd5" stroke="#f97316" strokeWidth={2}>
                                <LabelList dataKey="totalQty" position="top" formatter={formatK} fill="#f97316" fontSize={9} offset={10} />
                            </Area>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* --- กราฟ Profit Margin % รายเดือน --- */}
            {marginData.length > 1 && (
                <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                    <h2 className="text-sm font-bold text-gray-700 mb-1">% Profit Margin & กำไร/ลูก รายเดือน</h2>
                    <p className="text-xs text-gray-400 mb-3">ดูว่าต้นทุนกินกำไรมากขึ้นไหม</p>
                    <div className="h-[220px] w-full text-xs min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={marginData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10 }} unit="%" />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit="฿" />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar yAxisId="left" dataKey="margin" name="Margin %" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={8}>
                                    <LabelList dataKey="margin" position="top" fontSize={9} fill="#8b5cf6" formatter={(v) => `${v}%`} />
                                </Bar>
                                <Line yAxisId="right" type="monotone" dataKey="avgProfitPerUnit" name="กำไร/ลูก (฿)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* --- กราฟเส้นแนวโน้มราคา --- */}
            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                <h2 className="text-sm font-bold text-gray-700 mb-3">แนวโน้มราคาซื้อ-ขาย</h2>
                <div className="h-[250px] w-full text-xs min-w-0">
                    <ResponsiveContainer>
                        <LineChart data={lineChartData} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                            <Tooltip labelFormatter={(label, payload) => payload[0]?.payload.fullDate || label} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line type="monotone" dataKey="sellPrice" name="ราคาขาย" stroke="#16a34a" strokeWidth={1} dot={{ r: 0 }} />
                            <Line type="monotone" dataKey="buyPrice" name="ราคาซื้อ" stroke="#ef4444" strokeWidth={1} dot={{ r: 0 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
}