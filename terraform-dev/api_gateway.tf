# ─────────────────────────────────────────────────────────────
# API Gateway — HTTP API (dev)
# Routes:
#   POST /session  → synchronous Lambda (create session + presigned URLs)
#   POST /process  → synchronous Lambda (trigger async job)
#   POST /validate → synchronous Lambda (deep file parse check)
# ─────────────────────────────────────────────────────────────
resource "aws_apigatewayv2_api" "main" {
  name          = "xirrledger-api-dev"
  protocol_type = "HTTP"
  description   = "DEV: XIRR Ledger backend API"

  cors_configuration {
    allow_headers  = ["content-type", "authorization"]
    allow_methods  = ["POST", "OPTIONS"]
    allow_origins  = ["https://dev.xirrledger.com", "http://localhost:3000"]
    expose_headers = []
    max_age        = 300
  }
}

# Lambda integration (AWS_PROXY)
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.xirr_processor.invoke_arn
  payload_format_version = "2.0"
}

# POST /session
resource "aws_apigatewayv2_route" "session" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /session"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# POST /process
resource "aws_apigatewayv2_route" "process" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /process"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# POST /validate
resource "aws_apigatewayv2_route" "validate" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /validate"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Default stage — auto-deploy on changes
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      integrationError = "$context.integrationErrorMessage"
    })
  }

  default_route_settings {
    throttling_burst_limit = 20
    throttling_rate_limit  = 10
  }
}

# CloudWatch log group for API Gateway access logs
resource "aws_cloudwatch_log_group" "api_gw" {
  name              = "/aws/api-gw/xirrledger-dev"
  retention_in_days = 7
}

# Grant API Gateway permission to invoke Lambda
resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowAPIGatewayInvokeDev"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.xirr_processor.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
