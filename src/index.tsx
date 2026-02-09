import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { CloudflareBindings } from './types'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Enable CORS for all API routes
app.use('/api/*', cors())

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }))
app.use('/dashboard', serveStatic({ path: './public/static/dashboard.html' }))

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function generateProjectNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `PROJ-${year}-${random}`
}

function calculateCompletionDate(startDate: string, days: number): string {
  const date = new Date(startDate)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function calculateCOGS(quantity: number = 90): number {
  // Standard COGS per 90 chairs: Rp 886,192
  const standardCost = 886192
  return (standardCost / 90) * quantity
}

// =====================================================
// WORKSHOP PRODUCTION ROUTES
// =====================================================

// Get all production projects
app.get('/api/workshop/projects', async (c) => {
  const status = c.req.query('status')
  
  let query = 'SELECT * FROM production_projects'
  if (status) {
    query += ` WHERE status = '${status}'`
  }
  query += ' ORDER BY start_date DESC'
  
  try {
    const result = await c.env.DB.prepare(query).all()
    return c.json({ success: true, projects: result.results })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get single project by ID
app.get('/api/workshop/projects/:id', async (c) => {
  const id = c.req.param('id')
  
  try {
    const project = await c.env.DB.prepare(
      'SELECT * FROM production_projects WHERE id = ?'
    ).bind(id).first()
    
    if (!project) {
      return c.json({ success: false, error: 'Project not found' }, 404)
    }
    
    return c.json({ success: true, project })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Create new production project
app.post('/api/workshop/projects', async (c) => {
  try {
    const { start_date, target_output = 90, notes } = await c.req.json()
    
    const project_number = generateProjectNumber()
    const target_completion = calculateCompletionDate(start_date, 14)
    const estimated_cost = calculateCOGS(target_output)
    const estimated_revenue = target_output * 23000
    const profit_margin = ((estimated_revenue - estimated_cost) / estimated_revenue) * 100
    
    const result = await c.env.DB.prepare(`
      INSERT INTO production_projects 
      (project_number, start_date, target_completion_date, target_output, 
       estimated_cost, estimated_revenue, profit_margin, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'planning', ?)
    `).bind(
      project_number,
      start_date,
      target_completion,
      target_output,
      estimated_cost,
      estimated_revenue,
      profit_margin.toFixed(2),
      notes || null
    ).run()
    
    return c.json({ 
      success: true, 
      project_id: result.meta.last_row_id,
      project_number,
      estimated_profit: estimated_revenue - estimated_cost
    }, 201)
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Update project progress
app.post('/api/workshop/projects/:id/progress', async (c) => {
  const id = c.req.param('id')
  
  try {
    const { actual_output, status, notes, actual_completion_date } = await c.req.json()
    
    let updateFields = []
    let bindValues = []
    
    if (actual_output !== undefined) {
      updateFields.push('actual_output = ?')
      bindValues.push(actual_output)
    }
    if (status) {
      updateFields.push('status = ?')
      bindValues.push(status)
    }
    if (notes) {
      updateFields.push('notes = ?')
      bindValues.push(notes)
    }
    if (actual_completion_date) {
      updateFields.push('actual_completion_date = ?')
      bindValues.push(actual_completion_date)
    }
    
    updateFields.push("updated_at = datetime('now')")
    bindValues.push(id)
    
    await c.env.DB.prepare(`
      UPDATE production_projects
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).bind(...bindValues).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// =====================================================
// MATERIAL INVENTORY ROUTES
// =====================================================

// Get all materials with stock status
app.get('/api/workshop/materials', async (c) => {
  try {
    const materials = await c.env.DB.prepare(`
      SELECT 
        *,
        CASE 
          WHEN current_stock <= min_stock THEN 'critical'
          WHEN current_stock <= (min_stock * 1.5) THEN 'warning'
          ELSE 'ok'
        END as stock_status
      FROM workshop_materials
      ORDER BY material_code
    `).all()
    
    return c.json({ success: true, materials: materials.results })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Record material usage for project
app.post('/api/workshop/projects/:id/use-materials', async (c) => {
  const project_id = c.req.param('id')
  
  try {
    const { materials_used } = await c.req.json()
    
    for (const usage of materials_used) {
      // Get material details
      const material = await c.env.DB.prepare(
        'SELECT * FROM workshop_materials WHERE id = ?'
      ).bind(usage.material_id).first()
      
      if (!material) continue
      
      const total_cost = usage.quantity * material.unit_price
      
      // Record usage
      await c.env.DB.prepare(`
        INSERT INTO material_usage 
        (project_id, material_id, quantity_used, unit_cost, total_cost)
        VALUES (?, ?, ?, ?, ?)
      `).bind(project_id, usage.material_id, usage.quantity, material.unit_price, total_cost).run()
      
      // Update stock
      await c.env.DB.prepare(`
        UPDATE workshop_materials
        SET current_stock = current_stock - ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(usage.quantity, usage.material_id).run()
    }
    
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Update material stock (restock)
app.post('/api/workshop/materials/:id/restock', async (c) => {
  const id = c.req.param('id')
  
  try {
    const { quantity } = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE workshop_materials
      SET current_stock = current_stock + ?,
          last_restocked_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(quantity, id).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// =====================================================
// QUALITY CONTROL ROUTES
// =====================================================

// Record quality inspection
app.post('/api/workshop/quality-check', async (c) => {
  try {
    const { 
      project_id, 
      chair_number, 
      frame_stability, 
      cushion_quality, 
      finish_quality, 
      safety_check,
      defect_notes 
    } = await c.req.json()
    
    const passed = (frame_stability && cushion_quality && finish_quality && safety_check) ? 1 : 0
    
    await c.env.DB.prepare(`
      INSERT INTO quality_inspections
      (project_id, chair_number, frame_stability, cushion_quality, finish_quality, 
       safety_check, passed, defect_notes, inspected_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      project_id,
      chair_number,
      frame_stability ? 1 : 0,
      cushion_quality ? 1 : 0,
      finish_quality ? 1 : 0,
      safety_check ? 1 : 0,
      passed,
      defect_notes || null,
      'bapak-001' // Default inspector
    ).run()
    
    return c.json({ success: true, passed: passed === 1 })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get quality statistics for project
app.get('/api/workshop/projects/:id/quality', async (c) => {
  const project_id = c.req.param('id')
  
  try {
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_inspected,
        SUM(passed) as total_passed,
        SUM(CASE WHEN passed = 0 THEN 1 ELSE 0 END) as total_failed,
        AVG(frame_stability) * 100 as frame_pass_rate,
        AVG(cushion_quality) * 100 as cushion_pass_rate,
        AVG(finish_quality) * 100 as finish_pass_rate,
        AVG(safety_check) * 100 as safety_pass_rate,
        (SUM(passed) * 100.0 / COUNT(*)) as overall_pass_rate
      FROM quality_inspections
      WHERE project_id = ?
    `).bind(project_id).first()
    
    return c.json({ success: true, quality_stats: stats })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// =====================================================
// COST TRACKING & ANALYTICS
// =====================================================

// Get project cost breakdown
app.get('/api/workshop/projects/:id/costs', async (c) => {
  const project_id = c.req.param('id')
  
  try {
    const project = await c.env.DB.prepare(
      'SELECT * FROM production_projects WHERE id = ?'
    ).bind(project_id).first()
    
    if (!project) {
      return c.json({ success: false, error: 'Project not found' }, 404)
    }
    
    const material_costs = await c.env.DB.prepare(`
      SELECT 
        wm.material_name,
        mu.quantity_used,
        wm.unit,
        mu.unit_cost,
        mu.total_cost
      FROM material_usage mu
      JOIN workshop_materials wm ON mu.material_id = wm.id
      WHERE mu.project_id = ?
      ORDER BY mu.total_cost DESC
    `).bind(project_id).all()
    
    const total_actual_cost = material_costs.results.reduce((sum: number, m: any) => sum + m.total_cost, 0)
    const actual_revenue = project.actual_output * 23000
    const actual_profit = actual_revenue - total_actual_cost
    
    return c.json({
      success: true,
      project,
      material_costs: material_costs.results,
      summary: {
        estimated_cost: project.estimated_cost,
        actual_cost: total_actual_cost,
        cost_variance: total_actual_cost - project.estimated_cost,
        cost_variance_pct: ((total_actual_cost - project.estimated_cost) / project.estimated_cost) * 100,
        actual_revenue,
        actual_profit,
        profit_margin: (actual_profit / actual_revenue) * 100
      }
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// =====================================================
// DASHBOARD & ANALYTICS
// =====================================================

// Get dashboard statistics
app.get('/api/workshop/dashboard', async (c) => {
  try {
    // Active projects
    const activeProjects = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM production_projects WHERE status IN ('in_production', 'quality_check')"
    ).first()
    
    // Monthly revenue estimate (last 30 days completed projects)
    const monthlyRevenue = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(actual_revenue), 0) as revenue
      FROM production_projects
      WHERE status = 'completed' AND actual_completion_date >= date('now', '-30 days')
    `).first()
    
    // Average profit margin
    const avgMargin = await c.env.DB.prepare(`
      SELECT COALESCE(AVG(profit_margin), 57.2) as margin
      FROM production_projects
      WHERE status = 'completed'
    `).first()
    
    // Quality pass rate
    const qualityRate = await c.env.DB.prepare(`
      SELECT COALESCE((SUM(passed) * 100.0 / COUNT(*)), 95) as pass_rate
      FROM quality_inspections
      WHERE inspected_at >= date('now', '-30 days')
    `).first()
    
    // Low stock materials
    const lowStock = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM workshop_materials WHERE current_stock <= min_stock'
    ).first()
    
    // Pending alerts
    const pendingAlerts = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM gani_alerts WHERE read_status = 0'
    ).first()
    
    return c.json({
      success: true,
      stats: {
        active_projects: activeProjects?.count || 0,
        monthly_revenue: monthlyRevenue?.revenue || 0,
        profit_margin: avgMargin?.margin || 57.2,
        quality_pass_rate: qualityRate?.pass_rate || 95,
        low_stock_materials: lowStock?.count || 0,
        pending_alerts: pendingAlerts?.count || 0
      }
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// =====================================================
// HOME MODULE ROUTES
// =====================================================

// Get family members
app.get('/api/home/family', async (c) => {
  try {
    const members = await c.env.DB.prepare(
      'SELECT * FROM family_members ORDER BY role'
    ).all()
    return c.json({ success: true, members: members.results })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Get user tasks
app.get('/api/home/tasks', async (c) => {
  const user_id = c.req.query('user_id') || 'bapak-001'
  const status = c.req.query('status')
  
  try {
    let query = 'SELECT * FROM home_tasks WHERE user_id = ?'
    let params = [user_id]
    
    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }
    
    query += ' ORDER BY priority DESC, due_date ASC'
    
    const tasks = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ success: true, tasks: tasks.results })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Create task
app.post('/api/home/tasks', async (c) => {
  try {
    const { user_id, title, description, category, priority, due_date } = await c.req.json()
    
    const result = await c.env.DB.prepare(`
      INSERT INTO home_tasks (user_id, title, description, category, priority, due_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      user_id || 'bapak-001',
      title,
      description || null,
      category || 'business',
      priority || 'medium',
      due_date || null
    ).run()
    
    return c.json({ success: true, task_id: result.meta.last_row_id }, 201)
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// =====================================================
// GANI ALERTS ROUTES
// =====================================================

// Get alerts for user
app.get('/api/gani/alerts', async (c) => {
  const user_id = c.req.query('user_id') || 'bapak-001'
  const unread_only = c.req.query('unread_only') === 'true'
  
  try {
    let query = 'SELECT * FROM gani_alerts WHERE user_id = ?'
    if (unread_only) {
      query += ' AND read_status = 0'
    }
    query += ' ORDER BY priority DESC, created_at DESC LIMIT 50'
    
    const alerts = await c.env.DB.prepare(query).bind(user_id).all()
    return c.json({ success: true, alerts: alerts.results })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Mark alert as read
app.post('/api/gani/alerts/:id/read', async (c) => {
  const id = c.req.param('id')
  
  try {
    await c.env.DB.prepare(`
      UPDATE gani_alerts
      SET read_status = 1, read_at = datetime('now')
      WHERE id = ?
    `).bind(id).run()
    
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// =====================================================
// DEFAULT ROUTES
// =====================================================

// Root route - Dashboard UI
app.get('/', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Stark Dynasty Workshop - Bapak's Mini Chair Production</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 min-h-screen text-white">
        <div class="max-w-4xl mx-auto p-8">
            <div class="text-center mb-12">
                <i class="fas fa-hammer text-6xl text-purple-400 mb-4"></i>
                <h1 class="text-4xl font-bold mb-4">Stark Dynasty Workshop</h1>
                <p class="text-xl text-gray-300">Mini Chair Production Management System</p>
                <p class="text-sm text-gray-400 mt-2">Untuk Bapak - The Master Craftsman</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <a href="/dashboard" class="bg-purple-600 hover:bg-purple-700 rounded-xl p-6 text-center transition">
                    <i class="fas fa-chart-line text-4xl mb-3"></i>
                    <h2 class="text-xl font-bold">Dashboard</h2>
                    <p class="text-sm opacity-80 mt-2">Production metrics & analytics</p>
                </a>
                
                <a href="/api/workshop/projects" class="bg-blue-600 hover:bg-blue-700 rounded-xl p-6 text-center transition">
                    <i class="fas fa-project-diagram text-4xl mb-3"></i>
                    <h2 class="text-xl font-bold">Projects API</h2>
                    <p class="text-sm opacity-80 mt-2">Production project data</p>
                </a>
                
                <a href="/api/workshop/materials" class="bg-green-600 hover:bg-green-700 rounded-xl p-6 text-center transition">
                    <i class="fas fa-boxes text-4xl mb-3"></i>
                    <h2 class="text-xl font-bold">Materials API</h2>
                    <p class="text-sm opacity-80 mt-2">Material inventory status</p>
                </a>
                
                <a href="/api/workshop/dashboard" class="bg-orange-600 hover:bg-orange-700 rounded-xl p-6 text-center transition">
                    <i class="fas fa-tachometer-alt text-4xl mb-3"></i>
                    <h2 class="text-xl font-bold">Dashboard API</h2>
                    <p class="text-sm opacity-80 mt-2">Real-time statistics</p>
                </a>
            </div>
            
            <div class="bg-black bg-opacity-50 backdrop-blur-lg rounded-xl p-6 border border-purple-500">
                <h3 class="text-lg font-bold mb-3 flex items-center">
                    <i class="fas fa-info-circle mr-2 text-purple-400"></i>
                    System Status
                </h3>
                <div class="space-y-2 text-sm">
                    <p>✅ <strong>Workshop Module:</strong> Active</p>
                    <p>✅ <strong>Database:</strong> Connected (D1)</p>
                    <p>✅ <strong>API Endpoints:</strong> ${(await c.env.DB.prepare('SELECT 1').first()) ? 'Ready' : 'Initializing...'}</p>
                    <p>🤖 <strong>GANI Integration:</strong> Ready</p>
                </div>
            </div>
            
            <div class="mt-8 text-center text-sm text-gray-400">
                <p>Stark Dynasty v1.0.0 | Powered by <span class="text-purple-400 font-bold">GANI Hypha Engine</span></p>
                <p class="mt-2">🏭 Manufacturing Excellence | 💰 57% Profit Margin | ✅ 95%+ Quality</p>
            </div>
        </div>
    </body>
    </html>
  `)
})

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy',
    service: 'stark-dynasty-workshop',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

export default app
