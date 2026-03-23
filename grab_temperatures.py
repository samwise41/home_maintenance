import os
import json
import requests
from datetime import datetime

# 1. Define where the data lives
# We'll use a JSON file to match your existing data.json and lights.json structure
DATA_FILE = 'temperature_history.json'

def load_history():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {"history": []}

def save_history(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def fetch_nest_data():
    """
    Fetches the current temperature from the unofficial Nest Web API.
    Requires NEST_COOKIE and NEST_API_KEY environment variables.
    """
    cookie = os.environ.get('NEST_COOKIE')
    api_key = os.environ.get('NEST_API_KEY')

    if not cookie or not api_key:
        print("Missing Nest credentials. Exiting.")
        return None

    # --- THIS IS THE PART WE WILL FILL IN AFTER EXTRACTING YOUR BROWSER DATA ---
    # The URL usually looks something like: https://home.nest.com/api/0.1/user/...
    url = "YOUR_EXTRACTED_NEST_API_ENDPOINT"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Cookie": cookie,
        "Authorization": f"Basic {api_key}"
    }

    try:
        # Example request (will fail until real URL is provided)
        # response = requests.get(url, headers=headers)
        # response.raise_for_status()
        # raw_data = response.json()
        
        # --- MOCK DATA FOR DEMONSTRATION ---
        # Once the API is hooked up, we will parse the real JSON response to map your 
        # main thermostat and the 3 specific sensor IDs.
        print("Fetching data from Nest...")
        return {
            "Main Thermostat": 72.5,
            "Master Bedroom (Sensor 1)": 70.1,
            "Office (Sensor 2)": 73.0,
            "Basement (Sensor 3)": 68.5
        }
        
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

def main():
    # Load existing temperatures
    history_data = load_history()
    
    # Grab the latest temperatures
    current_temps = fetch_nest_data()
    
    if current_temps:
        # Create a timestamped entry
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = {
            "timestamp": timestamp,
            "readings": current_temps
        }
        
        # Append to history and save
        history_data["history"].append(entry)
        save_history(history_data)
        print(f"Successfully logged temperatures for {timestamp}")

if __name__ == "__main__":
    main()
