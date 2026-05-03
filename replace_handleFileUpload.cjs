const fs = require('fs');
const filepath = './components/InventoryImportModal.tsx';
let code = fs.readFileSync(filepath, 'utf8');

const startMarker = 'const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {';
const endMarker = 'reader.readAsBinaryString(file);';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker) + endMarker.length;

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Read as array of arrays to detect format
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        const importedItems = processExcelData(rawData);
        
        executeImport(importedItems);
      } catch (err: any) {
        setError(err.message || 'ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบรูปแบบไฟล์');
      }
    };
    reader.readAsBinaryString(file);`;

  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync(filepath, code);
  console.log('Successfully updated handleFileUpload to use processExcelData');
} else {
  console.log('Failed to find markers');
}
