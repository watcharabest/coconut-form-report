// src/pages/DashboardPage.jsx
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area
} from 'recharts';
import { LayoutDashboard, TrendingUp, DollarSign, Package, Filter } from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState([]); // ข้อมูลดิบทั้งหมด
  const [loading, setLoading] = useState(true);

  // State สำหรับ Filter
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');

  // รายชื่อเดือนภาษาไทย
  const thaiMonths = [
    { id: 1, name: 'มกราคม' }, { id: 2, name: 'กุมภาพันธ์' }, { id: 3, name: 'มีนาคม' },
    { id: 4, name: 'เมษายน' }, { id: 5, name: 'พฤษภาคม' }, { id: 6, name: 'มิถุนายน' },
    { id: 7, name: 'กรกฎาคม' }, { id: 8, name: 'สิงหาคม' }, { id: 9, name: 'กันยายน' },
    { id: 10, name: 'ตุลาคม' }, { id: 11, name: 'พฤศจิกายน' }, { id: 12, name: 'ธันวาคม' }
  ];

  // ดึงข้อมูล
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/api/transactions');
        // เรียงข้อมูลตามวันที่ (เก่า -> ใหม่)
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

  // --- 0. เตรียมข้อมูลสำหรับ Dropdown เลือกปี (ดึงจากข้อมูลจริง) ---
  const availableYears = useMemo(() => {
    const years = [...new Set(data.map(item => new Date(item['วันที่']).getFullYear()))];
    return years.sort((a, b) => b - a); // เรียงปีล่าสุดขึ้นก่อน
  }, [data]);

  // --- 1. กรองข้อมูล (Filter Logic) ---
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const date = new Date(item['วันที่']);
      const itemYear = date.getFullYear();
      const itemMonth = date.getMonth() + 1; // getMonth() ได้ 0-11 ต้อง +1

      const matchYear = selectedYear === 'All' || itemYear === parseInt(selectedYear);
      const matchMonth = selectedMonth === 'All' || itemMonth === parseInt(selectedMonth);

      return matchYear && matchMonth;
    });
  }, [data, selectedYear, selectedMonth]);

  // --- 2. เตรียมข้อมูลกราฟเส้น (Price Trend) จากข้อมูลที่กรองแล้ว ---
  const lineChartData = useMemo(() => {
    return filteredData.map(item => ({
      date: new Date(item['วันที่']).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
      fullDate: new Date(item['วันที่']).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: '2-digit' }),
      buyPrice: item['ราคาซื้อมะพร้าว'],
      sellPrice: item['ราคาขายมะพร้าว'],
      profitPerUnit: item['ราคาขายมะพร้าว'] - item['ราคาซื้อมะพร้าว']
    }));
  }, [filteredData]);

  // --- 3. เตรียมข้อมูลกราฟแท่งรายเดือน (Monthly Stats) จากข้อมูลที่กรองแล้ว ---
  const monthlyData = useMemo(() => {
    const grouped = {};

    filteredData.forEach(item => {
      const date = new Date(item['วันที่']);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`; 
      const monthName = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });

      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          name: monthName,
          totalQty: 0,
          totalCost: 0,
          totalRevenue: 0,
          netProfit: 0,
          rawSort: date.getTime()
        };
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

  // --- 4. คำนวณตัวเลขสรุป (KPI Cards) จากข้อมูลที่กรองแล้ว ---
  const summary = useMemo(() => {
    const totalRevenue = filteredData.reduce((acc, item) => acc + (item['จำนวนขายมะพร้าว'] * item['ราคาขายมะพร้าว']), 0);
    const totalCost = filteredData.reduce((acc, item) => acc + (item['จำนวนขายมะพร้าว'] * item['ราคาซื้อมะพร้าว']), 0);
    const totalProfit = totalRevenue - totalCost;
    const totalQty = filteredData.reduce((acc, item) => acc + item['จำนวนขายมะพร้าว'], 0);

    return { totalRevenue, totalProfit, totalQty };
  }, [filteredData]);

  const formatNumber = (num) => num.toLocaleString('th-TH', { maximumFractionDigits: 0 });

  if (loading) return <div className="p-10 text-center text-gray-500">กำลังโหลด Dashboard...</div>;

  return (
    <div className="p-4 pb-24 max-w-5xl mx-auto space-y-6">
      
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <LayoutDashboard className="text-green-600" /> ภาพรวมธุรกิจ
        </h1>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
            <Filter size={18} className="text-gray-500 ml-2" />
            
            {/* เลือกปี */}
            <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-sm border-none focus:ring-0 text-gray-700 font-medium cursor-pointer outline-none bg-transparent"
            >
                <option value="All">ทุกปี</option>
                {availableYears.map(year => (
                    <option key={year} value={year}>{year + 543}</option> // แสดงปี พ.ศ.
                ))}
            </select>
            
            <span className="text-gray-300">|</span>

            {/* เลือกเดือน */}
            <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-sm border-none focus:ring-0 text-gray-700 font-medium cursor-pointer outline-none bg-transparent"
            >
                <option value="All">ทุกเดือน</option>
                {thaiMonths.map(month => (
                    <option key={month.id} value={month.id}>{month.name}</option>
                ))}
            </select>
        </div>
      </div>

      {/* --- Section 1: KPI Cards (สรุปตัวเลขตาม Filter) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-green-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">กำไรสุทธิ</p>
            <h3 className="text-2xl font-bold text-green-600">฿{formatNumber(summary.totalProfit)}</h3>
          </div>
          <div className="bg-green-100 p-3 rounded-full text-green-600"><TrendingUp size={24} /></div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">รายได้รวม</p>
            <h3 className="text-2xl font-bold text-blue-600">฿{formatNumber(summary.totalRevenue)}</h3>
          </div>
          <div className="bg-blue-100 p-3 rounded-full text-blue-600"><DollarSign size={24} /></div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-orange-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">ขายได้ (ลูก)</p>
            <h3 className="text-2xl font-bold text-orange-600">{formatNumber(summary.totalQty)}</h3>
          </div>
          <div className="bg-orange-100 p-3 rounded-full text-orange-600"><Package size={24} /></div>
        </div>
      </div>

      {/* --- Section 2: Monthly Performance --- */}
      <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
        <h2 className="text-lg font-bold text-gray-700 mb-4">
            สรุปยอด {selectedYear === 'All' ? 'ทุกปี' : `ปี ${parseInt(selectedYear)+543}`} 
            {selectedMonth !== 'All' && ` เดือน${thaiMonths.find(m => m.id == selectedMonth)?.name}`}
        </h2>
        <div className="h-[350px] w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: 'บาท', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" stroke="#ff7300" label={{ value: 'ลูก', angle: 90, position: 'insideRight' }} />
              <Tooltip 
                 formatter={(value, name) => [formatNumber(value), name === 'totalQty' ? 'จำนวน (ลูก)' : (name === 'totalCost' ? 'ต้นทุน (บาท)' : 'กำไร (บาท)')]}
                 labelStyle={{ color: '#333' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="totalCost" name="รวมต้นทุน" fill="#fca5a5" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar yAxisId="left" dataKey="netProfit" name="กำไรสุทธิ" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={20} />
              <Area yAxisId="right" type="monotone" dataKey="totalQty" name="จำนวนขาย (ลูก)" fill="#ffedd5" stroke="#f97316" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- Section 3: Price Trend --- */}
      <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
        <h2 className="text-lg font-bold text-gray-700 mb-4">แนวโน้มราคาซื้อ-ขาย</h2>
        <div className="h-[300px] w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis domain={['auto', 'auto']} /> 
              <Tooltip labelFormatter={(label, payload) => payload[0]?.payload.fullDate || label} />
              <Legend />
              <Line type="monotone" dataKey="sellPrice" name="ราคาขาย" stroke="#16a34a" strokeWidth={1} dot={{ r: 0 }} />
              <Line type="monotone" dataKey="buyPrice" name="ราคาซื้อ" stroke="#ef4444" strokeWidth={1} dot={{ r: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}