# ─────────────────────────────────────────────────────────────
# IAM — Lambda execution role (dev)
# ─────────────────────────────────────────────────────────────
resource "aws_iam_role" "lambda_exec" {
  name = "xirrledger-lambda-exec-dev"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Basic Lambda execution (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom policy: S3 + SES + self-invocation
resource "aws_iam_policy" "lambda_custom" {
  name        = "xirrledger-lambda-policy-dev"
  description = "DEV: S3, SES, and self-invoke permissions for xirr-processor-dev Lambda"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Read ledger files from uploads bucket
      {
        Sid    = "S3UploadsRead"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:HeadObject"
        ]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      },
      # Write presigned URLs require listing too
      {
        Sid    = "S3UploadsPresign"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.uploads.arn,
          "${aws_s3_bucket.uploads.arn}/*"
        ]
      },
      # Write PDF reports
      {
        Sid    = "S3ReportsWrite"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.reports.arn}/*"
      },
      # Read/write/delete job status and OTP records
      {
        Sid    = "S3JobsReadWrite"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.jobs.arn}/*"
      },
      # Send email via SES
      {
        Sid    = "SESSendEmail"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail"
        ]
        Resource = "*"
      },
      # Self-invoke for async processing
      {
        Sid    = "LambdaSelfInvoke"
        Effect = "Allow"
        Action = "lambda:InvokeFunction"
        Resource = aws_lambda_function.xirr_processor.arn
      },
      # Read shared secret from Secrets Manager
      {
        Sid    = "SecretsManagerRead"
        Effect = "Allow"
        Action = "secretsmanager:GetSecretValue"
        Resource = "arn:aws:secretsmanager:ap-south-1:681745772892:secret:xirrledger/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_custom" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_custom.arn
}
