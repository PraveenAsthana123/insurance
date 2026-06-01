# Terraform — CloudFront distribution for insur_project frontend + API edge.
# Per operator 2026-06-01 + global §47 architecture.
#
# Apply: terraform init && terraform plan && terraform apply
#        (operator + cloud team; not deployed by this commit per §42)

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "insur-tfstate"
    key    = "infra/cdn/cloudfront.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1" # CloudFront certs MUST be in us-east-1
}

# ─────────────────────────────────────────────────────────────────────────
# Variables
# ─────────────────────────────────────────────────────────────────────────
variable "env" {
  type        = string
  description = "Environment: dev|staging|prod"
}

variable "domain" {
  type        = string
  description = "Public domain (e.g. insur.example.com)"
}

variable "origin_alb_dns" {
  type        = string
  description = "Application Load Balancer DNS name for backend"
}

variable "origin_s3_bucket" {
  type        = string
  description = "S3 bucket name for frontend static assets"
}

variable "acm_cert_arn" {
  type        = string
  description = "ACM certificate ARN in us-east-1"
}

# ─────────────────────────────────────────────────────────────────────────
# CloudFront distribution
# ─────────────────────────────────────────────────────────────────────────
resource "aws_cloudfront_distribution" "insur" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "insur_project ${var.env}"
  http_version    = "http2and3"
  price_class     = var.env == "prod" ? "PriceClass_All" : "PriceClass_100"

  aliases = [var.domain]

  # Frontend static origin (S3)
  origin {
    domain_name = "${var.origin_s3_bucket}.s3.amazonaws.com"
    origin_id   = "s3-frontend"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.s3.cloudfront_access_identity_path
    }
  }

  # Backend API origin (ALB)
  origin {
    domain_name = var.origin_alb_dns
    origin_id   = "alb-backend"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_keepalive_timeout = 60
      origin_read_timeout      = 60
    }
  }

  # Default behavior — serve frontend
  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    min_ttl                = 0
    default_ttl            = 300  # SPA shell — 5 min
    max_ttl                = 3600

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  # API ordered cache behavior — pass to ALB, no caching except where opted-in
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "alb-backend"
    viewer_protocol_policy = "https-only"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    min_ttl                = 0
    default_ttl            = 0  # no default cache for API
    max_ttl                = 3600

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "X-Tenant-ID", "X-Request-ID", "Content-Type", "Accept"]
      cookies { forward = "all" }
    }
  }

  # Static-asset ordered behavior — aggressive cache
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    min_ttl                = 86400
    default_ttl            = 31536000
    max_ttl                = 31536000

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_cert_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  web_acl_id = aws_wafv2_web_acl.insur.arn

  tags = {
    project = "insur"
    env     = var.env
  }
}

resource "aws_cloudfront_origin_access_identity" "s3" {
  comment = "insur frontend ${var.env}"
}

# ─────────────────────────────────────────────────────────────────────────
# WAF — block OWASP top 10 + per-IP rate limit
# ─────────────────────────────────────────────────────────────────────────
resource "aws_wafv2_web_acl" "insur" {
  name        = "insur-${var.env}"
  scope       = "CLOUDFRONT"
  description = "insur_project WAF"

  default_action {
    allow {}
  }

  rule {
    name     = "RateLimit"
    priority = 1
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = 2000  # 2000 req/5min per IP
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRules"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "insur-${var.env}-waf"
    sampled_requests_enabled   = true
  }
}

# ─────────────────────────────────────────────────────────────────────────
# Outputs
# ─────────────────────────────────────────────────────────────────────────
output "distribution_id" {
  value = aws_cloudfront_distribution.insur.id
}

output "distribution_domain" {
  value = aws_cloudfront_distribution.insur.domain_name
}
