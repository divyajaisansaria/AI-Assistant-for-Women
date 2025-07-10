import requests

def get_shiprocket_token():
    url = "https://apiv2.shiprocket.in/v1/external/auth/login"
    payload = {
        "email": "jaisansariadivya@gmail.com",
        "password": "#TLCkWP2zjOW@d1G"
    }

    response = requests.post(url, json=payload)
    if response.status_code == 200:
        token = response.json().get("token")
        print("Token:", token)
        return token
    else:
        print("Failed to get token:", response.json())
        return None

get_shiprocket_token()