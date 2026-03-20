from pydantic import BaseModel

class Token(BaseModel):
    token_acceso: str
    tipo_token: str

class TokenPayload(BaseModel):
    sub: str | None = None
    permisos: str | None = None  # Lista los permisos de este usuario
    id_sucursal: str | None = None    # A veces es util en el payload para el POS
