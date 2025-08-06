#!/usr/bin/env python3
import os
import sys
import hashlib
import magic
from minio import Minio
from minio.error import S3Error

def main():
    # Load environment variables
    endpoint = os.getenv("S3_ENDPOINT")
    bucket = os.getenv("S3_BUCKET")
    s3_path = os.getenv("S3_PATH")
    access_key = os.getenv("S3_ACCESS_KEY")
    secret_key = os.getenv("S3_SECRET_KEY")

    

    if not all([endpoint, bucket, access_key, secret_key]):
        print("Error: Please set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, and S3_SECRET_KEY environment variables.")
        sys.exit(1)

    photo_filename = "david.jpg"
    local_path = os.path.join(os.getcwd(), photo_filename)

    if not os.path.isfile(local_path):
        print(f"Error: File '{photo_filename}' not found in current directory.")
        sys.exit(1)

    # Calculate SHA256 hash
    hasher = hashlib.sha256()
    with open(local_path, "rb") as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    sha256_hash = hasher.hexdigest()
    print(f"SHA-256: {sha256_hash}")

    # Detect MIME type
    mime = magic.Magic(mime=True)
    mime_type = mime.from_file(local_path)
    print(f"MIME type: {mime_type}")

    # Prepare object key (S3 path)
    # Remove trailing slash if any
    s3_path = s3_path.rstrip("/")
    object_key = f"{s3_path}/{photo_filename}" if s3_path else photo_filename

    # Connect to MinIO/S3
    client = Minio(
        endpoint,
        access_key=access_key,
        secret_key=secret_key,
        secure=endpoint.startswith("https"),
    )

    # Ensure bucket exists (optional)
    try:
        if not client.bucket_exists(bucket):
            print(f"Bucket '{bucket}' does not exist. Creating it.")
            client.make_bucket(bucket)
    except S3Error as e:
        print(f"Error checking or creating bucket: {e}")
        sys.exit(1)

    # Upload the file
    try:
        print(f"Uploading {photo_filename} to bucket '{bucket}' at '{object_key}' ...")
        client.fput_object(bucket, object_key, local_path, content_type=mime_type)
        print("Upload complete!")
    except S3Error as e:
        print(f"Upload failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
