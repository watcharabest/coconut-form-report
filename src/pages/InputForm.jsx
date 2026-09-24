// src/pages/InputForm.jsx
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Save, Sparkles, Target, TrendingUp, CheckCircle2, Award } from 'lucide-react';
import Swal from 'sweetalert2';
import confetti from 'canvas-confetti';
import { calculateMonthlyTiers } from '../lib/milestoneAnalytics';

export default function InputForm() {
  // ตั้งค่าเริ่มต้น (วันที่ = วันนี้)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0], // format YYYY-MM-DD
    purchasePrice: '',
    soldQuantity: '',
    sellPrice: 50
  });

  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get('/api/transactions');
      setTransactions(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const tierData = useMemo(() => {
    return calculateMonthlyTiers(transactions, currentYear, currentMonth);
  }, [transactions, currentYear, currentMonth]);

  // ฟังก์ชันเปลี่ยนค่าในฟอร์ม
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // คำนวณกำไรสดขณะกรอก
  const purchaseNum = parseFloat(form.purchasePrice);
  const qtyNum = parseFloat(form.soldQuantity);
  const sellNum = parseFloat(form.sellPrice);

  const isFormCalculable = !isNaN(purchaseNum) && !isNaN(qtyNum) && !isNaN(sellNum) && qtyNum > 0;
  const estimatedRevenue = isFormCalculable ? qtyNum * sellNum : 0;
  const estimatedCost = isFormCalculable ? qtyNum * purchaseNum : 0;
  const estimatedProfit = isFormCalculable ? estimatedRevenue - estimatedCost : 0;
  const estimatedProfitPerUnit = isFormCalculable ? (estimatedProfit / qtyNum) : 0;
  const estimatedMargin = isFormCalculable && estimatedRevenue > 0 ? (estimatedProfit / estimatedRevenue) * 100 : 0;

  let cheerMessage = 'ช่วยขับเคลื่อนผลประกอบการให้เติบโตต่อเนื่อง';
  if (estimatedProfitPerUnit >= 5) {
    cheerMessage = 'อัตรากำไรต่อหน่วยอยู่ในเกณฑ์ยอดเยี่ยม คุ้มค่าการส่งมอบ';
  } else if (qtyNum >= 500) {
    cheerMessage = 'ปริมาณส่งมอบรอบนี้สูง ช่วยเพิ่มการหมุนเวียนผลผลิต';
  } else if (estimatedProfit > 0) {
    cheerMessage = 'สร้างผลกำไรสุทธิเพิ่มขึ้นอย่างมั่นคง';
  }

  // ฟังก์ชันกดบันทึก
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // แปลงข้อมูลให้ตรงกับชื่อใน Database (ภาษาไทย)
      const payload = {
        'วันที่': form.date,
        'ราคาซื้อมะพร้าว': parseFloat(form.purchasePrice),
        'จำนวนขายมะพร้าว': parseFloat(form.soldQuantity),
        'ราคาขายมะพร้าว': parseFloat(form.sellPrice)
      };

      // ยิง API
      await axios.post('/api/transactions', payload);

      // จุดพลุกระดาษฉลอง
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#16a34a', '#10b981', '#34d399', '#ffffff'],
        zIndex: 3000
      });

      // คำนวณกำไรและยอดขายของรายการนี้
      const profit = (payload['ราคาขายมะพร้าว'] - payload['ราคาซื้อมะพร้าว']) * payload['จำนวนขายมะพร้าว'];
      const qty = payload['จำนวนขายมะพร้าว'];

      // ตรวจสอบว่ารายการนี้ช่วยปลดล็อกระดับขั้นใหม่หรือไม่
      const priorQty = tierData.currentQty;
      const newTotalQty = priorQty + qty;
      const unlockedTier = tierData.tiers.find(t => priorQty < t.target && newTotalQty >= t.target);

      // แจ้งเตือนความสำเร็จด้วย SweetAlert2
      await Swal.fire({
        title: 'บันทึกสำเร็จ',
        html: `
          <div style="margin-top: 10px; font-family: inherit;">
            <p style="color: #6b7280; font-size: 13px; margin-bottom: 4px;">สร้างผลกำไรในรายการนี้</p>
            <p style="font-size: 2.2rem; font-weight: 800; color: #16a34a; line-height: 1.2; margin-bottom: 12px;">
              +฿${profit.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
            </p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 12px; text-align: left;">
              <p style="color: #166534; font-size: 13px; font-weight: 600; margin: 0 0 4px 0;">
                ${unlockedTier ? `พิชิต${unlockedTier.label} สำเร็จเรียบร้อย` : 'ความก้าวหน้าสู่เป้าหมาย'}
              </p>
              <p style="color: #374151; font-size: 12px; margin: 0;">
                สะสมผลผลิตเพิ่ม +${qty.toLocaleString('th-TH')} ลูก (ยอดรวมเดือนนี้: ${newTotalQty.toLocaleString('th-TH')} ลูก)
              </p>
            </div>
          </div>
        `,
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#16a34a',
      });

      // ล้างค่าฟอร์ม
      setForm({
        date: new Date().toISOString().split('T')[0],
        purchasePrice: '',
        soldQuantity: '',
        sellPrice: 50
      });

      // รีเฟรชข้อมูลเพื่ออัปเดตสถิติ Tiers ทันที
      fetchTransactions();

    } catch (error) {
      console.error(error);

      // แจ้งเตือน Error ด้วย SweetAlert2
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'บันทึกข้อมูลไม่สำเร็จ',
        icon: 'error',
        confirmButtonText: 'ลองใหม่',
        confirmButtonColor: '#d33'
      });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 pb-24 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-700 mb-4 text-center">
        บันทึกรายการใหม่
      </h1>

      {/* การ์ดสรุปเป้าหมาย 3 ระดับของเดือนนี้ */}
      <div className="mb-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="flex items-center gap-1.5 font-bold text-gray-800">
            <Target size={14} className="text-emerald-600" />
            เป้าหมาย{tierData.periodLabel}
          </span>
          <span className="text-[11px] text-gray-500 font-medium">
            สะสมแล้ว: <strong className="text-emerald-700 font-bold">{tierData.currentQty.toLocaleString('th-TH')}</strong> ลูก
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {tierData.tiers.map((t) => {
            const isCurrentActive = tierData.activeTier.id === t.id && !tierData.allCompleted;
            return (
              <div
                key={t.id}
                className={`p-2 rounded-lg border text-center transition-all ${
                  t.achieved
                    ? 'bg-emerald-100/60 border-emerald-300 text-emerald-900'
                    : isCurrentActive
                    ? 'bg-white border-teal-500 ring-1 ring-teal-200 shadow-2xs'
                    : 'bg-white/50 border-gray-200 text-gray-400'
                }`}
              >
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold">
                  {t.achieved ? (
                    <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                  ) : (
                    <span className={`w-1.5 h-1.5 rounded-full ${isCurrentActive ? 'bg-teal-500 animate-pulse' : 'bg-gray-300'}`} />
                  )}
                  <span className={t.achieved ? 'text-emerald-800' : isCurrentActive ? 'text-teal-700' : 'text-gray-500'}>
                    {t.label}
                  </span>
                </div>
                <p className={`text-[11px] font-extrabold mt-0.5 ${t.achieved ? 'text-emerald-700' : isCurrentActive ? 'text-gray-800' : 'text-gray-500'}`}>
                  {t.target.toLocaleString('th-TH')} ลูก
                </p>
                <span className={`inline-block text-[8px] px-1 py-0.5 rounded font-medium mt-0.5 ${
                  t.achieved
                    ? 'bg-emerald-200/60 text-emerald-800'
                    : isCurrentActive
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {t.achieved ? 'สำเร็จแล้ว' : isCurrentActive ? 'กำลังมุ่งสู่' : 'ถัดไป'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* 1. วันที่ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full py-3 indent-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
            required
          />
        </div>

        {/* 2. ราคาซื้อมะพร้าว */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ราคาซื้อมะพร้าว (บาท)</label>
          <input
            type="number"
            name="purchasePrice"
            value={form.purchasePrice}
            onChange={handleChange}
            step="0.1"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            required
          />
        </div>

        {/* 3. จำนวนขายมะพร้าว */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนขาย (ลูก)</label>
          <input
            type="number"
            name="soldQuantity"
            value={form.soldQuantity}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            required
          />
        </div>

        {/* 4. ราคาขายมะพร้าว */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ราคาขายมะพร้าว (บาท)</label>
          <input
            type="number"
            name="sellPrice"
            value={form.sellPrice}
            onChange={handleChange}
            step="0.1"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            required
          />
        </div>

        {/* การ์ดคำนวณกำไรสดขณะกรอก */}
        {isFormCalculable && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-4 rounded-xl border border-emerald-200 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <Sparkles size={14} className="text-emerald-600" />
                คาดการณ์ผลตอบแทนรายการนี้
              </span>
              <span className={`text-base font-bold ${estimatedProfit >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {estimatedProfit >= 0 ? '+' : ''}฿{estimatedProfit.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-emerald-100">
              <span>กำไรเฉลี่ย: ฿{estimatedProfitPerUnit.toFixed(1)} / ลูก</span>
              <span className="font-semibold text-emerald-700">Margin {estimatedMargin.toFixed(1)}%</span>
            </div>

            <p className="text-xs text-emerald-700 mt-2 font-medium">
              {cheerMessage}
            </p>

            <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-2 pt-2 border-t border-emerald-100/70">
              <Target size={13} className="text-emerald-600 shrink-0" />
              <span>
                {tierData.allCompleted ? (
                  <>เพิ่มยอดทะลุเป้าโบนัส +{qtyNum.toLocaleString('th-TH')} ลูก (รวมเป็น {(tierData.currentQty + qtyNum).toLocaleString('th-TH')} ลูก)</>
                ) : (
                  <>เพิ่มยอดสู่{tierData.activeTier.label} +{qtyNum.toLocaleString('th-TH')} ลูก (สะสมรวม {(tierData.currentQty + qtyNum).toLocaleString('th-TH')} / {tierData.activeTier.target.toLocaleString('th-TH')} ลูก)</>
                )}
              </span>
            </div>
          </div>
        )}

        {/* ปุ่มบันทึก */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 bg-green-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? 'กำลังบันทึก...' : (
            <>
              <Save size={20} /> บันทึกข้อมูล
            </>
          )}
        </button>

      </form>
    </div>
  );
}