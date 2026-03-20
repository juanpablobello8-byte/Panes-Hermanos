from pydantic import BaseModel, ConfigDict
from datetime import datetime

class RespuestaTurno(BaseModel):
    id: int
    id_empleado: int
    id_sucursal: int
    hora_entrada: datetime
    hora_salida: datetime | None = None
    estado: str
    
    model_config = ConfigDict(from_attributes=True)
