const fs = require('fs');
const filepath = './App.tsx';
let code = fs.readFileSync(filepath, 'utf8');

const startMarker = 'const handleImportInventory = async (importedItems: any[]) => {';
const endMarker = 'alert("เกิดข้อผิดพลาดในการนำเข้าข้อมูล: " + (error as Error).message);\n    }\n  };';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker) + endMarker.length;

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `const handleImportInventory = async (importedItems: any[]) => {
    try {
      const logsToCreate: any[] = [];
      let itemsToUpdate = importedItems.map(item => {
        let finalItem = { ...item };
        const existing = inventory.find(ex => ex.code === item.code || ex.name === item.name);
        
        if (existing) {
            // Merge existing data if some fields are missing from import
            finalItem.id = existing.id; // Preserve original ID so we overwrite correctly
            if (!finalItem.group && existing.group) finalItem.group = existing.group;
            if (!finalItem.usage && existing.usage) finalItem.usage = existing.usage;
            if (!finalItem.minStock && existing.minStock) finalItem.minStock = existing.minStock;
            if (!finalItem.maxStock && existing.maxStock) finalItem.maxStock = existing.maxStock;

            let prevStock = existing.currentStock || 0;
            let newStock = finalItem.currentStock || 0;
            let diff = newStock - prevStock;

            if (diff !== 0) {
               logsToCreate.push({
                  id: \`LOG-\${Date.now()}-\${Math.random().toString(36).substr(2, 5)}\`,
                  timestamp: new Date().toISOString(),
                  action: diff > 0 ? 'รับเข้าสินค้าสำเร็จรูป' : 'เบิกออกสินค้าสำเร็จรูป',
                  details: \`\${finalItem.name} (\${finalItem.code})\nยอดเดิม: \${prevStock.toLocaleString()}\nยอดใหม่: \${newStock.toLocaleString()}\nส่วนต่าง: \${diff > 0 ? '+' + diff.toLocaleString() : diff.toLocaleString()}\nนำเข้าผ่าน Excel (อัปเดตล่าสุด)\`,
                  user: currentUser ? currentUser.name : 'System Admin'
               });
            }
        } else {
           // New item, check if stock > 0
           if (finalItem.currentStock > 0) {
              logsToCreate.push({
                  id: \`LOG-\${Date.now()}-\${Math.random().toString(36).substr(2, 5)}\`,
                  timestamp: new Date().toISOString(),
                  action: 'สร้างสินค้าและรับเข้า',
                  details: \`เพิ่มข้อมูลใหม่ \${finalItem.name} (\${finalItem.code}) จำนวน \${finalItem.currentStock.toLocaleString()} \${finalItem.unit}\nผ่านการนำเข้า Excel\`,
                  user: currentUser ? currentUser.name : 'System Admin'
               });
           }
        }
        return finalItem;
      });

      // We need to batch write both itemsToUpdate and logsToCreate
      const allOperations = [
          ...itemsToUpdate.map(item => ({ type: 'item', data: item })),
          ...logsToCreate.map(log => ({ type: 'log', data: log }))
      ];

      allOperations.push({
          type: 'log',
          data: {
             id: \`LOG-\${Date.now()}-SUMMARY\`,
             timestamp: new Date().toISOString(),
             action: 'นำเข้าข้อมูลสินค้าคงคลัง (SUMMARY)',
             details: \`นำเข้าและอัปเดตข้อมูลจำนวน \${importedItems.length} รายการผ่าน Excel\`,
             user: currentUser ? currentUser.name : 'System Admin'
          }
      });

      const chunkSize = 400; // Keep space for batch
      for (let i = 0; i < allOperations.length; i += chunkSize) {
        const chunk = allOperations.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        for (const op of chunk) {
          if (op.type === 'item') {
            const itemRef = doc(db, 'inventory', op.data.id);
            const sanitizedItem = JSON.parse(JSON.stringify(op.data));
            batch.set(itemRef, sanitizedItem, { merge: true }); // Merge true to not overwrite unmentioned fields completely
          } else {
            const logRef = doc(collection(db, 'logs'), op.data.id);
            const sanitizedLog = JSON.parse(JSON.stringify(op.data));
            batch.set(logRef, sanitizedLog);
          }
        }
        
        await batch.commit();
      }
      
      // Notify assistant
      if (assistantRef.current) {
        const diffInfos = logsToCreate.map(l => l.details.split('\\n')[0] + ' ' + l.details.split('\\n')[3]).join(', ');
        assistantRef.current.notifyEvent(\`ผู้ใช้งานนำเข้า/อัปเดตสินค้าคงคลัง \${importedItems.length} รายการ มีรายการที่เปลี่ยนยอดจำนวน \${logsToCreate.length} สินค้า\nรายละเอียดคร่าวๆ: \${diffInfos ? diffInfos.substring(0, 300) + '...' : '-'}\`);
      }
    } catch (error) {
      console.error("Error importing inventory:", error);
      alert("เกิดข้อผิดพลาดในการนำเข้าข้อมูล: " + (error as Error).message);
    }
  };`;

    code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
    fs.writeFileSync(filepath, code);
    console.log('Successfully updated handleImportInventory logic');
} else {
    console.log('Failed to find markers');
}
