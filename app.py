"""
Agent de Support Client - Atanit Brain Care
Backend Flask avec Claude API + Shopify API
"""

import os
import json
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
import anthropic
import requests
from datetime import datetime

app = Flask(__name__)
CORS(app)

ANTHROPIC_API_KEY   = os.environ.get("ANTHROPIC_API_KEY", "")
SHOPIFY_STORE_URL   = os.environ.get("SHOPIFY_STORE_URL", "atanit-brain-care.myshopify.com")
SHOPIFY_ACCESS_TOKEN = os.environ.get("SHOPIFY_ACCESS_TOKEN", "")
ESCALATION_EMAIL    = os.environ.get("ESCALATION_EMAIL", "support@atanit-brain-care.com")

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
conversations: dict[str, list] = {}

SYSTEM_PROMPT = """
You are **Atanit Support**, a friendly and professional bilingual (French/English) customer support agent for Atanit Brain Care.

## Your Personality
- Warm, empathetic, solution-focused
- Always respond in the SAME language the customer uses

## Your Capabilities
1. **Order Status**: search by order number or email
2. **Product Information**: answer questions about products
3. **FAQ & Policies**: shipping, returns, refunds
4. **Escalation**: escalate to human agent when needed

## Store Policies
- Standard delivery: 3-5 business days (France), 7-14 days (international)
- Free shipping on orders over 50EUR
- 30-day return policy for unused, unopened items
- Refunds within 5-7 business days
- Escalation email: support@atanit-brain-care.com
"""

def shopify_headers():
    return {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN, "Content-Type": "application/json"}

def get_order_by_number(order_number):
    try:
        order_number = order_number.replace("#", "").strip()
        url = f"https://{SHOPIFY_STORE_URL}/admin/api/2024-01/orders.json"
        r = requests.get(url, headers=shopify_headers(), params={"name": f"#{order_number}","status":"any"}, timeout=10)
        orders = r.json().get("orders", [])
        return orders[0] if orders else None
    except Exception as e: print(f); return None

def get_orders_by_email(email):
    try:
        url = f"https://{SHOPIFY_STORE_URL}/admin/api/2024-01/orders.json"
        r = requests.get(url, headers=shopify_headers(), params={"email":email,"status":"any","limit":5}, timeout=10)
        return r.json().get("orders", [])
    except Exception as e: print(e); return []

def get_products(query="", limit=10):
    try:
        url = f"https://{SHOPIFY_STORE_URL}/admin/api/2024-01/products.json"
        params = {"limit":limit,"status":"active"}
        if query: params["title"] = query
        r = requests.get(url, headers=shopify_headers(), params=params, timeout=10)
        return r.json().get("products", [])
    except Exception as e: print(e); return []

def format_order(o):
    if not o: return "Commande introuvable."
    fs = o.get("fulfillment_status") or "unfulfilled"
    sm = {"fulfilled":"Shipped","unfulfilled":"Pending","partial":"Partial"}
    lines = [f"**Order #{o.get('order_number')}** | {o.get('created_at','')[:10]} | {sm.get(fs,fs)} | {o.get('total_price','?')} {o.get('currency','EUR')}"]
    for i in o.get("line_items",[]): lines.append(f"  {i.get('name')} x{i.get('quantity')}")
    for f in o.get("fulfillments",[]):
        if f.get("tracking_number"): lines.append(f"  Tracking: {f.get('tracking_number')}")
    return "\n".join(lines)

def format_products(products):
    if not products: return "No products found."
    return "\n\n".join([f"**{p.get('title')}** - {p.get('variants',[{}])[0].get('price','?')}EUR\n{p.get('body_html','')[:200].replace('<p>','').replace('</p>','').strip()}" for p in products[:5]])

import re
def detect_intent(msg):
    m = msg.lower()
    res = {"intent":"general","order_number":None,"email":None,"product_query":None}
    om = re.search(r"#?(\d{4,6})", msg)
    if om: res["order_number"]=om.group(1); res["intent"]="order_status"
    em = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", msg)
    if em: res["email"]=em.group(0); res["intent"]=res["intent"] if res["intent"]!="general" else "order_by_email"
    if any(k in m for k in ["commande","order","livraison","delivery","suivi","tracking"]) and res["intent"]=="general": res["intent"]="order_status"
    if any(k in m for k in ["produit","product","prix","price","brain","cerveau","supplement"]): res["intent"]="product_info"; res["product_query"]=msg
    if any(k in m for k in ["humain","human","agent","person","plainte","complaint"]): res["intent"]="escalation"
    return res

from flask import Flask, request, jsonify
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    sid = data.get("session_id","default")
    msg = data.get("message","").strip()
    if not msg: return jsonify({"error":"empty"}),400
    if sid not in conversations: conversations[sid]=[]
    int = detect_intent(msg)
    ctx = ""
    if int["intent"] in ("order_status","order_by_email"):
        if int["order_number"]:
            o=get_order_by_number(int["order_number"]); ctx=f"\n[ORDER_DATA]\n{format_order(o)}" if o else f"\n[INFO] No order #{int['order_number']}"
        elif int["email"]:
            os=get_orders_by_email(int["email"]); ctx="\n[ORDERS]\n"+"\n".join(format_order(o) for o in os[:3]) if os else f"\n[INFO] No orders for {int['email']}"
    elif int["intent"]=="product_info":
        ps=get_products(int.get("product_query","")); ctx=f"\n[PRODUCTS]\n{format_products(ps)}" if ps else ""
    conversations[sid].append({"role":"user","content":msg+ctx})
    try:
        r=client.messages.create(model="claude-sonnet-4-6",max_tokens=1024,system=SYSTEM_PROMPT,messages=conversations[sid])
        am=r.content[0].text
        conversations[sid].append({"role":"assistant","content":am})
        if len(conversations[sid])>20: conversations[sid]=conversations[sid][-20:]
        return jsonify({"message":am,"session_id":sid,"intent":int["intent"]})
    except Exception as e:
        return jsonify({"message":"Erreur server. Contact: support@atanit-brain-care.com","session_id":sid}),500

@app.route("/health",methods=["GET"])
def health():
    return jsonify({"status":"ok"})

if __name__=="__main__":
    port=int(os.environ.get("PORT",5000))
    app.run(host="0.0.0.0",port=port,debug=False)
