from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
import re

class EmpleadoBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    apellido: str = Field(..., max_length=100)
    email: EmailStr
    telefono: str = Field(..., description="E.164 formato de teléfono (+ y max 15 dígitos)")
    salario: float = Field(..., ge=0, description="Salario mínimo o mayor")
    id_sucursal: int | None = None
    id_rol: int

    @field_validator("telefono")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not re.match(r"^\+[1-9]\d{1,14}$", v):
            raise ValueError("Teléfono debe ser formato E.164, e.g. +521234567890")
        return v

class EmpleadoCrear(EmpleadoBase):
    password: str | None = Field(None, min_length=6, description="Para administración web")
    pin_pos: str | None = Field(None, min_length=4, max_length=6, description="PIN numérico para el terminal POS")

    @field_validator("pin_pos")
    @classmethod
    def validate_pin(cls, v: str | None) -> str | None:
        if v is not None and (not v.isdigit() or len(v) < 4 or len(v) > 6 or v in ["0000", "1234", "1111"]):
            raise ValueError("El PIN debe ser numérico seguro de 4-6 dígitos")
        return v

class EmpleadoActualizar(BaseModel):
    nombre: str | None = None
    apellido: str | None = None
    telefono: str | None = None
    salario: float | None = None
    id_sucursal: int | None = None
    id_rol: int | None = None
    activo: bool | None = None

    @field_validator("telefono")
    @classmethod
    def validate_phone_update(cls, v: str | None) -> str | None:
        if v is not None and not re.match(r"^\+[1-9]\d{1,14}$", v):
            raise ValueError("Teléfono debe ser E.164")
        return v

class EmpleadoRespuesta(EmpleadoBase):
    id: int
    activo: bool
    
    model_config = ConfigDict(from_attributes=True)
