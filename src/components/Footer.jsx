// src/components/Footer.jsx
import { Link, useLocation } from 'react-router-dom';
import { PlusCircle, Package, List, LayoutDashboard } from 'lucide-react';

export default function Footer() {
  const location = useLocation();

  // ฟังก์ชันเช็คว่าอยู่หน้าไหน จะได้เปลี่ยนสีปุ่ม
  const isActive = (path) => location.pathname === path ? "text-green-600" : "text-gray-400";

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 py-2 px-6 flex justify-between items-center z-50">
      
      {/* 1. หน้ากรอกฟอร์ม */}
      <Link to="/" className={`flex flex-col items-center ${isActive('/')}`}>
        <PlusCircle size={24} />
        <span className="text-xs mt-1">จดบันทึก</span>
      </Link>

      {/* 2. หน้าสต็อก */}
      {/* <Link to="/stock" className={`flex flex-col items-center ${isActive('/stock')}`}>
        <Package size={24} />
        <span className="text-xs mt-1">สต็อก</span>
      </Link> */}

      {/* 3. หน้าตาราง */}
      <Link to="/table" className={`flex flex-col items-center ${isActive('/table')}`}>
        <List size={24} />
        <span className="text-xs mt-1">ล่าสุด</span>
      </Link>

      {/* 4. หน้า Dashboard */}
      <Link to="/dashboard" className={`flex flex-col items-center ${isActive('/dashboard')}`}>
        <LayoutDashboard size={24} />
        <span className="text-xs mt-1">ภาพรวม</span>
      </Link>

    </div>
  );
}