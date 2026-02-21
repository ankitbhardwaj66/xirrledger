# ─────────────────────────────────────────────────────────────
# SES — Domain identity for xirrledger.com
# After terraform apply, add the DNS records shown in outputs
# to your Hostinger DNS to complete domain verification.
# ─────────────────────────────────────────────────────────────
resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# MAIL FROM domain (improves deliverability)
resource "aws_ses_domain_mail_from" "main" {
  domain           = aws_ses_domain_identity.main.domain
  mail_from_domain = "mail.${var.domain_name}"
}

# Verify the sender email address as well (belt-and-suspenders)
resource "aws_ses_email_identity" "from" {
  email = var.ses_from_email
}

# ─────────────────────────────────────────────────────────────
# SES — Email template for report delivery
# ─────────────────────────────────────────────────────────────
resource "aws_ses_template" "report_ready" {
  name    = "xirrledger-report-ready"
  subject = "Your XIRR Report is Ready — {{name}}"

  html = <<-HTML
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
        XIRR Ledger — <a href="https://xirrledger.com" style="color: #3f51b5;">xirrledger.com</a>
      </p>
    </body>
    </html>
  HTML

  text = <<-TEXT
    Hi {{name}},

    Your XIRR report is ready!

    Your XIRR:     {{xirr}}%
    Nifty 50 XIRR: {{nifty_xirr}}%
    vs Nifty 50:   {{vs_nifty}}

    Download your PDF report: {{report_url}}
    (This link expires in 7 days)

    — XIRR Ledger | https://xirrledger.com
  TEXT
}
