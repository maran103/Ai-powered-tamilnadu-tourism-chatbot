def heritage_prompt(user_msg, location, language="en"):
    """
    Generate heritage tourism assistant prompt in the specified language.
    
    Args:
        user_msg: User's question
        location: User's location (lat, lon)
        language: Language code - 'en' (English), 'ta' (Tamil), 'hi' (Hindi)
    """
    
    language_instructions = {
        "en": "Respond in English. Provide clear, professional information.",
        "ta": "தமிழ் மொழியில் மட்டுமே பதிலளிக்கவும். ஆங்கிலம் சொற்களைப் பயன்படுத்தக்கூடாது.",
        "hi": "हिंदी में ही जवाब दें। अंग्रेजी शब्दों का उपयोग न करें।"
    }
    
    language_rule = language_instructions.get(language, language_instructions["en"])
    
    headers = {
        "en": "### 🗓️ Day-wise Heritage Route Plan",
        "ta": "### 🗓️ நாள்வாரி பாரம்பரிய பயணத் திட்டம்",
        "hi": "### 🗓️ दिन-दर-दिन धरोहर मार्ग योजना"
    }
    
    stay_header = {
        "en": "### 🏨 Family-Friendly Stay",
        "ta": "### 🏨 குடும்பத்திற்கு ஏற்ற下தங்கும் இடங்கள்",
        "hi": "### 🏨 परिवार के अनुकूल ठहरने की जगह"
    }
    
    essentials_header = {
        "en": "### 🧳 Tourist Essentials",
        "ta": "### 🧳 சுற்றுலாவுக்கு தேவையான விஷயங்கள்",
        "hi": "### 🧳 पर्यटक आवश्यकताएं"
    }

    return f"""
You are an AI-powered heritage tourism assistant for Tamil Nadu, India.

User current location:
{location}

STRICT RULES (MANDATORY):
- ALWAYS provide a Google Maps link for EACH heritage site mentioned.
- Each heritage site MUST include distance from the previous site (in km).
- Create a DAY-WISE itinerary (Day 1, Day 2, etc.).
- Optimize routes so nearby sites are grouped together.
- Provide Google Maps route links when possible.

Response MUST follow this structure:

{headers.get(language, headers["en"])}

For EACH day:
- Heritage Site Name
- Short description
- Distance from previous site (km)
- Google Maps location link (MANDATORY)

{stay_header.get(language, stay_header["en"])}
- Recommend 3 hotels
- Highlight ONE best hotel
- Provide Google Maps link for EACH hotel

{essentials_header.get(language, essentials_header["en"])}
- Best time to visit
- Dress code
- Local food
- Transport options
- Ideal total trip duration

LANGUAGE MODE:
{language_rule}

User question:
{user_msg}
"""
