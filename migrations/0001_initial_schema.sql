-- =====================================================
-- STARK DYNASTY WORKSHOP PRODUCTION MODULE
-- Database Schema - Initial Migration
-- Version: 1.0.0
-- Date: 2026-02-09
-- =====================================================

-- =====================================================
-- TABLE 1: production_projects
-- Tracks 2-week production cycles (90 mini chairs each)
-- =====================================================
CREATE TABLE IF NOT EXISTS production_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_number TEXT UNIQUE NOT NULL, -- Format: "PROJ-2026-001"
    start_date DATE NOT NULL,
    target_completion_date DATE NOT NULL,
    actual_completion_date DATE,
    
    -- Targets
    target_output INTEGER DEFAULT 90, -- chairs
    actual_output INTEGER DEFAULT 0,
    
    -- Financial
    estimated_cost REAL DEFAULT 886192, -- Based on standard COGS
    actual_cost REAL DEFAULT 0,
    estimated_revenue REAL DEFAULT 2070000, -- 90 * Rp 23,000
    actual_revenue REAL DEFAULT 0,
    profit_margin REAL DEFAULT 57.2,
    
    -- Status
    status TEXT CHECK(status IN ('planning', 'materials_ordered', 'in_production', 'quality_check', 'completed', 'delivered')) DEFAULT 'planning',
    
    -- Metadata
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON production_projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_dates ON production_projects(start_date, target_completion_date);

-- =====================================================
-- TABLE 2: workshop_materials
-- 7 main materials untuk mini chair production
-- =====================================================
CREATE TABLE IF NOT EXISTS workshop_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_name TEXT UNIQUE NOT NULL,
    material_code TEXT UNIQUE NOT NULL, -- MAT-001, MAT-002, etc.
    unit TEXT NOT NULL, -- lembar, meter, kg, piece
    unit_price REAL NOT NULL,
    
    -- Inventory
    current_stock REAL DEFAULT 0,
    min_stock REAL NOT NULL, -- reorder point
    reorder_quantity REAL NOT NULL, -- standard order quantity
    
    -- Supplier
    supplier_name TEXT,
    supplier_contact TEXT,
    lead_time_days INTEGER DEFAULT 3, -- berapa lama dari order sampai datang
    
    -- Metadata
    last_restocked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_materials_stock_alert ON workshop_materials(current_stock, min_stock);

-- Initial material data (7 bahan utama)
INSERT INTO workshop_materials (material_name, material_code, unit, unit_price, min_stock, reorder_quantity, lead_time_days, supplier_name) VALUES
('Busa/Spoon', 'MAT-001', 'lembar', 64, 10, 50, 3, 'Supplier Busa Jakarta'),
('Kain/Cotton', 'MAT-002', 'meter', 17000, 20, 100, 5, 'Toko Kain Bandung'),
('Triplek (Thin Wood)', 'MAT-003', 'sheets', 46000, 5, 20, 7, 'PT Kayu Jaya'),
('Wood Sheets', 'MAT-004', 'sheets', 13000, 50, 200, 7, 'PT Kayu Jaya'),
('Paku/Nails', 'MAT-005', 'kg', 21000, 3, 10, 2, 'Toko Besi Sentosa'),
('Karton/Kardus', 'MAT-006', 'piece', 15000, 2, 10, 3, 'Supplier Packaging'),
('Lem/Glue', 'MAT-007', 'bottle', 15000, 2, 10, 3, 'Toko Kimia Abadi');

-- =====================================================
-- TABLE 3: material_usage
-- Track material consumption per project
-- =====================================================
CREATE TABLE IF NOT EXISTS material_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES production_projects(id),
    material_id INTEGER NOT NULL REFERENCES workshop_materials(id),
    quantity_used REAL NOT NULL,
    unit_cost REAL NOT NULL,
    total_cost REAL NOT NULL,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_project ON material_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_usage_material ON material_usage(material_id);

-- =====================================================
-- TABLE 4: quality_inspections
-- Quality control checklist for each chair
-- =====================================================
CREATE TABLE IF NOT EXISTS quality_inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES production_projects(id),
    chair_number INTEGER NOT NULL, -- 1-90
    
    -- Checklist (1 = pass, 0 = fail)
    frame_stability INTEGER CHECK(frame_stability IN (0, 1)) DEFAULT 1,
    cushion_quality INTEGER CHECK(cushion_quality IN (0, 1)) DEFAULT 1,
    finish_quality INTEGER CHECK(finish_quality IN (0, 1)) DEFAULT 1,
    safety_check INTEGER CHECK(safety_check IN (0, 1)) DEFAULT 1,
    
    -- Overall
    passed INTEGER CHECK(passed IN (0, 1)) DEFAULT 1,
    defect_notes TEXT,
    
    -- Inspector
    inspected_by TEXT, -- user_id
    inspected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inspections_project ON quality_inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_inspections_passed ON quality_inspections(passed);

-- =====================================================
-- TABLE 5: family_members (HOME MODULE)
-- Family members yang terlibat dalam Dynasty
-- =====================================================
CREATE TABLE IF NOT EXISTS family_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'bapak', 'ibu', 'stark', 'adik1', 'adik2'
    email TEXT,
    phone TEXT,
    
    -- Roles
    home_role TEXT, -- e.g., 'Family Head', 'Home Operations'
    workshop_role TEXT, -- e.g., 'Production Manager'
    barber_role TEXT, -- e.g., 'Supply Chain'
    
    -- Metrics
    stress_level INTEGER DEFAULT 0, -- 0-100
    productivity_score INTEGER DEFAULT 80, -- 0-100
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert Bapak (main user for workshop)
INSERT INTO family_members (user_id, name, role, home_role, workshop_role, barber_role) VALUES
('bapak-001', 'Bapak', 'bapak', 'Family Head', 'Production Manager', 'Supply Chain & Quality Control');

-- =====================================================
-- TABLE 6: home_tasks
-- Task management untuk family members
-- =====================================================
CREATE TABLE IF NOT EXISTS home_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES family_members(user_id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK(category IN ('household', 'business', 'personal', 'family')) DEFAULT 'business',
    priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    status TEXT CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    due_date DATE,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON home_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON home_tasks(status);

-- =====================================================
-- TABLE 7: sync_events (GANI Integration)
-- Cross-module communication events
-- =====================================================
CREATE TABLE IF NOT EXISTS sync_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_module TEXT NOT NULL, -- 'WORKSHOP', 'BARBER', 'HOME'
    target_module TEXT NOT NULL,
    event_type TEXT NOT NULL,
    priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    payload TEXT, -- JSON data
    processed INTEGER CHECK(processed IN (0, 1)) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_sync_unprocessed ON sync_events(processed, created_at);

-- =====================================================
-- TABLE 8: gani_alerts
-- GANI notification system
-- =====================================================
CREATE TABLE IF NOT EXISTS gani_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES family_members(user_id),
    alert_type TEXT NOT NULL, -- 'material_reorder', 'project_status', 'quality_issue', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    action_required INTEGER CHECK(action_required IN (0, 1)) DEFAULT 0,
    read_status INTEGER CHECK(read_status IN (0, 1)) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_unread ON gani_alerts(user_id, read_status);

-- =====================================================
-- INITIAL SEED DATA
-- =====================================================

-- Create first production project
INSERT INTO production_projects (
    project_number, 
    start_date, 
    target_completion_date, 
    target_output,
    estimated_cost,
    estimated_revenue,
    profit_margin,
    status
) VALUES (
    'PROJ-2026-001',
    date('now'),
    date('now', '+14 days'),
    90,
    886192,
    2070000,
    57.2,
    'in_production'
);

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- Project profitability view
CREATE VIEW IF NOT EXISTS v_project_profitability AS
SELECT 
    project_number,
    start_date,
    actual_completion_date,
    actual_output,
    actual_revenue,
    actual_cost,
    (actual_revenue - actual_cost) as profit,
    CASE 
        WHEN actual_revenue > 0 THEN ((actual_revenue - actual_cost) * 100.0 / actual_revenue)
        ELSE 0
    END as margin_pct,
    status
FROM production_projects
WHERE status = 'completed';

-- Material inventory status view
CREATE VIEW IF NOT EXISTS v_material_inventory_status AS
SELECT 
    material_name,
    material_code,
    unit,
    unit_price,
    current_stock,
    min_stock,
    CASE 
        WHEN current_stock <= min_stock THEN 'critical'
        WHEN current_stock <= (min_stock * 1.5) THEN 'warning'
        ELSE 'ok'
    END as stock_status,
    supplier_name,
    lead_time_days
FROM workshop_materials
ORDER BY current_stock ASC;

-- Quality statistics view
CREATE VIEW IF NOT EXISTS v_quality_stats AS
SELECT 
    pp.project_number,
    COUNT(*) as total_inspected,
    SUM(qi.passed) as total_passed,
    (SUM(qi.passed) * 100.0 / COUNT(*)) as pass_rate,
    AVG(qi.frame_stability) * 100 as frame_pass_rate,
    AVG(qi.cushion_quality) * 100 as cushion_pass_rate,
    AVG(qi.finish_quality) * 100 as finish_pass_rate,
    AVG(qi.safety_check) * 100 as safety_pass_rate
FROM quality_inspections qi
JOIN production_projects pp ON qi.project_id = pp.id
GROUP BY qi.project_id, pp.project_number;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
