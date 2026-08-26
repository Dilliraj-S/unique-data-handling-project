import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const collection = await getCollection('keywords', 'pluto');

  try {
    if (req.method === 'GET') {
      const keywords = await collection.find({}).sort({ created_at: -1 }).toArray();
      return res.status(200).json(keywords);
    } 
    else if (req.method === 'POST') {
      const { keyword, type } = req.body;
      if (!keyword || !type) {
        return res.status(400).json({ status: false, message: 'Missing fields' });
      }

      await collection.insertOne({
        keyword,
        type,
        created_at: new Date(),
        updated_at: new Date()
      });

      return res.status(200).json({ status: true, message: 'Keyword added' });
    } 
    else if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ status: false, message: 'ID required' });
      }

      await collection.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ status: true, message: 'Keyword deleted' });
    }
    else {
      return res.status(405).json({ status: false, message: 'Method not allowed' });
    }
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
}
