import os
import sys

# main.py reads these at import time (create_client requires a URL/key), so they
# must exist *before* `import main` happens anywhere in the test session. Real
# credentials are never needed for the mocked unit tests below.
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")

sys.path.insert(0, os.path.dirname(__file__))
