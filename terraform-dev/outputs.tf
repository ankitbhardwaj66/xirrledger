# ─────────────────────────────────────────────────────────────
# Outputs — values needed after apply
# ─────────────────────────────────────────────────────────────

output "api_gateway_url" {
  description = "DEV API Gateway endpoint URL — set as NEXT_PUBLIC_API_URL in Next.js build"
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
