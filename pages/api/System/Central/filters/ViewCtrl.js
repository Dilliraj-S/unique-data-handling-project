import SkeletonService from '../../../../../src/services/SkeletonService'
import DataService from '../../../../../src/services/DataService'
import { ObjectId } from 'mongodb'

/**
 * ViewCtrl - Email Threading & Profile View Controller
 * 
 * VIEW MODAL — intentionally reads from MongoDB (not OpenSearch).
 * This ensures the modal always shows 100% live, real-time data.
 * 
 * Threading Strategy (RFC 822 + Gmail):
 * 1. Match by in_reply_to → emails.in_reply_to = logs.message_id
 * 2. Match by thread_id → emails.thread_id = logs.thread_id (Gmail)
 * 3. Match by from_email → recipient replied back
 * 4. Bidirectional: Shows activity where contact is sender OR recipient
 */
export default class ViewCtrl {

  excludedColumns = [
    'id',
    '_id',
    'password',
    'deleted_at',
    'deleted_on'
  ]

  /**
   * Format date for display
   */
  formatDate(dateValue) {
    if (!dateValue) return '—'
    const d = dateValue.$date ? new Date(dateValue.$date) : new Date(dateValue)
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  /**
   * Get status badge HTML
   */
  getStatusBadge(status) {
    const statusColors = {
      'sent': 'success',
      'delivered': 'success',
      'replied': 'info',
      'opened': 'primary',
      'clicked': 'primary',
      'bounced': 'danger',
      'hard_bounce': 'danger',
      'soft_bounce': 'warning',
      'failed': 'danger',
      'pending': 'secondary',
      'automatic_reply': 'info',
      'unsubscribe': 'warning',
      'other': 'secondary'
    }
    const color = statusColors[status?.toLowerCase()] || 'secondary'
    return `<span class="badge bg-${color} bg-opacity-10 text-${color}" style="font-size:10px">${status || 'unknown'}</span>`
  }

  /**
   * Extract reply content (remove quoted text)
   */
  extractReplyContent(body) {
    if (!body) return ''
    
    // Remove Gmail quote container
    let clean = body.replace(/<div class="gmail_quote[^"]*"[\s\S]*?<\/div>/gi, '')
    clean = clean.replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '')
    
    // Remove "On ... wrote:" patterns
    clean = clean.replace(/On\s+.+wrote:/gi, '')
    
    // Strip excessive whitespace
    clean = clean.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>')
    
    return clean.trim()
  }

  async index(req, res) {
    try {
      console.log('🎯 ViewCtrl::index() - Email Threading Enabled')

      /* -------------------------------------------------
       * 0️⃣ Token & Record ID
       * ------------------------------------------------- */
      const token =
        req.params?.token ||
        req.body?.skeleton_token ||
        req.query?.token

      const recordId =
        req.query?.id ||
        req.body?.id

      if (!token || !recordId) {
        return res.status(400).json({
          status: false,
          message: 'Token or record id missing'
        })
      }

      /* -------------------------------------------------
       * 1️⃣ Resolve token
       * ------------------------------------------------- */
      const reqSet = await SkeletonService.resolveToken(token)
      if (!reqSet?.key || !reqSet?.table) {
        return res.status(400).json({
          status: false,
          message: 'Invalid token'
        })
      }

      /* -------------------------------------------------
       * 2️⃣ Resolve system
       * ------------------------------------------------- */
      let system = reqSet.system
      // Map master_leads and temp collections to sun database
      const sunTables = ['master_leads', 'temp_master_leads', 'master_accounts', 'temp_master_accounts', 'apollo', 'dlslinkedin', 'karur', 'other', 'outsourcing', 'zoom']
      if (system === 'central' && sunTables.includes(reqSet.table)) {
        system = 'sun'
      }

      /* -------------------------------------------------
       * 3️⃣ Fetch main record
       * ------------------------------------------------- */
      let data = null

      if (!isNaN(recordId)) {
        const r = await DataService.get(system, reqSet.table, {
          where: { id: Number(recordId) },
          limit: 1
        })
        if (r?.data?.length) data = r.data[0]
      }

      if (!data && ObjectId.isValid(recordId)) {
        const r = await DataService.get(system, reqSet.table, {
          where: { _id: new ObjectId(recordId) },
          limit: 1
        })
        if (r?.data?.length) data = r.data[0]
      }

      if (!data) {
        return res.status(404).json({
          status: false,
          message: 'Record not found'
        })
      }

      /* =================================================
       * 🧑‍💼 MODERN PROFILE HEADER
       * ================================================= */
      const fullName = data.li_full_name || data.first_name || 'Unknown'
      const initials = fullName
        .split(' ')
        .map(v => v[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

      const profileHeader = `
        <div class="p-3 border-bottom" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
          <div class="d-flex gap-3 align-items-center">
            <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
              style="width:56px;height:56px;font-size:18px;background:linear-gradient(135deg, #1db4cd 0%, #0891b2 100%);box-shadow:0 4px 12px rgba(29,180,205,0.3)">
              ${initials}
            </div>
            <div class="flex-grow-1">
              <div class="fw-bold" style="font-size:16px;color:#0f172a">${fullName}</div>
              <div class="text-muted small">${data.li_job_title || data.designation || '—'}</div>
              <div class="small" style="color:#1db4cd;font-weight:500">${data.li_company_name || data.company || '—'}</div>
            </div>
          </div>
        </div>
      `

      /* =================================================
       * 📌 CONTACT DETAILS GRID
       * ================================================= */
      const email = data.email || data.to_email || data.account_email || null
      
      const detailsSection = `
        <div class="p-3 border-bottom">
          <div class="row g-3">
            <div class="col-6">
              <div class="d-flex gap-2 align-items-start">
                <div class="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center" style="width:32px;height:32px;flex-shrink:0">
                  <i class="bi bi-envelope-fill text-primary" style="font-size:14px"></i>
                </div>
                <div class="small">
                  <div class="text-muted" style="font-size:11px">Email</div>
                  <div class="fw-medium text-break">${email || '—'}</div>
                </div>
              </div>
            </div>
            <div class="col-6">
              <div class="d-flex gap-2 align-items-start">
                <div class="rounded-circle bg-success bg-opacity-10 d-flex align-items-center justify-content-center" style="width:32px;height:32px;flex-shrink:0">
                  <i class="bi bi-telephone-fill text-success" style="font-size:14px"></i>
                </div>
                <div class="small">
                  <div class="text-muted" style="font-size:11px">Phone</div>
                  <div class="fw-medium">${data.phone || data.mobile || data.gs_phone_number || '—'}</div>
                </div>
              </div>
            </div>
            <div class="col-6">
              <div class="d-flex gap-2 align-items-start">
                <div class="rounded-circle bg-info bg-opacity-10 d-flex align-items-center justify-content-center" style="width:32px;height:32px;flex-shrink:0">
                  <i class="bi bi-globe2 text-info" style="font-size:14px"></i>
                </div>
                <div class="small">
                  <div class="text-muted" style="font-size:11px">Domain</div>
                  <div class="fw-medium">${data.li_smtp || data.domain || '—'}</div>
                </div>
              </div>
            </div>
            <div class="col-6">
              <div class="d-flex gap-2 align-items-start">
                <div class="rounded-circle bg-warning bg-opacity-10 d-flex align-items-center justify-content-center" style="width:32px;height:32px;flex-shrink:0">
                  <i class="bi bi-building text-warning" style="font-size:14px"></i>
                </div>
                <div class="small">
                  <div class="text-muted" style="font-size:11px">Industry</div>
                  <div class="fw-medium">${data.industry || '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `

      /* =================================================
       * 🧵 EMAIL THREADING (Gmail-Style Chat UI)
       * ================================================= */
      let emailThreadHtml = `
        <div class="text-center py-4 text-muted">
          <i class="bi bi-inbox" style="font-size:32px;opacity:0.5"></i>
          <div class="small mt-2">No email activity</div>
        </div>
      `

      // Enable email threading for all contact collections in sun database
      if (sunTables.includes(reqSet.table) && email) {
        
        console.log(`📧 [ViewCtrl] Looking up email activity for: ${email}`)
        const emailUsername = email.split('@')[0].toLowerCase()
        
        // BIDIRECTIONAL: Fetch logs where contact is RECIPIENT or SENDER
        // Also fetch direct emails from inbox
        const [campaignToRes, campaignFromRes, directEmailsRes] = await Promise.all([
          // Campaign emails SENT TO this contact
          DataService.get('pluto', 'email_campaign_logs', {
            where: { to_email: { $regex: email, $options: 'i' } },
            orderBy: { sent_at: 'desc' }
          }),
          // Campaign emails SENT FROM this contact (if contact is a sender account)
          DataService.get('pluto', 'email_campaign_logs', {
            where: { from_email: { $regex: email, $options: 'i' } },
            orderBy: { sent_at: 'desc' }
          }),
          // Direct emails in inbox FROM or TO this contact
          DataService.get('pluto', 'emails', {
            where: {
              $or: [
                { from_email: { $regex: emailUsername, $options: 'i' } },
                { account_email: { $regex: email, $options: 'i' } }
              ]
            },
            orderBy: { received_at: 'desc' }
          })
        ])

        const campaignToLogs = campaignToRes?.data || []
        const campaignFromLogs = campaignFromRes?.data || []
        const directEmails = directEmailsRes?.data || []
        
        console.log(`📧 [ViewCtrl] Found: ${campaignToLogs.length} campaigns TO, ${campaignFromLogs.length} campaigns FROM, ${directEmails.length} direct emails`)

        // Combine all campaign logs (dedupe by _id)
        const allCampaignLogsMap = new Map()
        for (const log of [...campaignToLogs, ...campaignFromLogs]) {
          const key = log._id?.$oid || String(log._id) || JSON.stringify(log)
          if (!allCampaignLogsMap.has(key)) {
            allCampaignLogsMap.set(key, { ...log, type: 'campaign' })
          }
        }
        const allLogs = Array.from(allCampaignLogsMap.values()).sort((a, b) => {
          const dateA = a.sent_at?.$date ? new Date(a.sent_at.$date) : new Date(a.sent_at || 0)
          const dateB = b.sent_at?.$date ? new Date(b.sent_at.$date) : new Date(b.sent_at || 0)
          return dateB - dateA
        })

        console.log(`📧 [ViewCtrl] Total logs to display: ${allLogs.length}`)

        // CASE 1: We have campaign logs - show threaded view
        if (allLogs.length > 0) {
          emailThreadHtml = `
            <style>
              .email-thread { max-height: 500px; overflow-y: auto; }
              .thread-item { border-left: 3px solid #e2e8f0; transition: all 0.2s; }
              .thread-item:hover { border-left-color: #1db4cd; background: #f8fafc; }
              .thread-item.has-reply { border-left-color: #22c55e; }
              .reply-bubble { background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0; }
              .sent-bubble { background: #f0f9ff; border-radius: 12px; border: 1px solid #bae6fd; }
              .reply-content { max-height: 150px; overflow-y: auto; font-size: 13px; }
            </style>
            <div class="email-thread">
          `

          for (const [i, log] of allLogs.entries()) {
            const messageId = String(log.message_id || '').trim()
            const threadId = log.thread_id || null
            const toEmail = log.to_email || ''
            const fromEmail = log.from_email || ''
            
            // Build matching query for replies
            const orConditions = []
            
            if (messageId) {
              const normalized = messageId.replace(/^<|>$/g, '')
              orConditions.push({ in_reply_to: { $in: [messageId, normalized, `<${normalized}>`] } })
            }
            
            if (threadId) {
              orConditions.push({ thread_id: threadId })
            }
            
            // Match by from_email containing recipient's email username
            if (toEmail) {
              const toUsername = toEmail.split('@')[0]
              orConditions.push({ from_email: { $regex: toUsername, $options: 'i' } })
            }

            let replies = []
            if (orConditions.length > 0) {
              const repliesRes = await DataService.get('pluto', 'emails', {
                where: { $or: orConditions },
                orderBy: { received_at: 'asc' }
              })
              
              // Filter out emails FROM the sender account (we only want replies)
              replies = (repliesRes?.data || []).filter(r => {
                const rFromEmail = (r.from_email || '').toLowerCase()
                const senderUsername = fromEmail.split('@')[0].toLowerCase()
                return !rFromEmail.includes(senderUsername)
              })
            }

            const hasReplies = replies.length > 0
            const sentDate = this.formatDate(log.sent_at)
            const typeLabel = log.type === 'drift' ? '🎯 Drift' : '📧 Campaign'

            emailThreadHtml += `
              <div class="thread-item p-3 mb-2 rounded ${hasReplies ? 'has-reply' : ''}">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <div class="d-flex align-items-center gap-2 mb-1">
                      <span class="badge bg-light text-dark border" style="font-size:10px">${typeLabel}</span>
                      ${this.getStatusBadge(log.status)}
                      ${hasReplies ? '<span class="badge bg-success" style="font-size:10px">💬 ' + replies.length + ' reply</span>' : ''}
                    </div>
                    <div class="small fw-medium" style="color:#0f172a">
                      ${fromEmail || '—'} → ${toEmail || '—'}
                    </div>
                  </div>
                  <div class="text-muted" style="font-size:11px">${sentDate}</div>
                </div>

                ${hasReplies ? `
                  <div class="ps-3 border-start border-success border-2">
                    ${replies.map(r => {
                      const replyDate = this.formatDate(r.received_at)
                      const cleanBody = this.extractReplyContent(r.body || r.body_plain || '')
                      const snippet = cleanBody.substring(0, 200).replace(/<[^>]+>/g, '')
                      
                      return `
                        <div class="reply-bubble p-2 mb-2">
                          <div class="d-flex justify-content-between align-items-start mb-1">
                            <div class="small">
                              <span class="fw-medium text-success">${r.from_email || r.from_name || 'Unknown'}</span>
                              ${this.getStatusBadge(r.status)}
                            </div>
                            <span class="text-muted" style="font-size:10px">${replyDate}</span>
                          </div>
                          <div class="small text-muted mb-1">${r.subject || '(No Subject)'}</div>
                          <div class="reply-content text-dark">
                            ${snippet}${snippet.length >= 200 ? '...' : ''}
                          </div>
                        </div>
                      `
                    }).join('')}
                  </div>
                ` : `
                  <div class="ps-3 small text-muted fst-italic">No replies yet</div>
                `}
              </div>
            `
          }

          emailThreadHtml += `</div>`
        }
        // CASE 2: No campaign logs but have direct emails - show inbox view
        else if (directEmails.length > 0) {
          console.log(`📧 [ViewCtrl] Showing ${directEmails.length} direct emails (no campaign logs)`)
          
          emailThreadHtml = `
            <style>
              .email-thread { max-height: 500px; overflow-y: auto; }
              .email-item { border-left: 3px solid #22c55e; }
              .reply-content { max-height: 150px; overflow-y: auto; font-size: 13px; }
            </style>
            <div class="email-thread">
              <div class="small text-muted mb-2"><i class="bi bi-info-circle me-1"></i>Showing inbox emails</div>
          `
          
          for (const emailDoc of directEmails.slice(0, 20)) {
            const recvDate = this.formatDate(emailDoc.received_at)
            const cleanBody = this.extractReplyContent(emailDoc.body || emailDoc.body_plain || '')
            const snippet = cleanBody.substring(0, 200).replace(/<[^>]+>/g, '')
            
            emailThreadHtml += `
              <div class="email-item p-3 mb-2 rounded bg-light">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <div class="small fw-medium" style="color:#0f172a">${emailDoc.from_email || emailDoc.from_name || 'Unknown'}</div>
                    <div class="small text-muted">${emailDoc.subject || '(No Subject)'}</div>
                  </div>
                  <div class="text-muted" style="font-size:11px">${recvDate}</div>
                </div>
                <div class="reply-content text-dark">${snippet}${snippet.length >= 200 ? '...' : ''}</div>
              </div>
            `
          }
          
          emailThreadHtml += `</div>`
        }
        // CASE 3: No data at all
        else {
          console.log(`📧 [ViewCtrl] No email activity found for: ${email}`)
        }
      }

      /* =================================================
       * 🧾 FINAL RESPONSE
       * ================================================= */
      return res.json({
        status: true,
        type: 'offcanvas',
        position: 'end',
        size: 'lg',
        label: 'Contact Profile',
        content: `
          ${profileHeader}
          ${detailsSection}
          <div class="p-3">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <div class="fw-bold" style="color:#0f172a">
                <i class="bi bi-chat-square-text me-2"></i>Email Activity
              </div>
            </div>
            ${emailThreadHtml}
          </div>
        `
      })

    } catch (error) {
      console.error('❌ ViewCtrl error:', error)
      return res.status(500).json({
        status: false,
        message: error.message
      })
    }
  }
}
