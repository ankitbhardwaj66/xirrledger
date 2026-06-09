# ─────────────────────────────────────────────────────────────
# S3 — Artifacts bucket (Lambda code + layer zips)
# ─────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "artifacts" {
  bucket = "xirrledger-artifacts-dev"
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket                  = aws_s3_bucket.artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

# ─────────────────────────────────────────────────────────────
# S3 — Uploads bucket (ledger files, auto-delete after 24h)
# ─────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "uploads" {
  bucket = "xirrledger-uploads-dev"
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "auto-delete-after-24h"
    status = "Enabled"

    filter {}

    expiration {
      days = var.uploads_expiry_days
    }
  }
}

# CORS for browser direct upload via presigned URLs
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST"]
    allowed_origins = ["https://dev.xirrledger.com", "http://localhost:3000"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ─────────────────────────────────────────────────────────────
# S3 — Reports bucket (PDF reports, signed URLs, 7-day expiry)
# ─────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "reports" {
  bucket = "xirrledger-reports-dev"
}

resource "aws_s3_bucket_lifecycle_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id

  rule {
    id     = "auto-delete-after-7d"
    status = "Enabled"

    filter {}

    expiration {
      days = var.reports_expiry_days
    }
  }
}

resource "aws_s3_bucket_public_access_block" "reports" {
  bucket                  = aws_s3_bucket.reports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ─────────────────────────────────────────────────────────────
# S3 — Jobs bucket (status.json per session, publicly readable)
# ─────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "jobs" {
  bucket = "xirrledger-jobs-dev"
}

resource "aws_s3_bucket_lifecycle_configuration" "jobs" {
  bucket = aws_s3_bucket.jobs.id

  rule {
    id     = "auto-delete-after-7d"
    status = "Enabled"

    filter {}

    expiration {
      days = 7
    }
  }
}

# Allow public read so frontend can poll status.json directly
resource "aws_s3_bucket_public_access_block" "jobs" {
  bucket                  = aws_s3_bucket.jobs.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "jobs_public_read" {
  bucket = aws_s3_bucket.jobs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.jobs.arn}/jobs/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.jobs]
}

# CORS for browser polling
resource "aws_s3_bucket_cors_configuration" "jobs" {
  bucket = aws_s3_bucket.jobs.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = ["https://dev.xirrledger.com", "http://localhost:3000"]
    max_age_seconds = 30
  }
}
