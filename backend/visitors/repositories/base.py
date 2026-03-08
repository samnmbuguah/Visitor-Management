from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from django.db.models import Model


class BaseRepository(ABC):
    """Abstract base repository following Repository pattern."""
    
    @abstractmethod
    def get_by_id(self, id: int) -> Optional[Model]:
        pass
    
    @abstractmethod
    def get_all(self, filters: Dict[str, Any] = None) -> List[Model]:
        pass
    
    @abstractmethod
    def create(self, data: Dict[str, Any]) -> Model:
        pass
    
    @abstractmethod
    def update(self, id: int, data: Dict[str, Any]) -> Optional[Model]:
        pass
    
    @abstractmethod
    def delete(self, id: int) -> bool:
        pass
