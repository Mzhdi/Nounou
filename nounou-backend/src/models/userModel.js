const database = require('../config/database');
const config = require('../config/env');

class UserModel {
  constructor() {
    this.schema = config.database.schemas.users;
  }

  // Créer un nouvel utilisateur
  async create(userData) {
    const query = `
      INSERT INTO ${this.schema}.user_profile (
        email, password_hash, first_name, last_name, phone,
        date_of_birth, gender, height, weight, activity_level,
        dietary_preferences, allergies, health_conditions, subscription_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, email, first_name, last_name, phone, date_of_birth,
               gender, height, weight, activity_level, dietary_preferences,
               allergies, health_conditions, subscription_type, created_at, is_active
    `;

    const values = [
      userData.email,
      userData.password_hash,
      userData.firstName,
      userData.lastName,
      userData.phone || null,
      userData.dateOfBirth || null,
      userData.gender || null,
      userData.height || null,
      userData.weight || null,
      userData.activityLevel || null,
      JSON.stringify(userData.dietaryPreferences || []),
      JSON.stringify(userData.allergies || []),
      JSON.stringify(userData.healthConditions || []),
      userData.subscriptionType || 'free'
    ];

    const result = await database.query(query, values);
    return result.rows[0];
  }

  // Trouver utilisateur par email
  async findByEmail(email) {
    const query = `
      SELECT id, email, password_hash, first_name, last_name, phone,
             date_of_birth, gender, height, weight, activity_level,
             dietary_preferences, allergies, health_conditions,
             subscription_type, subscription_expires_at, created_at,
             updated_at, is_active
      FROM ${this.schema}.user_profile
      WHERE email = $1 AND is_active = true
    `;

    const result = await database.query(query, [email]);
    return result.rows[0] || null;
  }

  // Trouver utilisateur par ID
  async findById(id) {
    const query = `
      SELECT id, email, first_name, last_name, phone, date_of_birth,
             gender, height, weight, activity_level, dietary_preferences,
             allergies, health_conditions, subscription_type,
             subscription_expires_at, created_at, updated_at, is_active
      FROM ${this.schema}.user_profile
      WHERE id = $1 AND is_active = true
    `;

    const result = await database.query(query, [id]);
    return result.rows[0] || null;
  }

  // Mettre à jour utilisateur
  async update(id, updateData) {
    // Construire la requête dynamiquement
    const setClause = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        // Mapper les noms de champs camelCase vers snake_case
        const dbField = this.mapFieldToDb(key);
        
        if (['dietary_preferences', 'allergies', 'health_conditions'].includes(dbField)) {
          setClause.push(`${dbField} = $${paramCount}`);
          values.push(JSON.stringify(updateData[key]));
        } else {
          setClause.push(`${dbField} = $${paramCount}`);
          values.push(updateData[key]);
        }
        paramCount++;
      }
    });

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE ${this.schema}.user_profile
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount} AND is_active = true
      RETURNING id, email, first_name, last_name, phone, date_of_birth,
               gender, height, weight, activity_level, dietary_preferences,
               allergies, health_conditions, subscription_type,
               subscription_expires_at, updated_at
    `;

    const result = await database.query(query, values);
    return result.rows[0] || null;
  }

  // Mettre à jour le mot de passe
  async updatePassword(id, newPasswordHash) {
    const query = `
      UPDATE ${this.schema}.user_profile
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = true
      RETURNING id, email, updated_at
    `;

    const result = await database.query(query, [newPasswordHash, id]);
    return result.rows[0] || null;
  }

  // Désactiver un utilisateur (soft delete)
  async deactivate(id) {
    const query = `
      UPDATE ${this.schema}.user_profile
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, is_active
    `;

    const result = await database.query(query, [id]);
    return result.rows[0] || null;
  }

  async createSession(sessionData) {
    // Vérifier la longueur des tokens avant insertion
    if (sessionData.token && sessionData.token.length > 1000) {
      throw new Error('Session token too long');
    }
    if (sessionData.refreshToken && sessionData.refreshToken.length > 1000) {
      throw new Error('Refresh token too long');
    }
  
    const query = `
      INSERT INTO ${this.schema}.user_sessions (
        user_id, token, refresh_token, device_id, device_type,
        ip_address, location, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, token, device_id, device_type, expires_at, created_at
    `;
  
    const values = [
      sessionData.userId,
      sessionData.token,
      sessionData.refreshToken,
      sessionData.deviceId,
      sessionData.deviceType,
      sessionData.ipAddress,
      sessionData.location,
      sessionData.expiresAt
    ];
  
    const result = await database.query(query, values);
    return result.rows[0];
  }

  // Trouver session par token
  async findSessionByToken(token) {
    const query = `
      SELECT s.id, s.user_id, s.token, s.refresh_token, s.device_id,
             s.device_type, s.expires_at, s.created_at, s.last_used_at,
             u.email, u.is_active as user_active
      FROM ${this.schema}.user_sessions s
      JOIN ${this.schema}.user_profile u ON s.user_id = u.id
      WHERE s.token = $1 AND s.expires_at > CURRENT_TIMESTAMP
    `;

    const result = await database.query(query, [token]);
    return result.rows[0] || null;
  }

  // Mettre à jour last_used_at de la session
  async updateSessionLastUsed(token) {
    const query = `
      UPDATE ${this.schema}.user_sessions
      SET last_used_at = CURRENT_TIMESTAMP
      WHERE token = $1
    `;

    await database.query(query, [token]);
  }

  // Supprimer session (logout)
  async deleteSession(token) {
    const query = `
      DELETE FROM ${this.schema}.user_sessions
      WHERE token = $1
      RETURNING id, user_id, device_id
    `;

    const result = await database.query(query, [token]);
    return result.rows[0] || null;
  }

  // Supprimer toutes les sessions d'un utilisateur (logout all devices)
  async deleteAllUserSessions(userId) {
    const query = `
      DELETE FROM ${this.schema}.user_sessions
      WHERE user_id = $1
    `;

    const result = await database.query(query, [userId]);
    return result.rowCount;
  }

  // Supprimer les sessions expirées
  async deleteExpiredSessions() {
    const query = `
      DELETE FROM ${this.schema}.user_sessions
      WHERE expires_at <= CURRENT_TIMESTAMP
    `;

    const result = await database.query(query);
    return result.rowCount;
  }

  // Mapper les noms de champs
  mapFieldToDb(field) {
    const mapping = {
      firstName: 'first_name',
      lastName: 'last_name',
      dateOfBirth: 'date_of_birth',
      activityLevel: 'activity_level',
      dietaryPreferences: 'dietary_preferences',
      healthConditions: 'health_conditions',
      subscriptionType: 'subscription_type',
      subscriptionExpiresAt: 'subscription_expires_at'
    };

    return mapping[field] || field;
  }

  // Compter les utilisateurs actifs
  async countActiveUsers() {
    const query = `
      SELECT COUNT(*) as count
      FROM ${this.schema}.user_profile
      WHERE is_active = true
    `;

    const result = await database.query(query);
    return parseInt(result.rows[0].count);
  }

  // Statistiques utilisateurs par type d'abonnement
  async getSubscriptionStats() {
    const query = `
      SELECT 
        subscription_type,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE is_active = true) as active_count
      FROM ${this.schema}.user_profile
      GROUP BY subscription_type
      ORDER BY count DESC
    `;

    const result = await database.query(query);
    return result.rows;
  }

  // Méthodes ajoutées pour les statistiques (BONUS)
  async getUserRegistrationStats(days = 30) {
    const query = `
      SELECT 
        DATE(created_at) as registration_date,
        COUNT(*) as registrations,
        COUNT(*) FILTER (WHERE subscription_type != 'free') as premium_registrations
      FROM ${this.schema}.user_profile
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY registration_date DESC
    `;

    const result = await database.query(query);
    return result.rows;
  }

  async getUserRetentionStats() {
    const query = `
      WITH user_sessions_summary AS (
        SELECT 
          u.id,
          u.created_at,
          MAX(s.last_used_at) as last_session,
          COUNT(s.id) as total_sessions
        FROM ${this.schema}.user_profile u
        LEFT JOIN ${this.schema}.user_sessions s ON u.id = s.user_id
        WHERE u.is_active = true
        GROUP BY u.id, u.created_at
      )
      SELECT 
        CASE 
          WHEN last_session >= CURRENT_DATE - INTERVAL '1 day' THEN 'active_today'
          WHEN last_session >= CURRENT_DATE - INTERVAL '7 days' THEN 'active_week'
          WHEN last_session >= CURRENT_DATE - INTERVAL '30 days' THEN 'active_month'
          ELSE 'inactive'
        END as activity_status,
        COUNT(*) as user_count
      FROM user_sessions_summary
      GROUP BY activity_status
    `;

    const result = await database.query(query);
    return result.rows;
  }
}

module.exports = new UserModel();