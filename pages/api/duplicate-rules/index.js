import { MongoClient } from 'mongodb';
import { getConnectionConfig } from '../../../src/config/database.js';

/**
 * API: Duplicate Rules Management
 * GET: Fetch all active duplicate rules
 * POST: Create a new duplicate rule
 */

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

/**
 * GET: Fetch all active duplicate rules
 */
async function handleGet(req, res) {
  let client;
  try {
    const config = getConnectionConfig('sun');
    client = new MongoClient(config.uri);
    await client.connect();

    const db = client.db(config.database || 'sun');
    const collection = db.collection('duplicate_rules');

    const { active_only = 'true' } = req.query;
    const query = active_only === 'true' ? { active: true } : {};

    const rules = await collection
      .find(query)
      .sort({ created_at: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      rules: rules.map(rule => ({
        rule_id: rule.rule_id,
        rule_name: rule.rule_name,
        columns: rule.columns,
        match_type: rule.match_type,
        active: rule.active,
        created_at: rule.created_at
      }))
    });

  } catch (error) {
    console.error('Error fetching duplicate rules:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch duplicate rules'
    });
  } finally {
    if (client) await client.close();
  }
}

/**
 * POST: Create a new duplicate rule
 */
async function handlePost(req, res) {
  let client;
  try {
    const { rule_name, columns, match_type } = req.body;

    // Validation
    if (!rule_name || !columns || !Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'rule_name and columns (non-empty array) are required'
      });
    }

    // Generate rule_id from columns (sorted, joined with +)
    const sortedColumns = [...columns].sort();
    const rule_id = sortedColumns.join('+');

    // Determine match_type if not provided
    const finalMatchType = match_type || (columns.length === 1 ? 'single' : 'composite');

    const config = getConnectionConfig('sun');
    client = new MongoClient(config.uri);
    await client.connect();

    const db = client.db(config.database || 'sun');
    const collection = db.collection('duplicate_rules');

    // Check if rule already exists
    const existing = await collection.findOne({ rule_id });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Rule with columns [${columns.join(', ')}] already exists`
      });
    }

    // Create new rule
    const newRule = {
      rule_id,
      rule_name: rule_name || sortedColumns.join(' + '), // Auto-generate if not provided
      columns: sortedColumns,
      match_type: finalMatchType,
      active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    await collection.insertOne(newRule);

    return res.status(201).json({
      success: true,
      message: 'Duplicate rule created successfully',
      rule: {
        rule_id: newRule.rule_id,
        rule_name: newRule.rule_name,
        columns: newRule.columns,
        match_type: newRule.match_type,
        active: newRule.active,
        created_at: newRule.created_at
      }
    });

  } catch (error) {
    console.error('Error creating duplicate rule:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create duplicate rule'
    });
  } finally {
    if (client) await client.close();
  }
}

