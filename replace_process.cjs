const fs = require('fs');
const filepath = './components/InventoryImportModal.tsx';
let code = fs.readFileSync(filepath, 'utf8');

const startMarker = 'const processExcelData = (rawData: any[][]) => {';
const endMarker = '    if (importedItems.length === 0) throw new Error';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `const processExcelData = (rawData: any[][]) => {
    let importedItems: any[] = [];
    
    let isFGReport = false;
    // Scan first 10 rows for the FG report signature
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const rowStr = (rawData[i] || []).join(' ');
        if (rowStr.includes('รายงานยอดสินค้า') || rowStr.includes('บริษัท เคแพค') || rowStr.includes('รายการรับ-เบิก สินค้าสำเร็จรูป')) {
           isFGReport = true;
           break;
        }
    }

    if (isFGReport) {
      // --- ROBUST FG REPORT PARSING LOGIC ---
      let isDataRow = false;
      let codeIdx = -1;
      let nameIdx = -1;
      let pcsIdx = -1;
      let customerIdx = -1;
      let totalStockIdx = -1;
      let minStockIdx = -1;
      let maxStockIdx = -1;
      let statusIdx = -1;

      for (let i = 0; i < rawData.length; i++) {
        const row: any = rawData[i];
        
        // Detect header row by scanning for keywords
        if (!isDataRow) {
           codeIdx = row.findIndex((cell: any) => String(cell).includes('รหัสสินค้า') || String(cell) === 'รหัส');
           nameIdx = row.findIndex((cell: any) => String(cell).includes('ชื่อรายการสินค้า') || String(cell).includes('ชื่อสินค้า') || String(cell) === 'รายการ');
           pcsIdx = row.findIndex((cell: any) => String(cell).trim() === 'PCS');
           customerIdx = row.findIndex((cell: any) => String(cell).includes('ชื่อลูกค้า'));
           
           // totalStockIdx for 'คิดเป็นชิ้น' under 'ยอดรวมทั้งสองคลัง'
           let bothWarehouseIdx = row.findIndex((cell: any) => String(cell).includes('ยอดรวมทั้งสองคลัง'));
           if (bothWarehouseIdx !== -1) {
               totalStockIdx = bothWarehouseIdx + 2; 
           } else {
               totalStockIdx = row.findIndex((cell: any) => String(cell).includes('ยอดรวม') || String(cell).includes('ยอดคงเหลือ'));
           }

           minStockIdx = row.findIndex((cell: any) => String(cell).includes('จุดต่ำสุด'));
           maxStockIdx = row.findIndex((cell: any) => String(cell).includes('จุดสูงสุด'));
           statusIdx = row.findIndex((cell: any) => String(cell).includes('สถานะ'));
           
           if (nameIdx !== -1) {
              isDataRow = true;
              if (codeIdx === -1 && nameIdx > 0) codeIdx = nameIdx - 1;
              if (totalStockIdx === -1 || totalStockIdx < nameIdx) {
                 totalStockIdx = row.findIndex((cell: any, idx: number) => idx > nameIdx && (String(cell).includes('ยอดรวม') || String(cell).includes('รวม')));
                 if (totalStockIdx === -1) totalStockIdx = nameIdx + 1; // Fallback
              }
           }
           continue;
        }

        if (isDataRow) {
          // Skip completely empty rows
          if (!row.some((cell: any) => String(cell).trim() !== '')) continue;
          
          let code = codeIdx !== -1 ? String(row[codeIdx] || '').trim() : '';
          let name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';

          if (!name) {
             const firstTextCellIdx = row.findIndex((c: any) => typeof c === 'string' && c.trim() !== '' && !c.match(/^[0-9,.-]+$/));
             if (firstTextCellIdx !== -1) {
                name = String(row[firstTextCellIdx]).trim();
             }
          }
          
          if (!name || name === '-' || name === '0' || name === 'รวม') continue;
          if (!code) code = name;

          let currentStockStr = totalStockIdx !== -1 ? String(row[totalStockIdx] || '').trim() : '0';
          let currentStock = Number(currentStockStr.replace(/,/g, ''));
          
          if (isNaN(currentStock) || currentStock === 0) {
             for (let j = nameIdx + 1; j < row.length; j++) {
                 const cellText = String(row[j] || '').trim();
                 if (cellText && cellText !== '-') {
                     const numTokens = cellText.replace(/,/g, '');
                     if (!isNaN(Number(numTokens)) && Number(numTokens) !== 0) {
                         currentStock = Number(numTokens);
                         break;
                     }
                 }
             }
          }

          if (isNaN(currentStock)) currentStock = 0;

          let category = 'FG'; 
          if (name.includes('Preform') || name.includes('พรีฟอร์ม')) category = 'Preform';
          if (name.includes('ฝา')) category = 'Other'; 
            
          let minStockStr = minStockIdx !== -1 ? String(row[minStockIdx] || '0').replace(/,/g, '') : '0';
          let minStock = Number(minStockStr);
          let maxStockStr = maxStockIdx !== -1 ? String(row[maxStockIdx] || '0').replace(/,/g, '') : '0';
          let maxStock = Number(maxStockStr);
          let statusText = statusIdx !== -1 ? String(row[statusIdx] || '').trim() : '';
          let pcsNum = pcsIdx !== -1 ? String(row[pcsIdx] || '').trim() : '';
          let customerStr = customerIdx !== -1 ? String(row[customerIdx] || '').trim() : '';

          let remarksParts = [];
          if (pcsNum && pcsNum !== '-') remarksParts.push(\`บรรจุ: \${pcsNum} PCS\`);
          if (customerStr && customerStr !== '-') remarksParts.push(\`ลูกค้า: \${customerStr}\`);
          if (statusText && statusText !== '-') remarksParts.push(\`สถานะ: \${statusText}\`);
          
          let safeCode = String(code || \`ITEM-\${Date.now()}-\${Math.random().toString(36).substr(2, 5)}\`);
          let safeId = safeCode.replace(/\\//g, '-').replace(/\\\\/g, '-');

          importedItems.push({
             id: safeId, 
             code: safeCode,
             name: name,
             category: category as any,
             unit: name.includes('กล่อง') ? 'box' : (name.includes('แพ็ค') ? 'pack' : 'pcs'), 
             currentStock: currentStock,
             minStock: isNaN(minStock) ? 0 : minStock, 
             maxStock: isNaN(maxStock) ? 0 : maxStock, 
             location: 'คลังสินค้า', 
             lastUpdated: new Date().toISOString(),
             group: '',
             remarks: remarksParts.join(', '),
             usage: ''
          });
        }
      }
    } else {
      // --- STANDARD TEMPLATE PARSING LOGIC ---
      const headers = rawData[0] || [];
      const objectData = rawData.slice(1).map(rowArray => {
          let rowObj: any = {};
          headers.forEach((header: string, index: number) => {
             rowObj[header] = rowArray[index];
          });
          return rowObj;
      });

      objectData.forEach((row: any) => {
        const code = row['รหัสสินค้า'] || row['code'] || '';
        const name = row['ชื่อสินค้า'] || row['name'] || '';
        if (!code && !name) return; // Skip empty rows

        let safeCode = String(code || \`ITEM-\${Date.now()}-\${Math.random().toString(36).substr(2, 5)}\`);
        let safeId = safeCode.replace(/\\//g, '-').replace(/\\\\/g, '-');

        importedItems.push({
          id: safeId,
          code: safeCode,
          name: name,
          category: (row['หมวดหมู่'] || row['category'] || 'Other') as any,
          unit: row['หน่วย'] || row['unit'] || 'pcs',
          currentStock: Number(String(row['ยอดคงเหลือ'] || row['currentStock'] || 0).replace(/,/g, '')),
          minStock: Number(String(row['Min Stock'] || row['minStock'] || 0).replace(/,/g, '')),
          maxStock: Number(String(row['Max Stock'] || row['maxStock'] || 0).replace(/,/g, '')),
          location: row['สถานที่เก็บ'] || row['location'] || '',
          lastUpdated: new Date().toISOString(),
          group: row['กลุ่ม'] || row['group'] || '',
          remarks: row['หมายเหตุ'] || row['remarks'] || '',
          usage: row['การใช้งาน'] || row['usage'] || ''
        });
      });
    }

`;
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync(filepath, code);
  console.log('Successfully updated processExcelData logic');
} else {
  console.log('Failed to find markers');
}
