import os
import json
import requests
from datetime import datetime

# 1. Define where the data lives
DATA_FILE = 'temperature_history.json'

# Your exact working Nest API endpoint
URL = "https://home.nest.com/api/0.1/user/13452177/app_launch"

def load_history():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {"history": []}

def save_history(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def dig_for_temperatures(data):
    """Recursively hunt through the entire JSON for indoor sensors."""
    found_devices = []
    
    if isinstance(data, dict):
        if 'current_temperature' in data:
            # Nest uses 'description' for sensor pucks, but might use 'name' as a fallback
            sensor_name = data.get('description') or data.get('name') or 'Unknown Sensor'
            found_devices.append({
                'name': sensor_name,
                'temp_c': data.get('current_temperature')
            })
        for key, value in data.items():
            found_devices.extend(dig_for_temperatures(value))
            
    elif isinstance(data, list):
        for item in data:
            found_devices.extend(dig_for_temperatures(item))
            
    return found_devices

def dig_for_weather(data):
    """Recursively hunt for the outdoor weather block."""
    if isinstance(data, dict):
        # The weather block has a 'current' dict with 'temp_c' and 'icon'
        if 'current' in data and 'temp_c' in data['current'] and 'icon' in data['current']:
            return data['current']['temp_c']
            
        for key, value in data.items():
            result = dig_for_weather(value)
            if result is not None:
                return result
                
    elif isinstance(data, list):
        for item in data:
            result = dig_for_weather(item)
            if result is not None:
                return result
                
    return None

def fetch_nest_data():
    """
    Fetches the current temperatures using the POST endpoint.
    Pulls credentials securely from GitHub Secrets.
    """
    cookie = os.environ.get('NEST_COOKIE')
    api_key = os.environ.get('NEST_API_KEY')

    if not cookie or not api_key:
        print("Missing Nest credentials in environment variables. Exiting.")
        return None

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cookie": cookie,
        "Authorization": api_key,
        "Content-Type": "application/json; charset=UTF-8",
        "x-nl-protocol-version": "1",
        "x-nl-webapp-version": "SNAPSHOT",
        "x-requested-with": "XMLHttpRequest"
    }

    # The exact bucket payload your account requires
    payload = {
        "known_bucket_types": [
            "buckets","delayed_topaz","demand_response","device","device_alert_dialog",
            "geofence_info","kryptonite","link","message","message_center","metadata",
            "occupancy","quartz","safety","rcs_settings","safety_summary","schedule",
            "shared","structure","structure_metadata","topaz","topaz_resource","track",
            "trip","tuneups","user","user_settings","where","widget_track"
        ],
        "known_bucket_versions": []
    }

    print("Sending POST request to Nest API...")
    try:
        response = requests.post(URL, headers=headers, json=payload)
        
        if response.status_code != 200:
            print(f"Failed to connect. Status Code: {response.status_code}")
            return None

        data = response.json()
        
        # 1. Grab indoor devices
        devices = dig_for_temperatures(data)
        
        # 2. Grab outdoor weather
        weather_temp_c_str = dig_for_weather(data)
        
        if not devices and weather_temp_c_str is None:
            print("Connected, but couldn't find any temperature data.")
            return None

        readings = {}
        
        # Format Indoor Sensors
        for dev in devices:
            name = dev['name']
            # Skip if we already recorded this sensor to avoid duplicates
            if name in readings:
                continue
            
            temp_c = dev['temp_c']
            if isinstance(temp_c, (int, float)):
                temp_f = (temp_c * 1.8) + 32
                readings[name] = round(temp_f, 1)

        # Format Outdoor Weather
        if weather_temp_c_str is not None:
            try:
                # Nest returns weather temp as a string (e.g., "18.3")
                w_temp_c = float(weather_temp_c_str)
                w_temp_f = (w_temp_c * 1.8) + 32
                readings["Outdoor Weather"] = round(w_temp_f, 1)
            except (ValueError, TypeError):
                print(f"Failed to parse weather temperature: {weather_temp_c_str}")

        return readings
        
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

def main():
    history_data = load_history()
    current_temps = fetch_nest_data()
    
    if current_temps:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = {
            "timestamp": timestamp,
            "readings": current_temps
        }
        
        history_data["history"].append(entry)
        save_history(history_data)
        print(f"✅ Successfully logged temperatures for {timestamp}: {current_temps}")

if __name__ == "__main__":
    main()
