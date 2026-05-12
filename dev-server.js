// dev-server.js — Local API server สำหรับ dev (ใช้ bun)
import mongoose from 'mongoose';
import Transaction from './src/models/Transaction.js';

let MONGODB_URI = process.env.MONGODB_URI;

// แปลง mongodb+srv:// เป็น mongodb:// เพื่อ bypass DNS SRV issue บน router ที่บ้าน
if (MONGODB_URI.startsWith('mongodb+srv://')) {
  const directHosts = [
    'ac-xjj5wcl-shard-00-00.zdyxzub.mongodb.net:27017',
    'ac-xjj5wcl-shard-00-01.zdyxzub.mongodb.net:27017',
    'ac-xjj5wcl-shard-00-02.zdyxzub.mongodb.net:27017',
  ].join(',');
  MONGODB_URI = MONGODB_URI
    .replace('mongodb+srv://', 'mongodb://')
    .replace('cluster0.zdyxzub.mongodb.net', directHosts);
  // เพิ่ม ssl & replicaSet params
  const separator = MONGODB_URI.includes('?') ? '&' : '?';
  MONGODB_URI += `${separator}ssl=true&authSource=admin`;
}

// Connect to MongoDB
try {
  await mongoose.connect(MONGODB_URI, { family: 4 });
  console.log('✅ Connected to MongoDB');
} catch (err) {
  console.error('❌ MongoDB connection failed:', err.message);
  process.exit(1);
}

const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname === '/api/transactions') {
      try {
        if (req.method === 'GET') {
          const transactions = await Transaction.find({}).sort({ 'วันที่': -1 }).lean();
          return new Response(JSON.stringify(transactions), { headers });
        }

        if (req.method === 'POST') {
          const data = await req.json();
          const newTransaction = new Transaction(data);
          await newTransaction.save();
          return new Response(JSON.stringify({ message: 'บันทึกสำเร็จ!', data: newTransaction }), { status: 201, headers });
        }

        if (req.method === 'PUT') {
          const { _id, ...updateData } = await req.json();
          if (!_id) return new Response(JSON.stringify({ error: 'ต้องระบุ _id' }), { status: 400, headers });
          const updated = await Transaction.findByIdAndUpdate(_id, updateData, { new: true, runValidators: true });
          if (!updated) return new Response(JSON.stringify({ error: 'ไม่พบรายการ' }), { status: 404, headers });
          return new Response(JSON.stringify({ message: 'แก้ไขสำเร็จ!', data: updated }), { headers });
        }

        if (req.method === 'DELETE') {
          const { _id } = await req.json();
          if (!_id) return new Response(JSON.stringify({ error: 'ต้องระบุ _id' }), { status: 400, headers });
          const deleted = await Transaction.findByIdAndDelete(_id);
          if (!deleted) return new Response(JSON.stringify({ error: 'ไม่พบรายการ' }), { status: 404, headers });
          return new Response(JSON.stringify({ message: 'ลบสำเร็จ!' }), { headers });
        }
      } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
      }
    }

    return new Response(JSON.stringify({ message: 'Not found' }), { status: 404, headers });
  },
});

console.log(`🚀 API server running at http://localhost:${server.port}`);
