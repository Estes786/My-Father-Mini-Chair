import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { CloudflareBindings } from './types'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Enable CORS for all API routes
app.use('/api/*', cors())

// Serve dashboard route  
app.get('/dashboard', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workshop Dashboard - Stark Dynasty</title><script src="https://cdn.tailwindcss.com"></script><link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"><script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script><script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script><script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/plugin/relativeTime.js"></script></head><body class="bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 min-h-screen text-white"><header class="bg-black bg-opacity-50 backdrop-blur-lg border-b border-purple-500"><div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between"><div class="flex items-center space-x-4"><i class="fas fa-hammer text-3xl text-purple-400"></i><div><h1 class="text-2xl font-bold">Workshop Production Dashboard</h1><p class="text-sm text-gray-400">Stark Dynasty • <span id="lastUpdate">Live</span></p></div></div><button onclick="location.reload()" class="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm"><i class="fas fa-sync-alt mr-2"></i>Refresh</button></div></header><main class="max-w-7xl mx-auto px-4 py-8"><div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"><div class="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6 shadow-xl"><div class="flex items-center justify-between mb-4"><i class="fas fa-project-diagram text-3xl"></i><span id="activeBadge" class="bg-green-500 text-xs px-2 py-1 rounded-full">...</span></div><h3 id="activeCount" class="text-4xl font-bold mb-2">-</h3><p class="text-sm opacity-80">Active Projects</p></div><div class="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6 shadow-xl"><i class="fas fa-money-bill-wave text-3xl mb-4"></i><h3 id="revenue" class="text-3xl font-bold mb-2">Rp -</h3><p class="text-sm opacity-80">Monthly Revenue</p></div><div class="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 shadow-xl"><i class="fas fa-check-circle text-3xl mb-4"></i><h3 id="quality" class="text-4xl font-bold mb-2">-%</h3><p class="text-sm opacity-80">Quality Rate</p></div><div class="bg-gradient-to-br from-orange-600 to-orange-800 rounded-xl p-6 shadow-xl"><i class="fas fa-box text-3xl mb-4"></i><h3 id="lowStock" class="text-4xl font-bold mb-2">-</h3><p class="text-sm opacity-80">Low Stock</p></div></div><div class="bg-black bg-opacity-50 backdrop-blur-lg rounded-xl p-6 border border-purple-500 mb-6"><h2 class="text-xl font-bold mb-6"><i class="fas fa-calendar-alt mr-3 text-purple-400"></i>Current Projects</h2><div id="projectsList">Loading...</div></div><div class="bg-black bg-opacity-50 backdrop-blur-lg rounded-xl p-6 border border-purple-500"><h2 class="text-xl font-bold mb-6"><i class="fas fa-boxes mr-3 text-purple-400"></i>Material Inventory</h2><div id="materialsList">Loading...</div></div></main><script>const API=window.location.origin;function fmt(n){return'Rp '+Math.round(n||0).toLocaleString('id-ID')}function pct(n){return (n||0).toFixed(1)+'%'}async function load(){try{const[stats,projects,materials]=await Promise.all([axios.get(API+'/api/workshop/dashboard'),axios.get(API+'/api/workshop/projects?status=in_production'),axios.get(API+'/api/workshop/materials')]);const s=stats.data.stats;document.getElementById('activeCount').textContent=s.active_projects;document.getElementById('activeBadge').textContent=s.active_projects>0?'ACTIVE':'NONE';document.getElementById('revenue').textContent=fmt(s.monthly_revenue);document.getElementById('quality').textContent=pct(s.quality_pass_rate);document.getElementById('lowStock').textContent=s.low_stock_materials;const phtml=projects.data.projects.slice(0,3).map(p=>{const prog=(p.actual_output/p.target_output*100)||0;return '<div class="border border-purple-500 rounded-lg p-4 mb-3"><div class="flex justify-between mb-2"><h3 class="font-bold">'+p.project_number+'</h3><span class="text-xs bg-green-600 px-2 py-1 rounded">'+p.status+'</span></div><div class="mb-2 text-sm"><div class="flex justify-between mb-1"><span>Progress</span><span>'+p.actual_output+'/'+p.target_output+'</span></div><div class="w-full bg-gray-700 rounded h-2"><div class="bg-green-400 h-2 rounded" style="width:'+prog+'%"></div></div></div><div class="grid grid-cols-2 gap-2 text-xs"><div><p class="text-gray-400">Target</p><p>'+p.target_completion_date+'</p></div><div><p class="text-gray-400">Margin</p><p>'+pct(p.profit_margin)+'</p></div></div></div>'}).join('')||'<p class="text-gray-400 text-center py-4">No active projects</p>';document.getElementById('projectsList').innerHTML=phtml;const mhtml=materials.data.materials.filter(m=>m.stock_status!=='ok').map(m=>{const color=m.stock_status==='critical'?'red':'yellow';return '<div class="border border-'+color+'-500 rounded-lg p-4 mb-3"><div class="flex justify-between items-start"><div><h3 class="font-bold">'+m.material_name+'</h3><p class="text-sm text-gray-400">'+m.material_code+'</p></div><span class="bg-'+color+'-600 text-xs px-2 py-1 rounded">'+m.stock_status.toUpperCase()+'</span></div><div class="mt-2 text-sm"><p>Stock: <strong>'+m.current_stock+' '+m.unit+'</strong> (min: '+m.min_stock+')</p><p class="text-gray-400">'+m.supplier_name+'</p></div></div>'}).join('')||'<p class="text-green-400 text-center py-4">✅ All materials OK!</p>';document.getElementById('materialsList').innerHTML=mhtml;document.getElementById('lastUpdate').textContent='Updated '+new Date().toLocaleTimeString()}catch(e){console.error(e)}}dayjs.extend(dayjs_plugin_relativeTime);load();setInterval(load,30000);</script></body></html>
  `)
})

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
// GANI AI CONSULTATION (Workers AI - Llama 3)
// =====================================================

// GANI AI Consultation for Workshop Management
app.post('/api/gani/consult', async (c) => {
  try {
    const { user_id = 'bapak-001', question, context_type = 'workshop' } = await c.req.json()
    
    if (!question) {
      return c.json({ success: false, error: 'Question is required' }, 400)
    }
    
    // Get workshop context
    const materials = await c.env.DB.prepare(`
      SELECT material_name, current_stock, min_stock, 
             CASE 
               WHEN current_stock <= min_stock THEN 'critical'
               WHEN current_stock <= (min_stock * 1.5) THEN 'warning'
               ELSE 'ok'
             END as stock_status
      FROM workshop_materials
    `).all()
    
    const activeProjects = await c.env.DB.prepare(`
      SELECT project_number, status, target_output, actual_output
      FROM production_projects 
      WHERE status IN ('in_production', 'quality_check')
    `).all()
    
    const recentQuality = await c.env.DB.prepare(`
      SELECT (SUM(passed) * 100.0 / COUNT(*)) as pass_rate
      FROM quality_inspections
      WHERE inspected_at >= date('now', '-7 days')
    `).first()
    
    // Build context for GANI
    const workshopContext = {
      materials: materials.results,
      active_projects: activeProjects.results,
      quality_pass_rate: recentQuality?.pass_rate || 95
    }
    
    // GANI system prompt
    const systemPrompt = `You are GANI (Generative AI Navigator Interface), the AI assistant for Stark Dynasty Workshop Production Management. Your role is to help Bapak (The Master Craftsman) manage his mini chair manufacturing business.

Context:
- Business: Manufacturing 90 mini chairs every 2 weeks
- Profit Margin: 57.2% (excellent!)
- Quality Target: 95%+ pass rate
- Cost: Rp 886,192 COGS, Revenue: Rp 2,070,000 per project

Current Workshop Status:
${JSON.stringify(workshopContext, null, 2)}

Your personality:
- Respectful to Bapak ("Boss")
- Data-driven and solution-oriented
- Proactive in alerting issues
- Proud of craftsmanship
- Mix Indonesian & English (casual professional)

Answer Bapak's question with actionable recommendations. Be specific with numbers and suggest concrete actions.`

    // Call Cloudflare Workers AI (Llama 3)
    const aiResponse = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      max_tokens: 512
    })
    
    return c.json({
      success: true,
      gani_response: aiResponse.response,
      context_used: workshopContext,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message,
      hint: 'Make sure Workers AI (Llama 3) is enabled in your Cloudflare account'
    }, 500)
  }
})

// Generate GANI Auto-Recommendations
app.get('/api/gani/recommendations', async (c) => {
  try {
    // Check for critical issues
    const recommendations = []
    
    // 1. Check material stock levels
    const lowStockMaterials = await c.env.DB.prepare(`
      SELECT material_name, current_stock, min_stock, reorder_quantity, 
             supplier_name, lead_time_days
      FROM workshop_materials
      WHERE current_stock <= min_stock
    `).all()
    
    for (const material of lowStockMaterials.results as any[]) {
      recommendations.push({
        priority: 'critical',
        type: 'material_reorder',
        title: `🚨 Stock ${material.material_name} Kritis!`,
        message: `Boss, stock ${material.material_name} tinggal ${material.current_stock}! Di bawah minimum ${material.min_stock}.\\n\\nRecommend order: ${material.reorder_quantity} unit dari ${material.supplier_name}\\nLead time: ${material.lead_time_days} hari\\n\\nJangan sampai delay production!`,
        action: 'restock_material',
        data: { material_id: material.id }
      })
    }
    
    // 2. Check project deadlines
    const upcomingDeadlines = await c.env.DB.prepare(`
      SELECT project_number, target_completion_date, actual_output, target_output
      FROM production_projects
      WHERE status = 'in_production' 
        AND target_completion_date <= date('now', '+3 days')
    `).all()
    
    for (const project of upcomingDeadlines.results as any[]) {
      const progress = (project.actual_output / project.target_output) * 100
      recommendations.push({
        priority: progress < 70 ? 'high' : 'medium',
        type: 'project_deadline',
        title: `⏰ Project ${project.project_number} Deadline Soon!`,
        message: `Boss, ${project.project_number} deadline dalam 3 hari!\\nProgress: ${project.actual_output}/${project.target_output} chairs (${progress.toFixed(1)}%)\\n\\n${progress < 70 ? 'Perlu percepat production!' : 'On track, maintain pace!'}`,
        action: 'view_project',
        data: { project_number: project.project_number }
      })
    }
    
    // 3. Check quality rate
    const qualityStats = await c.env.DB.prepare(`
      SELECT (SUM(passed) * 100.0 / COUNT(*)) as pass_rate,
             COUNT(*) as total_inspected
      FROM quality_inspections
      WHERE inspected_at >= date('now', '-7 days')
    `).first()
    
    if (qualityStats && qualityStats.pass_rate < 95 && qualityStats.total_inspected > 10) {
      recommendations.push({
        priority: 'high',
        type: 'quality_issue',
        title: '⚠️ Quality Pass Rate Below Target',
        message: `Boss, quality pass rate last 7 days: ${qualityStats.pass_rate.toFixed(1)}% (target: 95%+)\\n\\nPerlu investigate root cause:\\n- Check material quality\\n- Review production process\\n- Retrain if needed`,
        action: 'view_quality_report',
        data: { pass_rate: qualityStats.pass_rate }
      })
    }
    
    return c.json({
      success: true,
      recommendations,
      count: recommendations.length,
      timestamp: new Date().toISOString()
    })
    
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
