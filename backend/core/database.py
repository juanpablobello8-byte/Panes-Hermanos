from supabase import create_client, Client
import os
from .config import settings

# En un entorno real se usaría python-dotenv o la clase Settings,
# Aquí conectamos directamente a tu Supabase.
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ijvqubewduqzswxxamen.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_QBO_3vQo-u9kldEBLDfkbw_ZMV0lyPQ")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
