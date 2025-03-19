const db = require('../config/database');

class Menu {
  // Create a new menu
  static async create(menuData) {
    try {
      const { name, position } = menuData;
      
      const [result] = await db.execute(
        'INSERT INTO menus (name, position) VALUES (?, ?)',
        [name, position]
      );
      
      return result.insertId;
    } catch (error) {
      throw new Error('Error creating menu: ' + error.message);
    }
  }

  // Find menu by ID
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM menus WHERE id = ?',
        [id]
      );
      
      return rows[0];
    } catch (error) {
      throw new Error('Error finding menu: ' + error.message);
    }
  }

  // Get all menus
  static async findAll(filters = {}) {
    try {
      let query = 'SELECT * FROM menus';
      const params = [];
      
      if (filters.position) {
        query += ' WHERE position = ?';
        params.push(filters.position);
      }
      
      query += ' ORDER BY id ASC';
      
      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      throw new Error('Error finding menus: ' + error.message);
    }
  }

  // Update menu
  static async update(id, menuData) {
    try {
      const { name, position } = menuData;
      
      const [result] = await db.execute(
        'UPDATE menus SET name = ?, position = ? WHERE id = ?',
        [name, position, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error updating menu: ' + error.message);
    }
  }

  // Delete menu
  static async delete(id) {
    try {
      // Delete menu items first
      await db.execute('DELETE FROM menu_items WHERE menu_id = ?', [id]);
      
      // Then delete the menu
      const [result] = await db.execute('DELETE FROM menus WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error deleting menu: ' + error.message);
    }
  }

  // Toggle active status
  static async toggleActive(id) {
    try {
      const [rows] = await db.execute('SELECT is_active FROM menus WHERE id = ?', [id]);
      if (!rows.length) {
        throw new Error('Menu not found');
      }
      
      const currentStatus = rows[0].is_active === 1;
      
      const [result] = await db.execute(
        'UPDATE menus SET is_active = ? WHERE id = ?',
        [!currentStatus ? 1 : 0, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error toggling menu status: ' + error.message);
    }
  }

  // Update order
  static async updateOrder(id, orderNumber) {
    try {
      const [result] = await db.execute(
        'UPDATE menu_items SET order_number = ? WHERE id = ?',
        [orderNumber, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error updating menu order: ' + error.message);
    }
  }

  // Check if a menu exists
  static async exists(id) {
    try {
      const [rows] = await db.execute(
        'SELECT id FROM menus WHERE id = ?',
        [id]
      );
      return rows.length > 0;
    } catch (error) {
      throw new Error('Error checking menu existence: ' + error.message);
    }
  }

  // Get menu tree
  static async getMenuTree() {
    try {
      // Get all menus
      const [menus] = await db.execute(`
        SELECT * FROM menus ORDER BY position, name
      `);
      
      // For each menu, get its items
      for (let i = 0; i < menus.length; i++) {
        const [items] = await db.execute(`
          SELECT * FROM menu_items 
          WHERE menu_id = ? 
          ORDER BY parent_id IS NULL DESC, order_number ASC
        `, [menus[i].id]);
        
        // Build tree structure
        const itemMap = {};
        const rootItems = [];
        
        // First pass: create map of all items
        items.forEach(item => {
          itemMap[item.id] = {...item, children: []};
        });
        
        // Second pass: build tree structure
        items.forEach(item => {
          if (item.parent_id) {
            // If item has parent, add to parent's children
            if (itemMap[item.parent_id]) {
              itemMap[item.parent_id].children.push(itemMap[item.id]);
            }
          } else {
            // If item has no parent, it's a root item
            rootItems.push(itemMap[item.id]);
          }
        });
        
        // Attach items to menu
        menus[i].items = rootItems;
      }
      
      return menus;
    } catch (error) {
      throw new Error('Error getting menu tree: ' + error.message);
    }
  }
  
  // Add menu item
  static async addMenuItem(menuId, itemData) {
    try {
      const { label, url, parent_id, order_number = 0, is_active = true } = itemData;
      
      const [result] = await db.execute(
        `INSERT INTO menu_items (
          menu_id, label, url, parent_id, order_number, is_active
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [menuId, label, url, parent_id, order_number, is_active ? 1 : 0]
      );
      
      return result.insertId;
    } catch (error) {
      throw new Error('Error adding menu item: ' + error.message);
    }
  }
  
  // Get menu items
  static async getMenuItems(menuId) {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM menu_items 
         WHERE menu_id = ? 
         ORDER BY parent_id IS NULL DESC, order_number ASC`,
        [menuId]
      );
      
      return rows;
    } catch (error) {
      throw new Error('Error getting menu items: ' + error.message);
    }
  }
  
  // Update menu item
  static async updateMenuItem(itemId, itemData) {
    try {
      const { label, url, parent_id, order_number, is_active } = itemData;
      
      const updates = [];
      const params = [];
      
      if (label !== undefined) {
        updates.push('label = ?');
        params.push(label);
      }
      
      if (url !== undefined) {
        updates.push('url = ?');
        params.push(url);
      }
      
      if (parent_id !== undefined) {
        updates.push('parent_id = ?');
        params.push(parent_id);
      }
      
      if (order_number !== undefined) {
        updates.push('order_number = ?');
        params.push(order_number);
      }
      
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(is_active ? 1 : 0);
      }
      
      if (updates.length === 0) {
        return true; // Nothing to update
      }
      
      params.push(itemId);
      const query = `UPDATE menu_items SET ${updates.join(', ')} WHERE id = ?`;
      
      const [result] = await db.execute(query, params);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error updating menu item: ' + error.message);
    }
  }
  
  // Delete menu item
  static async deleteMenuItem(itemId) {
    try {
      // First, recursively delete all child items
      const [children] = await db.execute(
        'SELECT id FROM menu_items WHERE parent_id = ?',
        [itemId]
      );
      
      for (const child of children) {
        await this.deleteMenuItem(child.id);
      }
      
      // Then delete the menu item
      const [result] = await db.execute(
        'DELETE FROM menu_items WHERE id = ?', 
        [itemId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error deleting menu item: ' + error.message);
    }
  }
}

module.exports = Menu; 