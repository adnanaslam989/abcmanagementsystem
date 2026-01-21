const express = require('express');
const dbModule = require('../config/db');
const router = express.Router();

const db = dbModule.pool;

console.log('✅ Roles routes loaded');

// Helper function to check user exists
const checkUserExists = async (pak) => {
  try {
    const [civilianUsers] = await db.execute(
      'SELECT PAK FROM civ_manpower WHERE PAK = ?',
      [pak]
    );
    const [uniformedUsers] = await db.execute(
      'SELECT PAK FROM manpower WHERE PAK = ?',
      [pak]
    );
    return civilianUsers.length > 0 || uniformedUsers.length > 0;
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
};

// ==================== GET ALL MENU ITEMS ====================
router.get('/menu-items', async (req, res) => {
  try {
    const [menuItems] = await db.execute(
      `SELECT * FROM menu_permissions WHERE is_active = TRUE ORDER BY display_order`
    );
    res.json({ success: true, menuItems });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== GET USER'S MENU (MAIN ENDPOINT) ====================
router.get('/user-menu/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    console.log(`📋 Getting menu for user: ${pak}`);
    
    // Get ALL active menu items
    const [allMenuItems] = await db.execute(
      `SELECT * FROM menu_permissions WHERE is_active = TRUE ORDER BY display_order`
    );
    
    // ===== SUPER ADMIN BYPASS =====
    if (pak === '100001') {
      console.log('🔑 SUPER ADMIN detected - returning FULL menu');
      const menuTree = buildCompleteMenuTree(allMenuItems);
      return res.json({
        success: true,
        menuItems: menuTree,
        is_super_admin: true,
        total_items: menuTree.length
      });
    }
    
    // ===== NORMAL USER LOGIC =====
    // Get user's roles
    const [userRoles] = await db.execute(
      `SELECT MODULE, ADD_ROLE, UPDATE_ROLE, VIEW_ROLE, ASSIGN_ROLE 
       FROM employee_roles WHERE PAK = ?`,
      [pak]
    );
    
    // If no roles, return only main dashboard
    if (userRoles.length === 0) {
      console.log(`User ${pak} has no roles - returning main dashboard only`);
      const mainDashboard = allMenuItems.filter(item => item.menu_key === 'main-dashboard');
      const menuTree = buildCompleteMenuTree(mainDashboard);
      return res.json({
        success: true,
        menuItems: menuTree,
        message: 'No roles assigned'
      });
    }
    
    // Create permission map
    const permissionMap = {};
    userRoles.forEach(role => {
      permissionMap[role.MODULE] = {
        add: role.ADD_ROLE === 'on',
        update: role.UPDATE_ROLE === 'on',
        view: role.VIEW_ROLE === 'on',
        assign: role.ASSIGN_ROLE === 'on'
      };
    });
    
    console.log('User permissions:', permissionMap);
    
    // Filter menu items
    const filteredItems = allMenuItems.filter(item => {
      // Always show main dashboard
      if (item.menu_key === 'main-dashboard') return true;
      
      // If no module or module='all', show it
      if (!item.module || item.module === 'all') return true;
      
      // Check if user has permission for this module
      const userPerm = permissionMap[item.module];
      if (!userPerm) return false;
      
      // Check required permission
      const required = item.required_permission || 'view';
      switch(required) {
        case 'add': return userPerm.add;
        case 'update': return userPerm.update;
        case 'view': return userPerm.view;
        case 'assign': return userPerm.assign;
        default: return userPerm.view;
      }
    });
    
    console.log(`Filtered ${filteredItems.length} items for ${pak}`);
    
    const menuTree = buildCompleteMenuTree(filteredItems);
    
    res.json({
      success: true,
      menuItems: menuTree,
      total_items: menuTree.length
    });
    
  } catch (error) {
    console.error('❌ Error in user-menu:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper to build menu tree
function buildCompleteMenuTree(items) {
  const itemMap = {};
  const roots = [];
  
  // Create map
  items.forEach(item => {
    itemMap[item.menu_key] = {
      key: item.menu_key,
      title: item.menu_title,
      path: item.path,
      icon: item.icon,
      module: item.module,
      required_permission: item.required_permission,
      subItems: []
    };
  });
  
  // Build hierarchy
  items.forEach(item => {
    const node = itemMap[item.menu_key];
    if (item.parent_key && itemMap[item.parent_key]) {
      itemMap[item.parent_key].subItems.push(node);
    } else {
      roots.push(node);
    }
  });
  
  // Sort roots by display_order
  const getDisplayOrder = (key) => {
    const item = items.find(i => i.menu_key === key);
    return item ? item.display_order : 999;
  };
  
  roots.sort((a, b) => getDisplayOrder(a.key) - getDisplayOrder(b.key));
  
  // Sort subItems recursively
  const sortSubItems = (node) => {
    if (node.subItems && node.subItems.length > 0) {
      node.subItems.sort((a, b) => getDisplayOrder(a.key) - getDisplayOrder(b.key));
      node.subItems.forEach(sortSubItems);
    }
  };
  
  roots.forEach(sortSubItems);
  
  return roots;
}

// ==================== GET ALL EMPLOYEES ====================
router.get('/all-employees', async (req, res) => {
  try {
    // Get civilian employees
    const [civilianEmployees] = await db.execute(
      `SELECT 
        PAK,
        COALESCE(EMPLOYEE_NAME, 'Unknown') as employee_name,
        COALESCE(APPOINTMENT, 'N/A') as appointment,
        'civilian' as employee_type,
        SECTION,
        DEPLOYMENT
       FROM civ_manpower 
       WHERE (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())
       ORDER BY EMPLOYEE_NAME`
    );

    // Get uniformed employees
    const [uniformedEmployees] = await db.execute(
      `SELECT 
        PAK,
        COALESCE(EMPLOYEE_NAME, 'Unknown') as employee_name,
        COALESCE(\`RANK\`, 'N/A') as appointment,
        'uniformed' as employee_type,
        SECTION,
        DEPLOYMENT
       FROM manpower 
       WHERE (POSTOUT_DATE IS NULL OR POSTOUT_DATE > CURDATE())
       ORDER BY EMPLOYEE_NAME`
    );

    // Combine
    const allEmployees = [
      ...civilianEmployees.map(emp => ({
        ...emp,
        display_text: `${emp.PAK} : ${emp.appointment} : ${emp.employee_name} (${emp.employee_type})`
      })),
      ...uniformedEmployees.map(emp => ({
        ...emp,
        display_text: `${emp.PAK} : ${emp.appointment} : ${emp.employee_name} (${emp.employee_type})`
      }))
    ];

    res.json({ success: true, employees: allEmployees });
    
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== GET EMPLOYEE DETAILS ====================
router.get('/employee/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    
    // Check civilian table
    const [civilianEmployees] = await db.execute(
      `SELECT 
        PAK,
        EMPLOYEE_NAME as employee_name,
        APPOINTMENT as appointment,
        SECTION,
        DEPLOYMENT,
        'civilian' as employee_type
       FROM civ_manpower WHERE PAK = ?`,
      [pak]
    );
    
    if (civilianEmployees.length > 0) {
      return res.json({ success: true, employee: civilianEmployees[0] });
    }
    
    // Check uniformed table
    const [uniformedEmployees] = await db.execute(
      `SELECT 
        PAK,
        EMPLOYEE_NAME as employee_name,
        \`RANK\` as appointment,
        SECTION,
        DEPLOYMENT,
        'uniformed' as employee_type
       FROM manpower WHERE PAK = ?`,
      [pak]
    );
    
    if (uniformedEmployees.length > 0) {
      return res.json({ success: true, employee: uniformedEmployees[0] });
    }
    
    res.status(404).json({ success: false, message: 'Employee not found' });
    
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== GET USER ROLES ====================
router.get('/user/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    
    const [roles] = await db.execute(
      `SELECT 
        MODULE,
        CASE WHEN ADD_ROLE = 'on' THEN 1 ELSE 0 END as add_permission,
        CASE WHEN UPDATE_ROLE = 'on' THEN 1 ELSE 0 END as update_permission,
        CASE WHEN VIEW_ROLE = 'on' THEN 1 ELSE 0 END as view_permission,
        CASE WHEN ASSIGN_ROLE = 'on' THEN 1 ELSE 0 END as assign_permission
       FROM employee_roles WHERE PAK = ?`,
      [pak]
    );
    
    // Format response
    const formattedRoles = {};
    roles.forEach(role => {
      formattedRoles[role.MODULE] = {
        add: role.add_permission === 1,
        update: role.update_permission === 1,
        view: role.view_permission === 1,
        assign: role.assign_permission === 1
      };
    });
    
    // Ensure all modules exist
    const allModules = ['PAF_HR', 'PAF_Attendance', 'Civilian_HR', 'Civilian_Attendance'];
    allModules.forEach(module => {
      if (!formattedRoles[module]) {
        formattedRoles[module] = { add: false, update: false, view: false, assign: false };
      }
    });
    
    res.json({ success: true, roles: formattedRoles, user_pak: pak });
    
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== ASSIGN ROLES ====================
router.post('/assign', async (req, res) => {
  let connection;
  try {
    const { pak, roles } = req.body;
    
    console.log(`Assigning roles for ${pak}`);
    
    if (!pak || !roles) {
      return res.status(400).json({ success: false, message: 'PAK and roles required' });
    }
    
    // Check user exists
    const userExists = await checkUserExists(pak);
    if (!userExists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Delete existing roles
      await connection.execute('DELETE FROM employee_roles WHERE PAK = ?', [pak]);
      
      // Define modules
      const modules = [
        { moduleKey: 'PAF_HR', roleKey: 'pafhr' },
        { moduleKey: 'PAF_Attendance', roleKey: 'pafattendance' },
        { moduleKey: 'Civilian_HR', roleKey: 'civilianhr' },
        { moduleKey: 'Civilian_Attendance', roleKey: 'civilianattendance' }
      ];
      
      for (const { moduleKey, roleKey } of modules) {
        const moduleData = roles[roleKey] || {};
        
        // Only insert if any permission is true
        if (moduleData.add || moduleData.update || moduleData.view || moduleData.assign) {
          await connection.execute(
            `INSERT INTO employee_roles (PAK, MODULE, ADD_ROLE, UPDATE_ROLE, VIEW_ROLE, ASSIGN_ROLE)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              pak,
              moduleKey,
              moduleData.add ? 'on' : 'null',
              moduleData.update ? 'on' : 'null',
              moduleData.view ? 'on' : 'null',
              moduleData.assign ? 'on' : 'null'
            ]
          );
        }
      }
      
      await connection.commit();
      await connection.release();
      
      res.json({ success: true, message: 'Roles assigned successfully' });
      
    } catch (error) {
      if (connection) {
        await connection.rollback();
        await connection.release();
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Error assigning roles:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== UPDATE ROLES ====================
router.put('/update/:pak', async (req, res) => {
  try {
    const { pak } = req.params;
    const { roles } = req.body;
    
    // Just call assign endpoint (same logic)
    const response = await router.handle(
      { method: 'POST', url: '/assign', body: { pak, roles } },
      res
    );
    
    return response;
    
  } catch (error) {
    console.error('Error updating roles:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ==================== GET MENU WITH PERMISSIONS ====================
router.get('/menu-with-permissions', async (req, res) => {
  try {
    const [menuItems] = await db.execute(
      `SELECT 
        module,
        menu_key,
        menu_title,
        path,
        required_permission
       FROM menu_permissions 
       WHERE is_active = TRUE AND module IS NOT NULL AND module != 'all'
       ORDER BY module, menu_title`
    );
    
    // Group by module
    const modules = {};
    menuItems.forEach(item => {
      if (!modules[item.module]) {
        modules[item.module] = [];
      }
      modules[item.module].push({
        menu_key: item.menu_key,
        menu_title: item.menu_title,
        path: item.path,
        required_permission: item.required_permission || 'view'
      });
    });
    
    res.json({ success: true, modules: modules });
    
  } catch (error) {
    console.error('Error fetching menu with permissions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;