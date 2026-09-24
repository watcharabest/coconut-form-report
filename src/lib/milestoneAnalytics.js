// src/lib/milestoneAnalytics.js

/**
 * คำนวณ 3 ระดับเป้าหมายเชิงสถิติ (3-Tier Statistical Milestones)
 * รองรับทั้งประวัติยอดขายจริงและการปรับตัวตามขนาดของสวน
 *
 * @param {Array} transactions - รายการธุรกรรมทั้งหมด
 * @param {number|string} targetYear - ปีที่ต้องการประเมิน (เช่น 2026 หรือ 'All')
 * @param {number|string} targetMonth - เดือนที่ต้องการประเมิน (1-12 หรือ 'All')
 * @returns {Object} ข้อมูล 3 Tiers และความก้าวหน้า
 */
export function calculateMonthlyTiers(transactions = [], targetYear = 'All', targetMonth = 'All') {
  const thaiMonths = [
    { id: 1, name: 'มกราคม' }, { id: 2, name: 'กุมภาพันธ์' }, { id: 3, name: 'มีนาคม' },
    { id: 4, name: 'เมษายน' }, { id: 5, name: 'พฤษภาคม' }, { id: 6, name: 'มิถุนายน' },
    { id: 7, name: 'กรกฎาคม' }, { id: 8, name: 'สิงหาคม' }, { id: 9, name: 'กันยายน' },
    { id: 10, name: 'ตุลาคม' }, { id: 11, name: 'พฤศจิกายน' }, { id: 12, name: 'ธันวาคม' }
  ];

  // 1. รวมยอดขายตามเดือนในประวัติศาสตร์ทั้งหมด
  const monthlyTotals = {};
  transactions.forEach(item => {
    if (!item['วันที่']) return;
    const date = new Date(item['วันที่']);
    if (isNaN(date.getTime())) return;

    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const qty = parseFloat(item['จำนวนขายมะพร้าว']) || 0;

    if (!monthlyTotals[key]) {
      monthlyTotals[key] = { year: y, month: m, totalQty: 0 };
    }
    monthlyTotals[key].totalQty += qty;
  });

  const sortedMonthKeys = Object.keys(monthlyTotals).sort();
  const allMonthlyValues = sortedMonthKeys.map(k => monthlyTotals[k].totalQty).filter(q => q > 0);

  // กำหนดบริบทของช่วงเวลาเป้าหมาย
  const isMonthSpecific = targetMonth !== 'All';
  const monthNum = isMonthSpecific ? parseInt(targetMonth) : (new Date().getMonth() + 1);
  const yearNum = targetYear !== 'All' ? parseInt(targetYear) : new Date().getFullYear();
  const currentPeriodKey = `${yearNum}-${String(monthNum).padStart(2, '0')}`;

  const monthObj = thaiMonths.find(m => m.id === monthNum);
  const periodLabel = isMonthSpecific
    ? `ประจำเดือน${monthObj ? monthObj.name : ''}`
    : (targetYear !== 'All' ? `ประจำปี ${yearNum + 543}` : 'ภาพรวม');

  // ยอดขายในรอบปัจจุบัน
  let currentQty = 0;
  if (isMonthSpecific) {
    currentQty = monthlyTotals[currentPeriodKey] ? monthlyTotals[currentPeriodKey].totalQty : 0;
  } else if (targetYear !== 'All') {
    currentQty = Object.values(monthlyTotals)
      .filter(item => item.year === yearNum)
      .reduce((acc, cur) => acc + cur.totalQty, 0);
  } else {
    currentQty = allMonthlyValues.reduce((acc, cur) => acc + cur, 0);
  }

  // 2. คำนวณฐานสถิติ (Baseline) จากเดือนก่อนหน้า (ไม่รวมเดือนปัจจุบันที่กำลังดำเนินอยู่)
  const pastMonths = sortedMonthKeys
    .filter(k => k < currentPeriodKey)
    .map(k => monthlyTotals[k].totalQty)
    .filter(q => q > 0);

  let baseline = 1000; // ค่าเริ่มต้นมาตรฐาน

  if (pastMonths.length >= 3) {
    // ให้น้ำหนัก 3 เดือนล่าสุด (Weighted Moving Average: 50%, 30%, 20%)
    const m1 = pastMonths[pastMonths.length - 1];
    const m2 = pastMonths[pastMonths.length - 2];
    const m3 = pastMonths[pastMonths.length - 3];
    baseline = (m1 * 0.5) + (m2 * 0.3) + (m3 * 0.2);
  } else if (pastMonths.length > 0) {
    baseline = pastMonths.reduce((acc, cur) => acc + cur, 0) / pastMonths.length;
  } else if (allMonthlyValues.length > 0) {
    baseline = allMonthlyValues.reduce((acc, cur) => acc + cur, 0) / allMonthlyValues.length;
  }

  // ปรับสเกลหากดูภาพรวมทั้งปี
  if (!isMonthSpecific && targetYear !== 'All') {
    baseline = baseline * 12;
  }

  // 3. ปัดเศษฐานสถิติให้เป็นเลขกลมสวยงาม
  const roundUnit = baseline >= 5000 ? 500 : (baseline >= 1000 ? 100 : 50);
  const standardTarget = Math.max(isMonthSpecific ? 300 : 2000, Math.round(baseline / roundUnit) * roundUnit);

  // 4. แตกออกเป็น 3 ลำดับขั้น (3 Tiers)
  // Tier 1: พื้นฐาน (~65%)
  // Tier 2: มาตรฐาน (100% - จุดพิชิตเป้าหมายประจำเดือน)
  // Tier 3: ยอดเยี่ยม (~135% - โบนัสสำหรับช่วงผลผลิตดก)
  const tier1Target = Math.max(isMonthSpecific ? 150 : 1000, Math.round((standardTarget * 0.65) / roundUnit) * roundUnit);
  const tier2Target = standardTarget;
  const tier3Target = Math.round((standardTarget * 1.35) / roundUnit) * roundUnit;

  const tier1Achieved = currentQty >= tier1Target;
  const tier2Achieved = currentQty >= tier2Target;
  const tier3Achieved = currentQty >= tier3Target;

  const tiers = [
    {
      id: 'tier1',
      step: 1,
      label: 'ขั้นพื้นฐาน',
      sublabel: 'สถิติฐานผลผลิต',
      target: tier1Target,
      achieved: tier1Achieved,
    },
    {
      id: 'tier2',
      step: 2,
      label: 'ขั้นมาตรฐาน',
      sublabel: 'เป้าหมายหลักประจำงวด',
      target: tier2Target,
      achieved: tier2Achieved,
    },
    {
      id: 'tier3',
      step: 3,
      label: 'ขั้นยอดเยี่ยม',
      sublabel: 'ระดับยอดผลผลิตดก',
      target: tier3Target,
      achieved: tier3Achieved,
    }
  ];

  // 5. ประเมินขั้นที่กำลังมุ่งหน้าสู่ (Active Tier)
  let activeTier = tiers[0];
  let prevTarget = 0;
  let allCompleted = false;
  let bonusQty = 0;

  if (!tier1Achieved) {
    activeTier = tiers[0];
    prevTarget = 0;
  } else if (!tier2Achieved) {
    activeTier = tiers[1];
    prevTarget = tier1Target;
  } else if (!tier3Achieved) {
    activeTier = tiers[2];
    prevTarget = tier2Target;
  } else {
    // พิชิตครบทั้ง 3 Tiers
    allCompleted = true;
    activeTier = tiers[2];
    prevTarget = tier2Target;
    bonusQty = currentQty - tier3Target;
  }

  // คำนวณความก้าวหน้าสู่ขั้นปัจจุบัน (%)
  let progress = 0;
  let remaining = 0;

  if (allCompleted) {
    progress = 100;
    remaining = 0;
  } else {
    const range = activeTier.target - prevTarget;
    const currentInRange = Math.max(0, currentQty - prevTarget);
    progress = range > 0 ? Math.min(100, Math.max(3, Math.round((currentInRange / range) * 100))) : 0;
    remaining = Math.max(0, activeTier.target - currentQty);
  }

  return {
    periodLabel,
    currentQty,
    baseline: standardTarget,
    tiers,
    activeTier,
    prevTarget,
    progress,
    remaining,
    allCompleted,
    bonusQty
  };
}
