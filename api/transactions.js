// api/transactions.js
import dbConnect from '../src/lib/db.js';
import Transaction from '../src/models/Transaction.js';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    // ดึงข้อมูล
    try {
      const transactions = await Transaction.find({})
      .sort({ 'วันที่': -1 })
      .lean();
      res.status(200).json(transactions);
    } catch (error) {
      res.status(500).json({ error: "ดึงข้อมูลไม่สำเร็จ" });
    }
  } 
  
  // รับข้อมูลใหม่ (POST)
  else if (req.method === 'POST') {
    try {
      const data = req.body;
      console.log(data);

      const newTransaction = new Transaction(data);
      await newTransaction.save();

      res.status(201).json({ message: "บันทึกสำเร็จ!", data: newTransaction });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "บันทึกไม่สำเร็จ", details: error.message });
    }
  } 
  
  // แก้ไขข้อมูล (PUT)
  else if (req.method === 'PUT') {
    try {
      const { _id, ...updateData } = req.body;

      if (!_id) {
        return res.status(400).json({ error: "ต้องระบุ _id" });
      }

      const updated = await Transaction.findByIdAndUpdate(
        _id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updated) {
        return res.status(404).json({ error: "ไม่พบรายการ" });
      }

      res.status(200).json({ message: "แก้ไขสำเร็จ!", data: updated });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "แก้ไขไม่สำเร็จ", details: error.message });
    }
  }

  // ลบข้อมูล (DELETE)
  else if (req.method === 'DELETE') {
    try {
      const { _id } = req.body;

      if (!_id) {
        return res.status(400).json({ error: "ต้องระบุ _id" });
      }

      const deleted = await Transaction.findByIdAndDelete(_id);

      if (!deleted) {
        return res.status(404).json({ error: "ไม่พบรายการ" });
      }

      res.status(200).json({ message: "ลบสำเร็จ!" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "ลบไม่สำเร็จ", details: error.message });
    }
  }
  
  else {
    res.status(405).json({ message: "Method not allowed" });
  }
}