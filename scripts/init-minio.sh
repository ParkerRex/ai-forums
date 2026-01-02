#!/bin/sh
set -e

# Configure mc client
mc alias set local http://minio:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD

# Create bucket
mc mb local/vai-uploads --ignore-existing

# Set public read policy
mc anonymous set download local/vai-uploads

echo "MinIO bucket 'vai-uploads' initialized with public read access"
