


export type Status = 'Running' | 'Completed' | 'Delayed' | 'Stopped' | 'Paused' | 'Maintenance' | 'No Plan' | 'Rescheduled' | 'Planned';

export interface RawMaterial {
  id: string;
  inventoryItemId?: string; // Link back to Inventory
  name: string;
  qtyPcs: number;
  qtyKg: number;
  unit: string;
  lotNo: string;
  remarks: string;
}

export interface InventoryItem {
  id: string;
  code: string; 
  category: 'Resin' | 'Box' | 'Bag' | 'Pigment' | 'Other' | 'FG' | 'Preform';
  name: string;
  usage: string; 
  currentStock: number;
  unit: string;
  minStock: number;
  maxStock: number;
  remarks?: string;
  location?: string;
  lastUpdated?: string;
  group?: string;
  unitPrice?: number;
}

export interface ProductBOM {
  id?: string;
  productItem: string; 
  materials: {
    inventoryItemId: string;
    qtyPerUnit: number; 
    unitType: 'pcs' | 'kg' | string;
    alternativeItemId?: string;
    alternativeRatio?: number;
  }[];
  version?: number;
  status?: 'Active' | 'Archived';
  imageUrl?: string;
  sopUrl?: string;
}

export interface ProductionJob {
  id: string;
  machineId: string;
  productItem: string;
  productType?: string;
  structure?: string;
  moldCode: string;
  jobOrder: string;
  capacityPerShift: number;
  totalProduction: number;
  actualProduction?: number; // Added actual production field
  yesterdayProduction?: number; // Added for analysis
  color: string;
  weightG?: number;
  mouthWidthMm?: number;
  heightMm?: number;
  widthMm?: number; 
  capacityMl?: number;
  startDate: string; // ISO String
  endDate: string; // ISO String
  status: Status;
  priority?: 'Normal' | 'Urgent'; 
  jobType?: 'Planned' | 'Inserted' | 'Rework';
  remarks?: string;
  additionalRequirements?: string;
  packagingMethod?: string;
  materials?: RawMaterial[];
}

export interface Machine {
  id: string;
  name: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
}

export interface ProductSpec {
  code: string;
  name: string;
  material: string;
  type: 'Jar' | 'Cap' | 'Preform' | 'Bottle';
  weight?: string; 
  preformCode?: string; // Link to preform
  neckSize?: string;
  packSize?: number;
  height?: number;
  width?: number;
  // New Packaging Details
  packagingDetail?: {
    method: 'Box' | 'Bag' | 'Bundle' | 'Pallet';
    bagType?: string; // e.g. HD Blue, PE Clear
    bagSize?: string; // e.g. 20x30 inch
    qtyPerBag?: number;
    boxType?: string; // e.g. Box A01, Carton 5 Layer
    boxSize?: string; // e.g. 40x50x60 cm
    qtyPerBox?: number;
    layerConfig?: string; // e.g. 4 layers x 18 pcs
    palletConfig?: string; // e.g. 10 boxes / pallet
  };
}

export interface MachineMoldCapability {
  machineGroup: string; 
  moldName: string;     
  moldNumber?: number;  
  cavity: number;
  cycleTimeSec?: number; // Estimated if not provided
  theoreticalOutputHr?: number; 
  status?: string; // 'Active', 'Broken', 'Repair'
  remarks?: string;
}

export interface ProductMoldMapping {
  productName: string;
  moldCodes: string[];
}

export interface DowntimeLog {
  id: string;
  machineId: string;
  date: string; // ISO date
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  durationMinutes: number;
  category: 'Breakdown' | 'Setup' | 'Quality' | 'Material' | 'Other';
  reason: string;
  reporter?: string;
  impactOnPlan?: string;
}

export interface ShiftProductionLog {
  id: string;
  date: string; // YYYY-MM-DD
  shift: string; // 'Day' | 'Night' or specific shift name
  machineId: string;
  jobId?: string;
  jobOrder?: string;
  productItem: string;
  target: number;
  actual: number;
  variance: number; // actual - target
  isBelowTarget: boolean;
  reason?: string;
  reporter?: string;
  createdAt: string;
}

export const sortMachines = (machineIds: string[]): string[] => {
  const PREFIX_ORDER = ['IP', 'IO', 'AB', 'IB', 'B'];

  const getMachineSortKey = (machineId: string) => {
    const match = machineId.match(/^([A-Z]+)(\d+)?(.*)$/i);
    if (!match) return { prefix: machineId, num: 0, suffix: '' };
    return {
      prefix: match[1].toUpperCase(),
      num: match[2] ? parseInt(match[2], 10) : 0,
      suffix: match[3] || ''
    };
  };

  return [...machineIds].sort((a, b) => {
    const keyA = getMachineSortKey(a);
    const keyB = getMachineSortKey(b);

    const indexA = PREFIX_ORDER.indexOf(keyA.prefix);
    const indexB = PREFIX_ORDER.indexOf(keyB.prefix);

    if (indexA !== -1 && indexB !== -1) {
      if (indexA !== indexB) return indexA - indexB; // Sort by prefix order
      if (keyA.num !== keyB.num) return keyA.num - keyB.num; // Sort by number
      return keyA.suffix.localeCompare(keyB.suffix); // Sort by suffix if any
    }
    
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // Fallback
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
};

// --- New Types for History & AI ---
export interface AiMessage {
  id?: string;
  role: 'user' | 'model';
  text: string;
  image?: string; 
  fileName?: string;
  fileType?: string;
  timestamp: string;
  actionProposal?: {
    type: 'UPDATE' | 'CREATE' | 'BATCH_UPSERT' | 'GENERATE_FORM' | 'LOG_DOWNTIME';
    data: any;
    reason: string;
    executedAt?: string;
  };
  pendingFunctionCalls?: {
    name: string;
    args: any;
  }[];
  verifiedAction?: {
    type: string;
    data: any;
  };
}

export interface AppUser {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SYSTEM' | 'REVERT';
  user: string;
  details: string;
  targetId?: string;
  snapshot?: ProductionJob[]; // Store the state of jobs at this point in time
}

export interface FormTemplate {
  id: string;
  title: string;
  html: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomKnowledge {
  id: string;
  topic: string;
  content: string;
  updatedAt: string;
  createdBy?: string;
  category?: string;
  tags?: string[];
  linkedData?: {
    type: 'Machine' | 'Product' | 'Inventory' | 'BOM';
    id: string;
    name: string;
  }[];
  files?: {
    name: string;
    url: string;
    type: string;
    size?: number;
  }[];
}
// ----------------------------------

// Expanded Capabilities for Knowledge Base
export const MACHINE_MOLD_CAPABILITIES: MachineMoldCapability[] = [
  // IP Group (Injection)
  { machineGroup: 'IP1-IP10', moldName: 'P45', cavity: 6, cycleTimeSec: 25, theoreticalOutputHr: 864, status: 'Active' },
  { machineGroup: 'IP1-IP10', moldName: 'P44-2', cavity: 6, cycleTimeSec: 25, theoreticalOutputHr: 864, status: 'Active' },
  { machineGroup: 'IP1-IP10', moldName: 'P110', cavity: 4, cycleTimeSec: 35, theoreticalOutputHr: 411, status: 'Active' },
  { machineGroup: 'IP1-IP10', moldName: 'P44-3', cavity: 6, cycleTimeSec: 25, theoreticalOutputHr: 864, status: 'Active' },
  { machineGroup: 'IP1-IP10', moldName: 'P126-4', cavity: 4, cycleTimeSec: 35, theoreticalOutputHr: 411, status: 'Active' },
  { machineGroup: 'IP1-IP10', moldName: 'P30-2', cavity: 6, cycleTimeSec: 25, theoreticalOutputHr: 864, status: 'Active' },
  { machineGroup: 'IP1-IP10', moldName: 'P44-5', cavity: 8, cycleTimeSec: 25, theoreticalOutputHr: 1152, status: 'Active' },
  { machineGroup: 'IP1-IP10', moldName: 'P80-6', cavity: 8, cycleTimeSec: 30, theoreticalOutputHr: 960, status: 'Active' },
  
  // IO Group (Cap Compression/Injection)
  { machineGroup: 'IO1', moldName: 'C13', cavity: 16, cycleTimeSec: 5, theoreticalOutputHr: 11520, status: 'Active' },
  { machineGroup: 'IO2', moldName: '307B', cavity: 24, cycleTimeSec: 5, theoreticalOutputHr: 17280, status: 'Active' },
  
  // AB Group (Auto Blow)
  { machineGroup: 'AB1', moldName: 'A01', cavity: 2, cycleTimeSec: 9, theoreticalOutputHr: 800, status: 'Active' },
  { machineGroup: 'AB2', moldName: 'QE Series', cavity: 2, cycleTimeSec: 9, theoreticalOutputHr: 800, status: 'Active' },
  { machineGroup: 'AB3', moldName: 'QE Series', cavity: 2, cycleTimeSec: 9, theoreticalOutputHr: 800, status: 'Active' },
  { machineGroup: 'AB5', moldName: 'QE307', cavity: 4, cycleTimeSec: 12, theoreticalOutputHr: 1200, status: 'Active' },
  { machineGroup: 'AB7', moldName: 'QE307', cavity: 4, cycleTimeSec: 12, theoreticalOutputHr: 1200, status: 'Maintenance' },

  // Semi Blow
  { machineGroup: 'B Series', moldName: 'Standard Jar', cavity: 1, cycleTimeSec: 12, theoreticalOutputHr: 300, status: 'Active' },
];

// Comprehensive Product Master Data (Populated with Dimensions & Packaging)
export const PRODUCT_SPECS: ProductSpec[] = [
  // Preforms (Updated from Image)
  // #EOE211
  { 
    code: 'P18.5', name: 'Preform 18.5g', material: 'PET', type: 'Preform', weight: '18.5g', neckSize: 'EOE211', packSize: 1400,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 1400 }
  },
  { 
    code: 'P25', name: 'Preform 25g', material: 'PET', type: 'Preform', weight: '25g', neckSize: 'EOE211', packSize: 1000,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 1000 }
  },
  { 
    code: 'P35.5', name: 'Preform 35.5g', material: 'PET', type: 'Preform', weight: '35.5g', neckSize: 'EOE211', packSize: 540,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 540 }
  },
  
  // #EOE307
  { 
    code: 'P20', name: 'Preform 20g', material: 'PET', type: 'Preform', weight: '20g', neckSize: 'EOE307', packSize: 960,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 960 }
  },
  { 
    code: 'P30-2', name: 'Preform 30g Type 2', material: 'PET', type: 'Preform', weight: '30g', neckSize: 'EOE307', packSize: 720,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 720 }
  },
  { 
    code: 'P38', name: 'Preform 38g', material: 'PET', type: 'Preform', weight: '38g', neckSize: 'EOE307', packSize: 624,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 624 }
  },
  { 
    code: 'P44', name: 'Preform 44g', material: 'PET', type: 'Preform', weight: '44g', neckSize: 'EOE307', packSize: 480,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 480 }
  },
  { 
    code: 'P44-2', name: 'Preform 44g Type 2', material: 'PET', type: 'Preform', weight: '44g', neckSize: 'EOE307', packSize: 480,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 480 }
  },

  // #EOE401
  { 
    code: 'P44.5', name: 'Preform 44.5g', material: 'PET', type: 'Preform', weight: '44.5g', neckSize: 'EOE401', packSize: 450,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 450 }
  },

  // #Screw (ปากเกลียว)
  { 
    code: 'P48', name: 'Preform 48g', material: 'PET', type: 'Preform', weight: '48g', neckSize: 'Screw', packSize: 0,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 0 }
  },
  { 
    code: 'P45', name: 'Preform 45g', material: 'PET', type: 'Preform', weight: '45g', neckSize: 'Screw', packSize: 252,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 252 }
  },
  { 
    code: 'P75', name: 'Preform 75g', material: 'PET', type: 'Preform', weight: '75g', neckSize: 'Screw', packSize: 196,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 196 }
  },
  { 
    code: 'P80-6', name: 'Preform 80g (P80-1 to 6)', material: 'PET', type: 'Preform', weight: '80g', neckSize: 'Screw', packSize: 135,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 135 }
  },
  { 
    code: 'P126', name: 'Preform 126g', material: 'PET', type: 'Preform', weight: '126g', neckSize: 'Screw', packSize: 105,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 105 }
  },
  { 
    code: 'P40', name: 'Preform 40g', material: 'PET', type: 'Preform', weight: '40g', neckSize: 'Screw', packSize: 0,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 0 }
  },
  { 
    code: 'P28', name: 'Preform 28g', material: 'PET', type: 'Preform', weight: '28g', neckSize: 'Screw', packSize: 0,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 0 }
  },
  { 
    code: 'P85', name: 'Preform 85g', material: 'PET', type: 'Preform', weight: '85g', neckSize: 'Screw', packSize: 216,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 216 }
  },
  { 
    code: 'P110', name: 'Preform 110g', material: 'PET', type: 'Preform', weight: '110g', neckSize: 'Screw', packSize: 105,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 105 }
  },

  // #Series300
  { 
    code: 'P30S', name: 'Preform 30g Series 300', material: 'PET', type: 'Preform', weight: '30g', neckSize: 'Series300', packSize: 828,
    packagingDetail: { method: 'Box', boxType: 'Carton', qtyPerBox: 828 }
  },
  
  // --- Jars & Bottles (Updated Mappings & Dimensions) ---
  
  // From P18.5 (EOE211)
  { code: 'QE140', name: 'Jar QE 140', material: 'PET', type: 'Jar', preformCode: 'P18.5', weight: '18.5g', packSize: 637 },
  { code: 'QE180', name: 'Jar QE 180', material: 'PET', type: 'Jar', preformCode: 'P18.5', weight: '18.5g', packSize: 528, height: 56, width: 68 }, // Web: 68x56mm
  { code: 'QE200', name: 'Jar QE 200', material: 'PET', type: 'Jar', preformCode: 'P18.5', weight: '18.5g', packSize: 400, height: 68, width: 80 }, // Web: 80x68mm
  { code: 'QE210', name: 'Jar QE 210', material: 'PET', type: 'Jar', preformCode: 'P18.5', weight: '18.5g', packSize: 420, height: 61, width: 69 }, // Web: 69x61mm
  { code: 'QE215', name: 'Jar QE 215', material: 'PET', type: 'Jar', preformCode: 'P18.5', weight: '18.5g', packSize: 396, height: 68, width: 78 }, // Web: 78x68mm
  { code: 'QE220', name: 'Jar QE 220', material: 'PET', type: 'Jar', preformCode: 'P18.5', weight: '18.5g', packSize: 432, height: 69, width: 68, packagingDetail: { method: 'Box', bagType: 'HD Blue', bagSize: '41.5"x51"x0.06mm', qtyPerBag: 432, boxType: 'Box QE', boxSize: '485x485x620 mm', qtyPerBox: 432 } }, // Web: 68x69mm
  { code: 'QE280', name: 'Jar QE 280', material: 'PET', type: 'Jar', preformCode: 'P18.5', weight: '18.5g', packSize: 336, height: 90, width: 67 }, // Web: 67x90mm
  { code: 'QE375', name: 'Jar QE 375', material: 'PET', type: 'Jar', preformCode: 'P18.5', weight: '18.5g', packSize: 252, height: 94, width: 78 }, // Web: 78x94mm

  // From P25 (EOE211)
  { code: 'QE320', name: 'Jar QE 320', material: 'PET', type: 'Jar', preformCode: 'P25', weight: '25g', packSize: 288, height: 104, width: 68 }, // Web: 68x104mm
  { code: 'QE340', name: 'Jar QE 340', material: 'PET', type: 'Jar', preformCode: 'P25', weight: '25g', packSize: 240, height: 118, width: 66 }, // Web: 66x118mm

  // From P35.5 (EOE211)
  { code: 'QE450', name: 'Jar QE 450', material: 'PET', type: 'Jar', preformCode: 'P35.5', weight: '35.5g', packSize: 180, height: 120, width: 80.5 }, // Web: 80.5x120mm
  { code: 'QE520', name: 'Jar QE 520', material: 'PET', type: 'Jar', preformCode: 'P35.5', weight: '35.5g', packSize: 147, height: 178, width: 64 }, // Web: 64x178mm
  { code: 'QE650', name: 'Jar QE 650', material: 'PET', type: 'Jar', preformCode: 'P35.5', weight: '35.5g', packSize: 140, height: 155, width: 81.5 }, // Web: 81.5x155mm
  { code: 'QE670', name: 'Jar QE 670', material: 'PET', type: 'Jar', preformCode: 'P35.5', weight: '35.5g', packSize: 120, height: 154, width: 83 }, // Web: 83x154mm
  { code: 'QE675', name: 'Jar QE 675', material: 'PET', type: 'Jar', preformCode: 'P35.5', weight: '35.5g', packSize: 120 },

  // From P20 (EOE307)
  { code: 'QE225', name: 'Jar QE 225', material: 'PET', type: 'Jar', preformCode: 'P20', weight: '20g', packSize: 420, height: 59, width: 82 }, // Web: 82x59mm
  { code: 'QE275', name: 'Jar QE 275', material: 'PET', type: 'Jar', preformCode: 'P20', weight: '20g', packSize: 360, height: 59, width: 82 }, // Web: 82x59mm
  { code: 'QE300', name: 'Jar QE 300', material: 'PET', type: 'Jar', preformCode: 'P20', weight: '20g', packSize: 300, height: 70, width: 82, packagingDetail: { method: 'Box', bagType: 'HD Blue', bagSize: '41.5"x51"x0.06mm', qtyPerBag: 300, boxType: 'Box QE', boxSize: '440x465x593 mm', qtyPerBox: 300 } }, // Web: 82x70mm

  // From P30-2 (EOE307)
  { code: 'QE380P', name: 'Jar QE 380+ (P)', material: 'PET', type: 'Jar', preformCode: 'P30-2', weight: '30g', packSize: 210, height: 91, width: 89 }, // Web: 89x91mm
  { code: 'QE510', name: 'Jar QE 510', material: 'PET', type: 'Jar', preformCode: 'P30-2', weight: '30g', packSize: 180, height: 110, width: 82, packagingDetail: { method: 'Box', bagType: 'HD Blue', bagSize: '41.5"x51"x0.06mm', qtyPerBag: 180, boxType: 'Box QE', boxSize: '485x485x662 mm', qtyPerBox: 180 } }, // Web: 82x110mm
  { code: 'QE490', name: 'Jar QE 490', material: 'PET', type: 'Jar', preformCode: 'P30-2', weight: '30g', packSize: 180 },
  { code: 'QE445', name: 'Jar QE 445', material: 'PET', type: 'Jar', preformCode: 'P30-2', weight: '30g', packSize: 180 },
  { code: 'QE355', name: 'Jar QE 355', material: 'PET', type: 'Jar', preformCode: 'P30-2', weight: '30g', packSize: 210 },
  { code: 'QE301', name: 'Jar QE 301', material: 'PET', type: 'Jar', preformCode: 'P30-2', weight: '30g', packSize: 270, height: 78, width: 82 },
  { code: 'QE302', name: 'Jar QE 302', material: 'PET', type: 'Jar', preformCode: 'P30-2', weight: '30g', packSize: 210, height: 92, width: 82 }, // Web: 82x92mm
  { code: 'QE303', name: 'Jar QE 303', material: 'PET', type: 'Jar', preformCode: 'P30-2', weight: '30g', packSize: 240, height: 80, width: 87 },
  { code: 'QE304', name: 'Jar QE 304', material: 'PET', type: 'Jar', preformCode: 'P30-2', weight: '30g', packSize: 200, height: 40, width: 84 }, // Web: 84x40mm (Verify height)
  { code: 'QE305', name: 'Jar QE 305', material: 'PET', type: 'Jar', preformCode: 'P30-2', weight: '30g', packSize: 180, height: 110, width: 82 }, // Web: 82x110mm
  { code: 'QE307-3', name: 'Jar QE 307ml V.3', material: 'PET', type: 'Jar', preformCode: 'P30-2', weight: '30g', packSize: 120, packagingDetail: { method: 'Bag', bagType: 'HD Green P3S', bagSize: '20+3+3+X47X0.08mm', qtyPerBag: 120 } },
  { code: 'QE307-6', name: 'Jar QE 307ml V.6', material: 'PET', type: 'Jar', preformCode: 'P30-2', weight: '30g', packSize: 125, width: 72, height: 100, packagingDetail: { method: 'Box', bagType: 'HD Blue', bagSize: '41.5"x51"x0.06mm', qtyPerBag: 125, boxType: 'Box QE', boxSize: '485x485x662 mm', qtyPerBox: 125 } },

  // From P38 (EOE307)
  { code: 'QE306', name: 'Jar QE 306', material: 'PET', type: 'Jar', preformCode: 'P38', weight: '38g', packSize: 125, height: 110, width: 84 }, // Web: 84x110mm
  { code: 'QE307', name: 'Jar QE 307', material: 'PET', type: 'Jar', preformCode: 'P38', weight: '38g', packSize: 150, height: 130, width: 82 }, // Web: 82x130mm, 150/box
  { code: 'QE610', name: 'Jar QE 610', material: 'PET', type: 'Jar', preformCode: 'P38', weight: '38g', packSize: 150, height: 130, width: 82 },

  // From P44 (EOE307)
  { code: 'QE307-2', name: 'Jar QE 307 V.2', material: 'PET', type: 'Jar', preformCode: 'P44', weight: '44g', packSize: 150, height: 130, width: 82, packagingDetail: { method: 'Bag', bagType: 'HD Blue', bagSize: '20+3+3+X47X0.08mm', qtyPerBag: 72 } },
  { code: 'QE308-2', name: 'Jar QE 308 V.2', material: 'PET', type: 'Jar', preformCode: 'P44', weight: '44g', packSize: 120, height: 157, width: 81 }, // Web QE308: 81x157mm
  { code: 'QE309-2', name: 'Jar QE 309 V.2', material: 'PET', type: 'Jar', preformCode: 'P44', weight: '44g', packSize: 100, height: 150, width: 84 }, // Web QE309: 84x150mm
  { code: 'QE950', name: 'Jar QE 950', material: 'PET', type: 'Jar', preformCode: 'P44', weight: '44g', packSize: 80 },

  // From P44.5 (EOE401)
  { code: 'QE700', name: 'Jar QE 700', material: 'PET', type: 'Jar', preformCode: 'P44.5', weight: '44.5g', packSize: 120 },

  // From P48 (Screw)
  { code: 'S01', name: 'Jar S01', material: 'PET', type: 'Jar', preformCode: 'P48', weight: '48g', packSize: 40, packagingDetail: { method: 'Bag', bagType: 'HD Blue', bagSize: '24+3+3"x48"x0.08mm', qtyPerBag: 40 } },

  // From P45 (Screw)
  { code: 'A01', name: 'Jar A01', material: 'PET', type: 'Jar', preformCode: 'P45', weight: '42-45g', packSize: 66, height: 101, width: 94, packagingDetail: { method: 'Box', bagType: 'HD Blue', bagSize: '20+3+3+X47X0.08mm', qtyPerBag: 66, boxType: 'Carton A01', boxSize: '50x60x40 cm', qtyPerBox: 66, layerConfig: '4 ชั้น x 18 ชิ้น (กั้นด้วยกระดาษ)' } },
  { code: 'A03', name: 'Jar A03', material: 'PET', type: 'Jar', preformCode: 'P45', weight: '45g', packSize: 66, height: 168, width: 94 },

  // From P75 (Screw)
  { code: 'A02', name: 'Jar A02', material: 'PET', type: 'Jar', preformCode: 'P75', weight: '75g', packSize: 66, height: 169, width: 94, packagingDetail: { method: 'Bag', bagType: 'HD Blue', bagSize: '24+3+3"x48"x0.08mm', qtyPerBag: 66 } },

  // From P80 (B Series)
  { code: 'B01', name: 'Bottle B01', material: 'PET', type: 'Bottle', preformCode: 'P80-6', weight: '80g', packSize: 45, height: 127, width: 134, packagingDetail: { method: 'Bag', bagType: 'HD Blue', bagSize: '26+3.5+3.5"X51"X0.08mm', qtyPerBag: 45 } },
  { code: 'B02', name: 'Bottle B02', material: 'PET', type: 'Bottle', preformCode: 'P80-6', weight: '80g', packSize: 40, height: 126, width: 126, packagingDetail: { method: 'Bag', bagType: 'HD Blue', bagSize: '24+3+3"x48"x0.08mm', qtyPerBag: 40 } },
  { code: 'B07', name: 'Bottle B07', material: 'PET', type: 'Bottle', preformCode: 'P80-6', weight: '80g', packSize: 45, height: 143, width: 125, packagingDetail: { method: 'Bag', bagType: 'HD Blue', bagSize: '26+3.5+3.5"X51"X0.08mm', qtyPerBag: 45 } },
  { code: 'B08', name: 'Bottle B08', material: 'PET', type: 'Bottle', preformCode: 'P80-6', weight: '80g', packSize: 40 },
  { code: 'B06', name: 'Bottle B06', material: 'PET', type: 'Bottle', preformCode: 'P80-6', weight: '80g', packSize: 45, height: 178, width: 125, packagingDetail: { method: 'Bag', bagType: 'HD Blue', bagSize: '26+3.5+3.5"X51"X0.08mm', qtyPerBag: 45 } },
  { code: 'IBERIA', name: 'Bottle IBERIA', material: 'PET', type: 'Bottle', preformCode: 'P80-6', weight: '80g', packSize: 40 },

  // From P126
  { code: 'B03', name: 'Bottle B03', material: 'PET', type: 'Bottle', preformCode: 'P126', weight: '126g', packSize: 36, height: 202, width: 155, packagingDetail: { method: 'Bag', bagType: 'HD Blue', bagSize: '30.5"+4+4"x55"x0.08mm', qtyPerBag: 36 } },
  { code: 'B04', name: 'Bottle B04', material: 'PET', type: 'Bottle', preformCode: 'P126', weight: '126g', packSize: 40, height: 205, width: 125, packagingDetail: { method: 'Bag', bagType: 'HD Blue', bagSize: '24+3+3"x48"x0.08mm', qtyPerBag: 40 } },
  { code: 'B05', name: 'Bottle B05', material: 'PET', type: 'Bottle', preformCode: 'P126', weight: '126g', packSize: 45, height: 197, width: 135, packagingDetail: { method: 'Bag', bagType: 'HD Blue', bagSize: '26+3.5+3.5"X51"X0.08mm', qtyPerBag: 45 } },
  { code: 'B11', name: 'Bottle B11', material: 'PET', type: 'Bottle', preformCode: 'P126', weight: '126g', packSize: 40 },
  { code: 'B09', name: 'Bottle B09', material: 'PET', type: 'Bottle', preformCode: 'P126', weight: '126g', packSize: 45 },

  // From P40
  { code: 'SC580-82', name: 'Jar SC 580', material: 'PET', type: 'Jar', preformCode: 'P40', weight: '40g', packSize: 120 },

  // From P28
  { code: 'SC370-82', name: 'Jar SC 370', material: 'PET', type: 'Jar', preformCode: 'P28', weight: '28g', packSize: 180 },

  // From P85
  { code: 'CAR01', name: 'Jar CAR 01', material: 'PET', type: 'Jar', preformCode: 'P85', weight: '85g', packSize: 39 },
  { code: 'CAR2', name: 'Jar CAR 2', material: 'PET', type: 'Jar', preformCode: 'P85', weight: '85g', packSize: 39 },

  // From P110
  { code: 'B10', name: 'Bottle B10', material: 'PET', type: 'Bottle', preformCode: 'P110', weight: '110g', packSize: 40, packagingDetail: { method: 'Bag', bagType: 'HD Blue', bagSize: '26.5+3.5+3.5"x55"x0.08mm', qtyPerBag: 40 } },
  { code: 'B10-2', name: 'Bottle B10 V.2', material: 'PET', type: 'Bottle', preformCode: 'P110', weight: '110g', packSize: 40 },

  // From P30S
  { code: 'QE310-300', name: 'Jar QE 310 Series 300', material: 'PET', type: 'Jar', preformCode: 'P30S', weight: '30g', packSize: 210 },
  { code: 'QE325-300', name: 'Jar QE 325 Series 300', material: 'PET', type: 'Jar', preformCode: 'P30S', weight: '30g', packSize: 210 },
  { code: 'QE410-300', name: 'Jar QE 410 Series 300', material: 'PET', type: 'Jar', preformCode: 'P30S', weight: '30g', packSize: 180 },

  // Caps (Retaining existing cap data as it wasn't contradicted by the new image, just adding/verifying)
  { 
    code: 'C13', name: 'Cap 13mm (P3)', material: 'PP', type: 'Cap', weight: '2g', packSize: 196, width: 15, height: 5,
    packagingDetail: { method: 'Bag', bagType: 'HD Blue', bagSize: '22"x28"x0.08mm', qtyPerBag: 196 }
  },
  { 
    code: '307B', name: 'Cap 307B', material: 'PE', type: 'Cap', weight: '5g', packSize: 1000,
    packagingDetail: { method: 'Bag', bagType: 'PP Clear', bagSize: '6"x18"x0.08mm', qtyPerBag: 1000 }
  },
  { 
    code: '307B-5', name: 'Cap 307B-5', material: 'PE', type: 'Cap', weight: '5g', packSize: 1000,
    packagingDetail: { method: 'Bag', bagType: 'PP Clear', bagSize: '6"x18"x0.08mm', qtyPerBag: 1000 }
  },
  { 
    code: '307A', name: 'Cap 307A', material: 'PP', type: 'Cap', weight: '5g', packSize: 1000,
    packagingDetail: { method: 'Bag', bagType: 'PP Clear', bagSize: '6"x18"x0.08mm', qtyPerBag: 1000 }
  },
  { 
    code: '211A', name: 'Cap 211A', material: 'PP', type: 'Cap', weight: '4g', packSize: 1500,
    packagingDetail: { method: 'Bag', bagType: 'PP Clear', bagSize: '6"x18"x0.08mm', qtyPerBag: 1500 }
  },
  { 
    code: '211B', name: 'Cap 211B', material: 'PP', type: 'Cap', weight: '4g', packSize: 1500,
    packagingDetail: { method: 'Bag', bagType: 'PP Clear', bagSize: '6"x18"x0.08mm', qtyPerBag: 1500 }
  },
  { 
    code: 'C25', name: 'Cap C25 (Handle)', material: 'PP', type: 'Cap', weight: '4g', packSize: 135,
    packagingDetail: { method: 'Bag', bagType: 'HD Blue', bagSize: '22"x28"x0.08mm', qtyPerBag: 135 }
  },
  { 
    code: 'C26', name: 'Cap C26 (Handle)', material: 'PP', type: 'Cap', weight: '4g', packSize: 135,
    packagingDetail: { method: 'Bag', bagType: 'HD Blue', bagSize: '22"x28"x0.08mm', qtyPerBag: 135 }
  },
  { 
    code: 'C14', name: 'Cap C14 (Handle)', material: 'PP', type: 'Cap', weight: '4g', packSize: 135,
    packagingDetail: { method: 'Bag', bagType: 'HD Blue', bagSize: '22"x28"x0.08mm', qtyPerBag: 135 }
  },
  { 
    code: 'FlatB', name: 'Cap Flat B', material: 'PE', type: 'Cap', weight: '3g', packSize: 135,
    packagingDetail: { method: 'Bag', bagType: 'HD Blue', bagSize: '20"x29"x0.08mm', qtyPerBag: 135 }
  },
];

// Use actual real-time for the application
export const SIMULATED_NOW = new Date();

// Calculate the time difference between the original mock data's "current time" and the actual current time
const MOCK_BASE_TIME = new Date('2026-02-22T20:00:00').getTime();
const TIME_OFFSET = SIMULATED_NOW.getTime() - MOCK_BASE_TIME;

// Helper to shift dates so mock data always looks "live" relative to the current real-time
const shiftDate = (dateString: string) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return new Date(d.getTime() + TIME_OFFSET).toISOString();
};

export const MOCK_INVENTORY: InventoryItem[] = [
  // Raw Materials
  { id: 'r1', code: 'PET-SA135T', category: 'Resin', name: 'PET Resin SA135T', usage: 'Preform P45, P30', currentStock: 150000, unit: 'kg', minStock: 50000, maxStock: 200000 },
  { id: 'r2', code: 'PP-1100NK', category: 'Resin', name: 'PP Resin 1100NK', usage: 'Cap Injection', currentStock: 80000, unit: 'kg', minStock: 20000, maxStock: 100000 },
  
  // Preforms
  { id: 'p1', code: 'P30-2', category: 'Preform', name: 'Preform 30g Type 2', usage: 'Blow QE307', currentStock: 5000, unit: 'pcs', minStock: 20000, maxStock: 100000, remarks: 'Low Stock! Risk for AB5' },
  { id: 'p2', code: 'P45', category: 'Preform', name: 'Preform 45g', usage: 'Blow A01', currentStock: 85000, unit: 'pcs', minStock: 20000, maxStock: 100000 },
  { id: 'p3', code: 'P44-2', category: 'Preform', name: 'Preform 44g Type 2', usage: 'Blow QE510', currentStock: 120000, unit: 'pcs', minStock: 20000, maxStock: 150000 },

  // Packaging - Boxes
  { id: 'bx1', code: 'BOX-A01', category: 'Box', name: 'Carton A01 (50x60x40)', usage: 'Pack A01', currentStock: 2000, unit: 'pcs', minStock: 500, maxStock: 5000 },
  { id: 'bx2', code: 'BOX-QE-475', category: 'Box', name: 'Box QE 475x475x662', usage: 'Pack Cap 307B-5', currentStock: 1000, unit: 'pcs', minStock: 200, maxStock: 2000 },
  { id: 'bx3', code: 'BOX-QE-485-620', category: 'Box', name: 'Box QE 485x485x620', usage: 'Pack QE220', currentStock: 1000, unit: 'pcs', minStock: 200, maxStock: 2000 },
  { id: 'bx4', code: 'BOX-QE-485-662', category: 'Box', name: 'Box QE 485x485x662', usage: 'Pack QE (except 220)', currentStock: 3000, unit: 'pcs', minStock: 500, maxStock: 5000 },
  { id: 'bx5', code: 'BOX-QE-NEW', category: 'Box', name: 'Box QE 370x480x297 (New)', usage: 'Pack Caps 307A/B, 211A/B', currentStock: 5000, unit: 'pcs', minStock: 1000, maxStock: 10000 },
  { id: 'bx6', code: 'BOX-QE-440', category: 'Box', name: 'Box QE 440x465x593', usage: 'Pack QE300 Series', currentStock: 2000, unit: 'pcs', minStock: 500, maxStock: 3000 },
  
  // Packaging - Bags
  { id: 'bg1', code: 'BAG-HD-BL-26-51', category: 'Bag', name: 'Bag HD Blue 26+3.5+3.5"X51"', usage: 'Pack B01, B07, B06, B05', currentStock: 500, unit: 'kg', minStock: 100, maxStock: 1000 },
  { id: 'bg2', code: 'BAG-HD-BL-24-48', category: 'Bag', name: 'Bag HD Blue 24+3+3"x48"', usage: 'Pack B02, B04, A03, A02, S01', currentStock: 500, unit: 'kg', minStock: 100, maxStock: 1000 },
  { id: 'bg3', code: 'BAG-HD-BL-30-55', category: 'Bag', name: 'Bag HD Blue 30.5"+4+4"x55"', usage: 'Pack B03', currentStock: 200, unit: 'kg', minStock: 50, maxStock: 500 },
  { id: 'bg4', code: 'BAG-HD-BL-20-29', category: 'Bag', name: 'Bag HD Blue 20"x29"', usage: 'Pack Flat Caps', currentStock: 300, unit: 'kg', minStock: 50, maxStock: 500 },
  { id: 'bg5', code: 'BAG-HD-BL-22-28', category: 'Bag', name: 'Bag HD Blue 22"x28"', usage: 'Pack Handle Caps', currentStock: 300, unit: 'kg', minStock: 50, maxStock: 500 },
  { id: 'bg6', code: 'BAG-HD-BL-41-51', category: 'Bag', name: 'Bag HD Blue 41.5"x51"', usage: 'Liner for QE Box', currentStock: 1000, unit: 'kg', minStock: 200, maxStock: 2000 },
  { id: 'bg7', code: 'BAG-HD-BL-20-47', category: 'Bag', name: 'Bag HD Blue 20+3+3+X47', usage: 'Pack QE307-2, A01', currentStock: 500, unit: 'kg', minStock: 100, maxStock: 1000 },
  { id: 'bg8', code: 'BAG-PP-6-18', category: 'Bag', name: 'Bag PP Clear 6"x18"', usage: 'Pack Caps 307/211', currentStock: 500, unit: 'kg', minStock: 100, maxStock: 1000 },
  { id: 'bg9', code: 'BAG-HD-GR-P3S', category: 'Bag', name: 'Bag HD Green P3S 20+3+3+X47', usage: 'Pack QE307-3', currentStock: 200, unit: 'kg', minStock: 50, maxStock: 500 },
  { id: 'bg10', code: 'BAG-HD-BL-26-55', category: 'Bag', name: 'Bag HD Blue 26.5+3.5+3.5"x55"', usage: 'Pack B10', currentStock: 200, unit: 'kg', minStock: 50, maxStock: 500 },
  
  // Pigments
  { id: 'pig1', code: 'PIG-GOLD', category: 'Pigment', name: 'Pigment Gold 882', usage: 'Cap 307B Gold', currentStock: 50, unit: 'kg', minStock: 10, maxStock: 200 },
];

// Populated BOMs (Recipes) for AI & Master Data Page
export const MOCK_BOMS: ProductBOM[] = [
  {
    id: 'bom-1',
    productItem: 'A01 (Clear)',
    materials: [
      { inventoryItemId: 'p2', qtyPerUnit: 1, unitType: 'pcs' }, // P45
      { inventoryItemId: 'bg1', qtyPerUnit: 0.013, unitType: 'kg' }, // Bag
      { inventoryItemId: 'bx1', qtyPerUnit: 0.0138, unitType: 'pcs' }, // Box (1/72)
    ]
  },
  {
    id: 'bom-2',
    productItem: 'QE307-2 (Clear)',
    materials: [
      { inventoryItemId: 'p1', qtyPerUnit: 1, unitType: 'pcs' }, // P30-2
      { inventoryItemId: 'bg1', qtyPerUnit: 0.01, unitType: 'kg' },
    ]
  },
  {
    id: 'bom-3',
    productItem: 'ฝา 307B (Gold)',
    materials: [
      { inventoryItemId: 'r2', qtyPerUnit: 0.005, unitType: 'kg' }, // PP Resin 5g
      { inventoryItemId: 'pig1', qtyPerUnit: 0.0001, unitType: 'kg' }, // Pigment 2%
      { inventoryItemId: 'bx2', qtyPerUnit: 0.0005, unitType: 'pcs' }, // Box (1/2000)
    ]
  }
];

// Optimized Plan based on User Logic (Consolidated Molds on IO2/IO4)
const RAW_MOCK_DATA: ProductionJob[] = [
  // --- IP Group ---
  {
    id: 'ip1-1', machineId: 'IP1', productItem: 'P45', productType: 'Preform', moldCode: 'P45', jobOrder: 'B6902-055',
    capacityPerShift: 5760, totalProduction: 57600, actualProduction: 50148, yesterdayProduction: 39564, color: '-', startDate: '2026-02-12T09:00:00', endDate: '2026-02-23T20:00:00',
    status: 'Running', priority: 'Normal'
  },
  {
    id: 'ip1-2', machineId: 'IP1', productItem: 'P45', productType: 'Preform', moldCode: 'P45', jobOrder: 'B6902-138',
    capacityPerShift: 5760, totalProduction: 57600, actualProduction: 0, color: '-', startDate: '2026-02-23T20:00:00', endDate: '2026-02-28T20:00:00',
    status: 'Planned', priority: 'Normal'
  },
  {
    id: 'ip1-3', machineId: 'IP1', productItem: 'P45', productType: 'Preform', moldCode: 'P45', jobOrder: 'B6902-013',
    capacityPerShift: 3469, totalProduction: 1000, actualProduction: 0, color: 'สีชมพู', startDate: '2026-02-28T20:00:00', endDate: '2026-02-28T21:00:00',
    status: 'Planned', priority: 'Urgent', remarks: 'เทสสีชมพู 2%'
  },
  
  // IP2
  {
    id: 'ip2-1', machineId: 'IP2', productItem: 'P44-2', productType: 'Preform', moldCode: 'P44-2', jobOrder: 'B6902-009',
    capacityPerShift: 8640, totalProduction: 132240, actualProduction: 80796, yesterdayProduction: 58236, color: '-', startDate: '2026-02-07T22:00:00', endDate: '2026-02-15T00:00:00',
    status: 'Delayed', priority: 'Normal', remarks: 'ตกแผน'
  },
  {
    id: 'ip2-2', machineId: 'IP2', productItem: 'P44-2', productType: 'Preform', moldCode: 'P44-2', jobOrder: 'B6902-056',
    capacityPerShift: 8640, totalProduction: 86400, actualProduction: 0, color: '-', startDate: '2026-02-25T00:00:00', endDate: '2026-03-02T00:00:00',
    status: 'Planned', priority: 'Normal'
  },
  {
    id: 'ip2-3', machineId: 'IP2', productItem: 'P44-2', productType: 'Preform', moldCode: 'P44-2', jobOrder: 'B6902-139',
    capacityPerShift: 8640, totalProduction: 86400, actualProduction: 0, color: '-', startDate: '2026-03-02T00:00:00', endDate: '2026-03-07T00:00:00',
    status: 'Planned', priority: 'Normal'
  },

  // IP3
  {
    id: 'ip3-1', machineId: 'IP3', productItem: 'P75', productType: 'Preform', moldCode: 'P75', jobOrder: 'B6902-128',
    capacityPerShift: 5760, totalProduction: 34560, actualProduction: 26656, yesterdayProduction: 11368, color: '-', startDate: '2026-02-20T16:00:00', endDate: '2026-02-23T16:00:00',
    status: 'Running', priority: 'Normal'
  },
  {
    id: 'ip3-2', machineId: 'IP3', productItem: 'P110', productType: 'Preform', moldCode: 'P110', jobOrder: 'B6902-057',
    capacityPerShift: 2469, totalProduction: 34566, actualProduction: 28215, yesterdayProduction: 28215, color: '-', startDate: '2026-02-23T18:00:00', endDate: '2026-02-25T02:00:00',
    status: 'Running', priority: 'Normal', remarks: 'ซ่อมแม่พิมพ์ 2 วัน'
  },

  // IP4
  {
    id: 'ip4-1', machineId: 'IP4', productItem: 'P80-5', productType: 'Preform', moldCode: 'P80-5', jobOrder: 'B6902-011',
    capacityPerShift: 8640, totalProduction: 64800, actualProduction: 64800, yesterdayProduction: 64800, color: '-', startDate: '2026-02-11T03:00:00', endDate: '2026-02-15T08:00:00',
    status: 'Completed', priority: 'Normal', remarks: 'P80-5 no. 2,3,6,7 น้ำหนัก 88 กรัม เก็บแยกถุงไว้เป่า B02 ป้ายขาว'
  },

  // IP5
  {
    id: 'ip5-1', machineId: 'IP5', productItem: 'P44-3', productType: 'Preform', moldCode: 'P44-3', jobOrder: 'B6902-012',
    capacityPerShift: 8640, totalProduction: 103680, actualProduction: 86760, yesterdayProduction: 64800, color: '-', startDate: '2026-02-09T22:00:00', endDate: '2026-02-15T22:00:00',
    status: 'Delayed', priority: 'Normal'
  },
  {
    id: 'ip5-2', machineId: 'IP5', productItem: 'P44-3', productType: 'Preform', moldCode: 'P44-3', jobOrder: 'B6902-058',
    capacityPerShift: 8640, totalProduction: 120960, actualProduction: 0, color: '-', startDate: '2026-02-15T22:00:00', endDate: '2026-02-22T22:00:00',
    status: 'Planned', priority: 'Normal'
  },

  // IP6
  {
    id: 'ip6-1', machineId: 'IP6', productItem: '-', productType: '-', moldCode: '-', jobOrder: '-',
    capacityPerShift: 0, totalProduction: 0, actualProduction: 0, color: '-', startDate: '', endDate: '',
    status: 'No Plan', priority: 'Normal'
  },

  // IP7
  {
    id: 'ip7-1', machineId: 'IP7', productItem: 'P18.5-2', productType: 'Preform', moldCode: 'P18.5-2', jobOrder: 'B6902-106',
    capacityPerShift: 8640, totalProduction: 103680, actualProduction: 67200, yesterdayProduction: 67200, color: '-', startDate: '2026-02-14T08:00:00', endDate: '2026-02-19T08:00:00',
    status: 'Delayed', priority: 'Normal', remarks: 'ตกแผน'
  },
  {
    id: 'ip7-2', machineId: 'IP7', productItem: 'P30-2', productType: 'Preform', moldCode: 'P30-2', jobOrder: 'B6902-140',
    capacityPerShift: 8640, totalProduction: 86400, actualProduction: 33840, yesterdayProduction: 12960, color: '-', startDate: '2026-02-22T12:00:00', endDate: '2026-02-27T12:00:00',
    status: 'Running', priority: 'Normal', remarks: 'ตัดจบรายการเวลา 10.00 น. 22/2/69'
  },

  // IP8
  {
    id: 'ip8-1', machineId: 'IP8', productItem: 'P44-5', productType: 'Preform', moldCode: 'P44-5', jobOrder: 'B6902-060',
    capacityPerShift: 11520, totalProduction: 115200, actualProduction: 120240, yesterdayProduction: 120240, color: '-', startDate: '2026-02-15T10:00:00', endDate: '2026-02-20T10:00:00',
    status: 'Completed', priority: 'Normal'
  },
  {
    id: 'ip8-2', machineId: 'IP8', productItem: 'P44-5', productType: 'Preform', moldCode: 'P44-5', jobOrder: 'B6902-134',
    capacityPerShift: 11520, totalProduction: 115200, actualProduction: 79920, yesterdayProduction: 38400, color: '-', startDate: '2026-02-20T21:00:00', endDate: '2026-02-25T21:00:00',
    status: 'Running', priority: 'Normal'
  },

  // IP10
  {
    id: 'ip10-1', machineId: 'IP10', productItem: 'P80-6', productType: 'Preform', moldCode: 'P80-6', jobOrder: 'B6902-053',
    capacityPerShift: 7406, totalProduction: 74060, actualProduction: 51125, yesterdayProduction: 51125, color: '-', startDate: '2026-02-12T14:00:00', endDate: '2026-02-17T14:00:00',
    status: 'Delayed', priority: 'Normal', remarks: 'ตกแผน'
  },
  {
    id: 'ip10-2', machineId: 'IP10', productItem: 'P18.5-2', productType: 'Preform', moldCode: 'P18.5-2', jobOrder: 'B6902-145',
    capacityPerShift: 8640, totalProduction: 86400, actualProduction: 15400, yesterdayProduction: 0, color: '-', startDate: '2026-02-23T11:00:00', endDate: '2026-02-28T11:00:00',
    status: 'Running', priority: 'Normal', remarks: 'ตัดจบรายการเวลา 09.00 น. 23/2/69'
  },
  {
    id: 'ip10-3', machineId: 'IP10', productItem: 'P20-2', productType: 'Preform', moldCode: 'P20-2', jobOrder: 'B6902-142',
    capacityPerShift: 8640, totalProduction: 86400, actualProduction: 0, color: '-', startDate: '2026-02-28T14:00:00', endDate: '2026-03-02T14:00:00',
    status: 'Planned', priority: 'Normal'
  },

  // --- IO Group ---

  // IO1
  {
    id: 'io1-1', machineId: 'IO1', productItem: 'ฝา PP307A', productType: 'Cap', moldCode: '307A', jobOrder: 'B6902-070',
    capacityPerShift: 13824, totalProduction: 55296, actualProduction: 55296, yesterdayProduction: 43000, color: 'สีใส', startDate: '2026-02-20T16:00:00', endDate: '2026-02-22T16:00:00',
    status: 'Completed', priority: 'Normal', remarks: 'จาก IO2มา'
  },
  {
    id: 'io1-2', machineId: 'IO1', productItem: 'ฝา PP307A', productType: 'Cap', moldCode: '307A', jobOrder: 'B6902-071',
    capacityPerShift: 13824, totalProduction: 27648, actualProduction: 27648, yesterdayProduction: 9000, color: 'สีทอง', startDate: '2026-02-22T17:00:00', endDate: '2026-02-23T17:00:00',
    status: 'Completed', priority: 'Normal', remarks: 'จาก IO2มา'
  },
  {
    id: 'io1-3', machineId: 'IO1', productItem: 'ฝา PE307B', productType: 'Cap', moldCode: '307B-7', jobOrder: 'B6902-075',
    capacityPerShift: 13824, totalProduction: 82944, actualProduction: 20000, yesterdayProduction: 0, color: 'สีทอง', startDate: '2026-02-23T19:00:00', endDate: '2026-02-24T19:00:00',
    status: 'Running', priority: 'Normal', remarks: 'อุดเบอร์ 8 จอดแก้ไขแผ่นอะคริลิคแตก 19/2/69 1 ชม IO2'
  },
  {
    id: 'io1-4', machineId: 'IO1', productItem: 'ฝา PE307B', productType: 'Cap', moldCode: '307B-7', jobOrder: 'B6902-054',
    capacityPerShift: 13824, totalProduction: 82944, actualProduction: 65000, color: 'สีดำ', startDate: '2026-02-24T20:00:00', endDate: '2026-02-25T11:00:00',
    status: 'Planned', priority: 'Normal', remarks: 'ค้างยอดย้ายจากIO2'
  },
  {
    id: 'io1-5', machineId: 'IO1', productItem: 'ฝา PE307B', productType: 'Cap', moldCode: '307B-7', jobOrder: 'B6902-076',
    capacityPerShift: 13824, totalProduction: 82944, actualProduction: 0, color: 'สีดำ', startDate: '2026-02-25T11:00:00', endDate: '2026-02-28T11:00:00',
    status: 'Planned', priority: 'Normal', remarks: 'ย้ายจากIO2'
  },

  // IO2
  {
    id: 'io2-1', machineId: 'IO2', productItem: 'ฝาหูสั้น', productType: 'Cap', moldCode: 'C25-2', jobOrder: 'B6902-117',
    capacityPerShift: 2880, totalProduction: 11520, actualProduction: 11520, yesterdayProduction: 11340, color: 'สีแดง', startDate: '2026-02-20T20:00:00', endDate: '2026-02-22T20:00:00',
    status: 'Completed', priority: 'Normal', remarks: '*CT30s. chiller 20-22'
  },
  {
    id: 'io2-2', machineId: 'IO2', productItem: 'ฝาหูสั้น', productType: 'Cap', moldCode: 'C25-2', jobOrder: 'B6902-116',
    capacityPerShift: 2880, totalProduction: 28800, actualProduction: 0, color: 'สีทอง', startDate: '2026-02-22T21:00:00', endDate: '2026-02-27T21:00:00',
    status: 'Planned', priority: 'Normal', remarks: '*CT30s. chiller 20-22'
  },

  // IO3
  {
    id: 'io3-1', machineId: 'IO3', productItem: 'ฝา 307B', productType: 'Cap', moldCode: '307B-5', jobOrder: 'B6902-074',
    capacityPerShift: 13824, totalProduction: 138240, actualProduction: 75000, yesterdayProduction: 63000, color: 'สีใส', startDate: '2026-02-19T14:00:00', endDate: '2026-02-24T14:00:00',
    status: 'Running', priority: 'Normal'
  },
  {
    id: 'io3-2', machineId: 'IO3', productItem: 'ฝา 307B', productType: 'Cap', moldCode: '307B-5', jobOrder: 'B6902-118',
    capacityPerShift: 13824, totalProduction: 110592, actualProduction: 0, color: 'สีใส', startDate: '2026-02-24T14:00:00', endDate: '2026-02-28T14:00:00',
    status: 'Planned', priority: 'Normal'
  },

  // IO4
  {
    id: 'io4-1', machineId: 'IO4', productItem: 'ฝา 211A', productType: 'Cap', moldCode: '211A', jobOrder: 'B6902-111',
    capacityPerShift: 13824, totalProduction: 110592, actualProduction: 33000, color: 'สีดำ', startDate: '2026-02-19T12:00:00', endDate: '2026-02-23T12:00:00',
    status: 'Running', priority: 'Normal', remarks: 'อุดเบอร์ 6'
  },

  // IO5
  {
    id: 'io5-1', machineId: 'IO5', productItem: 'ฝา 211B', productType: 'Cap', moldCode: '211B', jobOrder: 'B6902-110',
    capacityPerShift: 13824, totalProduction: 13824, actualProduction: 17430, color: 'สีใส', startDate: '2026-02-18T22:00:00', endDate: '2026-02-19T10:00:00',
    status: 'Completed', priority: 'Normal', remarks: 'อุดเบอร์ 5'
  },
  {
    id: 'io5-2', machineId: 'IO5', productItem: 'ฝา 211B', productType: 'Cap', moldCode: '211B', jobOrder: 'B6902-066',
    capacityPerShift: 13824, totalProduction: 27648, actualProduction: 33000, color: 'สีดำ', startDate: '2026-02-19T11:00:00', endDate: '2026-02-20T11:00:00',
    status: 'Completed', priority: 'Normal', remarks: 'จากIO1มา'
  },
  {
    id: 'io5-3', machineId: 'IO5', productItem: 'ฝามีหู (C26)', productType: 'Cap', moldCode: 'C26-5', jobOrder: 'B6902-077',
    capacityPerShift: 2880, totalProduction: 5760, actualProduction: 2970, color: 'สีใส', startDate: '2026-02-20T13:00:00', endDate: '2026-02-21T13:00:00',
    status: 'Running', priority: 'Normal'
  },
  {
    id: 'io5-4', machineId: 'IO5', productItem: 'ฝามีหู (C26)', productType: 'Cap', moldCode: 'C26-5', jobOrder: 'B6902-119',
    capacityPerShift: 2880, totalProduction: 5760, actualProduction: 0, color: 'สีเหลือง', startDate: '2026-02-21T14:00:00', endDate: '2026-02-22T14:00:00',
    status: 'Planned', priority: 'Normal', remarks: 'แทรก'
  },
  {
    id: 'io5-5', machineId: 'IO5', productItem: 'ฝามีหู (C26)', productType: 'Cap', moldCode: 'C26-5', jobOrder: 'B6901-215',
    capacityPerShift: 2880, totalProduction: 5760, actualProduction: 675, color: 'สีชมพูพาสเทล', startDate: '2026-02-22T15:00:00', endDate: '2026-02-23T15:00:00',
    status: 'Running', priority: 'Normal', remarks: 'ค้าง ย้ายมาจาก io4'
  },
  {
    id: 'io5-6', machineId: 'IO5', productItem: 'ฝามีหู (C26)', productType: 'Cap', moldCode: 'C26-5', jobOrder: 'B6902-078',
    capacityPerShift: 2880, totalProduction: 5760, actualProduction: 0, color: 'สีส้ม เฟอร์เฟค', startDate: '2026-02-23T16:00:00', endDate: '2026-02-24T16:00:00',
    status: 'Planned', priority: 'Normal'
  },
  {
    id: 'io5-7', machineId: 'IO5', productItem: 'ฝามีหู (C26)', productType: 'Cap', moldCode: 'C26-5', jobOrder: 'B6902-079',
    capacityPerShift: 2880, totalProduction: 5760, actualProduction: 0, color: 'สีน้ำเงิน เฟอร์เฟค', startDate: '2026-02-24T17:00:00', endDate: '2026-02-25T17:00:00',
    status: 'Planned', priority: 'Normal'
  },
  {
    id: 'io5-8', machineId: 'IO5', productItem: 'ฝามีหู (C26)', productType: 'Cap', moldCode: 'C26-5', jobOrder: 'B6902-080',
    capacityPerShift: 2880, totalProduction: 5760, actualProduction: 0, color: 'สีเขียว เฟอร์เฟค', startDate: '2026-02-25T18:00:00', endDate: '2026-02-26T18:00:00',
    status: 'Planned', priority: 'Normal'
  },
  {
    id: 'io5-9', machineId: 'IO5', productItem: 'ฝามีหู (C26)', productType: 'Cap', moldCode: 'C26-5', jobOrder: 'B6902-081',
    capacityPerShift: 2880, totalProduction: 28800, actualProduction: 0, color: 'สีขาว', startDate: '2026-02-26T19:00:00', endDate: '2026-03-03T19:00:00',
    status: 'Planned', priority: 'Normal'
  },

  // IO6
  {
    id: 'io6-1', machineId: 'IO6', productItem: 'ฝาหูสั้น C14', productType: 'Cap', moldCode: 'C14', jobOrder: 'B6902-136',
    capacityPerShift: 6912, totalProduction: 69120, actualProduction: 15876, color: 'สีแดง', startDate: '2026-02-20T22:00:00', endDate: '2026-02-25T22:00:00',
    status: 'Running', priority: 'Normal'
  },

  // --- Auto Blow Group (AB) - Updated based on Real Situation ---
  
  // AB1: 800/hr, OT 10hr/day = 8000/day
  {
    id: 'ab1-1', machineId: 'AB1', productItem: 'A01', productType: 'Jar', moldCode: 'A01', jobOrder: 'B6902-086',
    capacityPerShift: 8000, totalProduction: 32000, actualProduction: 14586, yesterdayProduction: 6586, color: '-', startDate: '2026-02-23T14:00:00', endDate: '2026-02-25T14:00:00',
    status: 'Running', remarks: 'เปิด OT 800 ใบ/ชม. สลับพัก+พัก 2 ชม. เดินเครื่อง 10 ชม'
  },
  {
    id: 'ab1-2', machineId: 'AB1', productItem: 'A02', productType: 'Jar', moldCode: 'A02', jobOrder: 'B6902-123',
    capacityPerShift: 8000, totalProduction: 11200, actualProduction: 0, color: '-', startDate: '2026-02-25T16:00:00', endDate: '2026-02-26T08:00:00',
    status: 'Planned', remarks: 'เปิด OT 800 ใบ/ชม. สลับพัก+พัก 2 ชม. เดินเครื่อง 10 ชม'
  },
  {
    id: 'ab1-3', machineId: 'AB1', productItem: 'QE307-2', productType: 'Jar', moldCode: 'QE307-5', jobOrder: 'B6902-124',
    capacityPerShift: 8000, totalProduction: 56000, actualProduction: 0, color: '-', startDate: '2026-02-26T10:00:00', endDate: '2026-03-01T22:00:00',
    status: 'Planned', remarks: 'เปิด OT 800 ใบ/ชม. สลับพัก+พัก 2 ชม. เดินเครื่อง 10 ชม'
  },

  // AB2: High Mix, Low Volume - Many mold changes
  {
    id: 'ab2-1', machineId: 'AB2', productItem: 'QE304', productType: 'Jar', moldCode: 'QE304', jobOrder: 'B6902-144',
    capacityPerShift: 8000, totalProduction: 16000, actualProduction: 4000, yesterdayProduction: 0, color: '-', startDate: '2026-02-23T20:00:00', endDate: '2026-02-24T20:00:00',
    status: 'Running', remarks: 'เปิด OT 800 ใบ/ชม. สลับพัก+พัก 2 ชม. เดินเครื่อง 10 ชม'
  },
  {
    id: 'ab2-2', machineId: 'AB2', productItem: 'QE510', productType: 'Jar', moldCode: 'QE510', jobOrder: 'B6902-088',
    capacityPerShift: 8000, totalProduction: 16000, actualProduction: 9540, yesterdayProduction: 1540, color: '-', startDate: '2026-02-24T22:00:00', endDate: '2026-02-25T10:00:00',
    status: 'Planned', remarks: 'เปิด OT 800 ใบ/ชม. สลับพัก+พัก 2 ชม. เดินเครื่อง 10 ชม ย้ายจาก'
  },
  {
    id: 'ab2-3', machineId: 'AB2', productItem: 'QE275', productType: 'Jar', moldCode: 'QE275', jobOrder: 'B6902-126',
    capacityPerShift: 8000, totalProduction: 11200, actualProduction: 0, color: '-', startDate: '2026-02-25T12:00:00', endDate: '2026-02-26T04:00:00',
    status: 'Planned', remarks: 'เปิด OT 800 ใบ/ชม. สลับพัก+พัก 2 ชม. เดินเครื่อง 10 ชม'
  },
  {
    id: 'ab2-4', machineId: 'AB2', productItem: 'QE300', productType: 'Jar', moldCode: 'QE300', jobOrder: 'B6902-147',
    capacityPerShift: 8000, totalProduction: 16000, actualProduction: 0, color: '-', startDate: '2026-02-26T06:00:00', endDate: '2026-02-27T06:00:00',
    status: 'Planned', remarks: ''
  },

  // AB3
  {
    id: 'ab3-1', machineId: 'AB3', productItem: 'QE220', productType: 'Jar', moldCode: 'QE220', jobOrder: 'B6902-121',
    capacityPerShift: 8000, totalProduction: 22400, actualProduction: 16412, yesterdayProduction: 8412, color: '-', startDate: '2026-02-23T00:00:00', endDate: '2026-02-24T08:00:00',
    status: 'Running', remarks: 'เปิด OT 800 ใบ/ชม. สลับพัก+พัก 2 ชม. เดินเครื่อง 10 ชม'
  },
  {
    id: 'ab3-2', machineId: 'AB3', productItem: 'QE375', productType: 'Jar', moldCode: 'QE375', jobOrder: 'B6902-122',
    capacityPerShift: 8000, totalProduction: 11200, actualProduction: 0, color: '-', startDate: '2026-02-24T10:00:00', endDate: '2026-02-25T02:00:00',
    status: 'Planned', remarks: 'เปิด OT 800 ใบ/ชม. สลับพัก+พัก 2 ชม. เดินเครื่อง 10 ชม'
  },

  // AB4
  {
    id: 'ab4-1', machineId: 'AB4', productItem: 'QE307-2', productType: 'Jar', moldCode: 'QE307-4', jobOrder: 'B6902-030',
    capacityPerShift: 8400, totalProduction: 84000, actualProduction: 4098, yesterdayProduction: 4098, color: '-', startDate: '2026-02-09T09:00:00', endDate: '2026-02-13T09:00:00',
    status: 'Stopped', remarks: 'งานแฟล็ต ส่งวารไรตี้ห้ามมีเส้นผม ฝุ่นดำ จุดดำ สิ่งแปลกปลอม ห้ามนิ่ม'
  },
  {
    id: 'ab4-2', machineId: 'AB4', productItem: 'QE307-2', productType: 'Jar', moldCode: 'QE307-4', jobOrder: 'B6902-096',
    capacityPerShift: 8400, totalProduction: 84000, actualProduction: 0, color: '-', startDate: '2026-02-13T09:00:00', endDate: '2026-02-18T09:00:00',
    status: 'Planned', remarks: 'เปิด OT 700 ใบ/ชม.สลับพัก 1 ชม. เดินเครื่อง 10 ชม.'
  },

  // AB5 - High Volume, Starvation Risk
  {
    id: 'ab5-1', machineId: 'AB5', productItem: 'QE307-2', productType: 'Jar', moldCode: 'QE307-6', jobOrder: 'B6902-097',
    capacityPerShift: 12000, totalProduction: 200000, actualProduction: 65666, yesterdayProduction: 53666, color: '-', startDate: '2026-02-20T16:00:00', endDate: '2026-02-28T22:00:00',
    status: 'Running', remarks: 'ปิด OT (เดินเครื่อง 7 ชม.) 1,000ใบ/ชม.'
  },

  // AB7 - Breakdown
  {
    id: 'ab7-1', machineId: 'AB7', productItem: 'QE307-8', productType: 'Jar', moldCode: 'QE307-8', jobOrder: 'B6902-098',
    capacityPerShift: 12000, totalProduction: 140000, actualProduction: 56088, yesterdayProduction: 44088, color: '-', startDate: '2026-02-19T14:00:00', endDate: '2026-02-24T08:00:00',
    status: 'Running', remarks: 'ปิด OT (เดินเครื่อง 7 ชม.) 1,000ใบ/ชม.เริ่มเดิน 19.2.69'
  },

  // IB1
  {
    id: 'ib1-1', machineId: 'IB1', productItem: 'QE307-3', productType: 'Jar', moldCode: 'QE307-3', jobOrder: 'B6902-099',
    capacityPerShift: 8400, totalProduction: 84000, actualProduction: 66226, yesterdayProduction: 57826, color: '-', startDate: '2026-02-16T15:00:00', endDate: '2026-02-21T15:00:00',
    status: 'Running', remarks: 'เปิด OT 700 ใบ/ชม. เดินเครื่อง 12 ชม. ไม่จอดพัก'
  },
  {
    id: 'ib1-2', machineId: 'IB1', productItem: 'QE307-3', productType: 'Jar', moldCode: 'QE307-3', jobOrder: 'B6902-127',
    capacityPerShift: 8400, totalProduction: 84000, actualProduction: 0, color: '-', startDate: '2026-02-21T15:00:00', endDate: '2026-02-26T15:00:00',
    status: 'Planned', remarks: 'เปิด OT 700 ใบ/ชม. เดินเครื่อง 12 ชม. ไม่จอดพัก'
  },

  // --- Semi Blow Group (B) - 7 Hour Shifts ---
  {
    id: 'b1-1', machineId: 'B1', productItem: 'B07', productType: 'Jar', moldCode: 'B07', jobOrder: 'B6902-146',
    capacityPerShift: 2160, totalProduction: 21000, actualProduction: 865, yesterdayProduction: 0, color: '-', startDate: '2026-02-23T05:00:00', endDate: '2026-02-28T05:00:00',
    status: 'Running', remarks: 'ปิด OT 300 ใบ/ชม.สลับพัก 1 ชม. เดินเครื่อง 7 ชม.'
  },
  
  {
    id: 'b3-1', machineId: 'B3', productItem: 'B04', productType: 'Jar', moldCode: 'B04', jobOrder: 'B6902-120',
    capacityPerShift: 1890, totalProduction: 3780, actualProduction: 3740, yesterdayProduction: 1850, color: '-', startDate: '2026-02-22T08:00:00', endDate: '2026-02-23T05:00:00',
    status: 'Completed', remarks: 'ปิด OT 270 ใบ/ชม.สลับพัก 1 ชม. เดินเครื่อง 7 ชม. (เดินลงกล่องมือ 2)'
  },
  
  // B5 Sequence
  {
    id: 'b5-1', machineId: 'B5', productItem: 'B10-2', productType: 'Jar', moldCode: 'B10-2', jobOrder: 'B6901-228',
    capacityPerShift: 1890, totalProduction: 30240, actualProduction: 30240, color: '-', startDate: '2026-02-03T01:00:00', endDate: '2026-02-17T17:00:00',
    status: 'Completed', remarks: ''
  },
  {
    id: 'b5-2', machineId: 'B5', productItem: 'B10-3', productType: 'Jar', moldCode: 'B10-3', jobOrder: 'B6902-101',
    capacityPerShift: 1890, totalProduction: 18900, actualProduction: 18900, color: '-', startDate: '2026-02-17T08:00:00', endDate: '2026-02-22T08:00:00',
    status: 'Completed', remarks: 'ปิด OT (7 ชม.)'
  },
  {
    id: 'b5-3', machineId: 'B5', productItem: 'B05', productType: 'Jar', moldCode: 'B05', jobOrder: 'B6902-035',
    capacityPerShift: 1890, totalProduction: 1890, actualProduction: 0, color: '-', startDate: '2026-02-22T10:00:00', endDate: '2026-02-22T17:00:00',
    status: 'Planned', remarks: ''
  },

  // B7
  {
    id: 'b7-1', machineId: 'B7', productItem: 'B08', productType: 'Jar', moldCode: 'B08', jobOrder: 'B6902-102',
    capacityPerShift: 1890, totalProduction: 8400, actualProduction: 6000, color: '-', startDate: '2026-02-14T20:00:00', endDate: '2026-02-16T11:00:00',
    status: 'Completed', remarks: 'ปิด OT (7 ชม.)'
  },
  {
    id: 'b7-2', machineId: 'B7', productItem: 'B04', productType: 'Jar', moldCode: 'B04', jobOrder: 'B6902-103',
    capacityPerShift: 1890, totalProduction: 3780, actualProduction: 3780, color: '-', startDate: '2026-02-16T13:00:00', endDate: '2026-02-17T13:00:00',
    status: 'Completed', remarks: ''
  },

  // B8
  {
    id: 'b8-1', machineId: 'B8', productItem: 'B01', productType: 'Jar', moldCode: 'B01-6', jobOrder: 'B6902-036',
    capacityPerShift: 3000, totalProduction: 36000, actualProduction: 1890, yesterdayProduction: 0, color: '-', startDate: '2026-02-15T11:00:00', endDate: '2026-02-21T11:00:00',
    status: 'Running', remarks: 'ปิด OT 300 ใบ/ชม.สลับพัก 1 ชม. เดินเครื่อง 7 ชม. เปิดเครื่อง 23.2.69 8.00 น.'
  },
  {
    id: 'b8-2', machineId: 'B8', productItem: 'B01', productType: 'Jar', moldCode: 'B01-6', jobOrder: 'B6902-104',
    capacityPerShift: 3000, totalProduction: 21000, actualProduction: 0, color: '-', startDate: '2026-02-21T11:00:00', endDate: '2026-02-24T11:00:00',
    status: 'Planned', remarks: 'ปิด OT 300 ใบ/ชม.สลับพัก 1 ชม. เดินเครื่อง 7 ชม.'
  },
  {
    id: 'b8-3', machineId: 'B8', productItem: 'B01', productType: 'Jar', moldCode: 'B01-2', jobOrder: 'B6902-137',
    capacityPerShift: 3000, totalProduction: 21000, actualProduction: 0, color: '-', startDate: '2026-02-24T11:00:00', endDate: '2026-02-27T23:00:00',
    status: 'Planned', remarks: 'ปิด OT 300 ใบ/ชม.สลับพัก 1 ชม. เดินเครื่อง 7 ชม.'
  },

  // B6 (Using B9 slot in code as B6 in image)
  {
    id: 'b6-1', machineId: 'B6', productItem: 'B01-1', productType: 'Jar', moldCode: 'B01-1', jobOrder: 'B6902-034',
    capacityPerShift: 3000, totalProduction: 36000, actualProduction: 1800, yesterdayProduction: 0, color: '-', startDate: '2026-02-09T08:00:00', endDate: '2026-02-15T08:00:00',
    status: 'Running', remarks: 'ปิด OT 300 ใบ/ชม.สลับพัก 1 ชม. เดินเครื่อง 7 ชม. เปิดเครื่อง 23.2.69 8.'
  },
  {
    id: 'b6-2', machineId: 'B6', productItem: 'B01-1', productType: 'Jar', moldCode: 'B01-1', jobOrder: 'B6902-105',
    capacityPerShift: 3000, totalProduction: 21000, actualProduction: 0, color: '-', startDate: '2026-02-15T08:00:00', endDate: '2026-02-18T16:00:00',
    status: 'Planned', remarks: 'ปิด OT 300 ใบ/ชม.สลับพัก 1 ชม. เดินเครื่อง 7 ชม.'
  },
];

// Export the shifted mock data so it looks "live" relative to the actual real-time
export const MOCK_DATA: ProductionJob[] = RAW_MOCK_DATA.map(job => ({
  ...job,
  startDate: shiftDate(job.startDate),
  endDate: shiftDate(job.endDate),
}));
