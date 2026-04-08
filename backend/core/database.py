from postgrest import SyncPostgrestClient
import os

# Usaremos directamente la capa subyacente PostgREST para evitar 
# necesidad de compilar extensiones pesadas de C++ que pide supabase.
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ijvqubewduqzswxxamen.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_QBO_3vQo-u9kldEBLDfkbw_ZMV0lyPQ")

supabase = SyncPostgrestClient(
    f"{SUPABASE_URL}/rest/v1",
    headers={
        "apikey": SUPABASE_KEY, 
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
)
