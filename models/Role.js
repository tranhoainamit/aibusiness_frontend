const db = require('../config/database');

class Role {
  // Create a new role
  static async create(roleData) {
    try {
      const { name, description } = roleData;

      const [result] = await db.execute(
        'INSERT INTO roles (name, description) VALUES (?, ?)',
        [name, description]
      );

      return result.insertId;
    } catch (error) {
      throw new Error('Error creating role: ' + error.message);
    }
  }

  // Find role by ID
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT r.*, 
                GROUP_CONCAT(p.permission) as permissions
         FROM roles r
         LEFT JOIN permissions p ON r.id = p.role_id
         WHERE r.id = ?
         GROUP BY r.id`,
        [id]
      );

      if (rows[0]) {
        rows[0].permissions = rows[0].permissions ? rows[0].permissions.split(',') : [];
      }

      return rows[0];
    } catch (error) {
      throw new Error('Error finding role: ' + error.message);
    }
  }

  // Find role by name
  static async findByName(name) {
    try {
      const [rows] = await db.execute(
        `SELECT r.*, 
                GROUP_CONCAT(p.permission) as permissions
         FROM roles r
         LEFT JOIN permissions p ON r.id = p.role_id
         WHERE r.name = ?
         GROUP BY r.id`,
        [name]
      );

      if (rows[0]) {
        rows[0].permissions = rows[0].permissions ? rows[0].permissions.split(',') : [];
      }

      return rows[0];
    } catch (error) {
      throw new Error('Error finding role: ' + error.message);
    }
  }

  // Get all roles with their permissions
  static async findAll() {
    try {
      const [rows] = await db.execute(
        `SELECT r.*, 
                GROUP_CONCAT(p.permission) as permissions
         FROM roles r
         LEFT JOIN permissions p ON r.id = p.role_id
         GROUP BY r.id
         ORDER BY r.id ASC`
      );

      // Convert permissions string to array
      rows.forEach(role => {
        role.permissions = role.permissions ? role.permissions.split(',') : [];
      });

      return rows;
    } catch (error) {
      throw new Error('Error finding roles: ' + error.message);
    }
  }

  // Update role
  static async update(id, roleData) {
    try {
      const { name, description } = roleData;

      const [result] = await db.execute(
        'UPDATE roles SET name = ?, description = ? WHERE id = ?',
        [name, description, id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error updating role: ' + error.message);
    }
  }

  // Delete role
  static async delete(id) {
    try {
      // Delete associated permissions first
      await db.execute('DELETE FROM permissions WHERE role_id = ?', [id]);
      
      // Then delete the role
      const [result] = await db.execute('DELETE FROM roles WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error('Error deleting role: ' + error.message);
    }
  }

  // Add permissions to role
  static async addPermissions(roleId, permissions) {
    try {
      // First, remove existing permissions
      await db.execute('DELETE FROM permissions WHERE role_id = ?', [roleId]);

      // Then add new permissions
      if (permissions && permissions.length > 0) {
        const values = permissions.map(permission => [roleId, permission]);
        await db.query(
          'INSERT INTO permissions (role_id, permission) VALUES ?',
          [values]
        );
      }

      return true;
    } catch (error) {
      throw new Error('Error adding permissions: ' + error.message);
    }
  }

  // Check if role has specific permission
  static async hasPermission(roleId, permission) {
    try {
      const [rows] = await db.execute(
        'SELECT 1 FROM permissions WHERE role_id = ? AND permission = ?',
        [roleId, permission]
      );
      return rows.length > 0;
    } catch (error) {
      throw new Error('Error checking permission: ' + error.message);
    }
  }

  // Get all permissions for a role
  static async getPermissions(roleId) {
    try {
      const [rows] = await db.execute(
        'SELECT permission FROM permissions WHERE role_id = ?',
        [roleId]
      );
      return rows.map(row => row.permission);
    } catch (error) {
      throw new Error('Error getting permissions: ' + error.message);
    }
  }

  // Check if role exists
  static async exists(id) {
    try {
      const [rows] = await db.execute(
        'SELECT id FROM roles WHERE id = ?',
        [id]
      );
      return rows.length > 0;
    } catch (error) {
      throw new Error('Error checking role existence: ' + error.message);
    }
  }

  // Get users count by role
  static async getUsersCount(roleId) {
    try {
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM users WHERE role_id = ?',
        [roleId]
      );
      return rows[0].count;
    } catch (error) {
      throw new Error('Error getting users count: ' + error.message);
    }
  }
}

module.exports = Role; 