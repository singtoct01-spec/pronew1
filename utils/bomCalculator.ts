export interface BOMRow {
  no: number;
  itemName: string;
  packSize: number | string;
  usageQty: number | string;
  usageUnit: string;
  purchaseQty: number | string;
  purchaseUnit: string;
  note: string;
}

export interface BOMCalculation {
  rows: BOMRow[];
  totalTags: number;
  qtyPerTag: number;
  tagType: 'box' | 'bag';
  productDetails: {
    type: string;
    structure: string;
    weight: string;
    mouthWidth: string;
    jarWidth: string;
    height: string;
    capacity: string;
  };
  injection?: {
    machine: string;
    mold: string;
    totalRawMaterialKg: number;
    mixRounds: number;
    lldpe: { percent: number; kg: number; kgPerRound: number };
    hdpe: { percent: number; kg: number; kgPerRound: number };
    scrap: { percent: number; kg: string; kgPerRound: string };
    masterBatch: { percent: number; kg: number; kgPerRound: number };
    packMethod: string;
    qtyPerPack: number;
    totalPacks: number;
  };
  blow?: {
    machine: string;
    mold: string;
    preformName: string;
    preformQty: number;
    packMethod: string;
    qtyPerPack: number;
    totalPacks: number;
    note?: string;
  };
}

export function calculateBOM(productName: string, targetQty: number, color?: string, machineId?: string): BOMCalculation {
  const rows: BOMRow[] = [];
  let totalTags = 0;
  let qtyPerTag = 0;
  let tagType: 'box' | 'bag' = 'box';
  let productDetails = { type: '-', structure: '-', weight: '-', mouthWidth: '-', jarWidth: '-', height: '-', capacity: '-' };
  let injection: BOMCalculation['injection'] = undefined;
  let blow: BOMCalculation['blow'] = undefined;

  const nameUpper = productName.toUpperCase();
  const displayColor = color && color !== '-' ? color : 'สีใส';

  if (nameUpper.includes('B01')) {
    const preformQty = Math.ceil(targetQty * 1.02);
    const bagQty = Math.ceil(targetQty / 45);
    totalTags = bagQty;
    qtyPerTag = 45;
    tagType = 'bag';
    productDetails = { type: 'โหล ปากเกลียว', structure: 'PET 100%', weight: '80', mouthWidth: '-', jarWidth: '-', height: '-', capacity: '-' };

    blow = {
      machine: machineId || 'B6902-105',
      mold: 'B01-1',
      preformName: 'P80',
      preformQty: preformQty,
      packMethod: 'แพ็คถุง',
      qtyPerPack: 45,
      totalPacks: bagQty,
      note: '* ปิด OT 300 ใบ/ชม.สลับพัก 1 ชม. เดินเครื่อง 7 ชม.'
    };

    rows.push({
      no: 1, itemName: 'PreformP80', packSize: 135,
      usageQty: preformQty, usageUnit: 'ชิ้น',
      purchaseQty: Math.ceil(preformQty / 135), purchaseUnit: 'ลัง', note: 'เหลือส่งคืนคลัง'
    });
    rows.push({
      no: 2, itemName: 'ถุง HD ฟ้า ขนาด 26+3.5+3.5\'\'X51\'\'X0.08mm', packSize: 12,
      usageQty: bagQty, usageUnit: 'ใบ',
      purchaseQty: Math.ceil(bagQty / 12), purchaseUnit: 'kg.', note: 'เหลือส่งคืนคลัง'
    });
    rows.push({
      no: 3, itemName: 'ป้ายแท็ก', packSize: 8,
      usageQty: '-', usageUnit: '',
      purchaseQty: Math.ceil(bagQty / 8), purchaseUnit: 'แผ่น', note: ''
    });

  } else if (nameUpper.includes('B10-2')) {
    const preformQty = Math.ceil(targetQty * 1.02);
    const bagQty = Math.ceil(targetQty / 40);
    totalTags = bagQty;
    qtyPerTag = 40;
    tagType = 'bag';
    productDetails = { type: 'โหล ปากเกลียว', structure: 'PET 100%', weight: '110', mouthWidth: '-', jarWidth: '-', height: '-', capacity: '-' };

    blow = {
      machine: machineId || 'B4',
      mold: 'B10-3',
      preformName: 'P110',
      preformQty: preformQty,
      packMethod: 'แพ็คถุง',
      qtyPerPack: 40,
      totalPacks: bagQty,
      note: '* ปิด OT 270 ใบ/ชม.สลับพัก 1 ชม. เดินเครื่อง 7 ชม.'
    };

    rows.push({
      no: 1, itemName: 'PreformP110', packSize: 135,
      usageQty: preformQty, usageUnit: 'ชิ้น',
      purchaseQty: Math.ceil(preformQty / 135), purchaseUnit: 'ลัง', note: 'เหลือส่งคืนคลัง'
    });
    rows.push({
      no: 2, itemName: 'ถุง HD ฟ้า ขนาด 26.5+3.5+3.5\'\'x55\'\'x0.08mm', packSize: 12,
      usageQty: bagQty, usageUnit: 'ใบ',
      purchaseQty: Math.ceil(bagQty / 12), purchaseUnit: 'kg.', note: 'เหลือส่งคืนคลัง'
    });
    rows.push({
      no: 3, itemName: 'ป้ายแท็ก', packSize: 8,
      usageQty: '-', usageUnit: '',
      purchaseQty: Math.ceil(bagQty / 8), purchaseUnit: 'แผ่น', note: ''
    });

  } else if (nameUpper.includes('PE307B') || nameUpper.includes('307B')) {
    const totalWeightKg = Math.round((targetQty * 9.45) / 1000);
    const lldpe = Math.round(totalWeightKg * 0.80);
    const hdpe = Math.round(totalWeightKg * 0.20);
    const masterBatch = Number((totalWeightKg * 0.02).toFixed(2));
    
    const mixRounds = Math.ceil(totalWeightKg / 52.3); // Approx 52.3kg per round
    
    const smallBagQty = Math.ceil(targetQty / 50);
    const boxQty = Math.ceil(targetQty / 1000);
    
    totalTags = boxQty;
    qtyPerTag = 1000;
    tagType = 'box';
    productDetails = { type: 'ฝา EOE 307', structure: 'LLDPE 80% HDPE 20% + Master batch 2%', weight: '7', mouthWidth: '-', jarWidth: '-', height: '-', capacity: '-' };

    injection = {
      machine: machineId || 'IO1',
      mold: '307B-7',
      totalRawMaterialKg: totalWeightKg,
      mixRounds: mixRounds,
      lldpe: { percent: 80, kg: lldpe, kgPerRound: Number((lldpe / mixRounds).toFixed(2)) },
      hdpe: { percent: 20, kg: hdpe, kgPerRound: Number((hdpe / mixRounds).toFixed(2)) },
      scrap: { percent: 0, kg: '-', kgPerRound: '-' },
      masterBatch: { percent: 2, kg: masterBatch, kgPerRound: Number((masterBatch / mixRounds).toFixed(2)) },
      packMethod: 'กล่อง',
      qtyPerPack: 1000,
      totalPacks: boxQty
    };

    rows.push({
      no: 1, itemName: 'LLDPE 8420A', packSize: 25,
      usageQty: lldpe, usageUnit: 'kg.',
      purchaseQty: Math.ceil(lldpe / 25), purchaseUnit: 'ถุง', note: 'เหลือส่งคืนคลัง'
    });
    rows.push({
      no: 2, itemName: 'HDPE 1600J', packSize: 25,
      usageQty: hdpe, usageUnit: 'kg.',
      purchaseQty: Math.ceil(hdpe / 25), purchaseUnit: 'ถุง', note: 'เหลือส่งคืนคลัง'
    });
    rows.push({
      no: 3, itemName: `Scrap PE${displayColor}`, packSize: 25,
      usageQty: '-', usageUnit: 'kg.',
      purchaseQty: '-', purchaseUnit: 'ถุง', note: 'เหลือส่งคืนคลัง'
    });
    rows.push({
      no: 4, itemName: `Master batch ${displayColor}`, packSize: 25,
      usageQty: Math.ceil(masterBatch), usageUnit: 'kg.',
      purchaseQty: Math.ceil(masterBatch / 25) || 1, purchaseUnit: 'ถุง', note: 'เหลือส่งคืนคลัง'
    });
    rows.push({
      no: 5, itemName: 'ถุง HD ฟ้า ขนาด 6\'\'x18\'\'x0.08mm', packSize: 191,
      usageQty: smallBagQty, usageUnit: 'ใบ',
      purchaseQty: Math.ceil(smallBagQty / 191), purchaseUnit: 'kg.', note: 'เหลือส่งคืนคลัง'
    });
    rows.push({
      no: 6, itemName: 'ป้ายแท็ก', packSize: 3,
      usageQty: '-', usageUnit: '',
      purchaseQty: Math.ceil(boxQty / 3), purchaseUnit: 'แผ่น', note: ''
    });
    rows.push({
      no: 7, itemName: 'กล่องใส่ฝาขนาด 370*480*297-3ชั้น', packSize: 1000,
      usageQty: boxQty, usageUnit: 'ใบ',
      purchaseQty: '-', purchaseUnit: '', note: ''
    });

  } else {
    // Fallback for unknown products
    totalTags = Math.ceil(targetQty / 100);
    qtyPerTag = 100;
    rows.push({
      no: 1, itemName: 'วัตถุดิบหลัก', packSize: '-',
      usageQty: targetQty, usageUnit: 'ชิ้น',
      purchaseQty: targetQty, purchaseUnit: 'ชิ้น', note: 'กรุณาตั้งค่า BOM'
    });
  }

  return { rows, totalTags, qtyPerTag, tagType, productDetails, injection, blow };
}
