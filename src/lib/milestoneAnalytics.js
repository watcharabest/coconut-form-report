// src/lib/milestoneAnalytics.js

/**
 * อ่านระดับความยากประจำเดือน
 */
export function getMonthlyDifficulty(year, month) {
  if (typeof window === 'undefined') return 'standard';
  const key = `coconut_difficulty_${year}_${month}`;
  return localStorage.getItem(key) || 'standard';
}

/**
 * บันทึกระดับความยากประจำเดือน
 */
export function setMonthlyDifficulty(year, month, difficulty) {
  if (typeof window === 'undefined') return;
  const key = `coconut_difficulty_${year}_${month}`;
  localStorage.setItem(key, difficulty);
  localStorage.setItem(`${key}_locked`, 'true');
  window.dispatchEvent(new Event('coconut_difficulty_changed'));
}

/**
 * ตรวจสอบว่าสามารถเปลี่ยนระดับความยากของเดือนนี้ได้หรือไม่
 * เงื่อนไข: เป็นวันที่ 1 ของเดือน หรือยังไม่เคยตั้งค่ามาก่อนในเดือนนี้
 */
export function checkDifficultyChangeable(year, month) {
  if (typeof window === 'undefined') return false;
  const now = new Date();
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  const isCurrentMonth = now.getFullYear() === yearNum && (now.getMonth() + 1) === monthNum;
  if (!isCurrentMonth) return false;

  const key = `coconut_difficulty_${year}_${month}`;
  const isLocked = localStorage.getItem(`${key}_locked`) === 'true';

  // อนุญาตให้เลือกได้ในวันที่ 1 ของเดือน หรือยังไม่เคยบันทึกตั้งค่าเลย
  const isDay1 = now.getDate() === 1;
  return isDay1 || !isLocked;
}

/**
 * คำนวณ 3 ระดับเป้าหมายเชิงสถิติ (3-Tier Statistical Milestones)
 * พร้อมระบบความยากเฉพาะเดือนและชุดสีจำแนกขั้นชัดเจน
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

  // 2. คำนวณฐานสถิติ (Baseline) จากเดือนก่อนหน้า
  const pastMonths = sortedMonthKeys
    .filter(k => k < currentPeriodKey)
    .map(k => monthlyTotals[k].totalQty)
    .filter(q => q > 0);

  let baseline = 1000;
  if (pastMonths.length >= 3) {
    const m1 = pastMonths[pastMonths.length - 1];
    const m2 = pastMonths[pastMonths.length - 2];
    const m3 = pastMonths[pastMonths.length - 3];
    baseline = (m1 * 0.5) + (m2 * 0.3) + (m3 * 0.2);
  } else if (pastMonths.length > 0) {
    baseline = pastMonths.reduce((acc, cur) => acc + cur, 0) / pastMonths.length;
  } else if (allMonthlyValues.length > 0) {
    baseline = allMonthlyValues.reduce((acc, cur) => acc + cur, 0) / allMonthlyValues.length;
  }

  if (!isMonthSpecific && targetYear !== 'All') {
    baseline = baseline * 12;
  }

  // 3. จัดการระดับความยากประจำเดือน
  const difficulty = isMonthSpecific ? getMonthlyDifficulty(yearNum, monthNum) : 'standard';
  const canChangeDifficulty = isMonthSpecific ? checkDifficultyChangeable(yearNum, monthNum) : false;

  let difficultyMultiplier = 1.0;
  let difficultyInfo = {
    key: 'standard',
    label: 'โหมดมาตรฐาน (สมดุล)',
    shortLabel: 'มาตรฐาน',
    desc: 'เป้าหมายสอดคล้องตามศักยภาพและสถิติทั่วไปของสวน',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    headerGradient: 'from-emerald-50 via-teal-50 to-white',
    headerBorder: 'border-emerald-200'
  };

  if (difficulty === 'easy') {
    difficultyMultiplier = 0.8;
    difficultyInfo = {
      key: 'easy',
      label: 'โหมดผ่อนคลาย (ผลผลิตน้อย)',
      shortLabel: 'ผ่อนคลาย',
      desc: 'ปรับเป้าหมายลดลง 20% เหมาะสำหรับช่วงมะพร้าวขาดคอหรือหน้ามรสุม',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      headerGradient: 'from-amber-50 via-orange-50 to-white',
      headerBorder: 'border-amber-200'
    };
  } else if (difficulty === 'hard') {
    difficultyMultiplier = 1.25;
    difficultyInfo = {
      key: 'hard',
      label: 'โหมดท้าทาย (ผลผลิตดก)',
      shortLabel: 'ท้าทาย',
      desc: 'ปรับเป้าหมายเพิ่มขึ้น 25% สำหรับช่วงผลผลิตดกหรือตลาดต้องการสูง',
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      headerGradient: 'from-indigo-50 via-blue-50 to-white',
      headerBorder: 'border-indigo-200'
    };
  }

  // 4. คำนวณเป้าหมายมาตรฐานและปรับด้วยความยาก
  const roundUnit = baseline >= 5000 ? 500 : (baseline >= 1000 ? 100 : 50);
  const adjustedBase = baseline * difficultyMultiplier;
  const standardTarget = Math.max(isMonthSpecific ? 300 : 2000, Math.round(adjustedBase / roundUnit) * roundUnit);

  // 5. แตกเป็น 3 Tiers พร้อมชุดสีเฉพาะตัว
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
      sublabel: 'ฐานรากความมั่นคง',
      target: tier1Target,
      achieved: tier1Achieved,
      color: 'amber',
      tagColor: 'bg-amber-100 text-amber-800 border-amber-200',
      activeRing: 'border-amber-500 ring-2 ring-amber-100'
    },
    {
      id: 'tier2',
      step: 2,
      label: 'ขั้นมาตรฐาน',
      sublabel: 'เป้าหมายหลักประจำงวด',
      target: tier2Target,
      achieved: tier2Achieved,
      color: 'blue',
      tagColor: 'bg-blue-100 text-blue-800 border-blue-200',
      activeRing: 'border-blue-500 ring-2 ring-blue-100'
    },
    {
      id: 'tier3',
      step: 3,
      label: 'ขั้นยอดเยี่ยม',
      sublabel: 'ระดับยอดผลผลิตดก',
      target: tier3Target,
      achieved: tier3Achieved,
      color: 'yellow',
      tagColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      activeRing: 'border-yellow-500 ring-2 ring-yellow-100'
    }
  ];

  // 6. ประเมินขั้นที่กำลังมุ่งหน้าสู่ และระดับยศสูงสุดที่ได้รับ
  let activeTier = tiers[0];
  let prevTarget = 0;
  let allCompleted = false;
  let bonusQty = 0;
  let completedCount = 0;
  let rankTitle = 'กำลังมุ่งหน้าสู่การรับรอง [ขั้นพื้นฐาน]';

  if (tier3Achieved) {
    allCompleted = true;
    activeTier = tiers[2];
    prevTarget = tier2Target;
    bonusQty = currentQty - tier3Target;
    completedCount = 3;
    rankTitle = 'พิชิตระดับสูงสุด [ขั้นยอดเยี่ยม] ครบสมบูรณ์ 3 จาก 3 ขั้น';
  } else if (tier2Achieved) {
    activeTier = tiers[2];
    prevTarget = tier2Target;
    completedCount = 2;
    rankTitle = 'ได้รับการรับรอง [ขั้นมาตรฐาน] (ผ่านแล้ว 2 จาก 3 ขั้น)';
  } else if (tier1Achieved) {
    activeTier = tiers[1];
    prevTarget = tier1Target;
    completedCount = 1;
    rankTitle = 'ได้รับการรับรอง [ขั้นพื้นฐาน] (ผ่านแล้ว 1 จาก 3 ขั้น)';
  } else {
    activeTier = tiers[0];
    prevTarget = 0;
    completedCount = 0;
    rankTitle = 'กำลังมุ่งหน้าสู่การรับรอง [ขั้นพื้นฐาน]';
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
    yearNum,
    monthNum,
    difficulty,
    difficultyInfo,
    canChangeDifficulty,
    tiers,
    activeTier,
    prevTarget,
    progress,
    remaining,
    allCompleted,
    bonusQty,
    completedCount,
    rankTitle
  };
}
