import os
import webbrowser
import subprocess
import psutil
import datetime
import difflib
import time
import socket
import smtplib
import urllib.request
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import base64
import tempfile
import re

# Windows-only imports (not available on Render/Linux)
try:
    import pyautogui
    import pywhatkit as kit
    import screen_brightness_control as sbc
    WINDOWS_MODE = True
except Exception:
    WINDOWS_MODE = False

from flask import Flask, request, jsonify
from flask_cors import CORS
import groq
import json
from dotenv import load_dotenv
from tavily import TavilyClient

load_dotenv()

app = Flask(__name__)

# =====================================================
# 📇 CONTACTS
# =====================================================
# =====================================================
CONTACTS = {
    "raushan": {
        "whatsapp": "+916203607979",
        "email": "panditraushan84@gmail.com"
    },
    "shiv": {
        "whatsapp": "+918102006696",
        "email": "shivprajapati2060@gmail.com"
    },
    "amit": {
        "whatsapp": "+919112233445",
        "email": "amit@example.com"
    },
    "nishant": {
        "whatsapp": "+918765432109",
        "email": "nishantroy2005@gmail.com"
    },
    "priya": {
        "whatsapp": "+919998887776",
        "email": "priya@example.com"
    }
}
history_data = []
CORS(app, origins="*")

HISTORY_FILE = os.path.join(os.path.dirname(__file__), "history.json")

def load_history_file():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            pass
    return {}

def save_history_file(data):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# =========================
# 💾 SAVE HISTORY (persistent)
# =========================
@app.route("/save_history", methods=["POST"])
def save_history_route():
    try:
        body = request.json
        date_key = body.get("date")   # "YYYY-MM-DD"
        cmd = body.get("command", "").strip()
        if not date_key or not cmd:
            return jsonify({"status": "missing fields"}), 400
        data = load_history_file()
        data.setdefault(date_key, [])
        if cmd not in data[date_key]:          # avoid exact duplicates
            data[date_key].insert(0, cmd)
            data[date_key] = data[date_key][:100]  # cap 100 per day
        save_history_file(data)
        return jsonify({"status": "saved"})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

# =========================
# 📖 GET HISTORY (persistent)
# =========================
@app.route("/get_history", methods=["GET"])
def get_history_route():
    return jsonify(load_history_file())

# =========================
# 🗑️ DELETE HISTORY ITEM (persistent)
# =========================
@app.route("/delete_history_item", methods=["POST"])
def delete_history_item_route():
    try:
        body = request.json
        date_key = body.get("date")
        cmd = body.get("command", "").strip()
        if not date_key or not cmd:
            return jsonify({"status": "missing fields"}), 400
        data = load_history_file()
        if date_key in data:
            data[date_key] = [c for c in data[date_key] if c != cmd]
            if not data[date_key]:
                del data[date_key]
            save_history_file(data)
        return jsonify({"status": "deleted"})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


# =====================================================
# 🖥️ SYSTEM STATS ROUTE
# =====================================================
@app.route("/system_stats")
def system_stats():
    try:
        cpu = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory()
        processes = [p.info['name'] for p in psutil.process_iter(['name'])]
        return jsonify({
            "cpu": cpu,  # CPU usage %
            "memory": {
                "used": round(mem.used / 1e9, 2),   # GB
                "total": round(mem.total / 1e9, 2)   # GB
            },
            "processes": processes
        })
    except Exception as e:
        return jsonify({"cpu": 0, "memory": {"used": 0, "total": 0}, "processes": [], "error": str(e)})

# =====================================================
# 🎵 EXTRACT SONG
# =====================================================
def extract_song(text):
    text = text.lower()
    text = text.replace("play", "")
    text = text.replace("on youtube", "")
    text = text.replace("in youtube", "")
    return text.strip()

# =====================================================
# 🧠 SMART APP LAUNCHER
# =====================================================
def open_application(app_name):
    try:
        app_name = app_name.lower().strip()

        apps = {
            "spotify": "start spotify:",
            "chrome": "start chrome",
            "edge": "start msedge",
            "vscode": "code",
            "Bscode": "code",
            "vs code": "code",
            "code": "code",
            "notepad": "notepad",
            "calculator": "calc",
            "calc": "calc",
            "camera": "start microsoft.windows.camera:",
            "settings": "start ms-settings:",
            "file explorer": "explorer",
            "explorer": "explorer",
            "task manager": "taskmgr",
            "word": "start winword",
            "excel": "start excel",
            "powerpoint": "start powerpnt",
            "outlook": "start outlook",
            "onenote": "start onenote",
            "teams": "start msteams",
            "onedrive": "start onedrive",
            "microsoft store": "start ms-windows-store:",
            "photos": "start ms-photos",
            "paint": "mspaint",
            "snipping tool": "snippingtool",
            "vlc": "vlc",
            "itunes": "itunes",
            "whatsapp": "start whatsapp:",
            "telegram": "start telegram",
            "zoom": "start zoom:",
            "skype": "start skype:",
            "netflix": "start netflix:",
            "amazon music": "start amazonmusic:",
            "kindle": "start kindle:",
            "dropbox": "start dropbox:",
            "adobe acrobat": "start acrord32",
            "windows security": "start windowsdefender:",
            "your phone": "start yourphone:",
            "spotify": "start spotify:",
            "chrome": "start chrome",
            "microsoft edge": "start msedge",
            "edge": "start msedge",
            "firefox": "start firefox",
            "vscode": "code",
            "visual studio code": "code",
            "notepad": "notepad",
            "calculator": "calc",
            "camera": "start microsoft.windows.camera:",
            "settings": "start ms-settings:",
            "file explorer": "explorer",
            "explorer": "explorer",
            "task manager": "taskmgr",
            "word": "start winword",
            "excel": "start excel",
            "powerpoint": "start powerpnt",
            "outlook": "start outlook",
            "onenote": "start onenote",
            "teams": "start msteams",
            "onedrive": "start onedrive",
            "microsoft store": "start ms-windows-store:",
            "photos": "start ms-photos",
            "paint": "mspaint",
            "snipping tool": "snippingtool",
            "vlc": "vlc",
            "itunes": "itunes",
            "whatsapp": "start whatsapp:",
            "telegram": "start telegram",
            "zoom": "start zoom:",
            "skype": "start skype:",
            "netflix": "start netflix:",
            "amazon music": "start amazonmusic:",
            "kindle": "start kindle:",
            "dropbox": "start dropbox:",
            "adobe acrobat": "start acrord32",
            "windows security": "start windowsdefender:",
            "your phone": "start yourphone:",
            "control panel": "control",
            "command prompt": "start cmd",
            "powershell": "start powershell",
            "task scheduler": "start taskschd.msc",
            "regedit": "start regedit",
            "computer management": "start compmgmt.msc",
            
            }

        for key in apps:
            if key in app_name:
                subprocess.Popen(apps[key], shell=True)
                return f"Opening {key}"

        match = difflib.get_close_matches(app_name, apps.keys(), n=1, cutoff=0.6)
        if match:
            subprocess.Popen(apps[match[0]], shell=True)
            return f"Opening {match[0]}"

        return None
    except:
        return None

# =====================================================
# 🧹 CLOSE APPLICATION
# =====================================================
def close_application(app_name):
    app_name = app_name.lower().strip()
    processes = {
        "chrome": "chrome.exe",
        "edge": "msedge.exe",
        "firefox": "firefox.exe",
        "spotify": "Spotify.exe",
        "vscode": "Code.exe",
        "notepad": "notepad.exe",
        "calculator": "Calculator.exe",
        "camera": "WindowsCamera.exe",
        "task manager": "Taskmgr.exe",
        "word": "WINWORD.EXE",
        "excel": "EXCEL.EXE",
        "powerpoint": "POWERPNT.EXE",
        "outlook": "OUTLOOK.EXE",
        "onenote": "ONENOTE.EXE",
        "teams": "Teams.exe",
        "onedrive": "OneDrive.exe",
        "photos": "Microsoft.Photos.exe",
        "paint": "mspaint.exe",
        "snipping tool": "SnippingTool.exe",
        "vlc": "vlc.exe",
        "itunes": "iTunes.exe",
        "whatsapp": "WhatsApp.exe",
        "telegram": "Telegram.exe",
        "zoom": "Zoom.exe",
        "skype": "Skype.exe",
        "netflix": "Netflix.exe",
        "amazon music": "AmazonMusic.exe",
        "kindle": "Kindle.exe",
        "dropbox": "Dropbox.exe",
        "adobe acrobat": "AcroRd32.exe",
        "windows security": "WindowsDefender.exe",
        "your phone": "YourPhone.exe"
         "start spotify:",
        "chrome": "start chrome",
        "microsoft edge": "start msedge",
        "edge": "start msedge",
        "firefox": "start firefox",
        "vscode": "code",
        "visual studio code": "code",
        "notepad": "notepad",
        "calculator": "calc",
        "camera": "start microsoft.windows.camera:",
        "settings": "start ms-settings:",
        "file explorer": "explorer",
        "explorer": "explorer",
        "task manager": "taskmgr",
        "word": "start winword",
        "excel": "start excel",
        "powerpoint": "start powerpnt",
        "outlook": "start outlook",
        "onenote": "start onenote",
        "teams": "start msteams",
        "onedrive": "start onedrive",
        "microsoft store": "start ms-windows-store:",
        "photos": "start ms-photos",
        "paint": "mspaint",
        "snipping tool": "snippingtool",
        "vlc": "vlc",
        "itunes": "itunes",
        "whatsapp": "start whatsapp:",
        "telegram": "start telegram",
        "zoom": "start zoom:",
        "skype": "start skype:",
        "netflix": "start netflix:",
        "amazon music": "start amazonmusic:",
        "kindle": "start kindle:",
        "dropbox": "start dropbox:",
        "adobe acrobat": "start acrord32",
        "windows security": "start windowsdefender:",
        "your phone": "start yourphone:",
        "control panel": "control",
        "command prompt": "start cmd",
        "powershell": "start powershell",
        "task scheduler": "start taskschd.msc",
        "regedit": "start regedit",
        "computer management": "start compmgmt.msc",
        "chrome": "chrome.exe",
        "edge": "msedge.exe",
        "firefox": "firefox.exe",
        "spotify": "Spotify.exe",
        "vscode": "Code.exe",
        "notepad": "notepad.exe",
        "calculator": "Calculator.exe",
        "camera": "WindowsCamera.exe",
        "task manager": "Taskmgr.exe",
        "word": "WINWORD.EXE",
        "excel": "EXCEL.EXE",
        "powerpoint": "POWERPNT.EXE",
        "outlook": "OUTLOOK.EXE",
        "onenote": "ONENOTE.EXE",
        "teams": "Teams.exe",
        "onedrive": "OneDrive.exe",
        "photos": "Microsoft.Photos.exe",
        "paint": "mspaint.exe",
        "snipping tool": "SnippingTool.exe",
        "vlc": "vlc.exe",
        "itunes": "iTunes.exe",
        "whatsapp": "WhatsApp.exe",
        "telegram": "Telegram.exe",
        "zoom": "Zoom.exe",
        "skype": "Skype.exe",
    
        "amazon music": "AmazonMusic.exe",
        "kindle": "Kindle.exe",
        "dropbox": "Dropbox.exe",
        "adobe acrobat": "AcroRd32.exe",
        "windows security": "WindowsDefender.exe",
        "your phone": "YourPhone.exe",
        "powershell": "powershell.exe",
        "command prompt": "cmd.exe",
        "explorer": "explorer.exe",
        }

    match = difflib.get_close_matches(app_name, processes.keys(), n=1, cutoff=0.6)
    if match:
        process_name = processes[match[0]]
        subprocess.run(f'taskkill /f /im {process_name}', shell=True)
        return f"Closed {match[0]}"
    return f"No running app found for '{app_name}'"

# =====================================================
# 🌐 WEBSITE FALLBACK
# =====================================================
import re

def open_website(app_name):
    try:
        app_name = app_name.lower().replace("open", "").strip()

        if app_name.startswith("http://") or app_name.startswith("https://"):
            return app_name, f"Opening {app_name}"

        if re.match(r"^[\w\-]+\.[a-z]{2,}(\.[a-z]{2,})?$", app_name):
            url = f"https://{app_name}"
            return url, f"Opening {url}"

        sites = {
            "youtube": "https://www.youtube.com",
            "google": "https://www.google.com",
            "github": "https://github.com",
            "zomato": "https://www.zomato.com",
            "amazon": "https://www.amazon.in",
            "flipkart": "https://www.flipkart.com",
            "instagram": "https://www.instagram.com",
            "facebook": "https://www.facebook.com",
            "twitter": "https://twitter.com",
            "linkedin": "https://www.linkedin.com",
            "netflix": "https://www.netflix.com",
            "hotstar": "https://www.hotstar.com",
            "prime video": "https://www.primevideo.com",
            "spotify": "https://open.spotify.com",
            "whatsapp web": "https://web.whatsapp.com",
            "telegram": "https://web.telegram.org",
            "chatgpt": "https://chat.openai.com",
            "reddit": "https://www.reddit.com",
            "wikipedia": "https://www.wikipedia.org",
            "stack overflow": "https://stackoverflow.com",
            "gmail": "https://mail.google.com",
            "google drive": "https://drive.google.com",
            "google maps": "https://maps.google.com",
            "google docs": "https://docs.google.com",
            "canva": "https://www.canva.com",
            "figma": "https://www.figma.com",
            "notion": "https://www.notion.so",
            "leetcode": "https://leetcode.com",
            "geeksforgeeks": "https://www.geeksforgeeks.org",
            "swiggy": "https://www.swiggy.com",
            "irctc": "https://www.irctc.co.in",
            "seeding minds": "https://seedingminds.co.in",
            "orcode": "https://orcode.co.in",
        }

        if app_name in sites:
            return sites[app_name], f"Opening {app_name}"

        url = f"https://www.{app_name}.com"
        return url, f"Opening {app_name}"

    except Exception as e:
        return None, f"Could not open website: {str(e)}"
# =====================================================
# 🔊 VOLUME CONTROL
# =====================================================
def volume_up():
    if not WINDOWS_MODE: return "Volume control not available on server"
    for _ in range(5):
        pyautogui.press("volumeup")
    return "Volume increased"

def volume_down():
    if not WINDOWS_MODE: return "Volume control not available on server"
    for _ in range(5):
        pyautogui.press("volumedown")
    return "Volume decreased"

def mute():
    if not WINDOWS_MODE: return "Mute not available on server"
    pyautogui.press("volumemute")
    return "Muted"

# =====================================================
# 🔆 BRIGHTNESS CONTROL
# =====================================================
def set_brightness(command):
    if not WINDOWS_MODE: return "Brightness control not available on server"
    try:
        command = command.lower()

        # Get current brightness
        current = sbc.get_brightness(display=0)
        if isinstance(current, list):
            current = current[0]

        # Increase brightness
        if "increase brightness" in command:
            new_brightness = min(current + 20, 100)
            sbc.set_brightness(new_brightness)
            return f"Brightness increased to {new_brightness}%"

        # Decrease brightness
        elif "decrease brightness" in command:
            new_brightness = max(current - 20, 10)
            sbc.set_brightness(new_brightness)
            return f"Brightness decreased to {new_brightness}%"

        # Set brightness to specific number
        match = re.search(r'\d+', command)
        if match:
            value = int(match.group())
            value = max(10, min(value, 100))
            sbc.set_brightness(value)
            return f"Brightness set to {value}%"

        # Default brightness
        else:
            sbc.set_brightness(70)
            return "Brightness set to 70%"

    except Exception as e:
        return f"Brightness control error: {e}"



# =====================================================
# 🔐 SYSTEM CONTROLS
# =====================================================
def lock_system():
    subprocess.Popen("rundll32.exe user32.dll,LockWorkStation", shell=True)
    return "System locked"

def shutdown():
    subprocess.Popen("shutdown /s /t 5", shell=True)
    return "Shutting down system"

def restart():
    subprocess.Popen("shutdown /r /t 5", shell=True)
    return "Restarting system"

# =====================================================
# ⚙️ SETTINGS SHORTCUTS
# =====================================================
def open_settings(text):
    text = text.lower()

    settings_map = {
        "display": "ms-settings:display",
        "screen": "ms-settings:display",
        "brightness": "ms-settings:display",

        "sound": "ms-settings:sound",
        "audio": "ms-settings:sound",

        "bluetooth": "ms-settings:bluetooth",
        "devices": "ms-settings:devices",

        "network": "ms-settings:network",
        "internet": "ms-settings:network",

        "wifi": "ms-settings:network-wifi",
        "wi-fi": "ms-settings:network-wifi",

        "ethernet": "ms-settings:network-ethernet",

        "power": "ms-settings:powersleep",
        "sleep": "ms-settings:powersleep",

        "lock screen": "ms-settings:lockscreen",

        "mouse": "ms-settings:mouse",
        "keyboard": "ms-settings:keyboard",
        "touchpad": "ms-settings:devices-touchpad",

        "printer": "ms-settings:printers",
        "scanner": "ms-settings:printers",

        "camera": "ms-settings:camera",

        "account": "ms-settings:yourinfo",
        "user account": "ms-settings:yourinfo",

        "sign in": "ms-settings:signinoptions",
        "login": "ms-settings:signinoptions",

        "family": "ms-settings:family-group",
        "other users": "ms-settings:otherusers",

        "sync": "ms-settings:sync",

        "update": "ms-settings:windowsupdate",
        "windows update": "ms-settings:windowsupdate",

        "security": "windowsdefender:",

        "backup": "ms-settings:backup",
        "recovery": "ms-settings:recovery",
        "activation": "ms-settings:activation",

        "apps": "ms-settings:appsfeatures",
        "installed apps": "ms-settings:appsfeatures",
        "default apps": "ms-settings:defaultapps",

        "optional features": "ms-settings:optionalfeatures",

        "themes": "ms-settings:themes",
        "theme": "ms-settings:themes",

        "background": "ms-settings:personalization-background",
        "wallpaper": "ms-settings:personalization-background",

        "colors": "ms-settings:colors",

        "settings": "ms-settings:"
    }

    try:
        for key in settings_map:
            if key in text:
                os.startfile(settings_map[key])
                return f"Opening {key} settings"

        os.startfile("ms-settings:")
        return "Opening settings"

    except Exception as e:
        return f"Error opening settings: {e}"




# =====================================================
# 📶 WIFI
# =====================================================
def wifi_control(turn_on=True):
    state = "enable" if turn_on else "disable"
    subprocess.run(f'netsh interface set interface "Wi-Fi" {state}', shell=True)
    return f"WiFi {state}d"

# =====================================================
# 🖥️ WINDOW CONTROL
# =====================================================
def minimize_all():
    if not WINDOWS_MODE: return "Window control not available on server"
    pyautogui.hotkey("win", "d")
    return "Minimized all windows"

def maximize_all():
    if not WINDOWS_MODE: return "Window control not available on server"
    pyautogui.hotkey("win", "shift", "m")
    return "Restored all windows"

# =====================================================
# 🎬 YOUTUBE
# =====================================================
def play_youtube(text):
    song = extract_song(text)
    if not song:
        return "What should I play?"
    if not WINDOWS_MODE:
        return f"Open YouTube and search: {song}"
    try:
        kit.playonyt(song)
        time.sleep(5)
        pyautogui.press("space")
        return f"Playing {song} on YouTube"
    except Exception as e:
        url = f"https://www.youtube.com/results?search_query={song}"
        webbrowser.open(url)
        return f"Showing results for {song}"
# =====================================================
# 🧠 COMMAND DETECTION
# =====================================================
def understand_command(text):
    text = text.lower().strip()
    if "play" in text:
        return "play"
    if "close" in text:
        return "close"
    if "volume up" in text:
        return "vol_up"
    if "volume down" in text:
        return "vol_down"
    if "mute" in text:
        return "mute"
    if "shutdown" in text:
        return "shutdown"
    if "restart" in text:
        return "restart"
    if "lock" in text:
        return "lock"
    if "wifi on" in text:
        return "wifi_on"
    if "wifi off" in text:
        return "wifi_off"
    if "brightness" in text:
        return "brightness"
    if "settings" in text:
        return "settings"
    if "time" in text:
        return "time"
    if "date" in text:
        return "date"
    if "usage" in text:
        return "usage"
    if "minimize" in text:
        return "minimize"
    if "maximize" in text:
        return "maximize"
    if "show history" in text or "get history" in text:
        return "show_history"

    if "delete history" in text:
        return "delete_history"

    if "clear history" in text:
        return "clear_history"
    if "send" in text and any(name in text for name in CONTACTS):
        return "send_message"
    return "open"

# =====================================================
# 🚀 MAIN ROUTE
# =====================================================
@app.route("/command", methods=["POST"])
def command():
    try:
        text = request.json.get("command", "")

        # ✅ SAVE HISTORY
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d")
        history_data.append({
            "command": text,
            "date": timestamp
        })

        # Check if system command first
        action = understand_command(text)
        if action != "open" or any(word in text.lower() for word in ['app', 'open', 'close', 'play', 'volume', 'brightness', 'settings', 'time', 'shutdown', 'lock', 'wifi']):
            # Existing system command logic...
            if action == "play":
                return jsonify({"status": play_youtube(text)})

            elif action == "close":
                app_name = text.replace("close", "").strip()
                return jsonify({"status": close_application(app_name)})

            elif action == "open":
                app_name = text.replace("open", "").strip()
                result = open_application(app_name)
                if result:
                    return jsonify({"status": result})
                else:
                    url, msg = open_website(app_name)
                    return jsonify({"status": msg, "url": url})

            elif action == "vol_up":
                return jsonify({"status": volume_up()})

            elif action == "vol_down":
                return jsonify({"status": volume_down()})

            elif action == "mute":
                return jsonify({"status": mute()})

            elif action == "shutdown":
                return jsonify({"status": shutdown()})

            elif action == "restart":
                return jsonify({"status": restart()})

            elif action == "lock":
                return jsonify({"status": lock_system()})

            elif action == "wifi_on":
                return jsonify({"status": wifi_control(True)})

            elif action == "wifi_off":
                return jsonify({"status": wifi_control(False)})

            elif action == "brightness":
                return jsonify({"status": set_brightness(text)})

            elif action == "settings":
                return jsonify({"status": open_settings(text)})

            elif action == "usage":
                cpu = psutil.cpu_percent()
                ram = psutil.virtual_memory().percent
                return jsonify({"status": f"CPU {cpu}% | RAM {ram}%"})

            elif action == "time":
                now_time = datetime.datetime.now().strftime("%I:%M %p")
                today_date = datetime.datetime.now().strftime("%A, %d %B %Y")
                return jsonify({"status": f"Time: {now_time} | Date: {today_date}"})

            elif action == "date":
                today = datetime.datetime.now().strftime("%A, %d %B %Y")
                return jsonify({"status": f"Today's date is {today}"})

            elif action == "minimize":
                return jsonify({"status": minimize_all()})

            elif action == "maximize":
                return jsonify({"status": maximize_all()})

            elif action == "show_history":
                webbrowser.open("http://127.0.0.1:5000/history")
                return jsonify({"status": "Opening history page"})
            elif "introduce" in text.lower() or "who are you" in text.lower():
                return jsonify({"status": "I am Omni - your AI voice assistant! I can open apps, play music, control system, and more. Ask me anything!"})

            elif action == "send_message":
                return jsonify({"status": handle_send_message(text)})

        # AI Chatbot fallback for general questions
        return jsonify({"status": get_ai_response(text)})

    except Exception as e:
        return jsonify({"status": str(e)})


# =====================================================
# 📨 SEND MESSAGE (WhatsApp / Email)
# =====================================================
def handle_send_message(text):
    text_lower = text.lower()

    # Detect contact name
    contact_name = None
    for name in CONTACTS:
        if name in text_lower:
            contact_name = name
            break

    if not contact_name:
        return "Contact not found. Please add the contact first."

    contact = CONTACTS[contact_name]

    import re
    # Extract message between "send" and "to <name>" → "send <MSG> to raushan ..."
    m = re.search(r"\bsend\b\s+(.+?)\s+\bto\b\s+" + contact_name, text_lower)
    if not m:
        # fallback: "send to raushan <MSG>" or "say <MSG> to raushan"
        m = re.search(r"(?:send|say)\s+(?:to\s+" + contact_name + r")\s+(.*)", text_lower)
    if not m:
        # last fallback: everything after contact name, strip platform words
        after = re.split(contact_name, text_lower, maxsplit=1)[-1]
        after = re.sub(r"\b(in|on|via|by|through|using|with)\s+(email|mail|whatsapp|message)\b", "", after)
        after = re.sub(r"\b(email|mail|whatsapp|message|send|say|to)\b", "", after)
        msg_body = " ".join(after.split()).strip()
    else:
        msg_body = m.group(1).strip()

    if not msg_body:
        msg_body = "Hi"

    # Decide platform
    if "email" in text_lower or "mail" in text_lower:
        return send_email_to_contact(contact_name, contact["email"], msg_body)
    else:
        return send_whatsapp_to_contact(contact_name, contact["whatsapp"], msg_body)


def send_whatsapp_to_contact(name, phone, message):
    try:
        now = datetime.datetime.now()
        # pywhatkit needs at least 1-2 min ahead
        send_hour = now.hour
        send_min = now.minute + 2
        if send_min >= 60:
            send_min -= 60
            send_hour += 1
        kit.sendwhatmsg(phone, message, send_hour, send_min, wait_time=15, tab_close=True)
        return f"WhatsApp message sent to {name}: '{message}'"
    except Exception as e:
        return f"WhatsApp send failed: {str(e)}"


def send_email_to_contact(name, to_email, message):
    try:
        sender = "shivprajapati2060@gmail.com"
        app_password = os.getenv("GMAIL_APP_PASSWORD", "").strip()
        if not app_password:
            return "Email failed: GMAIL_APP_PASSWORD not set in .env"

        msg = MIMEMultipart()
        msg["Subject"] = f"Message from OMNI Assistant"
        msg["From"] = sender
        msg["To"] = to_email
        msg.attach(MIMEText(message, "plain", "utf-8"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as server:
            server.login(sender, app_password)
            server.sendmail(sender, to_email, msg.as_string())

        return f"Email sent to {name} ({to_email}): '{message}'"
    except Exception as e:
        return f"Email send failed: {str(e)}"


# =====================================================
# 🤖 AI CHATBOT (Groq + Tavily Realtime)
# =====================================================
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

chat_history = []

REALTIME_KEYWORDS = [
    "current", "now", "today", "latest", "recent", "live", "right now",
    "weather", "temperature", "forecast", "rain", "humidity",
    "news", "headline", "breaking",
    "who is", "who's", "cm of", "chief minister", "prime minister", "pm of",
    "president of", "governor of", "minister", "election", "result",
    "score", "match", "ipl", "cricket", "football", "stock", "price",
    "rate", "dollar", "rupee", "bitcoin", "crypto"
]

def needs_realtime(query):
    q = query.lower()
    return any(kw in q for kw in REALTIME_KEYWORDS)

def get_realtime_context(query):
    if not TAVILY_API_KEY:
        return ""
    try:
        client = TavilyClient(api_key=TAVILY_API_KEY)
        result = client.search(query=query, search_depth="basic", max_results=3)
        snippets = [r.get("content", "") for r in result.get("results", [])]
        context = "\n".join(snippets[:3])
        print(f"[Tavily] Got context for: {query[:50]}")
        return context
    except Exception as e:
        print(f"[Tavily Error] {e}")
        return ""

def get_ai_response(query):
    global chat_history
    try:
        client = groq.Groq(api_key=GROQ_API_KEY)

        today = datetime.datetime.now().strftime("%A, %d %B %Y, %I:%M %p")

        # Fetch real-time context if query needs live data
        realtime_context = ""
        if needs_realtime(query):
            realtime_context = get_realtime_context(query)

        system_prompt = (
            f"You are OMNI, an intelligent AI voice assistant. Today's date and time is {today}. "
            "Answer every question accurately and completely. "
            "Keep answers concise but complete — 1 to 4 sentences. "
            "Never say you cannot answer. Just answer directly."
        )

        # Inject live web data into user message if available
        user_message = query
        if realtime_context:
            user_message = (
                f"{query}\n\n"
                f"[LIVE WEB DATA - use this to answer accurately]:\n{realtime_context}"
            )

        # Keep last 6 turns of memory (12 messages)
        chat_history.append({"role": "user", "content": user_message})
        if len(chat_history) > 12:
            chat_history = chat_history[-12:]

        messages = [{"role": "system", "content": system_prompt}] + chat_history

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.4,
            max_tokens=300,
        )

        answer = response.choices[0].message.content.strip()
        # Store only the original query (not the injected context) in history
        chat_history[-1] = {"role": "user", "content": query}
        chat_history.append({"role": "assistant", "content": answer})
        return answer

    except Exception as e:
        return f"AI error: {str(e)}"

@app.route("/chat", methods=["POST"])
def chat():
    try:
        query = request.json.get("message", "")
        response = get_ai_response(query)
        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    


# =========================
# 📅 GET HISTORY
# =========================
@app.route("/history", methods=["GET"])
def get_history():
    return jsonify(history_data)


# =========================
# ❌ DELETE ONE
# =========================
@app.route("/delete_history", methods=["POST"])
def delete_history():
    try:
        index = request.json.get("index")

        if index is None:
            return jsonify({"status": "Index required"})

        index = int(index)

        if 0 <= index < len(history_data):
            removed = history_data.pop(index)
            return jsonify({
                "status": "Deleted",
                "deleted_item": removed
            })

        return jsonify({"status": "Invalid index"})

    except Exception as e:
        return jsonify({"status": "Error deleting history", "error": str(e)})


# =========================
# 🧹 CLEAR ALL
# =========================
@app.route("/clear_history", methods=["POST"])
def clear_history():
    history_data.clear()
    chat_history.clear()
    return jsonify({"status": "All history cleared"})


# =====================================================
# ▶️ RUN
# =====================================================
# =====================================================
# 📧 LOGIN NOTIFICATION EMAIL
# =====================================================
def get_live_location():
    try:
        with urllib.request.urlopen("http://ip-api.com/json/?fields=status,query,city,regionName,country,lat,lon,isp", timeout=5) as res:
            data = json.loads(res.read().decode())
        if data.get("status") == "success":
            return data
    except Exception:
        pass
    return {}


def reverse_geocode(lat, lon):
    """Get street-level address from GPS coordinates using OpenStreetMap."""
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
        req = urllib.request.Request(url, headers={"User-Agent": "OMNI-Assistant/1.0"})
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode())
        return data.get("display_name", "")
    except Exception:
        return ""


@app.route("/login_notify", methods=["POST"])
def login_notify():
    try:
        desktop_name = socket.gethostname()
        ip_address   = socket.gethostbyname(desktop_name)
        now          = datetime.datetime.now().strftime("%A, %d %B %Y at %I:%M:%S %p")
        loc          = get_live_location()

        sender       = "shivprajapati2060@gmail.com"
        recipient    = "shivprajapati2060@gmail.com"
        app_password = os.getenv("GMAIL_APP_PASSWORD", "").strip()

        if not app_password:
            return jsonify({"status": "Email failed", "error": "GMAIL_APP_PASSWORD not set in .env"}), 500

        public_ip  = loc.get("query", ip_address)
        city       = loc.get("city", "Unknown")
        region     = loc.get("regionName", "Unknown")
        country    = loc.get("country", "Unknown")
        isp        = loc.get("isp", "Unknown")

        # GPS coordinates from browser (high accuracy ~200m)
        gps        = (request.json or {}).get("location", {})
        gps_lat    = gps.get("latitude", "")
        gps_lon    = gps.get("longitude", "")
        gps_acc    = gps.get("accuracy", "")
        gps_error  = gps.get("error", "")

        if gps_lat and gps_lon:
            lat, lon   = gps_lat, gps_lon
            coord_src  = f"GPS (±{round(float(gps_acc))}m)" if gps_acc else "GPS"
        else:
            lat, lon   = loc.get("lat", ""), loc.get("lon", "")
            coord_src  = "IP-based (approximate)"

        maps_link  = f"https://maps.google.com/?q={lat},{lon}" if lat and lon else "N/A"

        body = (
            "OMNI AI Assistant - Login Alert\n\n"
            "Someone just logged into OMNI AI Assistant.\n\n"
            f"  Desktop Name : {desktop_name}\n"
            f"  Local IP     : {ip_address}\n"
            f"  Public IP    : {public_ip}\n"
            f"  Date & Time  : {now}\n\n"
            "📍 Live Location:\n"
            f"  City         : {city}\n"
            f"  Region       : {region}\n"
            f"  Country      : {country}\n"
            f"  ISP          : {isp}\n"
            f"  Coordinates  : {lat}, {lon}\n"
            f"  Accuracy     : {coord_src}\n"
            f"  Google Maps  : {maps_link}\n"
            + (f"  GPS Error    : {gps_error}\n" if gps_error else "") +
            "\nIf this was not you, please secure your account."
        )

        msg = MIMEMultipart()
        msg["Subject"] = "OMNI Login Alert - " + now
        msg["From"]    = sender
        msg["To"]      = recipient
        msg.attach(MIMEText(body, "plain", "utf-8"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as server:
            server.login(sender, app_password)
            server.sendmail(sender, recipient, msg.as_string())

        print(f"[LOGIN NOTIFY] Email sent to {recipient} at {now}")
        return jsonify({"status": "Email sent"})
    except smtplib.SMTPAuthenticationError:
        return jsonify({"status": "Email failed", "error": "Gmail authentication failed. Check App Password in .env"}), 500
    except Exception as e:
        print(f"[LOGIN NOTIFY ERROR] {e}")
        return jsonify({"status": "Email failed", "error": str(e)}), 500


# =====================================================
# 📁 FILE UPLOAD & ANALYZE
# =====================================================
@app.route("/upload_analyze", methods=["POST"])
def upload_analyze():
    try:
        file = request.files.get("file")
        question = request.form.get("question", "Analyze this file and give a detailed summary.")

        if not file:
            return jsonify({"error": "No file provided"}), 400

        filename = file.filename.lower()
        client = groq.Groq(api_key=GROQ_API_KEY)
        extracted_text = ""
        is_image = False
        image_b64 = None
        image_mime = None

        # --- PDF ---
        if filename.endswith(".pdf"):
            try:
                import fitz  # PyMuPDF
                data = file.read()
                doc = fitz.open(stream=data, filetype="pdf")
                for page in doc:
                    extracted_text += page.get_text()
                doc.close()
            except ImportError:
                return jsonify({"error": "Install PyMuPDF: pip install pymupdf"}), 500

        # --- DOCX ---
        elif filename.endswith(".docx"):
            try:
                from docx import Document
                import io
                doc = Document(io.BytesIO(file.read()))
                extracted_text = "\n".join(p.text for p in doc.paragraphs)
            except ImportError:
                return jsonify({"error": "Install python-docx: pip install python-docx"}), 500

        # --- IMAGE ---
        elif filename.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp")):
            is_image = True
            ext_map = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                       ".gif": "image/gif", ".webp": "image/webp"}
            ext = "." + filename.rsplit(".", 1)[-1]
            image_mime = ext_map.get(ext, "image/jpeg")
            image_b64 = base64.b64encode(file.read()).decode("utf-8")

        # --- TEXT / CODE / CSV / JSON / etc. ---
        else:
            try:
                extracted_text = file.read().decode("utf-8", errors="ignore")
            except Exception:
                return jsonify({"error": "Cannot read this file type"}), 400

        # --- Send to Groq ---
        if is_image:
            response = client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": question},
                        {"type": "image_url", "image_url": {"url": f"data:{image_mime};base64,{image_b64}"}}
                    ]
                }],
                max_tokens=1024,
            )
        else:
            if not extracted_text.strip():
                return jsonify({"error": "Could not extract text from file"}), 400
            # Truncate to avoid token limits
            content = extracted_text[:12000]
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are OMNI, an AI assistant. Analyze the provided file content and answer the user's question accurately."},
                    {"role": "user", "content": f"{question}\n\n--- FILE CONTENT ---\n{content}"}
                ],
                max_tokens=1024,
                temperature=0.4,
            )

        answer = response.choices[0].message.content.strip()
        return jsonify({"answer": answer, "filename": file.filename})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)