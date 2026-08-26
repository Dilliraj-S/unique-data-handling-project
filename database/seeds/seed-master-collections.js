const { MongoClient } = require('mongodb');
require('dotenv').config();

/**
 * Seed Master Collections
 * Seeds sample data for master_accounts and master_leads collections
 */

class MasterCollectionsSeeder {
  constructor() {
    this.mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.databaseName = 'sun';
    this.client = null;
    this.db = null;
  }

  async connect() {
    console.log('🔗 Connecting to MongoDB...');
    this.client = new MongoClient(this.mongoUrl);
    await this.client.connect();
    this.db = this.client.db(this.databaseName);
    console.log(`✅ Connected to database: ${this.databaseName}`);
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  async seedMasterAccounts() {
    console.log('🌱 Seeding master_accounts collection...');
    
    const collection = this.db.collection('master_accounts');
    
    // Clear existing data
    await collection.deleteMany({});
    
    const sampleAccounts = [
      {
        company: 'Tech Solutions Inc.',
        smtp: 'smtp.techsolutions.com',
        industry: 'Technology',
        website: 'https://techsolutions.com',
        address: '123 Tech Street, Silicon Valley',
        address1: '123 Tech Street',
        address2: 'Suite 100',
        address3: 'Silicon Valley',
        address4: 'CA 94000',
        location: 'California, USA',
        need_to_action: 1,
        source: 'Direct Registration',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        company: 'Marketing Pro Ltd.',
        smtp: 'mail.marketingpro.com',
        industry: 'Marketing',
        website: 'https://marketingpro.com',
        address: '456 Marketing Ave, New York',
        address1: '456 Marketing Ave',
        address2: 'Floor 15',
        address3: 'New York',
        address4: 'NY 10001',
        location: 'New York, USA',
        need_to_action: 0,
        source: 'Partner Referral',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        company: 'Healthcare Systems',
        smtp: 'smtp.healthcare.org',
        industry: 'Healthcare',
        website: 'https://healthcaresystems.org',
        address: '789 Medical Center Dr, Chicago',
        address1: '789 Medical Center Dr',
        address2: 'Building A',
        address3: 'Chicago',
        address4: 'IL 60601',
        location: 'Illinois, USA',
        need_to_action: 1,
        source: 'Trade Show',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        company: 'Financial Advisors Group',
        smtp: 'mail.financialadvisors.com',
        industry: 'Finance',
        website: 'https://financialadvisors.com',
        address: '321 Finance Blvd, Miami',
        address1: '321 Finance Blvd',
        address2: 'Tower 2',
        address3: 'Miami',
        address4: 'FL 33101',
        location: 'Florida, USA',
        need_to_action: 0,
        source: 'Online Form',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        company: 'Education Excellence',
        smtp: 'smtp.eduexcellence.edu',
        industry: 'Education',
        website: 'https://eduexcellence.edu',
        address: '555 University Way, Boston',
        address1: '555 University Way',
        address2: 'Campus Building',
        address3: 'Boston',
        address4: 'MA 02101',
        location: 'Massachusetts, USA',
        need_to_action: 1,
        source: 'Cold Outreach',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    const result = await collection.insertMany(sampleAccounts);
    console.log(`✅ Inserted ${result.insertedCount} master accounts`);
    
    return result.insertedIds;
  }

  async seedMasterLeads(accountIds) {
    console.log('🌱 Seeding master_leads collection...');
    
    const collection = this.db.collection('master_leads');
    
    // Clear existing data
    await collection.deleteMany({});
    
    const accountIdsArray = Object.values(accountIds);
    
    const sampleLeads = [
      {
        first_name: 'John',
        last_name: 'Smith',
        full_name: 'John Smith',
        email: 'john.smith@techsolutions.com',
        phone: '+1-555-0101',
        phone1: '+1-555-0102',
        phone2: null,
        website: 'https://johnsmith.dev',
        address: '123 Tech Street, Silicon Valley, CA',
        address1: '123 Tech Street',
        address2: 'Apt 5A',
        address3: 'Silicon Valley',
        address4: 'CA 94000',
        city: 'Palo Alto',
        district: 'Santa Clara',
        state: 'California',
        pincode: '94000',
        location: 'Silicon Valley, California',
        company_id: accountIdsArray[0],
        smtp: 'smtp.techsolutions.com',
        designation: 'Senior Developer',
        industry: 'Technology',
        source: 'LinkedIn',
        need_to_action: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        first_name: 'Sarah',
        last_name: 'Johnson',
        full_name: 'Sarah Johnson',
        email: 'sarah.johnson@marketingpro.com',
        phone: '+1-555-0201',
        phone1: '+1-555-0202',
        phone2: '+1-555-0203',
        website: 'https://sarahjohnson.marketing',
        address: '456 Marketing Ave, New York, NY',
        address1: '456 Marketing Ave',
        address2: 'Suite 1501',
        address3: 'Manhattan',
        address4: 'NY 10001',
        city: 'New York',
        district: 'Manhattan',
        state: 'New York',
        pincode: '10001',
        location: 'Manhattan, New York',
        company_id: accountIdsArray[1],
        smtp: 'mail.marketingpro.com',
        designation: 'Marketing Director',
        industry: 'Marketing',
        source: 'Conference',
        need_to_action: 0,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        first_name: 'Michael',
        last_name: 'Brown',
        full_name: 'Michael Brown',
        email: 'michael.brown@healthcare.org',
        phone: '+1-555-0301',
        phone1: null,
        phone2: null,
        website: null,
        address: '789 Medical Center Dr, Chicago, IL',
        address1: '789 Medical Center Dr',
        address2: 'Building A, Room 301',
        address3: 'Chicago',
        address4: 'IL 60601',
        city: 'Chicago',
        district: 'Cook County',
        state: 'Illinois',
        pincode: '60601',
        location: 'Chicago, Illinois',
        company_id: accountIdsArray[2],
        smtp: 'smtp.healthcare.org',
        designation: 'Chief Medical Officer',
        industry: 'Healthcare',
        source: 'Referral',
        need_to_action: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        first_name: 'Emily',
        last_name: 'Davis',
        full_name: 'Emily Davis',
        email: 'emily.davis@financialadvisors.com',
        phone: '+1-555-0401',
        phone1: '+1-555-0402',
        phone2: null,
        website: 'https://emilydavis.finance',
        address: '321 Finance Blvd, Miami, FL',
        address1: '321 Finance Blvd',
        address2: 'Tower 2, Floor 20',
        address3: 'Miami',
        address4: 'FL 33101',
        city: 'Miami',
        district: 'Miami-Dade',
        state: 'Florida',
        pincode: '33101',
        location: 'Miami, Florida',
        company_id: accountIdsArray[3],
        smtp: 'mail.financialadvisors.com',
        designation: 'Financial Advisor',
        industry: 'Finance',
        source: 'Website Form',
        need_to_action: 0,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        first_name: 'David',
        last_name: 'Wilson',
        full_name: 'David Wilson',
        email: 'david.wilson@eduexcellence.edu',
        phone: '+1-555-0501',
        phone1: null,
        phone2: null,
        website: 'https://davidwilson.edu',
        address: '555 University Way, Boston, MA',
        address1: '555 University Way',
        address2: 'Campus Building, Office 205',
        address3: 'Boston',
        address4: 'MA 02101',
        city: 'Boston',
        district: 'Suffolk County',
        state: 'Massachusetts',
        pincode: '02101',
        location: 'Boston, Massachusetts',
        company_id: accountIdsArray[4],
        smtp: 'smtp.eduexcellence.edu',
        designation: 'Dean of Students',
        industry: 'Education',
        source: 'Academic Network',
        need_to_action: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        first_name: 'Lisa',
        last_name: 'Anderson',
        full_name: 'Lisa Anderson',
        email: 'lisa.anderson@freelancer.com',
        phone: '+1-555-0601',
        phone1: '+1-555-0602',
        phone2: null,
        website: 'https://lisaanderson.portfolio.com',
        address: '888 Freelance St, Austin, TX',
        address1: '888 Freelance St',
        address2: 'Co-working Space',
        address3: 'Austin',
        address4: 'TX 78701',
        city: 'Austin',
        district: 'Travis County',
        state: 'Texas',
        pincode: '78701',
        location: 'Austin, Texas',
        company_id: null, // Freelancer, no company
        smtp: 'smtp.gmail.com',
        designation: 'Freelance Consultant',
        industry: 'Consulting',
        source: 'Social Media',
        need_to_action: 0,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    const result = await collection.insertMany(sampleLeads);
    console.log(`✅ Inserted ${result.insertedCount} master leads`);
    
    return result.insertedIds;
  }

  async run() {
    try {
      console.log('🚀 Starting master collections seeding...\n');
      
      await this.connect();
      
      // Seed accounts first
      const accountIds = await this.seedMasterAccounts();
      
      // Then seed leads with account references
      const leadIds = await this.seedMasterLeads(accountIds);
      
      console.log('\n🎉 Seeding completed successfully!');
      console.log(`📊 Summary:`);
      console.log(`   - Master Accounts: ${Object.keys(accountIds).length}`);
      console.log(`   - Master Leads: ${Object.keys(leadIds).length}`);
      
    } catch (error) {
      console.error('❌ Seeding failed:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const seeder = new MasterCollectionsSeeder();
  seeder.run().catch(console.error);
}

module.exports = MasterCollectionsSeeder;
