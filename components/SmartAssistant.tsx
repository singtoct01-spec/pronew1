




import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { ProductionJob, SIMULATED_NOW, InventoryItem, ProductBOM, ProductSpec, MachineMoldCapability, AiMessage, FormTemplate, CustomKnowledge, DowntimeLog, ShiftProductionLog } from '../types';
import { Send, Bot, X, Loader2, CheckCircle, AlertTriangle, Paperclip, Image as ImageIcon, Trash2, BrainCircuit, FileSpreadsheet, MessageSquareText, Key, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

import { formatDateTime } from '../utils/dateUtils';

interface SmartAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: ProductionJob[];
  inventory: InventoryItem[];
  boms: ProductBOM[];
  specs: ProductSpec[];
  machineCapabilities: MachineMoldCapability[];
  formTemplates?: FormTemplate[];
  customKnowledge?: CustomKnowledge[];
  downtimeLogs?: DowntimeLog[];
  shiftProductionLogs?: ShiftProductionLog[];
  onUpdateJob: (job: ProductionJob) => void;
  onCreateJob: (job: ProductionJob) => void;
  onDeleteJob?: (jobId: string) => void;
  onUpdateActuals?: (jobId: string, actuals: number, reason?: string) => void;
  onBatchUpsert?: (jobs: ProductionJob[]) => Promise<boolean> | void;
  onGenerateForm?: (html: string, title: string) => void;
  onLogDowntime?: (data: any) => void;
  onDeleteDowntimeLog?: (logId: string) => void;
  onAddKnowledge?: (topic: string, content: string, linkedData?: { type: string, id: string, name: string }[]) => void;
  onAddBom?: (bom: Omit<ProductBOM, 'id'>) => void;
  onUpdateBom?: (bom: ProductBOM) => void;
  onDeleteBom?: (id: string) => void;
  onAddInventory?: (item: Omit<InventoryItem, 'id'>) => void;
  onUpdateInventory?: (item: InventoryItem) => void;
  onDeleteInventory?: (id: string) => void;
  onChangeView?: (view: string) => void;
  onPrintTag?: (jobOrder: string) => void;
  onPrintHandover?: (jobOrders: string[]) => void;
  onOpenImportModal?: () => void;
  messages: AiMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AiMessage[]>>;
  onUpdateAiMessage?: (updatedMessage: AiMessage) => void;
}

// Define structure for selected file
type UploadedFile = {
  file: File;
  type: 'image' | 'excel' | 'pdf';
  preview?: string; // For images and PDFs
  content?: string; // For excel (parsed CSV/JSON string)
};

export const SmartAssistant: React.FC<SmartAssistantProps> = ({ 
  isOpen, 
  onClose, 
  jobs,
  inventory,
  boms,
  specs,
  machineCapabilities,
  formTemplates,
  customKnowledge,
  downtimeLogs,
  shiftProductionLogs,
  onUpdateJob,
  onCreateJob,
  onDeleteJob,
  onUpdateActuals,
  onBatchUpsert,
  onGenerateForm,
  onLogDowntime,
  onDeleteDowntimeLog,
  onAddKnowledge,
  onAddBom,
  onUpdateBom,
  onDeleteBom,
  onAddInventory,
  onUpdateInventory,
  onDeleteInventory,
  onChangeView,
  onPrintTag,
  onPrintHandover,
  onOpenImportModal,
  messages,
  setMessages,
  onUpdateAiMessage
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      // Scroll immediately
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      // And scroll again after a short delay to ensure images/content are rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 300);
    }
  }, [messages, isOpen]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Determine file type
      if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
        // Handle Excel
        await processExcelFile(file);
      } else if (file.type.startsWith('image/')) {
        // Handle Image
        processImageFile(file);
      } else if (file.type === 'application/pdf' || file.name.match(/\.pdf$/i)) {
        // Handle PDF
        processPdfFile(file);
      } else {
        alert('รองรับเฉพาะไฟล์รูปภาพ, PDF หรือ Excel (.xlsx, .xls) เท่านั้นครับ');
      }
    }
  };

  const processPdfFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedFile({
          file: file,
          type: 'pdf',
          preview: event.target.result as string
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedFile({
          file: file,
          type: 'image',
          preview: event.target.result as string
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const processExcelFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to CSV for AI consumption (Tokens efficient enough for typical planning sheets)
      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      
      setSelectedFile({
        file: file,
        type: 'excel',
        content: csvData
      });
    } catch (error) {
      console.error("Error reading excel:", error);
      alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel");
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault(); 
        const file = items[i].getAsFile();
        if (file) processImageFile(file);
        break; 
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedFile) return;

    const userMsgText = input;
    const currentFile = selectedFile;

    // Reset Input State
    setInput('');
    clearFile();

    // Add User Message to UI
    setMessages(prev => [...prev, { 
      role: 'user', 
      text: userMsgText, 
      image: currentFile?.type === 'image' ? currentFile.preview : undefined, // Display image if it is one
      fileName: currentFile && currentFile.type !== 'image' ? currentFile.file.name : undefined,
      fileType: currentFile && currentFile.type !== 'image' ? currentFile.type : undefined,
      timestamp: new Date().toISOString()
    }]);

    setIsLoading(true);

    try {
      // 1. Prepare "Second Brain" Context
      const fullSystemContext = {
        meta: {
          currentTime: SIMULATED_NOW.toISOString(),
          appName: "ProPlanner AI",
        },
        productionPlan: jobs.map(j => ({
          id: j.id,
          machine: j.machineId,
          order: j.jobOrder,
          product: j.productItem,
          status: j.status,
          totalTarget: j.totalProduction, // ยอดสั่งผลิตทั้งหมด
          actualProduced: j.actualProduction || 0, // ยอดผลิตได้จริง (Current output)
          progressPercent: j.totalProduction > 0 ? Math.round(((j.actualProduction || 0) / j.totalProduction) * 100) + '%' : '0%',
          startDate: j.startDate,
          endDate: j.endDate,
          remarks: j.remarks
        })),
        inventorySnapshot: inventory.map(i => ({
          code: i.code,
          name: i.name,
          current: i.currentStock,
          unit: i.unit,
          status: i.currentStock <= i.minStock ? 'LOW STOCK' : 'OK'
        })),
        masterData: {
            recipesBOM: boms,
            productSpecifications: specs,
            machineMoldCapabilities: machineCapabilities
        },
        savedFormTemplates: formTemplates?.map(f => ({ id: f.id, title: f.title, html: f.html })) || [],
        customKnowledge: customKnowledge?.map(k => ({ topic: k.topic, content: k.content, linkedData: k.linkedData, files: k.files?.map(f => ({ name: f.name, url: f.url })) })) || [],
        downtimeHistory: downtimeLogs?.map(d => ({ machineId: d.machineId, date: d.date, durationMinutes: d.durationMinutes, category: d.category, reason: d.reason })) || [],
        shiftProductionLogs: shiftProductionLogs?.map(s => ({ date: s.date, shift: s.shift, machineId: s.machineId, target: s.target, actual: s.actual, variance: s.variance, reason: s.reason })) || []
      };

      // 2. Initialize Gemini
      let apiKey = '';
      
      try {
        apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
      } catch (e) {
        // Ignore if process is not defined
      }
      
      if (!apiKey) {
        apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.VITE_API_KEY || '';
      }

      if (!apiKey) {
        setMessages(prev => [...prev, { role: 'model', text: 'ไม่พบ API Key ในระบบ กรุณาตั้งค่า Environment Variable GEMINI_API_KEY', timestamp: new Date().toISOString() }]);
        setIsLoading(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      
      // 3. Construct System Prompt (UPGRADED)
      const systemPrompt = `
        You are "ProPlanner Brain", a **Senior Production Manager** at KPAC Plastics Factory.
        You are intelligent, witty, proactive, and deeply understand manufacturing logistics.

        **YOUR PERSONALITY:**
        - You don't just answer; you **analyze**.
        - You know that **Machines break**, **Mold changes take time (2hrs)**, and **Color changes take time (1hr)**.
        - You are keenly aware of **"Starvation"**: Preform machines (Injection) are often SLOWER than Blow machines. If Preform stock is low, the Blow machine MUST stop.
        - You are helpful, professional, but sharp. You catch mistakes before they happen.

        **YOUR KNOWLEDGE BASE (MASTER DATA & CUSTOM KNOWLEDGE):**
        You have access to the full factory master data (provided in JSON context).
        - **Product Specs:** You know which Bottle (Jar) uses which Preform. (e.g., A01 uses P45).
        - **Machine Caps:** You know AB1 runs at ~800/hr, but IP machines might run differently.
        - **Colors:** You know changing from Black -> White is a nightmare (needs heavy cleaning).
        - **Custom Knowledge:** Pay special attention to the \`customKnowledge\` array in the context. This contains specific rules, warnings, or facts added by the user. 
          - **Data Linking:** Some knowledge items have \`linkedData\` attached (e.g., linked to a specific Machine, Product, Inventory item, or BOM). If a user asks about a specific machine (e.g., "IP1"), you MUST check if there is any custom knowledge linked to "IP1" and apply it to your answer. Always prioritize these custom rules when answering or planning.
          - **Attached Files:** Some knowledge items have \`files\` attached (with \`name\` and \`url\`). The text content of these files has already been extracted and included in the \`content\` field. You can read the extracted text directly from \`content\`. If the user asks for the file, you can provide the \`url\` as a markdown link (e.g., [Download File](url)).

        **PREDICTIVE ANALYTICS (FORECASTING):**
        - You have access to \`downtimeHistory\`, \`shiftProductionLogs\`, and current \`jobs\`.
        - **Machine Health:** Analyze the downtime history. If a machine (e.g., IP1) has frequent breakdowns or a recent major failure, warn the user that it might need maintenance soon or is at risk of breaking down again if heavily loaded.
        - **Shift Shortfalls (ตกแคป):** Analyze the \`shiftProductionLogs\`. If there are frequent shortfalls (actual < target) for a specific machine, shift, or product, identify the patterns and reasons provided. Suggest root causes or improvements based on the data.
        - **Material Shortage:** Analyze the current running jobs and inventory. If a Blow machine is running fast but the corresponding Injection machine is slow or stopped, calculate when the Preform stock will run out and warn the user (e.g., "วัตถุดิบจะหมดในอีก 5 ชั่วโมง").
        - Be proactive. If the user asks for a general update, include these predictive insights.

        **CRITICAL RULES:**
        1. **Preform Check:** If a user asks to plan a Blow Job (e.g., QE307 on AB5), CHECK PREFORM STOCK FIRST. If stock is low, WARN THEM immediately.
        2. **Breakdowns:** If a machine is 'Maintenance' (like AB7 is now), do not suggest putting jobs on it until repaired.
        3. **Optimization:** If you see short runs of different colors on one machine, suggest grouping them to save setup time.
        4. **Realism:** If a plan is impossible (e.g., producing 100k in 1 hour), say it's impossible.
        5. **Update Actuals:** If the user provides the *total* actual production for a job (e.g., "ยอดรวมตอนนี้ 60,000"), you MUST calculate the difference between the new total and the current \`actualProduction\`, and call \`updateActualProduction\` with the *difference* (e.g., actuals = 5325). Only update jobs that are currently 'Running'. If the machine is not running, warn the user.

        **DATA INTERPRETATION:**
        - \`actualProduced\` = Current output so far.
        - \`totalTarget\` = The goal.
        - Negative numbers in reports often mean "Stock Deficit" (Owe customers), but in Inventory reports, dashes '-' usually mean 0. Use context.

        **LONG-TERM MEMORY (CUSTOM KNOWLEDGE):**
        - You have a "Long-term Memory" feature. If the user tells you a specific rule, preference, or fact that should be remembered *forever* (e.g., "Machine AB1 is old", "Manager likes blue reports"), use the \`addKnowledge\` tool to save it.
        - Do not just say "I will remember". ACTUALLY save it using the tool.
        
        **RESPONSE FORMAT & ACTIONS:**
        - Talk naturally in Thai.
        - Use emojis 🏭 ⚠️ ✅ appropriately.
        - **CRITICAL: DIRECT ACTIONS (FUNCTION CALLING):** If the user asks you to perform an action (e.g., "เลื่อนงาน", "อัปเดตสถานะงาน", "บันทึกเครื่องจักรเสีย", "สร้างสูตรการผลิต", "เพิ่มสินค้า", "เปิดหน้า...", "อัปเดตยอดผลิต", "ลบงาน", "ปริ้นเอกสาร", "เปิดหน้านำเข้า", "จำว่า..."), you **MUST** use the provided tools (Function Calling) to execute the action. **DO NOT** just describe what you will do. **ACTUALLY CALL THE FUNCTION.**
        - **Navigation:** If the user asks to open a specific page (e.g., "เปิดหน้าคลังสินค้า", "พาไปดูแผนการผลิต"), use the \`navigateApp\` tool.
        - **Other Actions (JSON Block):** ONLY for actions that DO NOT have a specific tool (like batch importing schedule or generating a form), append a JSON block for Action Proposal EXACTLY in this format:
        \`\`\`json
        {
          "type": "BATCH_UPSERT",
          "data": [
            {
              "jobOrder": "B6902-055",
              "machineId": "IP1",
              "productItem": "P45",
              "moldCode": "P45",
              "capacityPerShift": 5760,
              "totalProduction": 57600,
              "actualProduction": 25200,
              "color": "-",
              "startDate": "2026-02-12T09:00:00Z",
              "endDate": "2026-02-23T20:00:00Z",
              "status": "Running",
              "remarks": ""
            }
          ]
        }
        \`\`\`
        (Use "type": "UPDATE" or "CREATE" for single actions, or "BATCH_UPSERT" for multiple jobs. For BATCH_UPSERT, the system will update existing jobs by jobOrder, or create them if they don't exist.)
        
        **FORM GENERATION (EXCEL STYLE) - CRITICAL INSTRUCTIONS:**
        - **"Did you see my form?":** If the user asks if you've seen their form, CHECK \`savedFormTemplates\` in the context FIRST. If you find one, acknowledge it by name. If they just uploaded an image, acknowledge receiving the image.
        - **Exact Replication (The "Photocopier" Rule):** When the user uploads an image of a form or asks to replicate a document, your goal is **100% VISUAL FIDELITY**.
          - **Do NOT** summarize or "improve" the layout.
          - **Do NOT** use modern UI cards.
          - **MUST** use the \`excel-like-content\` wrapper.
          - **MUST** replicate every column, every merged cell, every header exactly as shown in the image or described.
          - **Fonts:** Use \`font-family: 'Sarabun', sans-serif;\` for Thai documents.
          - **Borders:** Use \`border: 1px solid #000;\` for all cells. No soft gray borders.
        - **Confirmation:** Before generating the HTML, briefly describe what you "see" to reassure the user (e.g., "ผมเห็นเอกสาร 'ใบสั่งผลิต' ที่มี 5 คอลัมน์: ลำดับ, รายการ, จำนวน... กำลังสร้างแบบฟอร์มให้เหมือนเป๊ะครับ").
        - **Action:** Return a JSON action with \`type: 'GENERATE_FORM'\`, \`html: '<div class=\"excel-like-content\">...</div>'\`, and \`title: 'Form Title'\`.
        - **CRITICAL: HTML SIZE LIMIT:** The generated HTML must be concise. Do not generate thousands of empty rows. Generate only the rows visible in the image, or a maximum of 10 empty rows for filling. Avoid excessive inline styles; use the provided CSS classes (e.g., \`text-center\`, \`font-bold\`, \`bg-gray\`).
        
        - If the user asks to use an existing form template, refer to \`savedFormTemplates\`. Generate a new form by taking the saved \`html\` and modifying it to insert the requested data.
        
        - If the user reports a machine breakdown, setup time, or any downtime (e.g., from a LINE chat message), extract the details and return a JSON action with \`type: 'LOG_DOWNTIME'\`.
        \`\`\`json
        {
          "type": "LOG_DOWNTIME",
          "data": {
            "machineId": "AB1",
            "date": "2026-03-01T00:00:00Z",
            "durationMinutes": 45,
            "category": "Breakdown",
            "reason": "มอเตอร์ไหม้",
            "reporter": "ช่างเอ"
          }
        }
        \`\`\`
        (Category must be one of: 'Breakdown', 'Setup', 'Quality', 'Material', 'Other')
        \`\`\`json
        {
          "type": "GENERATE_FORM",
          "title": "ใบแจ้งงานผลิต",
          "html": "<div class=\\"p-8 bg-white text-black\\"><h1 class=\\"text-2xl font-bold text-center\\">ใบแจ้งงานผลิต</h1>...</div>"
        }
        \`\`\`

        **IMAGE EXTRACTION & VISION RULES:**
        - **Data Extraction:** When extracting from images or Excel files, you MUST extract ALL columns including "ชื่อสินค้า" (productItem), "ยอดการผลิตได้" (actualProduction), "Cap ต่อกะ" (capacityPerShift), "รหัสแม่พิมพ์" (moldCode), "สี" (color), and "หมายเหตุ" (remarks). Do not leave them out.
        - **Form Templates:** If the image is a form template and the user wants to create a form based on it, extract its structure and generate a \`GENERATE_FORM\` action.
        - **Quality Control (Defects):** If the user uploads an image of a defective product (NG/Defect), analyze the visual anomaly (e.g., black spots, short shot, flash, scratches, bubbles). Explain the possible root causes based on plastic injection/blow molding principles, and suggest immediate troubleshooting steps.
        - **Machine Error Screens:** If the user uploads an image of a machine error screen or alarm, read the error code/message, explain what it means, and suggest how to fix it. If it implies downtime, you can propose a \`LOG_DOWNTIME\` action.
        
        FULL SYSTEM CONTEXT:
        ${JSON.stringify(fullSystemContext)}
      `;

      // 4. Prepare Content Parts
      const contents: any[] = [];
      
      // Add conversation history (limit to last 100 messages to utilize Gemini's large context window)
      const historyMessages = messages.slice(-100);
      for (const msg of historyMessages) {
        const parts: any[] = [{ text: msg.text }];
        if (msg.image) {
          const match = msg.image.match(/^data:(image\/\w+);base64,(.*)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2]
              }
            });
          }
        }
        contents.push({ role: msg.role, parts });
      }

      const userParts: any[] = [];
      
      // Attach Text
      let finalPrompt = userMsgText;
      
      // Attach Excel Content as Text
      if (currentFile?.type === 'excel' && currentFile.content) {
          finalPrompt += `\n\n[USER UPLOADED EXCEL FILE CONTENT (CSV FORMAT)]:\n${currentFile.content}\n[END OF EXCEL FILE] - Please analyze this KPAC Preform report based on the Strict Rules provided.`;
      }
      
      if (finalPrompt) {
          userParts.push({ text: finalPrompt });
      }

      // Attach Image or PDF Content
      if ((currentFile?.type === 'image' || currentFile?.type === 'pdf') && currentFile.preview) {
        const base64Data = currentFile.preview.split(',')[1];
        userParts.push({
          inlineData: {
            mimeType: currentFile.file.type || (currentFile.type === 'pdf' ? 'application/pdf' : 'image/jpeg'),
            data: base64Data
          }
        });
      }
      
      contents.push({ role: 'user', parts: userParts });

      // Sanitize contents to ensure alternating roles (user -> model -> user -> model)
      const sanitizedContents: any[] = [];
      let lastRole = '';
      
      for (const content of contents) {
        if (content.role === lastRole) {
           // If same role, merge parts into the previous content
           sanitizedContents[sanitizedContents.length - 1].parts.push(...content.parts);
        } else {
           sanitizedContents.push(content);
           lastRole = content.role;
        }
      }

      // 4.5 Define Tools
      const rescheduleMachineJobsFunc: FunctionDeclaration = {
        name: "rescheduleMachineJobs",
        description: "เลื่อนงานทั้งหมดของเครื่องจักรที่ระบุ ไปยังวันและเวลาใหม่ (เช่น เลื่อนงานของ AB1 ไปพรุ่งนี้)",
        parameters: {
          type: Type.OBJECT,
          properties: {
            machineId: { type: Type.STRING, description: "รหัสเครื่องจักร เช่น AB1, IP1" },
            newStartDate: { type: Type.STRING, description: "วันและเวลาเริ่มต้นใหม่ (ISO 8601 format)" }
          },
          required: ["machineId", "newStartDate"]
        }
      };

      const updateJobStatusFunc: FunctionDeclaration = {
        name: "updateJobStatus",
        description: "อัปเดตสถานะของรายการผลิต",
        parameters: {
          type: Type.OBJECT,
          properties: {
            jobOrder: { type: Type.STRING, description: "หมายเลข Job Order" },
            status: { type: Type.STRING, description: "สถานะใหม่ เช่น Running, Completed, Pending, Paused" }
          },
          required: ["jobOrder", "status"]
        }
      };

      const createJobFunc: FunctionDeclaration = {
        name: "createJob",
        description: "สร้างรายการผลิตใหม่ (Job Order)",
        parameters: {
          type: Type.OBJECT,
          properties: {
            jobOrder: { type: Type.STRING, description: "รหัส Job Order (ถ้าไม่ระบุให้สร้างใหม่แบบสุ่ม)" },
            productCode: { type: Type.STRING, description: "รหัสสินค้า เช่น A01, P45" },
            machineId: { type: Type.STRING, description: "รหัสเครื่องจักร เช่น AB1, IP1" },
            targetQuantity: { type: Type.NUMBER, description: "จำนวนที่ต้องการผลิต" },
            startDate: { type: Type.STRING, description: "วันและเวลาเริ่มต้น (ISO 8601 format)" },
            endDate: { type: Type.STRING, description: "วันและเวลาสิ้นสุด (ISO 8601 format)" },
            priority: { type: Type.STRING, description: "ความสำคัญ: High, Medium, Low" }
          },
          required: ["productCode", "machineId", "targetQuantity", "startDate", "endDate"]
        }
      };

      const logDowntimeFunc: FunctionDeclaration = {
        name: "logDowntime",
        description: "บันทึกข้อมูลเครื่องจักรขัดข้อง หรือเวลาสูญเสีย",
        parameters: {
          type: Type.OBJECT,
          properties: {
            machineId: { type: Type.STRING, description: "รหัสเครื่องจักร" },
            date: { type: Type.STRING, description: "วันที่เกิดเหตุ (ISO 8601)" },
            durationMinutes: { type: Type.NUMBER, description: "ระยะเวลาที่เสีย (นาที)" },
            category: { type: Type.STRING, description: "หมวดหมู่: Breakdown, Setup, Quality, Material, Other" },
            reason: { type: Type.STRING, description: "สาเหตุ" }
          },
          required: ["machineId", "date", "durationMinutes", "category", "reason"]
        }
      };

      const deleteDowntimeLogFunc: FunctionDeclaration = {
        name: "deleteDowntimeLog",
        description: "ลบบันทึกข้อมูลเครื่องจักรขัดข้อง (Downtime Log) ออกจากระบบ",
        parameters: {
          type: Type.OBJECT,
          properties: {
            logId: { type: Type.STRING, description: "ID ของบันทึกที่ต้องการลบ" }
          },
          required: ["logId"]
        }
      };

      const addKnowledgeFunc: FunctionDeclaration = {
        name: "addKnowledge",
        description: "บันทึกความรู้ใหม่ กฎ หรือข้อเท็จจริงสำคัญลงใน Long-term Memory (เช่น 'เครื่อง AB1 มักจะมีปัญหาเรื่องความร้อน', 'ผู้จัดการชอบรายงานสีฟ้า')",
        parameters: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING, description: "หัวข้อหลัก (เช่น 'Machine AB1', 'Preferences', 'Rules')" },
            content: { type: Type.STRING, description: "เนื้อหาความรู้ที่ต้องการบันทึก" },
            linkedData: {
              type: Type.ARRAY,
              description: "ข้อมูลหลักที่เกี่ยวข้องกับความรู้นี้ (ถ้ามี)",
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: "ประเภทข้อมูล: Machine, Product, Inventory, BOM" },
                  id: { type: Type.STRING, description: "รหัสอ้างอิงของข้อมูลนั้นๆ" },
                  name: { type: Type.STRING, description: "ชื่อของข้อมูลนั้นๆ" }
                },
                required: ["type", "id", "name"]
              }
            }
          },
          required: ["topic", "content"]
        }
      };

      const createBOMFunc: FunctionDeclaration = {
        name: "createBOM",
        description: "สร้างสูตรการผลิต (BOM) ใหม่ สำหรับสินค้าที่ยังไม่มีสูตร",
        parameters: {
          type: Type.OBJECT,
          properties: {
            productItem: { type: Type.STRING, description: "ชื่อสินค้าที่ต้องการสร้างสูตร เช่น 'ขวด B01 (Clear)'" },
            materials: {
              type: Type.ARRAY,
              description: "รายการวัตถุดิบที่ใช้",
              items: {
                type: Type.OBJECT,
                properties: {
                  inventoryItemId: { type: Type.STRING, description: "ID ของวัตถุดิบในคลัง (เช่น 'p1', 'r1', 'bg1')" },
                  qtyPerUnit: { type: Type.NUMBER, description: "จำนวนที่ใช้ต่อ 1 หน่วยสินค้า" },
                  unitType: { type: Type.STRING, description: "หน่วย เช่น 'pcs', 'kg'" }
                },
                required: ["inventoryItemId", "qtyPerUnit", "unitType"]
              }
            }
          },
          required: ["productItem", "materials"]
        }
      };

      const navigateAppFunc: FunctionDeclaration = {
        name: "navigateApp",
        description: "เปลี่ยนหน้าจอไปยังเมนูต่างๆ ในระบบ",
        parameters: {
          type: Type.OBJECT,
          properties: {
            view: { 
              type: Type.STRING, 
              description: "หน้าจอที่ต้องการไป: dashboard (ภาพรวม), plan (แผนการผลิต), analysis (วิเคราะห์), schedule (ไทม์ไลน์), list (รายการงาน), machines (เครื่องจักร), inventory (คลังสินค้า), master-data (ข้อมูลหลัก), history (ประวัติ), form-templates (แบบฟอร์มเอกสาร), users (ผู้ใช้งาน), shift-production (ยอดผลิตรายกะ)" 
            }
          },
          required: ["view"]
        }
      };

      const addInventoryFunc: FunctionDeclaration = {
        name: "addInventory",
        description: "เพิ่มรายการสินค้าคงคลังใหม่ (FG หรือ วัตถุดิบ)",
        parameters: {
          type: Type.OBJECT,
          properties: {
            code: { type: Type.STRING, description: "รหัสสินค้า/วัตถุดิบ" },
            name: { type: Type.STRING, description: "ชื่อสินค้า/วัตถุดิบ" },
            category: { type: Type.STRING, description: "หมวดหมู่ (FG, Preform, Resin, Color, Packaging, Other)" },
            currentStock: { type: Type.NUMBER, description: "จำนวนที่มีอยู่ปัจจุบัน" },
            minStock: { type: Type.NUMBER, description: "จุดสั่งซื้อ/จำนวนขั้นต่ำ" },
            unit: { type: Type.STRING, description: "หน่วยนับ (pcs, kg, pack, etc.)" },
            location: { type: Type.STRING, description: "สถานที่จัดเก็บ (เช่น WH1, Zone A)" }
          },
          required: ["code", "name", "category", "currentStock", "minStock", "unit"]
        }
      };

      const updateActualProductionFunc: FunctionDeclaration = {
        name: "updateActualProduction",
        description: "อัปเดตยอดผลิตที่ทำได้จริงของงาน",
        parameters: {
          type: Type.OBJECT,
          properties: {
            jobOrder: { type: Type.STRING, description: "หมายเลข Job Order" },
            actuals: { type: Type.NUMBER, description: "จำนวนยอดผลิตที่ต้องการเพิ่มเข้าไป" },
            reason: { type: Type.STRING, description: "หมายเหตุ (ถ้ามี)" }
          },
          required: ["jobOrder", "actuals"]
        }
      };

      const deleteJobFunc: FunctionDeclaration = {
        name: "deleteJob",
        description: "ลบรายการผลิต (Job Order) ออกจากระบบ",
        parameters: {
          type: Type.OBJECT,
          properties: {
            jobOrder: { type: Type.STRING, description: "หมายเลข Job Order ที่ต้องการลบ" }
          },
          required: ["jobOrder"]
        }
      };

      const printDocumentFunc: FunctionDeclaration = {
        name: "printDocument",
        description: "พิมพ์เอกสารต่างๆ เช่น ใบแท็ก (Tag), ใบส่งมอบงาน (Handover), หรือ แผนการผลิต (Plan)",
        parameters: {
          type: Type.OBJECT,
          properties: {
            documentType: { type: Type.STRING, description: "ประเภทเอกสาร: 'tag', 'handover', 'plan'" },
            jobOrders: { 
              type: Type.ARRAY, 
              description: "หมายเลข Job Order ที่ต้องการพิมพ์ (จำเป็นสำหรับ tag และ handover)",
              items: { type: Type.STRING }
            }
          },
          required: ["documentType"]
        }
      };

      const openImportModalFunc: FunctionDeclaration = {
        name: "openImportModal",
        description: "เปิดหน้าต่างนำเข้าแผนการผลิตจาก Excel / Google Sheets",
        parameters: {
          type: Type.OBJECT,
          properties: {}
        }
      };

      // 5. Call API
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: sanitizedContents,
        config: {
          systemInstruction: systemPrompt,
          tools: [{ functionDeclarations: [
            rescheduleMachineJobsFunc, updateJobStatusFunc, createJobFunc, 
            logDowntimeFunc, deleteDowntimeLogFunc, addKnowledgeFunc, createBOMFunc, navigateAppFunc, 
            addInventoryFunc, updateActualProductionFunc, deleteJobFunc, 
            printDocumentFunc, openImportModalFunc
          ] }]
        }
      });

      let responseText = '';
      try {
        responseText = response.text || '';
      } catch (e) {
        // No text part
      }
      
      // 6. Parse Response
      let actionProposal = null;
      let functionVerifiedAction: any = null;
      let displayText = responseText;
      let pendingFunctionCalls: any[] = [];

      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          const readOnlyActions = ['navigateApp', 'printDocument', 'openImportModal'];
          if (readOnlyActions.includes(call.name)) {
            // Execute read-only actions immediately
            if (call.name === 'navigateApp') {
              if (onChangeView) {
                const { view } = call.args as any;
                onChangeView(view);
                displayText += `\n\n⚡ **ดำเนินการอัตโนมัติ:** เปิดหน้า ${view} ให้เรียบร้อยแล้วครับ`;
              }
            } else if (call.name === 'printDocument') {
              const { documentType, jobOrders } = call.args as any;
              if (documentType === 'tag' && onPrintTag && jobOrders && jobOrders.length > 0) {
                onPrintTag(jobOrders[0]);
                displayText += `\n\n⚡ **ดำเนินการอัตโนมัติ:** เปิดหน้าพิมพ์ใบแท็กสำหรับงาน ${jobOrders[0]} แล้วครับ`;
              } else if (documentType === 'handover' && onPrintHandover && jobOrders && jobOrders.length > 0) {
                onPrintHandover(jobOrders);
                displayText += `\n\n⚡ **ดำเนินการอัตโนมัติ:** เปิดหน้าพิมพ์ใบส่งมอบงานแล้วครับ`;
              } else if (documentType === 'plan' && onChangeView) {
                onChangeView('plan-print');
                displayText += `\n\n⚡ **ดำเนินการอัตโนมัติ:** เปิดหน้าพิมพ์แผนการผลิตแล้วครับ`;
              } else {
                displayText += `\n\n⚡ **ดำเนินการอัตโนมัติ:** ไม่สามารถพิมพ์เอกสารได้ (ข้อมูลไม่ครบถ้วน หรือ Missing handler)`;
              }
            } else if (call.name === 'openImportModal') {
              if (onOpenImportModal) {
                onOpenImportModal();
                displayText += `\n\n⚡ **ดำเนินการอัตโนมัติ:** เปิดหน้าต่างนำเข้าแผนการผลิตจาก Excel ให้แล้วครับ`;
              }
            }
          } else {
            // Queue data-modifying actions for confirmation
            pendingFunctionCalls.push({
              name: call.name,
              args: call.args
            });
          }
        }
        
        if (pendingFunctionCalls.length > 0) {
          displayText += `\n\n⏳ **รอการยืนยัน:** ผมเตรียมคำสั่งปรับปรุงข้อมูลไว้แล้ว กรุณากดยืนยันด้านล่างเพื่อดำเนินการครับ`;
        }
      } else {
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            actionProposal = JSON.parse(jsonMatch[1]);
            displayText = responseText.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
          } catch (e) {
            console.error("Failed to parse AI JSON action", e);
          }
        }
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: displayText,
        actionProposal,
        pendingFunctionCalls: pendingFunctionCalls.length > 0 ? pendingFunctionCalls : undefined,
        verifiedAction: functionVerifiedAction,
        timestamp: new Date().toISOString()
      }]);

    } catch (error: any) {
      console.error("AI Error:", error);
      let errorMessage = 'ระบบสมองกลขัดข้องชั่วคราว (Network/API Error) กรุณาตรวจสอบ API Key หรือการเชื่อมต่ออินเทอร์เน็ตครับ';
      
      // Robust error string extraction
      let errStr = '';
      if (typeof error === 'string') {
        errStr = error;
      } else if (error.message) {
        errStr = error.message;
      } else if (error.error && error.error.message) {
        // Handle nested error object from Google API
        errStr = JSON.stringify(error.error);
      } else {
        try {
          errStr = JSON.stringify(error);
        } catch (e) {
          errStr = 'Unknown error';
        }
      }

      let apiKey = '';
      try {
        apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
      } catch (e) {
        // Ignore if process is not defined
      }
      if (!apiKey) {
        apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.VITE_API_KEY || '';
      }
      const keyHint = apiKey && apiKey.length > 4 
        ? `...${apiKey.slice(-4)}` 
        : '(System Key)';

      if (errStr.includes('API key not valid') || errStr.includes('400') || errStr.includes('INVALID_ARGUMENT')) {
        errorMessage = `API Key (${keyHint}) ไม่ถูกต้อง`;
      } else if (errStr.includes('quota') || errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = `โควต้าการใช้งาน API เต็ม (Quota Exceeded) สำหรับคีย์ ${keyHint}`;
      } else if (errStr.includes('network') || errStr.includes('fetch')) {
        errorMessage = 'เกิดปัญหาการเชื่อมต่ออินเทอร์เน็ต (Network Error) กรุณาตรวจสอบสัญญาณเน็ตครับ';
      } else {
         errorMessage = `เกิดข้อผิดพลาด: ${errStr.substring(0, 100)}... (Key: ${keyHint})`;
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: errorMessage,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getLiveStatus = (action: any) => {
    if (!action || !action.data) return null;
    
    // BATCH_UPSERT
    if (action.type === 'BATCH_UPSERT' && Array.isArray(action.data)) {
      const jobOrders = action.data.map((j: any) => j.jobOrder).filter(Boolean);
      const liveJobs = jobs.filter(j => jobOrders.includes(j.jobOrder));
      return {
        _status: `พบข้อมูลในระบบ ${liveJobs.length} จาก ${jobOrders.length} รายการ`,
        liveData: liveJobs.map(j => ({ 
          jobOrder: j.jobOrder, 
          productItem: j.productItem,
          status: j.status, 
          actual: j.actualProduction, 
          target: j.totalProduction, 
          machine: j.machineId 
        }))
      };
    }

    if (action.type === 'FUNCTION_CALLS_EXECUTED' && Array.isArray(action.data)) {
      const jobOrders: string[] = [];
      action.data.forEach((call: any) => {
        if (call.args && call.args.jobOrder) {
          jobOrders.push(call.args.jobOrder);
        }
      });
      if (jobOrders.length > 0) {
        const liveJobs = jobs.filter(j => jobOrders.includes(j.jobOrder));
        return {
          _status: `พบข้อมูลในระบบ ${liveJobs.length} จากที่ดำเนินการ ${jobOrders.length} รายการ`,
          liveData: liveJobs.map(j => ({ 
            jobOrder: j.jobOrder, 
            productItem: j.productItem,
            status: j.status, 
            actual: j.actualProduction, 
            target: j.totalProduction, 
            machine: j.machineId 
          }))
        };
      }
      return { _status: 'ดำเนินการเสร็จสิ้น (ไม่มีข้อมูล Job Order ให้ตรวจสอบ)' };
    }
    
    // Single UPDATE or CREATE or updateJobStatus
    const jobOrder = action.data.jobOrder;
    if (jobOrder) {
      const liveJob = jobs.find(j => j.jobOrder === jobOrder);
      if (liveJob) {
        return {
          _status: 'พบข้อมูลในระบบ (Found)',
          liveData: { 
            jobOrder: liveJob.jobOrder, 
            productItem: liveJob.productItem,
            status: liveJob.status, 
            actual: liveJob.actualProduction, 
            target: liveJob.totalProduction, 
            machine: liveJob.machineId 
          }
        };
      } else {
        return { _status: 'ไม่พบข้อมูลในระบบ (Not Found)' };
      }
    }
    
    // Fallback for other actions
    return action.data;
  };

  const executePendingFunctionCalls = async (calls: any[], msgIndex: number, callIndexToExecute?: number) => {
    let responseText = '';
    let executedCount = 0;
    let hasError = false;

    const callsToExecute = callIndexToExecute !== undefined ? [calls[callIndexToExecute]] : calls;

    for (const call of callsToExecute) {
      try {
        if (call.name === 'rescheduleMachineJobs') {
          const { machineId, newStartDate } = call.args as any;
          const machineJobs = jobs.filter(j => j.machineId === machineId).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
          if (machineJobs.length > 0) {
            const startDiff = new Date(newStartDate).getTime() - new Date(machineJobs[0].startDate).getTime();
            const updatedJobs = machineJobs.map(job => ({
              ...job,
              startDate: new Date(new Date(job.startDate).getTime() + startDiff).toISOString(),
              endDate: new Date(new Date(job.endDate).getTime() + startDiff).toISOString(),
            }));
            if (onBatchUpsert) {
              const success = await onBatchUpsert(updatedJobs);
              if (success === false) {
                responseText += `\n❌ เลื่อนงานของเครื่อง ${machineId} ล้มเหลว`;
                hasError = true;
                continue;
              }
            } else {
              updatedJobs.forEach(j => onUpdateJob(j));
            }
            responseText += `\n✅ เลื่อนงานของเครื่อง ${machineId} ไปเริ่มวันที่ ${formatDateTime(newStartDate)} เรียบร้อยแล้ว`;
            executedCount++;
          } else {
            responseText += `\n⚠️ ไม่พบงานของเครื่อง ${machineId}`;
          }
        } else if (call.name === 'updateJobStatus') {
          const { jobOrder, status } = call.args as any;
          const targetJob = jobs.find(j => j.jobOrder === jobOrder);
          if (targetJob) {
            onUpdateJob({ ...targetJob, status: status as any });
            responseText += `\n✅ อัปเดตสถานะงาน ${jobOrder} เป็น ${status} เรียบร้อยแล้ว`;
            executedCount++;
          } else {
            responseText += `\n⚠️ ไม่พบงาน ${jobOrder}`;
          }
        } else if (call.name === 'createJob') {
          const args = call.args as any;
          const newJob: ProductionJob = {
            id: `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            jobOrder: args.jobOrder || `JO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            productItem: args.productCode || args.productItem || args.product || 'New Item',
            machineId: args.machineId || 'Unknown',
            totalProduction: args.targetQuantity || args.totalProduction || 0,
            actualProduction: 0,
            capacityPerShift: args.capacityPerShift || args.capacity || 0,
            startDate: args.startDate || SIMULATED_NOW.toISOString(),
            endDate: args.endDate || SIMULATED_NOW.toISOString(),
            status: 'Running',
            color: args.color || '-',
            moldCode: args.moldCode || args.mold || 'Standard'
          };
          if (onCreateJob) {
            onCreateJob(newJob);
            responseText += `\n✅ สร้างรายการผลิต ${newJob.jobOrder} สำหรับสินค้า ${newJob.productItem} บนเครื่อง ${newJob.machineId} เรียบร้อยแล้ว`;
            executedCount++;
          } else {
            responseText += `\n❌ ไม่สามารถสร้างรายการผลิตได้`;
          }
        } else if (call.name === 'logDowntime') {
           if (onLogDowntime) {
             onLogDowntime(call.args);
             responseText += `\n✅ บันทึกข้อมูลเครื่องจักรขัดข้อง (${(call.args as any).machineId} - ${(call.args as any).reason}) เรียบร้อยแล้ว`;
             executedCount++;
           }
        } else if (call.name === 'addKnowledge') {
          if (onAddKnowledge) {
            const { topic, content, linkedData } = call.args as any;
            onAddKnowledge(topic, content, linkedData);
            responseText += `\n✅ บันทึกข้อมูลเรื่อง "${topic}" ไว้ในหน่วยความจำระยะยาวแล้ว`;
            executedCount++;
          }
        } else if (call.name === 'createBOM') {
          if (onAddBom) {
            const { productItem, materials } = call.args as any;
            onAddBom({ productItem, materials });
            responseText += `\n✅ สร้างสูตรการผลิต (BOM) สำหรับ "${productItem}" เรียบร้อยแล้ว`;
            executedCount++;
          } else {
            responseText += `\n❌ ไม่สามารถสร้างสูตรการผลิตได้`;
          }
        } else if (call.name === 'addInventory') {
          if (onAddInventory) {
            const { code, name, category, currentStock, minStock, unit, location } = call.args as any;
            onAddInventory({ code, name, category, currentStock, minStock, unit, location });
            responseText += `\n✅ เพิ่มรายการสินค้า/วัตถุดิบ "${name}" (${code}) ลงในคลังเรียบร้อยแล้ว`;
            executedCount++;
          } else {
            responseText += `\n❌ ไม่สามารถเพิ่มรายการสินค้าได้`;
          }
        } else if (call.name === 'updateActualProduction') {
          if (onUpdateActuals) {
            const { jobOrder, actuals, reason } = call.args as any;
            const targetJob = jobs.find(j => j.jobOrder === jobOrder);
            if (targetJob) {
              onUpdateActuals(targetJob.id, actuals, reason);
              responseText += `\n✅ อัปเดตยอดผลิตงาน ${jobOrder} เพิ่ม ${actuals} ชิ้น เรียบร้อยแล้ว`;
              executedCount++;
            } else {
              responseText += `\n⚠️ ไม่พบงาน ${jobOrder}`;
            }
          }
        } else if (call.name === 'deleteJob') {
          if (onDeleteJob) {
            const { jobOrder } = call.args as any;
            const targetJob = jobs.find(j => j.jobOrder === jobOrder);
            if (targetJob) {
              onDeleteJob(targetJob.id);
              responseText += `\n✅ ลบงาน ${jobOrder} ออกจากระบบเรียบร้อยแล้ว`;
              executedCount++;
            } else {
              responseText += `\n⚠️ ไม่พบงาน ${jobOrder}`;
            }
          }
        } else if (call.name === 'deleteDowntimeLog') {
          if (onDeleteDowntimeLog) {
            const { logId } = call.args as any;
            onDeleteDowntimeLog(logId);
            responseText += `\n✅ ลบบันทึกเครื่องจักรขัดข้อง (${logId}) ออกจากระบบเรียบร้อยแล้ว`;
            executedCount++;
          }
        }
      } catch (error) {
        console.error("Error executing function call:", call.name, error);
        responseText += `\n❌ เกิดข้อผิดพลาดในการดำเนินการ ${call.name}`;
        hasError = true;
      }
    }

    setMessages(prev => {
      const newMessages = [...prev];
      let remainingCalls: any[] | undefined = undefined;

      if (newMessages[msgIndex]) {
        if (callIndexToExecute !== undefined) {
          // Remove only the executed call
          const updatedCalls = [...calls];
          updatedCalls.splice(callIndexToExecute, 1);
          remainingCalls = updatedCalls.length > 0 ? updatedCalls : undefined;
          
          // Remove from old message
          newMessages[msgIndex] = { 
            ...newMessages[msgIndex], 
            pendingFunctionCalls: undefined 
          };
        } else {
          // Remove all calls
          newMessages[msgIndex] = { ...newMessages[msgIndex], pendingFunctionCalls: undefined };
        }
        
        // Notify parent to update Firestore
        if (onUpdateAiMessage) {
          onUpdateAiMessage(newMessages[msgIndex]);
        }
      }
      
      newMessages.push({ 
        role: 'model', 
        text: `ดำเนินการเสร็จสิ้น ${executedCount} รายการ:\n${responseText}`, 
        timestamp: new Date().toISOString(),
        verifiedAction: { type: 'FUNCTION_CALLS_EXECUTED', data: callsToExecute },
        pendingFunctionCalls: remainingCalls
      });
      
      return newMessages;
    });
  };

  const executeAction = async (proposal: any, msgIndex: number) => {
    const type = proposal.type ? String(proposal.type).toUpperCase() : '';
    let responseText = '';

    if (type === 'UPDATE') {
      const targetJob = jobs.find(j => 
        j.jobOrder === proposal.data?.jobOrder || 
        j.id === proposal.data?.id || 
        (j.machineId === proposal.data?.machineId && j.productItem === proposal.data?.productItem)
      );
      
      if (targetJob) {
        const updatedJob = { ...targetJob, ...proposal.data };
        onUpdateJob(updatedJob);
        responseText = `✅ บันทึกการแก้ไขข้อมูล ${targetJob.jobOrder || targetJob.productItem} เรียบร้อย`;
      } else {
        responseText = `❌ ไม่พบรายการผลิตที่ตรงกันในระบบครับ (อ้างอิง: ${proposal.data?.jobOrder || proposal.data?.productItem || 'ไม่ระบุ'})`;
      }
    } else if (type === 'CREATE') {
      const newJob: ProductionJob = {
         id: `new-${Date.now()}`,
         machineId: proposal.data?.machineId || proposal.data?.machine || 'Unknown',
         productItem: proposal.data?.productItem || proposal.data?.product || proposal.data?.item || proposal.data?.productCode || 'New Item',
         moldCode: proposal.data?.moldCode || proposal.data?.mold || '-',
         jobOrder: proposal.data?.jobOrder || `AUTO-${Date.now()}`,
         capacityPerShift: proposal.data?.capacityPerShift || proposal.data?.capacity || 0,
         totalProduction: proposal.data?.totalProduction || proposal.data?.target || proposal.data?.targetQuantity || 0,
         actualProduction: proposal.data?.actualProduction || proposal.data?.actual || proposal.data?.actualProduced || 0,
         color: proposal.data?.color || '-',
         startDate: proposal.data?.startDate || SIMULATED_NOW.toISOString(),
         endDate: proposal.data?.endDate || SIMULATED_NOW.toISOString(),
         status: proposal.data?.status || 'Running',
         ...proposal.data
      };
      onCreateJob(newJob);
      responseText = `✅ สร้างรายการผลิตใหม่ ${newJob.jobOrder} ลงตารางเรียบร้อย`;
    } else if (type === 'BATCH_UPSERT' && Array.isArray(proposal.data)) {
      let created = 0;
      let updated = 0;
      const batchJobs: ProductionJob[] = [];
      
      proposal.data.forEach((item: any, index: number) => {
        const targetJob = jobs.find(j => 
          (item.jobOrder && j.jobOrder === item.jobOrder) || 
          (item.id && j.id === item.id)
        );

        if (targetJob) {
          const updatedJob = { 
            ...targetJob, 
            ...item, 
            id: targetJob.id,
            productItem: item.productItem || item.product || item.item || item.productCode || targetJob.productItem,
            moldCode: item.moldCode || item.mold || targetJob.moldCode,
            machineId: item.machineId || item.machine || targetJob.machineId,
            capacityPerShift: item.capacityPerShift || item.capacity || targetJob.capacityPerShift,
            totalProduction: item.totalProduction || item.target || item.targetQuantity || targetJob.totalProduction,
            actualProduction: item.actualProduction || item.actual || item.actualProduced || targetJob.actualProduction,
          };
          batchJobs.push(updatedJob);
          updated++;
        } else {
          const newJob: ProductionJob = {
             machineId: item.machineId || item.machine || 'Unknown',
             productItem: item.productItem || item.product || item.item || item.productCode || 'New Item',
             moldCode: item.moldCode || item.mold || '-',
             jobOrder: item.jobOrder || `AUTO-${Date.now()}-${index}`,
             capacityPerShift: item.capacityPerShift || item.capacity || 0,
             totalProduction: item.totalProduction || item.target || item.targetQuantity || 0,
             actualProduction: item.actualProduction || item.actual || item.actualProduced || 0,
             color: item.color || '-',
             startDate: item.startDate || SIMULATED_NOW.toISOString(),
             endDate: item.endDate || SIMULATED_NOW.toISOString(),
             status: item.status || 'Running',
             ...item,
             id: item.id || `new-${Date.now()}-${index}`
          };
          batchJobs.push(newJob);
          created++;
        }
      });
      
      if (onBatchUpsert) {
        const success = await onBatchUpsert(batchJobs);
        if (success === false) {
           responseText = `❌ เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูลครับ`;
           setMessages(prev => {
             const newMessages = [...prev];
             if (newMessages[msgIndex]) {
               newMessages[msgIndex] = { ...newMessages[msgIndex], actionProposal: undefined };
               if (onUpdateAiMessage) {
                 onUpdateAiMessage(newMessages[msgIndex]);
               }
             }
             newMessages.push({ 
               role: 'model', 
               text: responseText, 
               timestamp: new Date().toISOString()
             });
             return newMessages;
           });
           return;
        }
      } else {
        // Fallback if onBatchUpsert is not provided
        batchJobs.forEach(job => {
          if (jobs.find(j => j.id === job.id)) onUpdateJob(job);
          else onCreateJob(job);
        });
      }
      
      responseText = `✅ นำเข้าข้อมูลสำเร็จ: สร้างใหม่ ${created} รายการ, อัปเดต ${updated} รายการ`;
    } else if (type === 'GENERATE_FORM') {
      if (onGenerateForm && proposal.html) {
        onGenerateForm(proposal.html, proposal.title || 'เอกสารที่สร้างโดย AI');
        responseText = `✅ สร้างเอกสาร "${proposal.title || 'เอกสาร'}" เรียบร้อยแล้ว ระบบกำลังเปิดหน้าต่างเอกสาร...`;
      } else {
        responseText = `❌ ไม่สามารถสร้างเอกสารได้ (ระบบไม่รองรับ หรือ ข้อมูล HTML ไม่สมบูรณ์)`;
      }
    } else if (type === 'LOG_DOWNTIME') {
      if (onLogDowntime && proposal.data) {
        onLogDowntime(proposal.data);
        const dataPreview = Array.isArray(proposal.data) ? proposal.data[0] : proposal.data;
        responseText = `✅ บันทึกข้อมูลเครื่องจักรขัดข้อง (${dataPreview?.machineId || 'หลายรายการ'} - ${dataPreview?.reason || ''}) เรียบร้อยแล้ว`;
      } else {
        responseText = `❌ ไม่สามารถบันทึกข้อมูลเครื่องจักรขัดข้องได้`;
      }
    } else {
      responseText = `❌ รูปแบบคำสั่งไม่ถูกต้อง (Unknown Action Type: ${proposal.type || 'None'})`;
    }

    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages[msgIndex]) {
        newMessages[msgIndex] = { ...newMessages[msgIndex], actionProposal: undefined };
        if (onUpdateAiMessage) {
          onUpdateAiMessage(newMessages[msgIndex]);
        }
      }
      newMessages.push({ 
        role: 'model', 
        text: responseText, 
        timestamp: new Date().toISOString(),
        verifiedAction: { type, data: proposal.data }
      });
      return newMessages;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300 font-kanit">
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <BrainCircuit size={24} />
          </div>
          <div>
            <h2 className="font-bold text-lg">ProPlanner Brain</h2>
            <p className="text-xs text-indigo-200">
               ระบบอัจฉริยะ & ฐานข้อมูล Master
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
            }`}>
              
              {/* Header Info */}
              <div className={`flex items-center gap-2 mb-2 text-[10px] font-medium ${msg.role === 'user' ? 'text-indigo-200 justify-end' : 'text-slate-500'}`}>
                {msg.role === 'user' ? 'คุณ' : 'ProPlanner Brain'}
              </div>

              {/* Image Preview in Chat History */}
              {msg.image && (
                <div className="mb-3 rounded-lg overflow-hidden border border-white/20">
                  <img src={msg.image} alt="User upload" className="w-full h-auto object-cover max-h-48" />
                </div>
              )}

              {/* File Attachment in Chat History */}
              {msg.fileName && (
                <div className={`mb-3 flex items-center gap-2 p-2 rounded-lg ${msg.role === 'user' ? 'bg-indigo-700/50 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {msg.fileType === 'pdf' ? <FileText size={20} className={msg.role === 'user' ? "text-white" : "text-red-500"}/> : <FileSpreadsheet size={20} className={msg.role === 'user' ? "text-white" : "text-emerald-600"}/>}
                  <span className="text-xs font-mono truncate">{msg.fileName}</span>
                </div>
              )}

              {/* Special rendering if user uploaded Excel but didn't type text (or mixed) */}
              {msg.text.includes("[USER UPLOADED EXCEL FILE CONTENT") && msg.role === 'user' && !msg.fileName ? (
                  <div className="mb-2 flex items-center gap-2 bg-indigo-700/50 p-2 rounded-lg">
                      <FileSpreadsheet size={20} className="text-white"/>
                      <span className="text-xs font-mono">แนบไฟล์ Excel แล้ว</span>
                  </div>
              ) : null}
              
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text.replace(/\[USER UPLOADED EXCEL FILE CONTENT[\s\S]*$/, '')}</div>
              
              {/* Action Proposal Card */}
              {msg.actionProposal && (
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="text-indigo-600 shrink-0" size={16} />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Action Required: {msg.actionProposal.type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-100 mb-3 font-mono overflow-x-auto max-h-32">
                    {JSON.stringify(msg.actionProposal.data, null, 2)}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => executeAction(msg.actionProposal, idx)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1"
                    >
                      <CheckCircle size={14} /> ยืนยัน (Approve)
                    </button>
                  </div>
                </div>
              )}

              {/* Pending Function Calls Card */}
              {msg.pendingFunctionCalls && msg.pendingFunctionCalls.length > 0 && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                      รอการยืนยันดำเนินการ ({msg.pendingFunctionCalls.length} รายการ)
                    </span>
                  </div>
                  <div className="space-y-2 mb-3">
                    {msg.pendingFunctionCalls.map((call, callIdx) => (
                      <div key={callIdx} className="text-xs text-slate-700 bg-white p-2 rounded border border-amber-100 font-mono overflow-x-auto">
                        <div className="font-bold text-amber-700 mb-1">{call.name}</div>
                        <div className="text-slate-500 whitespace-pre-wrap">{JSON.stringify(call.args, null, 2)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 mt-2">
                    {msg.pendingFunctionCalls.map((call, callIdx) => (
                      <button 
                        key={callIdx}
                        onClick={() => executePendingFunctionCalls(msg.pendingFunctionCalls!, idx, callIdx)}
                        className="w-full bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 text-xs py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 shadow-sm"
                      >
                        <CheckCircle size={14} /> ยืนยันรายการที่ {callIdx + 1} ({call.name})
                      </button>
                    ))}
                    {msg.pendingFunctionCalls.length > 1 && (
                      <button 
                        onClick={() => executePendingFunctionCalls(msg.pendingFunctionCalls!, idx)}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 shadow-sm mt-1"
                      >
                        <CheckCircle size={14} /> ยืนยันดำเนินการทั้งหมด ({msg.pendingFunctionCalls.length} รายการ)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Verified Action Card */}
              {msg.verifiedAction && (
                <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-start gap-2 mb-2">
                    <CheckCircle className="text-emerald-600 shrink-0" size={16} />
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                      ดำเนินการแล้ว (Executed)
                    </span>
                  </div>
                  <details className="text-xs text-slate-600 bg-white rounded border border-emerald-100 mb-1 overflow-hidden">
                    <summary className="p-2 cursor-pointer font-medium hover:bg-slate-50 outline-none flex justify-between items-center">
                      <span>ตรวจสอบข้อมูลจริงในระบบ (Verify Live Data)</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Live</span>
                    </summary>
                    <div className="p-2 border-t border-emerald-100 font-mono overflow-x-auto max-h-48 bg-slate-50">
                      {JSON.stringify(getLiveStatus(msg.verifiedAction), null, 2)}
                    </div>
                  </details>
                </div>
              )}

              {/* Timestamp at bottom right */}
              <div className={`text-[10px] mt-2 text-right ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                {msg.timestamp ? formatDateTime(msg.timestamp) : ''}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-500" />
                <span className="text-xs text-slate-500">กำลังประมวลผลข้อมูล...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        
        {/* File Preview before sending */}
        {selectedFile && (
          <div className="mb-3 flex items-center gap-3 bg-slate-100 p-2 rounded-lg border border-slate-200 animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-12 rounded bg-white border border-slate-300 overflow-hidden flex-shrink-0 flex items-center justify-center">
               {selectedFile.type === 'image' ? (
                   <img src={selectedFile.preview} alt="Preview" className="w-full h-full object-cover" />
               ) : selectedFile.type === 'pdf' ? (
                   <FileText size={24} className="text-red-500" />
               ) : (
                   <FileSpreadsheet size={24} className="text-emerald-600" />
               )}
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-xs font-medium text-slate-700 truncate">{selectedFile.file.name}</p>
               <p className="text-[10px] text-slate-500">{(selectedFile.file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={clearFile} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          {/* File Input Hidden */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*,.xlsx,.xls,.csv,.pdf"
            className="hidden" 
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-3 rounded-xl transition-colors border border-slate-200"
            title="แนบรูปภาพ, PDF หรือ ไฟล์ Excel"
            disabled={isLoading}
          >
            {selectedFile ? (
                selectedFile.type === 'image' ? <ImageIcon size={20} className="text-indigo-600"/> : 
                selectedFile.type === 'pdf' ? <FileText size={20} className="text-red-500"/> :
                <FileSpreadsheet size={20} className="text-emerald-600"/>
            ) : <Paperclip size={20} />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            onPaste={handlePaste}
            placeholder={selectedFile ? "พิมพ์คำสั่ง..." : "ถาม AI เรื่องผลิต, สต็อก, ถ่ายรูปของเสีย/Error..."}
            className="flex-1 px-4 py-3 bg-slate-100 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 placeholder-slate-400"
            disabled={isLoading}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !selectedFile)}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white p-3 rounded-xl transition-colors shadow-lg shadow-indigo-200"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-2 flex items-center justify-center gap-1">
           <MessageSquareText size={10} /> รองรับการสรุปแชทไลน์, วิเคราะห์แผน, วิเคราะห์รูปของเสีย/Error, และพยากรณ์แนวโน้ม (Predictive)
        </p>
      </div>
    </div>
  );
};
