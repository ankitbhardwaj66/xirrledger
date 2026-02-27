# ─────────────────────────────────────────────────────────────
# SES — Dev shares the prod domain identity (xirrledger.com)
# The domain is already verified in prod — no new DNS records needed.
# We just reference the existing verified email identity for sending.
# ─────────────────────────────────────────────────────────────

# Reference the already-verified sender email (created by prod terraform)
# Dev Lambda uses the same SES from address: reports@xirrledger.com
# No new SES resources needed — prod verification covers sending from
# reports@xirrledger.com in the same AWS account/region.

# SES email template for dev reports
resource "aws_ses_template" "report_ready" {
  name    = "xirrledger-report-ready-dev"
  subject = "[DEV] Your XIRR Report is Ready — {{name}}"

  html = <<-HTML
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <p style="background: #fef3c7; padding: 8px 12px; border-radius: 4px; font-size: 0.85em; color: #92400e;">
        ⚠️ This is a DEV environment report
      </p>
      <h2 style="color: #1a237e;">Your XIRR Report is Ready</h2>
      <p>Hi {{name}},</p>
      <p>Your portfolio analysis is complete. Here's a quick summary:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #e8eaf6;">
          <td style="padding: 10px; border: 1px solid #c5cae9;"><strong>Your XIRR</strong></td>
          <td style="padding: 10px; border: 1px solid #c5cae9; font-size: 1.4em; color: #283593;"><strong>{{xirr}}%</strong></td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #c5cae9;">Nifty 50 XIRR</td>
          <td style="padding: 10px; border: 1px solid #c5cae9;">{{nifty_xirr}}%</td>
        </tr>
        <tr style="background: #e8eaf6;">
          <td style="padding: 10px; border: 1px solid #c5cae9;"><strong>vs Nifty 50</strong></td>
          <td style="padding: 10px; border: 1px solid #c5cae9;"><strong>{{vs_nifty}}</strong></td>
        </tr>
      </table>
      <p>
        <a href="{{report_url}}" style="background: #3f51b5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Download Full PDF Report
        </a>
      </p>
      <p style="color: #666; font-size: 0.9em;">This link expires in 7 days.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
      <p style="color: #999; font-size: 0.8em;">
        XIRR Ledger DEV — <a href="https://dev.xirrledger.com" style="color: #3f51b5;">dev.xirrledger.com</a>
      </p>
    </body>
    </html>
  HTML

  text = <<-TEXT
    [DEV] Hi {{name}},

    Your XIRR report is ready!

    Your XIRR:     {{xirr}}%
    Nifty 50 XIRR: {{nifty_xirr}}%
    vs Nifty 50:   {{vs_nifty}}

    Download your PDF report: {{report_url}}
    (This link expires in 7 days)

    — XIRR Ledger DEV | https://dev.xirrledger.com
  TEXT
}
