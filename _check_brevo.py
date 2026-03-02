import requests, os
from dotenv import load_dotenv
load_dotenv(override=True)
key = os.getenv("BREVO_API_KEY", "")
headers = {"accept": "application/json", "api-key": key}

resp = requests.get("https://api.brevo.com/v3/senders", headers=headers, timeout=15)
print("=== Verified Senders ===")
for s in resp.json().get("senders", []):
    email = s.get("email")
    active = s.get("active")
    print(f"  {email}  active={active}")

resp2 = requests.get("https://api.brevo.com/v3/senders/domains", headers=headers, timeout=15)
print("\n=== Domains ===")
print(resp2.json())
