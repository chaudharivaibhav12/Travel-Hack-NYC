import os

from supabase import Client, create_client


supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_ANON_KEY"],
)


def get_supabase() -> Client:
    return supabase
