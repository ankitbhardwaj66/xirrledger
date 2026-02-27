# ─────────────────────────────────────────────────────────────
# Lambda — zip the local lambda/ directory
# ─────────────────────────────────────────────────────────────
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda"
  output_path = "${path.root}/../lambda/dist/lambda-dev.zip"
  excludes    = ["dist", "*.pyc", "__pycache__", "layer"]
}

# ─────────────────────────────────────────────────────────────
# Lambda Layer — upload zip to S3 first (>70MB can't go direct)
# Built by running: cd lambda && ./build_layer.sh
# ─────────────────────────────────────────────────────────────
resource "aws_s3_object" "layer_zip" {
  bucket = aws_s3_bucket.artifacts.id
  key    = "lambda/layer.zip"
  source = "${path.root}/../lambda/dist/layer.zip"
  etag   = filemd5("${path.root}/../lambda/dist/layer.zip")
}

resource "aws_lambda_layer_version" "deps" {
  layer_name          = "xirrledger-deps-dev"
  compatible_runtimes = ["python3.12"]
  compatible_architectures = ["arm64"]

  s3_bucket         = aws_s3_object.layer_zip.bucket
  s3_key            = aws_s3_object.layer_zip.key
  s3_object_version = aws_s3_object.layer_zip.version_id
  source_code_hash  = filebase64sha256("${path.root}/../lambda/dist/layer.zip")

  lifecycle {
    create_before_destroy = true
  }
}

# ─────────────────────────────────────────────────────────────
# Lambda — xirr-processor-dev function
# ─────────────────────────────────────────────────────────────
resource "aws_lambda_function" "xirr_processor" {
  function_name = "xirr-processor-dev"
  description   = "DEV: XIRR calculator: parse ledgers, compute XIRR, generate PDF, send email"

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  handler = "handler.lambda_handler"
  runtime = "python3.12"
  architectures = ["arm64"]

  role    = aws_iam_role.lambda_exec.arn
  timeout = var.lambda_timeout_seconds
  memory_size = var.lambda_memory_mb

  layers = [aws_lambda_layer_version.deps.arn]

  environment {
    variables = {
      S3_UPLOADS_BUCKET    = aws_s3_bucket.uploads.id
      S3_REPORTS_BUCKET    = aws_s3_bucket.reports.id
      S3_JOBS_BUCKET       = aws_s3_bucket.jobs.id
      SES_FROM_EMAIL       = var.ses_from_email
      HOSTINGER_API_URL    = var.hostinger_api_url
      HOSTINGER_API_SECRET = var.hostinger_api_secret
      AWS_REGION_NAME      = var.aws_region
      TEST_EMAILS          = var.test_emails
      SEND_EMAIL           = "false"
    }
  }

  tracing_config {
    mode = "PassThrough"
  }
}

# CloudWatch log group with 7-day retention
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${aws_lambda_function.xirr_processor.function_name}"
  retention_in_days = 7
}

# ─────────────────────────────────────────────────────────────
# Nifty 50 daily cache refresher Lambda
# ─────────────────────────────────────────────────────────────
resource "aws_lambda_function" "nifty_refresher" {
  function_name = "nifty-refresher-dev"
  description   = "DEV: Downloads full Nifty 50 history from yfinance and caches in S3 daily"

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  handler       = "refresher.lambda_handler"
  runtime       = "python3.12"
  architectures = ["arm64"]

  role        = aws_iam_role.lambda_exec.arn
  timeout     = 300
  memory_size = 256

  layers = [aws_lambda_layer_version.deps.arn]

  environment {
    variables = {
      S3_JOBS_BUCKET = aws_s3_bucket.jobs.id
    }
  }

  tracing_config {
    mode = "PassThrough"
  }
}

resource "aws_cloudwatch_log_group" "nifty_refresher" {
  name              = "/aws/lambda/${aws_lambda_function.nifty_refresher.function_name}"
  retention_in_days = 7
}

# EventBridge rule — fires daily at 6:00 AM IST (00:30 UTC)
resource "aws_cloudwatch_event_rule" "nifty_refresh_schedule" {
  name                = "nifty-daily-refresh-dev"
  description         = "DEV: Refresh Nifty 50 S3 cache daily at 6am IST"
  schedule_expression = "cron(30 0 * * ? *)"
}

resource "aws_cloudwatch_event_target" "nifty_refresh_target" {
  rule      = aws_cloudwatch_event_rule.nifty_refresh_schedule.name
  target_id = "NiftyRefresherLambdaDev"
  arn       = aws_lambda_function.nifty_refresher.arn
}

resource "aws_lambda_permission" "allow_eventbridge_nifty" {
  statement_id  = "AllowEventBridgeInvokeNiftyDev"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.nifty_refresher.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.nifty_refresh_schedule.arn
}
