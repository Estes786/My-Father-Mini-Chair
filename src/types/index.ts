// =====================================================
// STARK DYNASTY WORKSHOP - TypeScript Types
// =====================================================

export interface CloudflareBindings {
  DB: D1Database;
  AI: any; // Cloudflare Workers AI
}

// =====================================================
// Production Project Types
// =====================================================
export interface ProductionProject {
  id: number;
  project_number: string;
  start_date: string;
  target_completion_date: string;
  actual_completion_date?: string;
  target_output: number;
  actual_output: number;
  estimated_cost: number;
  actual_cost: number;
  estimated_revenue: number;
  actual_revenue: number;
  profit_margin: number;
  status: 'planning' | 'materials_ordered' | 'in_production' | 'quality_check' | 'completed' | 'delivered';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  start_date: string;
  target_output?: number;
  notes?: string;
}

export interface UpdateProjectProgressRequest {
  actual_output?: number;
  status?: string;
  notes?: string;
  actual_completion_date?: string;
}

// =====================================================
// Material Types
// =====================================================
export interface WorkshopMaterial {
  id: number;
  material_name: string;
  material_code: string;
  unit: string;
  unit_price: number;
  current_stock: number;
  min_stock: number;
  reorder_quantity: number;
  supplier_name?: string;
  supplier_contact?: string;
  lead_time_days: number;
  last_restocked_at?: string;
  created_at: string;
  updated_at: string;
  stock_status?: 'critical' | 'warning' | 'ok';
}

export interface MaterialUsage {
  material_id: number;
  quantity: number;
}

export interface RecordMaterialUsageRequest {
  materials_used: MaterialUsage[];
}

// =====================================================
// Quality Inspection Types
// =====================================================
export interface QualityInspection {
  id: number;
  project_id: number;
  chair_number: number;
  frame_stability: 0 | 1;
  cushion_quality: 0 | 1;
  finish_quality: 0 | 1;
  safety_check: 0 | 1;
  passed: 0 | 1;
  defect_notes?: string;
  inspected_by: string;
  inspected_at: string;
}

export interface RecordQualityCheckRequest {
  project_id: number;
  chair_number: number;
  frame_stability: boolean;
  cushion_quality: boolean;
  finish_quality: boolean;
  safety_check: boolean;
  defect_notes?: string;
}

export interface QualityStats {
  total_inspected: number;
  total_passed: number;
  total_failed: number;
  frame_pass_rate: number;
  cushion_pass_rate: number;
  finish_pass_rate: number;
  safety_pass_rate: number;
  overall_pass_rate: number;
}

// =====================================================
// Family & Home Types
// =====================================================
export interface FamilyMember {
  id: number;
  user_id: string;
  name: string;
  role: 'bapak' | 'ibu' | 'stark' | 'adik1' | 'adik2';
  email?: string;
  phone?: string;
  home_role?: string;
  workshop_role?: string;
  barber_role?: string;
  stress_level: number;
  productivity_score: number;
  last_active: string;
  created_at: string;
}

export interface HomeTask {
  id: number;
  user_id: string;
  title: string;
  description?: string;
  category: 'household' | 'business' | 'personal' | 'family';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  completed_at?: string;
  created_at: string;
}

export interface CreateTaskRequest {
  user_id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  due_date?: string;
}

// =====================================================
// GANI Alert Types
// =====================================================
export interface GANIAlert {
  id: number;
  user_id: string;
  alert_type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  action_required: 0 | 1;
  read_status: 0 | 1;
  created_at: string;
  read_at?: string;
}

export interface CreateAlertRequest {
  user_id: string;
  alert_type: string;
  title: string;
  message: string;
  priority?: string;
  action_required?: boolean;
}

// =====================================================
// Sync Event Types
// =====================================================
export interface SyncEvent {
  id: number;
  source_module: 'WORKSHOP' | 'BARBER' | 'HOME';
  target_module: 'WORKSHOP' | 'BARBER' | 'HOME';
  event_type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  payload?: string; // JSON string
  processed: 0 | 1;
  created_at: string;
  processed_at?: string;
}

export interface CreateSyncEventRequest {
  source_module: string;
  target_module: string;
  event_type: string;
  priority?: string;
  payload?: any;
}

// =====================================================
// Analytics Types
// =====================================================
export interface ProjectProfitability {
  project_number: string;
  start_date: string;
  actual_completion_date?: string;
  actual_output: number;
  actual_revenue: number;
  actual_cost: number;
  profit: number;
  margin_pct: number;
  status: string;
}

export interface MaterialInventoryStatus {
  material_name: string;
  material_code: string;
  unit: string;
  unit_price: number;
  current_stock: number;
  min_stock: number;
  stock_status: 'critical' | 'warning' | 'ok';
  supplier_name: string;
  lead_time_days: number;
}

export interface DashboardStats {
  active_projects: number;
  monthly_revenue: number;
  profit_margin: number;
  quality_pass_rate: number;
  low_stock_materials: number;
  pending_alerts: number;
}
