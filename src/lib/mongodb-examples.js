/**
 * Multi-Database Usage Examples
 * This file demonstrates how to use the multi-database connection system
 * 
 * Note: This is a reference file. You can delete it or use it as documentation.
 */

import { 
  getCollection, 
  getDb, 
  connection, 
  isConnected,
  closeConnection 
} from './mongodb';

// ==========================================
// Example 1: Using getCollection() with connection name
// ==========================================

export async function example1_getCollection() {
  // Default connection (central)
  const users = await getCollection('users');
  const userList = await users.find({}).toArray();
  
  // Pluto database
  const plutoItems = await getCollection('items', 'pluto');
  const items = await plutoItems.find({}).toArray();
  
  // Sun database
  const sunProducts = await getCollection('products', 'sun');
  const products = await sunProducts.find({}).toArray();
  
  // Moon database
  const moonOrders = await getCollection('orders', 'moon');
  const orders = await moonOrders.find({}).toArray();
  
  return { userList, items, products, orders };
}

// ==========================================
// Example 2: Using connection() helper (Laravel-style)
// ==========================================

export async function example2_connection() {
  // Get collection from pluto database
  const plutoItems = await connection('pluto').getCollection('items');
  const items = await plutoItems.find({}).toArray();
  
  // Get collection from sun database
  const sunProducts = await connection('sun').getCollection('products');
  const products = await sunProducts.find({}).toArray();
  
  // Get database instance
  const plutoDb = await connection('pluto').getDb();
  const collections = await plutoDb.listCollections().toArray();
  
  return { items, products, collections };
}

// ==========================================
// Example 3: Cross-database operations
// ==========================================

export async function example3_crossDatabase() {
  // Get user from central database
  const centralUsers = await connection('central').getCollection('users');
  const user = await centralUsers.findOne({ email: 'user@example.com' });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Get product from sun database
  const sunProducts = await connection('sun').getCollection('products');
  const product = await sunProducts.findOne({ _id: 'product123' });
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  // Create order in moon database
  const moonOrders = await connection('moon').getCollection('orders');
  const order = await moonOrders.insertOne({
    userId: user._id,
    productId: product._id,
    amount: product.price,
    status: 'pending',
    createdAt: new Date(),
  });
  
  return order;
}

// ==========================================
// Example 4: Using getDb() directly
// ==========================================

export async function example4_getDb() {
  // Default database
  const db = await getDb();
  const users = db.collection('users');
  
  // Pluto database
  const plutoDb = await getDb('pluto');
  const items = plutoDb.collection('items');
  
  // Perform operations
  const userCount = await users.countDocuments();
  const itemCount = await items.countDocuments();
  
  return { userCount, itemCount };
}

// ==========================================
// Example 5: Check connection status
// ==========================================

export async function example5_checkConnection() {
  const connections = ['central', 'pluto', 'sun', 'moon'];
  const status = {};
  
  for (const conn of connections) {
    status[conn] = isConnected(conn);
  }
  
  return status;
}

// ==========================================
// Example 6: API Route Example
// ==========================================

/*
// pages/api/pluto/items.js
import { connection } from 'src/lib/mongodb';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const itemsCollection = await connection('pluto').getCollection('items');
      const items = await itemsCollection.find({}).toArray();
      res.json({ items });
    } else if (req.method === 'POST') {
      const itemsCollection = await connection('pluto').getCollection('items');
      const result = await itemsCollection.insertOne(req.body);
      res.json({ success: true, id: result.insertedId });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
*/

// ==========================================
// Example 7: Aggregation across databases
// ==========================================

export async function example7_aggregation() {
  // Get sales from moon database
  const moonSales = await connection('moon').getCollection('sales');
  const salesByProduct = await moonSales.aggregate([
    {
      $group: {
        _id: '$productId',
        totalSales: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalSales: -1 } },
    { $limit: 10 },
  ]).toArray();
  
  // Get product details from sun database
  const sunProducts = await connection('sun').getCollection('products');
  const productIds = salesByProduct.map(s => s._id);
  const products = await sunProducts.find({
    _id: { $in: productIds },
  }).toArray();
  
  // Combine data
  const enrichedSales = salesByProduct.map(sale => {
    const product = products.find(p => p._id.toString() === sale._id.toString());
    return {
      ...sale,
      productName: product?.name || 'Unknown',
      productPrice: product?.price || 0,
    };
  });
  
  return enrichedSales;
}

// ==========================================
// Example 8: Transaction-like operations (manual)
// ==========================================

export async function example8_transaction() {
  try {
    // Create user in central database
    const centralUsers = await connection('central').getCollection('users');
    const userResult = await centralUsers.insertOne({
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date(),
    });
    
    // Create profile in pluto database
    const plutoProfiles = await connection('pluto').getCollection('profiles');
    await plutoProfiles.insertOne({
      userId: userResult.insertedId,
      bio: 'Software Developer',
      createdAt: new Date(),
    });
    
    // Create settings in sun database
    const sunSettings = await connection('sun').getCollection('settings');
    await sunSettings.insertOne({
      userId: userResult.insertedId,
      theme: 'dark',
      notifications: true,
      createdAt: new Date(),
    });
    
    return { success: true, userId: userResult.insertedId };
  } catch (error) {
    // Rollback logic would go here
    console.error('Error in transaction:', error);
    throw error;
  }
}

