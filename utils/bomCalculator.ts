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

export function calculateBOM(productName: string, targetQty: number, color?: string, machineId?: string, boms?: any[], inventory?: any[]): BOMCalculation {
  const rows: BOMRow[] = [];
  let totalTags = 0;
  let qtyPerTag = 0;
  let tagType: 'box' | 'bag' = 'box';
  let productDetails = { type: '-', structure: '-', weight: '-', mouthWidth: '-', jarWidth: '-', height: '-', capacity: '-' };
  let injection: BOMCalculation['injection'] = undefined;
  let blow: BOMCalculation['blow'] = undefined;

  const nameUpper = productName.toUpperCase();
  const displayColor = color && color !== '-' ? color : 'สีใส';

  // 1. Try to find dynamic BOM from the database
  const dynamicBom = boms ? boms.find(b => b.productItem === productName || b.productItem.toUpperCase() === nameUpper) : null;

  if (dynamicBom && dynamicBom.materials && inventory) {
    // We found a dynamic BOM in the database!
    let totalMaterialWeightKg = 0;
    
    // Process basic generic details
    productDetails = { 
      type: productName, 
      structure: '-', 
      weight: '-', 
      mouthWidth: '-', 
      jarWidth: '-', 
      height: '-', 
      capacity: '-' 
    };

    let isInjection = false;
    let isBlow = false;
    let packageItem = null;
    let materialRows: any[] = [];
    
    // Separate materials into resins/masterbatch vs packaging
    dynamicBom.materials.forEach((mat: any, index: number) => {
      const invItem = inventory.find(i => i.id === mat.inventoryItemId);
      if (!invItem) return;

      const isPackaging = invItem.category === 'Packaging' || invItem.name.includes('กล่อง') || invItem.name.includes('ถุง');
      const isPreform = invItem.category === 'Preform' || invItem.name.toLowerCase().includes('preform');
      const isResin = invItem.category === 'Resin' || invItem.category === 'Pigment' || invItem.name.includes('PE') || invItem.name.includes('Master Batch');

      if (isPreform) isBlow = true;
      if (isResin) isInjection = true;

      // Calculate usage
      const requiredQty = mat.qtyPerUnit * targetQty;
      
      // Attempt to guess pack requirements from packaging
      if (isPackaging && !packageItem) {
         packageItem = { name: invItem.name, qty: requiredQty };
         // Guess qty per pack
         qtyPerTag = Math.ceil(targetQty / requiredQty);
         totalTags = Math.ceil(targetQty / qtyPerTag);
         tagType = invItem.name.includes('กล่อง') ? 'box' : 'bag';
      }

      if (isResin && mat.unitType === 'kg') {
         totalMaterialWeightKg += requiredQty;
      }

      materialRows.push({
         no: materialRows.length + 1,
         itemName: invItem.name,
         packSize: 25, // Fallback
         usageQty: Number(requiredQty.toFixed(2)),
         usageUnit: mat.unitType,
         purchaseQty: invItem.unit === mat.unitType ? '-' : '-', // Not enough info for strict package conversion in generic form
         purchaseUnit: '',
         note: ''
      });
    });

    if (packageItem) {
       qtyPerTag = qtyPerTag || 1000;
       totalTags = totalTags || 1;
    } else {
       qtyPerTag = targetQty;
       totalTags = 1;
    }

    // Attempt to guess structure formula string
    const structureParts = dynamicBom.materials.map((m: any) => {
       const invItem = inventory.find(i => i.id === m.inventoryItemId);
       if (invItem && (invItem.category === 'Resin' || invItem.category === 'Pigment')) {
           return invItem.name;
       }
       return null;
    }).filter(Boolean);
    
    if (structureParts.length > 0) {
        productDetails.structure = structureParts.join(' + ');
    }

    // Build the pseudo-Injection or Blow details needed for the template if they exist
    if (isInjection) {
      const mixRounds = Math.ceil(totalMaterialWeightKg / 50) || 1;
      let lldpeInfo = { percent: 0, kg: 0, kgPerRound: 0 };
      let hdpeInfo = { percent: 0, kg: 0, kgPerRound: 0 };
      let masterBatchInfo = { percent: 0, kg: 0, kgPerRound: 0 };
      let scrapInfo = { percent: 0, kg: '-', kgPerRound: '-' };

      dynamicBom.materials.forEach((mat: any) => {
         const invItem = inventory.find(i => i.id === mat.inventoryItemId);
         if (!invItem) return;
         const reqKg = mat.qtyPerUnit * targetQty;
         const pct = Math.round((reqKg / totalMaterialWeightKg) * 100);
         const kgPerRd = Number((reqKg / mixRounds).toFixed(2));

         if (invItem.name.includes('HDPE')) {
             hdpeInfo = { percent: pct, kg: reqKg, kgPerRound: kgPerRd };
         } else if (invItem.name.includes('LLDPE')) {
             lldpeInfo = { percent: pct, kg: reqKg, kgPerRound: kgPerRd };
         } else if (invItem.name.includes('Master Batch') || invItem.category === 'Pigment') {
             masterBatchInfo = { percent: pct, kg: reqKg, kgPerRound: kgPerRd };
         }
      });

      injection = {
        machine: machineId || 'IO1',
        mold: productName,
        totalRawMaterialKg: Number(totalMaterialWeightKg.toFixed(2)),
        mixRounds: mixRounds,
        lldpe: lldpeInfo,
        hdpe: hdpeInfo,
        scrap: scrapInfo as any,
        masterBatch: masterBatchInfo,
        packMethod: tagType === 'box' ? 'กล่อง' : 'แพ็ค',
        qtyPerPack: qtyPerTag,
        totalPacks: totalTags
      };
    } else if (isBlow) {
       let preformName = 'Preform';
       let preformQty = targetQty;
       dynamicBom.materials.forEach((m: any) => {
           const invItem = inventory.find(i => i.id === m.inventoryItemId);
           if (invItem && invItem.name.toLowerCase().includes('preform')) {
               preformName = invItem.name;
               preformQty = m.qtyPerUnit * targetQty;
           }
       });

       blow = {
          machine: machineId || 'B1',
          mold: productName,
          preformName: preformName,
          preformQty: preformQty,
          packMethod: tagType === 'box' ? 'กล่อง' : 'แพ็คถุง',
          qtyPerPack: qtyPerTag,
          totalPacks: totalTags,
          note: '* อ้างอิงจากสูตรการผลิตที่ตั้งค่าไว้'
       };
    }

    rows.push(...materialRows);

  } else if (nameUpper.includes('B01')) {
    // --- Legacy / Hardcoded Fallbacks for existing generic tests ---
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
    
    const mixRounds = Math.ceil(totalWeightKg / 52.3); 
    
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
    // Fallback for unknown products without dynamic BOM
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
