import requests
import base64
import json

# Step 1 — Login to get token
login_response = requests.post(
    'http://localhost:5000/api/auth/login',
    json={
        "email": "rahul@test.com",
        "password": "test1234"
    }
)
token = login_response.json()['token']
print(f"Token received: {token[:20]}...")

# Step 2 — Generate PDF
pdf_response = requests.post(
    'http://localhost:5000/api/tailor/pdf',
    headers={'Authorization': f'Bearer {token}'},
    json={"tailored_id": 4}
)

data = pdf_response.json()

if 'pdf_base64' in data:
    # Decode and save directly
    pdf_bytes = base64.b64decode(data['pdf_base64'])
    
    with open('tailored_resume.pdf', 'wb') as f:
        f.write(pdf_bytes)
    
    print(f"PDF saved: {len(pdf_bytes)} bytes")
    print("Open tailored_resume.pdf to view")
else:
    print("Error:", data)