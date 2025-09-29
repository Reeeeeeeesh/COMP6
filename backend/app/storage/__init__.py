"""
Storage module for file storage abstraction and implementations.
Provides unified interface for file storage with SHA-256 hashing and lineage tracking.
"""

from .file_store import FileStore, LocalFileStore, FileStorageResult, FileStorageError

__all__ = [
    "FileStore",
    "LocalFileStore", 
    "FileStorageResult",
    "FileStorageError"
]


def create_file_store(storage_type: str = "local", **kwargs) -> FileStore:
    """
    Factory function to create file store instances.
    
    Args:
        storage_type: Type of storage ("local", "s3", etc.)
        **kwargs: Additional configuration parameters
        
    Returns:
        FileStore: Configured file store instance
        
    Raises:
        ValueError: If storage_type is not supported
    """
    if storage_type == "local":
        return LocalFileStore(**kwargs)
    else:
        raise ValueError(f"Unsupported storage type: {storage_type}")
