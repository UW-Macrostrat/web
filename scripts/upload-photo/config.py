"""
Settings that define the ingestion process.
"""

from minio import Minio

from macrostrat.core.config import settings  # type: ignore[import-untyped]

CHUNK_SIZE = 8 * 1024 * 1024  # 8 MB
TIMEOUT = 60  # seconds

PG_DATABASE = getattr(settings, "pg_database")

storage = getattr(settings, "storage", {})
buckets = getattr(storage, "buckets", {})

S3_HOST = storage.get("endpoint", None)
S3_ACCESS_KEY = storage.get("access_key", None)
S3_SECRET_KEY = storage.get("secret_key", None)
S3_BUCKET = buckets.get("map-staging", None)


def get_minio_client():
    if not isinstance(S3_HOST, str):
        raise ValueError("settings.storage.endpoint is not defined")

    host = S3_HOST
    secure = None
    if host.startswith("http://"):
        host = host[7:]
        secure = False
    elif host.startswith("https://"):
        host = host[8:]
        secure = True

    return Minio(
        endpoint=host,
        access_key=S3_ACCESS_KEY,
        secret_key=S3_SECRET_KEY,
        secure=secure,
    )