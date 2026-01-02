// src/pages/InputForm.jsx
import { useState } from 'react';
import axios from 'axios';
import { Save } from 'lucide-react';
import Swal from 'sweetalert2'; // ✅ นำเข้า SweetAlert2

export default function InputForm() {
  // ตั้งค่าเริ่มต้น (วันที่ = วันนี้)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0], // format YYYY-MM-DD
    purchasePrice: '',
    soldQuantity: '',
    sellPrice: ''
  });

  const [loading, setLoading] = useState(false);

  // ฟังก์ชันเปลี่ยนค่าในฟอร์ม
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

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

      // ✅ ใช้ SweetAlert2 แทน alert เดิม
      await Swal.fire({
        title: 'บันทึกสำเร็จ!',
        text: 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว',
        icon: 'success',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#16a34a', // สีเขียวเดียวกับปุ่มบันทึก
        timer: 2000, // ปิดเองอัตโนมัติใน 2 วินาที (ถ้าไม่กด)
      });

      // ล้างค่าฟอร์ม
      setForm({
        date: new Date().toISOString().split('T')[0],
        purchasePrice: '',
        soldQuantity: '',
        sellPrice: ''
      });

    } catch (error) {
      console.error(error);
      
      // ❌ แจ้งเตือน Error ด้วย SweetAlert2
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
      <h1 className="text-2xl font-bold text-gray-700 mb-6 text-center">
        บันทึกรายการใหม่
      </h1>

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