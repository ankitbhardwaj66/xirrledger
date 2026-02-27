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

  # Source of truth: lambda/email/report-ready.html
  # Do NOT edit AWS SES console directly — terraform apply will overwrite it.
  html = file("${path.module}/../lambda/email/report-ready.html")

  text = <<-TEXT
    Hi {{name}},

    Your XIRR report is ready!

    Your XIRR:        {{xirr}}%
    Nifty 50 XIRR:    {{nifty_xirr}}%
    vs Nifty 50:      {{vs_nifty}}

    Total Invested:   {{total_invested}}
    Current Value:    {{current_value}}
    Net Gain:         {{net_gain}}
    Period:           {{investment_period}}

    Download your PDF report: {{report_url}}
    (Link expires in 24 hours)

    — XIRR Ledger | https://xirrledger.com
  TEXT
}
