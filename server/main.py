"""
Cyber Buddha x402 Payment Server
使用 FastAPI + x402 实现链上上香支付
"""

import os
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from x402.fastapi.middleware import require_payment
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 配置
ADDRESS = os.getenv("ADDRESS", "0x0000000000000000000000000000000000000000")
NETWORK = os.getenv("NETWORK", "base-sepolia")
# Facilitator URLs
# PayAI: 支持主网，无需认证
# x402.org: 仅测试网
# CDP: 需要认证，主网支持待确认
PAYAI_FACILITATOR_URL = "https://facilitator.payai.network"
DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator"
FACILITATOR_URL = os.getenv("FACILITATOR_URL", "")
CDP_API_KEY_ID = os.getenv("CDP_API_KEY_ID", "")
CDP_API_KEY_SECRET = os.getenv("CDP_API_KEY_SECRET", "")

# Facilitator 配置
async def create_cdp_headers():
    """为 CDP Facilitator 创建认证头"""
    if CDP_API_KEY_ID and CDP_API_KEY_SECRET:
        import base64
        credentials = base64.b64encode(f"{CDP_API_KEY_ID}:{CDP_API_KEY_SECRET}".encode()).decode()
        return {
            "verify": {"Authorization": f"Basic {credentials}"},
            "settle": {"Authorization": f"Basic {credentials}"},
        }
    return {}

# 自动选择 facilitator URL
# 主网用 PayAI，测试网用 x402.org
if FACILITATOR_URL:
    _facilitator_url = FACILITATOR_URL
elif NETWORK in ["base", "polygon", "avalanche", "sei", "iotex", "solana", "peaq", "xlayer"]:
    _facilitator_url = PAYAI_FACILITATOR_URL
else:
    _facilitator_url = DEFAULT_FACILITATOR_URL

FACILITATOR_CONFIG = {
    "url": _facilitator_url,
    "create_headers": create_cdp_headers if CDP_API_KEY_ID else None,
}

print(f"Using facilitator: {_facilitator_url}")

app = FastAPI(
    title="Cyber Buddha x402",
    description="赛博佛祖 - 链上上香许愿",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-PAYMENT-RESPONSE"],
)

# x402 支付中间件 - 上香端点
# 小香: $0.10
app.middleware("http")(
    require_payment(
        path="/api/offer/small",
        price="$0.10",
        pay_to_address=ADDRESS,
        network=NETWORK,
        facilitator_config=FACILITATOR_CONFIG,
    )
)

# 中香: $1.00
app.middleware("http")(
    require_payment(
        path="/api/offer/medium",
        price="$1.00",
        pay_to_address=ADDRESS,
        network=NETWORK,
        facilitator_config=FACILITATOR_CONFIG,
    )
)

# 大香: $5.00
app.middleware("http")(
    require_payment(
        path="/api/offer/large",
        price="$5.00",
        pay_to_address=ADDRESS,
        network=NETWORK,
        facilitator_config=FACILITATOR_CONFIG,
    )
)

# 高香: $10.00
app.middleware("http")(
    require_payment(
        path="/api/offer/premium",
        price="$10.00",
        pay_to_address=ADDRESS,
        network=NETWORK,
        facilitator_config=FACILITATOR_CONFIG,
    )
)


@app.get("/api/health")
async def health():
    """健康检查"""
    return {"status": "ok", "message": "佛祖在线"}


@app.get("/api/config")
async def get_config():
    """获取支付配置信息"""
    return {
        "network": NETWORK,
        "receiver": ADDRESS,
        "offerings": [
            {"id": "small", "name": "小香", "price": "$0.10", "path": "/api/offer/small"},
            {"id": "medium", "name": "中香", "price": "$1.00", "path": "/api/offer/medium"},
            {"id": "large", "name": "大香", "price": "$5.00", "path": "/api/offer/large"},
            {"id": "premium", "name": "高香", "price": "$10.00", "path": "/api/offer/premium"},
        ]
    }


@app.post("/api/offer/small")
async def offer_small(request: Request):
    """点小香 - 需要 $0.10 USDC"""
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    wish = body.get("wish", "心诚则灵")
    return {
        "success": True,
        "message": "小香已点燃",
        "blessing": f"🙏 {wish} 🙏",
        "type": "small"
    }


@app.post("/api/offer/medium")
async def offer_medium(request: Request):
    """点中香 - 需要 $1.00 USDC"""
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    wish = body.get("wish", "心诚则灵")
    return {
        "success": True,
        "message": "中香已点燃",
        "blessing": f"🙏 {wish} 🙏",
        "type": "medium"
    }


@app.post("/api/offer/large")
async def offer_large(request: Request):
    """点大香 - 需要 $5.00 USDC"""
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    wish = body.get("wish", "心诚则灵")
    return {
        "success": True,
        "message": "大香已点燃",
        "blessing": f"🙏 {wish} 🙏",
        "type": "large"
    }


@app.post("/api/offer/premium")
async def offer_premium(request: Request):
    """点高香 - 需要 $10.00 USDC"""
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    wish = body.get("wish", "心诚则灵")
    return {
        "success": True,
        "message": "高香已点燃，佛光普照",
        "blessing": f"🙏✨ {wish} ✨🙏",
        "type": "premium"
    }


# 静态文件服务 - 放在最后
import pathlib
STATIC_DIR = pathlib.Path(__file__).parent.parent
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 4021))
    print(f"""
    ╔══════════════════════════════════════════╗
    ║         🙏 Cyber Buddha x402 🙏          ║
    ║──────────────────────────────────────────║
    ║  Server running at http://localhost:{port}  ║
    ║  Network: {NETWORK:<29} ║
    ║  Receiver: {ADDRESS[:10]}...{ADDRESS[-6:]:<14} ║
    ╚══════════════════════════════════════════╝
    """)
    uvicorn.run(app, host="0.0.0.0", port=port)
