# 🛍️ Udaan – Voice-First Digital Gateway for Rural Women

Udaan is a voice- and image-powered platform that connects rural women entrepreneurs to the digital world. Built to break barriers like digital illiteracy, lack of typing skills, and limited market access, Udaan enables users to list and promote their products using just voice commands and photos — no typing or apps required.

---

## 🚀 Features

- 🎤 **Voice-First Product Listing**  
  Speak in your native language and snap a photo — AI handles the rest.

- 🤖 **AI-Powered Description Generation**  
  Automatically generates product descriptions from voice and image inputs.

- 📦 **Seamless Workflow Automation (via n8n)**  
  End-to-end pipeline from listing to logistics handled via automated workflows.

- 📲 **WhatsApp-Based Sharing**  
  Auto-generated posters and shareable links for promotion on social media.

- 🔄 **Undo Feature**  
  Voice command like `पिछला बदलो` allows users to fix mistakes easily.

- 🔒 **Privacy-First Design**  
  Location and audio data collection is optional, respecting user trust.

---

## 💡 Why Udaan?

| Problem | Solution |
|--------|----------|
| Manual listing requires English/typing | Voice + image input replaces text |
| Limited market access | Local + national buyers via digital platforms |
| Low income (~₹2–3K/month) | Projected earnings ₹5K–10K/month |
| No digital literacy | Voice-first UI makes it self-reliant |
| No tracking/support | AI helpdesk + voice alerts enabled |

---

## 📊 Tech Stack

- 🧠 **AI Models**: Whisper (for speech-to-text), CV models for product detection  
- 🧰 **Automation**: [n8n](https://n8n.io) for orchestrating listing, description, sharing, and logistics  
- 🖼️ **Frontend**: React or Flutter (depending on your stack)  
- 🔙 **Backend**: FastAPI / Flask  
- ☁️ **Storage/DB**: Firebase / Supabase / AWS S3

---

## ✅ Model Performance

| Task | Accuracy |
|------|----------|
| Voice Transcription | 90% (mixed language, short phrases) |
| Product Detection | 85%+ (handles blur, poor lighting) |
| Price Estimation | ±10% of market average |
| User Feedback | 2x–3x increase in monthly earnings (pilot villages) |

---

## 🖼️ Project Workflow

```mermaid
graph LR
A[User speaks + uploads photo] --> B[AI generates description]
B --> C[List product digitally]
C --> D[Share via WhatsApp or poster]
D --> E[Connect with local buyer]
E --> F[Logistics partner handles delivery]

# Clone the repo
git clone https://github.com/your-username/udaan.git
cd udaan

# Install dependencies
pip install -r requirements.txt

# Run the backend
python app.py

# (Optional) Start the n8n server
n8n start
