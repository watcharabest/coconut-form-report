// src/models/Transaction.js
import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  'วันที่': { type: Date, default: Date.now },
  'ราคาซื้อมะพร้าว': { type: Number, required: true },
  'จำนวนขายมะพร้าว': { type: Number, required: true },
  'ราคาขายมะพร้าว': { type: Number, required: true },
});

// ป้องกัน error เวลา compile ซ้ำ
export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);