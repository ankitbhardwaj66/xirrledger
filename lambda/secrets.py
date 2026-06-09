"""
Thin wrapper around AWS Secrets Manager.
Fetches a secret once at import time and caches it for the Lambda lifetime.
"""
import os
import boto3

_cache: dict[str, str] = {}


def get_secret(name: str) -> str:
    """Return the secret string for `name`, fetching from Secrets Manager if not cached."""
    if name not in _cache:
        client = boto3.client(
            "secretsmanager",
            region_name=os.environ.get("AWS_REGION_NAME", "ap-south-1"),
        )
        resp = client.get_secret_value(SecretId=name)
        _cache[name] = resp["SecretString"]
    return _cache[name]


def get_hostinger_api_secret() -> str:
    """Read HOSTINGER_API_SECRET from env (legacy) or Secrets Manager."""
    # Legacy: direct env var (kept for local dev / backwards compat)
    direct = os.environ.get("HOSTINGER_API_SECRET", "")
    if direct:
        return direct
    # Preferred: name of the Secrets Manager secret passed as env var
    secret_name = os.environ.get("HOSTINGER_API_SECRET_NAME", "")
    if secret_name:
        return get_secret(secret_name)
    return ""
