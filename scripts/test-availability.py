import urllib.request, json

# Login
login_data = json.dumps({"email": "juan@ppam.org", "password": "123456"}).encode()
req = urllib.request.Request("http://127.0.0.1:3000/api/auth/login", data=login_data, headers={"Content-Type": "application/json"})
resp = json.loads(urllib.request.urlopen(req).read())
token = resp.get("token", "")

# Get availability
req2 = urllib.request.Request("http://127.0.0.1:3000/api/reports/availability", headers={"Authorization": f"Bearer {token}"})
data = json.loads(urllib.request.urlopen(req2).read())
print(f"Total: {data['total']}")
for r in data['data'][:5]:
    print(f"{r['publisherName']} | {r['dayName']} | {r['timeSlotRange']} | {r['locationName']}")
