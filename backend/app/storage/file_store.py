"""
File storage abstraction with SHA-256 hashing and lineage tracking.
Provides secure file storage with integrity verification.
"""

import hashlib
import os
import shutil
import uuid
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, BinaryIO, Union
import logging

logger = logging.getLogger(__name__)


class FileStorageError(Exception):
    """Custom exception for file storage operations."""
    pass


class FileStorageResult:
    """Result object for file storage operations."""
    
    def __init__(self, storage_path: str, bytes_hash: str, file_size: int):
        self.storage_path = storage_path
        self.bytes_hash = bytes_hash
        self.file_size = file_size
        self.created_at = datetime.utcnow()
    
    def to_dict(self) -> Dict:
        """Convert to dictionary representation."""
        return {
            "storage_path": self.storage_path,
            "bytes_hash": self.bytes_hash,
            "file_size": self.file_size,
            "created_at": self.created_at.isoformat()
        }


class FileStore(ABC):
    """Abstract base class for file storage implementations."""
    
    @abstractmethod
    def save_file(self, tenant_id: str, file_content: Union[bytes, BinaryIO], 
                  filename: str, metadata: Optional[Dict] = None) -> FileStorageResult:
        """
        Save file content with SHA-256 hashing.
        
        Args:
            tenant_id: Tenant identifier for organizing files
            file_content: File content as bytes or file-like object
            filename: Original filename
            metadata: Optional metadata to store with file
            
        Returns:
            FileStorageResult: Storage result with path, hash, and size
            
        Raises:
            FileStorageError: If storage operation fails
        """
        pass
    
    @abstractmethod
    def get_file(self, storage_path: str) -> bytes:
        """
        Retrieve file content by storage path.
        
        Args:
            storage_path: Path to stored file
            
        Returns:
            bytes: File content
            
        Raises:
            FileStorageError: If file not found or read error
        """
        pass
    
    @abstractmethod
    def delete_file(self, storage_path: str) -> bool:
        """
        Delete file by storage path.
        
        Args:
            storage_path: Path to stored file
            
        Returns:
            bool: True if deleted, False if file didn't exist
            
        Raises:
            FileStorageError: If deletion fails
        """
        pass
    
    @abstractmethod
    def verify_checksum(self, storage_path: str, expected_hash: str) -> bool:
        """
        Verify file integrity using SHA-256 checksum.
        
        Args:
            storage_path: Path to stored file
            expected_hash: Expected SHA-256 hash
            
        Returns:
            bool: True if checksums match, False otherwise
            
        Raises:
            FileStorageError: If file not found or read error
        """
        pass
    
    @abstractmethod
    def file_exists(self, storage_path: str) -> bool:
        """
        Check if file exists at storage path.
        
        Args:
            storage_path: Path to check
            
        Returns:
            bool: True if file exists, False otherwise
        """
        pass


class LocalFileStore(FileStore):
    """Local filesystem implementation of FileStore."""
    
    def __init__(self, base_path: str = "storage"):
        """
        Initialize local file store.
        
        Args:
            base_path: Base directory for file storage
        """
        self.base_path = Path(base_path)
        self._ensure_base_directory()
    
    def _ensure_base_directory(self):
        """Ensure base storage directory exists with proper permissions."""
        try:
            self.base_path.mkdir(parents=True, exist_ok=True)
            # Test write permissions
            test_file = self.base_path / ".write_test"
            test_file.write_text("test")
            test_file.unlink()
        except Exception as e:
            raise FileStorageError(f"Cannot create or write to storage directory {self.base_path}: {e}")
    
    def _get_tenant_directory(self, tenant_id: str) -> Path:
        """Get tenant-specific storage directory."""
        tenant_dir = self.base_path / tenant_id
        tenant_dir.mkdir(parents=True, exist_ok=True)
        return tenant_dir
    
    def _calculate_sha256(self, file_content: Union[bytes, BinaryIO]) -> str:
        """Calculate SHA-256 hash of file content."""
        sha256_hash = hashlib.sha256()
        
        if isinstance(file_content, bytes):
            sha256_hash.update(file_content)
        else:
            # Handle file-like object
            if hasattr(file_content, 'seek'):
                file_content.seek(0)
            
            while chunk := file_content.read(8192):
                if isinstance(chunk, str):
                    chunk = chunk.encode('utf-8')
                sha256_hash.update(chunk)
            
            if hasattr(file_content, 'seek'):
                file_content.seek(0)
        
        return sha256_hash.hexdigest()
    
    def _get_file_extension(self, filename: str) -> str:
        """Extract file extension from filename."""
        return Path(filename).suffix.lower()
    
    def save_file(self, tenant_id: str, file_content: Union[bytes, BinaryIO], 
                  filename: str, metadata: Optional[Dict] = None) -> FileStorageResult:
        """Save file to local storage with SHA-256 hashing."""
        try:
            # Get tenant directory
            tenant_dir = self._get_tenant_directory(tenant_id)
            
            # Generate unique filename
            file_extension = self._get_file_extension(filename)
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            storage_path = tenant_dir / unique_filename
            
            # Calculate hash before saving
            bytes_hash = self._calculate_sha256(file_content)
            
            # Convert content to bytes if needed
            if isinstance(file_content, bytes):
                content_bytes = file_content
            else:
                if hasattr(file_content, 'seek'):
                    file_content.seek(0)
                content_bytes = file_content.read()
                if isinstance(content_bytes, str):
                    content_bytes = content_bytes.encode('utf-8')
            
            # Save file
            with open(storage_path, 'wb') as f:
                f.write(content_bytes)
            
            file_size = len(content_bytes)
            
            # Store metadata if provided
            if metadata:
                metadata_path = storage_path.with_suffix(f"{storage_path.suffix}.meta")
                import json
                with open(metadata_path, 'w') as f:
                    json.dump({
                        **metadata,
                        "original_filename": filename,
                        "created_at": datetime.utcnow().isoformat(),
                        "bytes_hash": bytes_hash,
                        "file_size": file_size
                    }, f, indent=2)
            
            logger.info(f"File saved: {storage_path} (hash: {bytes_hash[:16]}...)")
            
            return FileStorageResult(
                storage_path=str(storage_path.relative_to(self.base_path)),
                bytes_hash=bytes_hash,
                file_size=file_size
            )
            
        except Exception as e:
            raise FileStorageError(f"Failed to save file {filename}: {e}")
    
    def get_file(self, storage_path: str) -> bytes:
        """Retrieve file content from local storage."""
        try:
            full_path = self.base_path / storage_path
            
            if not full_path.exists():
                raise FileStorageError(f"File not found: {storage_path}")
            
            with open(full_path, 'rb') as f:
                content = f.read()
            
            logger.debug(f"File retrieved: {storage_path} ({len(content)} bytes)")
            return content
            
        except FileStorageError:
            raise
        except Exception as e:
            raise FileStorageError(f"Failed to read file {storage_path}: {e}")
    
    def delete_file(self, storage_path: str) -> bool:
        """Delete file from local storage."""
        try:
            full_path = self.base_path / storage_path
            
            if not full_path.exists():
                return False
            
            # Delete main file
            full_path.unlink()
            
            # Delete metadata file if exists
            metadata_path = full_path.with_suffix(f"{full_path.suffix}.meta")
            if metadata_path.exists():
                metadata_path.unlink()
            
            logger.info(f"File deleted: {storage_path}")
            return True
            
        except Exception as e:
            raise FileStorageError(f"Failed to delete file {storage_path}: {e}")
    
    def verify_checksum(self, storage_path: str, expected_hash: str) -> bool:
        """Verify file integrity using SHA-256 checksum."""
        try:
            content = self.get_file(storage_path)
            actual_hash = hashlib.sha256(content).hexdigest()
            
            is_valid = actual_hash == expected_hash
            
            if is_valid:
                logger.debug(f"Checksum verified for {storage_path}")
            else:
                logger.warning(f"Checksum mismatch for {storage_path}: expected {expected_hash}, got {actual_hash}")
            
            return is_valid
            
        except Exception as e:
            raise FileStorageError(f"Failed to verify checksum for {storage_path}: {e}")
    
    def file_exists(self, storage_path: str) -> bool:
        """Check if file exists in local storage."""
        full_path = self.base_path / storage_path
        return full_path.exists() and full_path.is_file()
    
    def get_file_info(self, storage_path: str) -> Optional[Dict]:
        """Get file metadata if available."""
        try:
            full_path = self.base_path / storage_path
            metadata_path = full_path.with_suffix(f"{full_path.suffix}.meta")
            
            if not metadata_path.exists():
                return None
            
            import json
            with open(metadata_path, 'r') as f:
                return json.load(f)
                
        except Exception as e:
            logger.warning(f"Failed to read metadata for {storage_path}: {e}")
            return None
    
    def get_storage_stats(self) -> Dict:
        """Get storage statistics for monitoring."""
        try:
            total_files = 0
            total_size = 0
            tenant_stats = {}
            
            for tenant_dir in self.base_path.iterdir():
                if tenant_dir.is_dir():
                    tenant_files = 0
                    tenant_size = 0
                    
                    for file_path in tenant_dir.iterdir():
                        if file_path.is_file() and not file_path.name.endswith('.meta'):
                            tenant_files += 1
                            tenant_size += file_path.stat().st_size
                    
                    tenant_stats[tenant_dir.name] = {
                        "files": tenant_files,
                        "size_bytes": tenant_size
                    }
                    
                    total_files += tenant_files
                    total_size += tenant_size
            
            return {
                "total_files": total_files,
                "total_size_bytes": total_size,
                "tenant_stats": tenant_stats,
                "base_path": str(self.base_path)
            }
            
        except Exception as e:
            logger.error(f"Failed to get storage stats: {e}")
            return {"error": str(e)}
