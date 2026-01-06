// api/transactions.js
import dbConnect from '../src/lib/db.js';
import Transaction from '../src/models/Transaction.js';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    // ดึงข้อมูล (Code เดิม)
    try {
      const transactions = await Transaction.find({})
      .select('วันที่ ราคาซื้อมะพร้าว ราคาขายมะพร้าว จำนวนขายมะพร้าว')
      .sort({ 'วันที่': -1 })
      .lean();
      res.status(200).json(transactions);
    } catch (error) {
      res.status(500).json({ error: "ดึงข้อมูลไม่สำเร็จ" });
    }
  } 
  
  // ✅ เพิ่มส่วนนี้: รับข้อมูลใหม่ (POST)
  else if (req.method === 'POST') {
    try {
      // รับข้อมูลจากหน้าบ้าน
      const data = req.body;
      
      console.log(data);

      // สร้างข้อมูลใหม่ลง Database
      const newTransaction = new Transaction(data);
      await newTransaction.save();

      res.status(201).json({ message: "บันทึกสำเร็จ!", data: newTransaction });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "บันทึกไม่สำเร็จ", details: error.message });
    }
  } 
  
  else {
    res.status(405).json({ message: "Method not allowed" });
  }
}