import { authMiddleware } from '../../src/server/Http/Middleware/auth';
import { getCollection } from '../../src/lib/mongodb';

const mapDomainToRegion = (domain) => {
  const domainMap = {
    'gmail.com': 'Google',
    'yahoo.com': 'Yahoo',
    'outlook.com': 'Microsoft',
    'hotmail.com': 'Microsoft'
  };
  return domainMap[domain] || 'Other';
};

export default async function handler(req, res) {
  let user;
  try {
    user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      status: false,
      message: 'Method not allowed'
    });
  }

  try {
    const emailAccountsCollection = await getCollection('email_accounts', 'pluto');
    const userId = user.user_id;

    // user_id is now a string (e.g., "USR_ADMIN_001") - no conversion needed
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        status: false,
        message: `Invalid user ID format: ${userId}`
      });
    }

    // Get all active email accounts for the user only (no fallback to all accounts)
    const accounts = await emailAccountsCollection.find({
      status: 'active',
      user_id: userId  // String user_id (e.g., "USR_ADMIN_001")
    }).toArray();
    
    console.log(`📧 Found ${accounts.length} email accounts for user_id: ${userId}`);

    // Group by region (from account.region field, or derive from domain)
    const regionsMap = {};
    
    for (const account of accounts) {
      const region = account.region || mapDomainToRegion(account.email.split('@')[1]);
      
      if (!regionsMap[region]) {
        regionsMap[region] = {
          name: region,
          emails: []
        };
      }
      
      regionsMap[region].emails.push(account.email);
    }

    const regions = Object.values(regionsMap);

    return res.status(200).json({
      status: true,
      regions: regions,
      accounts: accounts.map(acc => ({
        id: acc.id?.toNumber ? acc.id.toNumber() : acc.id,
        email: acc.email,
        type: acc.type,
        region: acc.region || mapDomainToRegion(acc.email.split('@')[1]),
        status: acc.status,
        daily_send_limit: acc.daily_send_limit || 500
      }))
    });

  } catch (error) {
    console.error('Failed to fetch email accounts:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to fetch email accounts'
    });
  }
}

