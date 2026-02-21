# ─────────────────────────────────────────────────────────────
# Outputs — values needed after apply
# ─────────────────────────────────────────────────────────────

output "api_gateway_url" {
  description = "API Gateway endpoint URL — set as NEXT_PUBLIC_API_URL in Next.js build"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "s3_uploads_bucket" {
  description = "S3 bucket name for ledger file uploads"
  value       = aws_s3_bucket.uploads.id
}

output "s3_reports_bucket" {
  description = "S3 bucket name for PDF reports"
  value       = aws_s3_bucket.reports.id
}

output "s3_jobs_bucket" {
  description = "S3 bucket name for job status files"
  value       = aws_s3_bucket.jobs.id
}

output "s3_jobs_base_url" {
  description = "Base URL for polling status.json — append /jobs/{session_id}/status.json"
  value       = "https://${aws_s3_bucket.jobs.id}.s3.${var.aws_region}.amazonaws.com"
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.xirr_processor.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.xirr_processor.arn
}

# ─────────────────────────────────────────────────────────────
# SES DNS records — add these to Hostinger DNS
# ─────────────────────────────────────────────────────────────
output "ses_verification_token" {
  description = "Add this as TXT record: _amazonses.xirrledger.com"
  value       = aws_ses_domain_identity.main.verification_token
}

output "ses_dkim_tokens" {
  description = "Add 3 CNAME records for DKIM — token._domainkey.xirrledger.com → token.dkim.amazonses.com"
  value       = aws_ses_domain_dkim.main.dkim_tokens
}

output "ses_mail_from_mx" {
  description = "Add MX record: mail.xirrledger.com → feedback-smtp.ap-south-1.amazonses.com (priority 10)"
  value       = "feedback-smtp.${var.aws_region}.amazonses.com"
}
