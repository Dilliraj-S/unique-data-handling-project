import { MongoClient } from 'mongodb';
import { getConnectionConfig } from '../../../src/config/database.js';

/**
 * API: Duplicate Rule Management (by ID)
 * PUT: Update a duplicate rule
 * DELETE: Deactivate/delete a duplicate rule
 */

export default async function handler(req, res) {
  if (req.method === 'PUT') {
    return handlePut(req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res);
  } else {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

/**
 * PUT: Update a duplicate rule
 */
async function handlePut(req, res) {
  let client;
  try {
    const { id } = req.query;
    const { rule_name, active } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Rule ID is required'
      });
    }

    const config = getConnectionConfig('sun');
    client = new MongoClient(config.uri);
    await client.connect();

    const db = client.db(config.database || 'sun');
    const collection = db.collection('duplicate_rules');

    const updateData = { updated_at: new Date() };
    if (rule_name !== undefined) updateData.rule_name = rule_name;
    if (active !== undefined) updateData.active = active;

    const result = await collection.updateOne(
      { rule_id: id },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rule not found'
      });
    }

    const updatedRule = await collection.findOne({ rule_id: id });

    return res.status(200).json({
      success: true,
      message: 'Rule updated successfully',
      rule: {
        rule_id: updatedRule.rule_id,
        rule_name: updatedRule.rule_name,
        columns: updatedRule.columns,
        match_type: updatedRule.match_type,
        active: updatedRule.active,
        updated_at: updatedRule.updated_at
      }
    });

  } catch (error) {
    console.error('Error updating duplicate rule:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update duplicate rule'
    });
  } finally {
    if (client) await client.close();
  }
}

/**
 * DELETE: Deactivate a duplicate rule (soft delete)
 */
async function handleDelete(req, res) {
  let client;
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Rule ID is required'
      });
    }

    const config = getConnectionConfig('sun');
    client = new MongoClient(config.uri);
    await client.connect();

    const db = client.db(config.database || 'sun');
    const collection = db.collection('duplicate_rules');

    const result = await collection.updateOne(
      { rule_id: id },
      { $set: { active: false, updated_at: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rule not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Rule deactivated successfully'
    });

  } catch (error) {
    console.error('Error deleting duplicate rule:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete duplicate rule'
    });
  } finally {
    if (client) await client.close();
  }
}

