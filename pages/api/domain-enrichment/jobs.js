import { getCollection } from '../../../src/lib/mongodb';
import { authMiddleware } from '../../../src/server/Http/Middleware/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  try {
    let user;
    try {
      user = await authMiddleware(req);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message || 'Unauthorized' });
    }

    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '25', 10);
    const skip = (page - 1) * limit;
    const batchId = req.query.batch_id || null;
    const search = (req.query.search || '').trim();

    const jobsCollection = await getCollection('domain_enrichment_jobs', 'automation');

    const query = {};
    if (batchId) {
      query.batch_id = batchId;
    }
    if (search) {
      query.domain = { $regex: search, $options: 'i' };
    }

    const total = await jobsCollection.countDocuments(batchId ? { batch_id: batchId } : {});
    const filtered = await jobsCollection.countDocuments(query);

    // Status breakdown for progress bar (per batch or global if no batchId)
    const statusMatch = batchId ? { batch_id: batchId } : {};
    const statusAgg = await jobsCollection
      .aggregate([
        { $match: statusMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .toArray();

    const statusCounts = {};
    for (const row of statusAgg) {
      if (!row?._id) continue;
      statusCounts[row._id] = row.count || 0;
    }

    const pipeline = [
      { $match: query },
      { $sort: { created_at: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'domain_enrichment_results',
          localField: 'job_id',
          foreignField: 'job_id',
          as: 'result',
        },
      },
      {
        $addFields: {
          result: { $arrayElemAt: ['$result', 0] },
        },
      },
      {
        $project: {
          _id: 0,
          job_id: 1,
          batch_id: 1,
          domain: 1,
          status: 1,
          attempts: 1,
          error: 1,
          created_at: 1,
          updated_at: 1,
          company_name: '$result.company_name',
          address: '$result.address',
          phone: '$result.phone',
          score: '$result.score',
        },
      },
    ];

    const data = await jobsCollection.aggregate(pipeline).toArray();

    return res.status(200).json({
      status: true,
      data,
      meta: {
        page,
        limit,
        recordsTotal: total,
        recordsFiltered: filtered,
        statusCounts,
      },
    });
  } catch (error) {
    console.error('Error fetching domain enrichment jobs:', error);
    return res
      .status(500)
      .json({ status: false, message: error.message || 'Failed to fetch jobs' });
  }
}


