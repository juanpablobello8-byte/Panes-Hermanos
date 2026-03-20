from pydantic import BaseModel, ConfigDict

class RoleSchema(BaseModel):
    id: int
    name: str
    permissions: str
    
    model_config = ConfigDict(from_attributes=True)

class BranchSchema(BaseModel):
    id: int
    name: str
    address: str | None = None
    
    model_config = ConfigDict(from_attributes=True)
