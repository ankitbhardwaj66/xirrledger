variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name (prod, staging)"
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Root domain name for SES and tagging"
  type        = string
  default     = "xirrledger.com"
}

variable "ses_from_email" {
  description = "Email address to send reports from"
  type        = string
  default     = "reports@xirrledger.com"
}

variable "hostinger_api_url" {
  description = "Hostinger PHP bridge base URL"
  type        = string
  default     = "https://xirrledger.com/api"
}

variable "hostinger_api_secret_name" {
  description = "AWS Secrets Manager secret name containing the Lambda→PHP shared secret"
  type        = string
  default     = "xirrledger/prod/hostinger_api_secret"
}

variable "lambda_memory_mb" {
  description = "Lambda function memory in MB"
  type        = number
  default     = 512
}

variable "lambda_timeout_seconds" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 120
}

variable "uploads_expiry_days" {
  description = "Days before uploaded ledger files are auto-deleted"
  type        = number
  default     = 1
}

variable "reports_expiry_days" {
  description = "Days before PDF reports are auto-deleted"
  type        = number
  default     = 7
}
