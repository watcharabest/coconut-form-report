// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Footer from './components/Footer';

// Import หน้าต่างๆ
import InputForm from './pages/InputForm';
import StockPage from './pages/StockPage';
import TablePage from './pages/TablePage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
        
        {/* ส่วนเนื้อหาที่จะเปลี่ยนไปตาม URL */}
        <Routes>
          <Route path="/" element={<InputForm />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/table" element={<TablePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>

        {/* เมนู Footer อยู่ตลอดทุกหน้า */}
        <Footer />
        
      </div>
    </BrowserRouter>
  );
}

export default App;