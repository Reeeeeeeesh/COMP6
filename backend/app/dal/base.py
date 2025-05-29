from typing import Generic, TypeVar, Type, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from ..database import Base

ModelType = TypeVar("ModelType", bound=Base)

class BaseDAL(Generic[ModelType]):
    """Base Data Access Layer class with common CRUD operations"""
    
    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db
    
    def create(self, obj_in: dict) -> ModelType:
        """Create a new record"""
        db_obj = self.model(**obj_in)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
    
    def get(self, id: str) -> Optional[ModelType]:
        """Get a record by ID"""
        return self.db.query(self.model).filter(self.model.id == id).first()
    
    def get_multi(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Get multiple records with pagination"""
        return self.db.query(self.model).offset(skip).limit(limit).all()
    
    def update(self, db_obj: ModelType, obj_in: dict) -> ModelType:
        """Update an existing record"""
        for field, value in obj_in.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
    
    def delete(self, id: str) -> bool:
        """Delete a record by ID"""
        db_obj = self.get(id)
        if db_obj:
            self.db.delete(db_obj)
            self.db.commit()
            return True
        return False
    
    def count(self) -> int:
        """Count total records"""
        return self.db.query(self.model).count()
