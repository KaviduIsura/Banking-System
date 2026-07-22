import time
import logging
import re
from urllib.parse import unquote
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("ids_monitor")
logger.setLevel(logging.INFO)

# A short list of basic attack signatures (SQLi, XSS, Path Traversal)
ATTACK_SIGNATURES = [
    re.compile(r"(?i)(UNION\s+SELECT|SELECT\s+.*?\s+FROM|DROP\s+TABLE|INSERT\s+INTO)"),  # Basic SQLi
    re.compile(r"(?i)(<script>|javascript:|onerror=)"),                                  # Basic XSS
    re.compile(r"(\.\./|\.\.\\)"),                                                       # Path Traversal
]

class IDSMonitorMiddleware(BaseHTTPMiddleware):
    """
    CW2 Requirement: System Level (Firewalls / IDS)
    
    This middleware acts as a software-level Intrusion Detection System (IDS). 
    In a real production environment, this function would typically be handled by a 
    dedicated Web Application Firewall (WAF) or Network IDS, feeding logs to a SIEM. 
    
    This simulation:
    1. Logs all incoming requests (method, path, IP, duration, status).
    2. Pattern-matches the request URL (and ideally body, though reading body in ASGI 
       middleware is complex and omitted here for stability) against attack signatures.
    3. Emits a WARNING level log if a signature matches (detective control).
    It does NOT block the request; rate-limiting handles the blocking (preventative control).
    """
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # 1. Analyze the request URL for malicious signatures
        url_str = unquote(str(request.url))
        is_suspicious = False
        
        for sig in ATTACK_SIGNATURES:
            if sig.search(url_str):
                is_suspicious = True
                break
                
        if is_suspicious:
            client_ip = request.client.host if request.client else "unknown"
            logger.warning(f"SUSPICIOUS_REQUEST detected from {client_ip} on URL: {url_str}")
        
        # Process the request
        response = await call_next(request)
        
        # 2. Log the request outcome
        duration_ms = (time.time() - start_time) * 1000
        client_ip = request.client.host if request.client else "unknown"
        
        logger.info(
            f"IDS_LOG | {request.method} {request.url.path} | "
            f"IP: {client_ip} | Status: {response.status_code} | Duration: {duration_ms:.2f}ms"
        )
        
        return response
