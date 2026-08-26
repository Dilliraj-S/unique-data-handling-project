import { getCollection } from '../src/lib/mongodb.js'

/**
 * Creates indexes that speed up dashboard stats queries.
 *
 * Usage:
 *   node scripts/create-dashboard-indexes.js
 */
async function main() {
  console.log('⚙️  Creating dashboard-related indexes...')

  // email_campaign_logs (pluto) - used by stats + charts
  const emailCampaignLogs = await getCollection('email_campaign_logs', 'pluto')
  const emailCampaignIndexes = [
    { key: { from_email: 1, sent_at: -1 }, name: 'from_email_sent_at' },
    { key: { from_email: 1, status: 1 }, name: 'from_email_status' },
    { key: { campaign_id: 1, from_email: 1 }, name: 'campaign_from_email' }
  ]

  for (const idx of emailCampaignIndexes) {
    await emailCampaignLogs.createIndex(idx.key, { name: idx.name, background: true })
    console.log(`✅ email_campaign_logs -> ${idx.name}`)
  }

  // email_accounts (pluto) - used to fetch active accounts per user
  const emailAccounts = await getCollection('email_accounts', 'pluto')
  const emailAccountIndexes = [
    { key: { user_id: 1, status: 1 }, name: 'user_status' },
    { key: { email: 1 }, name: 'email' }
  ]

  for (const idx of emailAccountIndexes) {
    await emailAccounts.createIndex(idx.key, { name: idx.name, background: true })
    console.log(`✅ email_accounts -> ${idx.name}`)
  }

  console.log('🎉 Index creation completed.')
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Failed to create indexes', err)
  process.exit(1)
})

