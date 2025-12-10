import { pool } from '../config/database.js';
import type { HarvestRecord } from '../types/harvest.types.js';

export class HarvestService {
  async createHarvestRecord(data: Omit<HarvestRecord, 'id' | 'created_at'>): Promise<HarvestRecord> {
    const query = `
      INSERT INTO harvest_records (
        farmer_id, phone_number, plot_location, crop_type, 
        weight_kg, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      data.farmer_id,
      data.phone_number,
      data.plot_location,
      data.crop_type,
      data.weight_kg,
      data.timestamp
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getRecordById(id: number): Promise<HarvestRecord | null> {
    const query = `SELECT * FROM harvest_records WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async getFarmerRecords(farmerId: string, limit: number = 50, offset: number = 0): Promise<HarvestRecord[]> {
    const query = `
      SELECT * FROM harvest_records 
      WHERE farmer_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [farmerId, limit, offset]);
    return result.rows;
  }

  async getAllRecords(limit: number = 100, offset: number = 0): Promise<HarvestRecord[]> {
    const query = `
      SELECT * FROM harvest_records 
      ORDER BY timestamp DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  async getFarmerStats(farmerId: string): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_records,
        SUM(weight_kg) as total_weight,
        COUNT(DISTINCT crop_type) as crop_types,
        MAX(timestamp) as last_harvest
      FROM harvest_records 
      WHERE farmer_id = $1
    `;
    const result = await pool.query(query, [farmerId]);
    return result.rows[0];
  }

  async updateRecord(id: number, data: Partial<HarvestRecord>): Promise<HarvestRecord | null> {
    const fields = Object.keys(data)
      .map((key, index) => `${key} = ${index + 2}`)
      .join(', ');
    
    const values = Object.values(data);
    
    const query = `
      UPDATE harvest_records 
      SET ${fields}
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  async deleteRecord(id: number): Promise<boolean> {
    const query = `DELETE FROM harvest_records WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }
}