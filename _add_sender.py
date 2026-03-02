import requests, os
from dotenv import load_dotenv
load_dotenv(override=True)
key = os.getenv("BREVO_API_KEY", "")
headers = {"accept": "application/json", "content-type": "application/json", "api-key": key}

# Create sender support@law-gpt.app
payload = {
    "name": "LawGPT Support",
    "email": "support@law-gpt.app"
}
resp = requests.post("https://api.brevo.com/v3/senders", json=payload, headers=headers, timeout=15)
print("Create sender status:", resp.status_code)
print("Response:", resp.text)
