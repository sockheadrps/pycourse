import os
import secrets
from datetime import datetime, timedelta
from fastapi import FastAPI, Response, Request, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
import json
from fastapi.staticfiles import StaticFiles
from slugify import slugify
from pydantic import BaseModel
from typing import Dict, Any, Optional
from collections import defaultdict
import hashlib
from dotenv import load_dotenv
from database import ViewTracker
from contextlib import asynccontextmanager

# Load environment variables from .env file
load_dotenv(f"{os.path.dirname(os.path.abspath(__file__))}/.env")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting guide server...")
    print(f"   Templates directory: {TEMPLATES_DIR}")
    print(f"   Guides directory: {GUIDES_DIR}")
    print(f"   Static directory: {STATIC_DIR}")
    print(f"   Dev mode: {DEV_MODE}")

    # Initialize SQLite database
    print(f"   Database initialized: {view_tracker.db_path}")

    # Clean up expired sessions
    cleanup_expired_sessions()

    # Generate all guides
    generate_all_guides()

    yield

    # Shutdown (if needed)
    print("🛑 Shutting down guide server...")

app = FastAPI(lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://socksthoughtshop.lol",
        "https://www.socksthoughtshop.lol"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
GUIDES_DIR = BASE_DIR / "guides"
STATIC_DIR = BASE_DIR / "static"

print("Templates directory:", TEMPLATES_DIR)
print("Static directory:", STATIC_DIR)

# Server configuration from environment variables
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8002"))

# IP exclusion for view tracking
EXCLUDED_IPS = os.getenv("EXCLUDED_IPS", "").split(
    ",") if os.getenv("EXCLUDED_IPS") else []
EXCLUDED_IPS = [ip.strip() for ip in EXCLUDED_IPS if ip.strip()]

print(f"🚀 Server configuration:")
print(f"   Host: {HOST}")
print(f"   Port: {PORT}")
print(f"   Dev Mode: {DEV_MODE}")
print(f"   Excluded IPs for tracking: {EXCLUDED_IPS}")

app.mount("/guides/static", StaticFiles(directory=STATIC_DIR), name="static")

# Authentication models


class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str
    expires_at: str

# Guide creation models


class GuideBasicInfo(BaseModel):
    slug: str
    title: str
    description: str


class TutorialStep(BaseModel):
    title: str
    description: str
    file: str
    code_snippet: str = ""


class TutorialPhase(BaseModel):
    phase: int
    title: str
    steps: list[TutorialStep]


class TutorialData(BaseModel):
    title: str
    description: str
    phases: list[TutorialPhase]
    youtube_video: Optional[str] = None  # YouTube video ID or URL


class FlowStep(BaseModel):
    step: int
    title: str
    description: str
    location: dict
    step_type: str


class FlowPhase(BaseModel):
    phase: int
    title: str
    flow_title: str
    steps: list[FlowStep]


class FlowData(BaseModel):
    title: str
    description: str
    phases: list[FlowPhase]


class GuideData(BaseModel):
    basic_info: GuideBasicInfo
    tutorial: TutorialData
    flow: FlowData


# Session storage (in production, use Redis or database)
active_sessions = {}

# Initialize SQLite view tracker
view_tracker = ViewTracker(BASE_DIR / "view_stats.db")
# Set this in production
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
if not ADMIN_PASSWORD:
    print("⚠️  WARNING: ADMIN_PASSWORD environment variable not set!")
    print("   Set it with: export ADMIN_PASSWORD='your-password'")
    print("   Or create a .env file with ADMIN_PASSWORD=your-password")
    ADMIN_PASSWORD = "admin123"  # Fallback for development
    print("   Using default password: admin123")
SESSION_DURATION = timedelta(hours=24)
print(
    f"🔐 Admin password: {'*' * len(ADMIN_PASSWORD)} (set via ADMIN_PASSWORD env var)")

# Security
security = HTTPBearer()


def create_session() -> str:
    """Create a new session token"""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now() + SESSION_DURATION
    active_sessions[token] = {
        "created_at": datetime.now(),
        "expires_at": expires_at,
        "authenticated": True
    }
    return token


def validate_session(token: str) -> bool:
    """Validate a session token"""
    if token not in active_sessions:
        return False

    session = active_sessions[token]
    if datetime.now() > session["expires_at"]:
        del active_sessions[token]
        return False

    return session["authenticated"]


def cleanup_expired_sessions():
    """Remove expired sessions"""
    current_time = datetime.now()
    expired_tokens = [
        token for token, session in active_sessions.items()
        if current_time > session["expires_at"]
    ]
    for token in expired_tokens:
        del active_sessions[token]


def get_client_id(request: Request) -> str:
    """Generate a unique client ID based on IP and user agent"""
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")

    # Create a hash of IP + user agent for privacy
    client_string = f"{client_ip}:{user_agent}"
    return hashlib.md5(client_string.encode()).hexdigest()


def track_guide_view(guide_slug: str, request: Request):
    """Track a view for a guide using SQLite database"""
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    client_id = get_client_id(request)

    # Track view with IP exclusion
    return view_tracker.track_view(guide_slug, client_id, client_ip, user_agent, EXCLUDED_IPS)


def get_guide_stats(guide_slug: str) -> Dict[str, int]:
    """Get view statistics for a guide from database"""
    return view_tracker.get_guide_stats(guide_slug)


def generate_unique_slug(base_slug: str) -> str:
    """Generate a unique slug by appending a number if needed"""
    if not base_slug:
        return "new-guide"

    # Clean the slug
    clean_slug = slugify(base_slug)
    if not clean_slug:
        clean_slug = "new-guide"

    # Check if slug exists
    guide_dir = GUIDES_DIR / clean_slug
    if not guide_dir.exists():
        return clean_slug

    # Try with numbers
    counter = 1
    while True:
        new_slug = f"{clean_slug}-{counter}"
        if not (GUIDES_DIR / new_slug).exists():
            return new_slug
        counter += 1


def validate_slug(slug: str) -> tuple[bool, str]:
    """Validate a slug and return (is_valid, error_message)"""
    if not slug or slug.strip() == "":
        return False, "Guide slug is required"

    # Check for invalid characters
    if not slug.replace("-", "").replace("_", "").isalnum():
        return False, "Slug can only contain letters, numbers, hyphens, and underscores"

    # Check length
    if len(slug) < 3:
        return False, "Slug must be at least 3 characters long"

    if len(slug) > 50:
        return False, "Slug must be less than 50 characters long"

    return True, ""


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> bool:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    print(
        f"🔐 Auth check - Token: {token[:10]}..., Valid: {validate_session(token)}")
    if not validate_session(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )
    return True


async def get_current_user_optional(request: Request) -> bool:
    """Optional authentication check for GET requests"""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]  # Remove "Bearer " prefix
        if validate_session(token):
            return True
    return False


async def get_current_user_flexible(request: Request) -> bool:
    """Authentication check that only accepts Authorization header for security"""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]  # Remove "Bearer " prefix
        if validate_session(token):
            return True

    # No query parameter support for security reasons
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired session"
    )


def get_jinja_env():
    """Get Jinja environment, reloading templates in dev mode"""
    return Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))


def get_templates():
    """Get template objects, reloading in dev mode"""
    env = get_jinja_env()
    return {
        "tutorial": env.get_template("tabbed_tutorial.html")
    }


def get_guides():
    """Return a dict of {guide_slug: guide_path}"""
    guides = {}
    for guide_dir in GUIDES_DIR.iterdir():
        if guide_dir.is_dir():
            guides[guide_dir.name] = guide_dir
    return guides


def generate_guide(guide_slug: str, use_temp_files=False):
    """Generate HTML for a specific guide"""
    print(
        f"🔧 generate_guide called for {guide_slug}, use_temp_files={use_temp_files}")
    guide_dir = GUIDES_DIR / guide_slug
    if not guide_dir.exists():
        raise Exception(f"Guide directory {guide_slug} not found")

    # Use temporary files for preview mode
    if use_temp_files:
        tutorial_file = guide_dir / "temp_tutorial.json"
        flow_file = guide_dir / "temp_flow.json"
        output_file = guide_dir / "temp_tutorial.html"
    else:
        tutorial_file = guide_dir / "tutorial.json"
        flow_file = guide_dir / "flow.json"
        output_file = guide_dir / "tutorial.html"

    if not tutorial_file.exists():
        raise Exception(f"Tutorial file not found for guide {guide_slug}")

    # Load tutorial data
    with open(tutorial_file, 'r', encoding='utf-8') as f:
        tutorial_data = json.load(f)

    # Load flow data if it exists
    flow_data = None
    if flow_file.exists():
        with open(flow_file, 'r', encoding='utf-8') as f:
            flow_data = json.load(f)

    # Calculate total steps
    total_steps = 0
    if tutorial_data.get('tutorial', {}).get('phases'):
        for phase in tutorial_data['tutorial']['phases']:
            total_steps += len(phase.get('steps', []))

    # Generate HTML using the template
    template = get_jinja_env().get_template("tabbed_tutorial.html")

    # Format js_links as HTML script tags
    assets = tutorial_data.get('assets', {})
    # Handle nested assets structure
    if 'assets' in assets:
        assets = assets['assets']
    js_links = "\n".join(
        f"<script src='{src}' defer></script>" for src in assets.get("js", [])
    )

    html_content = template.render(
        title=tutorial_data['tutorial']['title'],
        description=tutorial_data['tutorial']['description'],
        tutorial_data=tutorial_data['tutorial'],
        flow_data=flow_data,
        total_steps=total_steps,
        js_links=js_links,
        is_preview=use_temp_files
    )

    # Write the generated HTML
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"Generated HTML for guide: {guide_slug}" +
          (" (preview)" if use_temp_files else ""))


def generate_all_guides():
    print("🔄 Generating all guides...")
    templates = get_templates()

    for guide_slug, guide_path in get_guides().items():
        tutorial_json = guide_path / "tutorial.json"
        flow_json = guide_path / "flow.json"
        tutorial_html = guide_path / "tutorial.html"
        flow_html = guide_path / "flow.html"

        # Tutorial
        if tutorial_json.exists():
            try:
                with open(tutorial_json, encoding="utf-8") as f:
                    data = json.load(f)
                tutorial = data.get("tutorial", {})
                assets = data.get("assets", {}) or {}
                # Handle nested assets structure
                if 'assets' in assets:
                    assets = assets['assets']
                css_links = "\n".join(
                    f"<link rel='stylesheet' href='{href}'>" for href in assets.get("css", []) or [])
                js_links = "\n".join(
                    f"<script src='{src}' defer></script>" for src in assets.get("js", []) or [])
                total_steps = sum(len(p["steps"])
                                  for p in tutorial.get("phases", []))

                # Generate flow content if flow.json exists
                flow_content = ""
                flow_data = None
                if flow_json.exists():
                    try:
                        with open(flow_json, encoding="utf-8") as f:
                            flow_data = json.load(f)
                        flow_content = f'<div id="flow-data" data-flow="{json.dumps(flow_data)}"></div>'
                        print(
                            f"✅ Loaded flow data for {guide_slug}: {len(flow_data.get('phases', []))} phases")
                    except Exception as e:
                        print(
                            f"⚠️ Warning: Could not generate flow content for {guide_slug}: {e}")

                rendered_html = templates["tutorial"].render(
                    title=tutorial.get("title", ""),
                    description=tutorial.get("description", ""),
                    css_links=css_links,
                    js_links=js_links,
                    tutorial_data=tutorial,
                    total_steps=total_steps,
                    flow_content=flow_content,
                    flow_data=flow_data,
                    tutorial_data_json=json.dumps(tutorial),
                )
                tutorial_html.write_text(rendered_html, encoding="utf-8")
                print(f"✅ Generated tutorial for {guide_slug}")
            except Exception as e:
                print(f"❌ Error generating tutorial for {guide_slug}: {e}")

    print("🎉 All guides generated successfully!")


@app.get("/guides/{guide_slug}/draft.json")
def serve_draft_json(guide_slug: str):
    """Serve draft.json file for a guide"""
    guide_path = GUIDES_DIR / guide_slug
    draft_file = guide_path / "draft.json"

    if not draft_file.exists():
        raise HTTPException(status_code=404, detail="Draft not found")

    try:
        with open(draft_file, 'r', encoding='utf-8') as f:
            draft_data = json.load(f)
        return draft_data
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to read draft: {str(e)}")


@app.get("/guides/{guide_slug}/tutorial")
def serve_guide_tutorial(guide_slug: str, request: Request):
    guide_path = GUIDES_DIR / guide_slug

    # Check if this is a preview request
    is_preview = request.query_params.get("preview", "false").lower() == "true"

    if is_preview:
        # Use temporary files for preview
        tutorial_json = guide_path / "temp_tutorial.json"
        flow_json = guide_path / "temp_flow.json"
        tutorial_html = guide_path / "temp_tutorial.html"
    else:
        # Use published files
        tutorial_json = guide_path / "tutorial.json"
        flow_json = guide_path / "flow.json"
        tutorial_html = guide_path / "tutorial.html"

        # Track view for published guides only
        if tutorial_json.exists():
            track_guide_view(guide_slug, request)

    # For preview mode, serve the generated HTML directly
    if is_preview and tutorial_html.exists():
        with open(tutorial_html, 'r', encoding='utf-8') as f:
            html_content = f.read()
        return Response(content=html_content, media_type="text/html")

    # For regular mode or if preview HTML doesn't exist, generate dynamically
    if not tutorial_json.exists():
        return Response("<h1>Tutorial not found</h1>", media_type="text/html")

    # Load tutorial data
    with open(tutorial_json, encoding="utf-8") as f:
        data = json.load(f)
    tutorial = data.get("tutorial", {})
    assets = data.get("assets", {}) or {}
    # Handle nested assets structure
    if 'assets' in assets:
        assets = assets['assets']
    css_links = "\n".join(
        f"<link rel='stylesheet' href='{href}'>" for href in assets.get("css", []) or [])
    js_links = "\n".join(
        f"<script src='{src}' defer></script>" for src in assets.get("js", []) or [])
    total_steps = sum(len(p["steps"]) for p in tutorial.get("phases", []))

    # Generate flow content if flow.json exists
    flow_content = ""
    flow_data = None
    if flow_json.exists():
        try:
            with open(flow_json, encoding="utf-8") as f:
                flow_data = json.load(f)
            flow_content = f'<div id="flow-data" data-flow="{json.dumps(flow_data)}"></div>'
            print(
                f"✅ Loaded flow data for {guide_slug}: {len(flow_data.get('phases', []))} phases")
        except Exception as e:
            print(f"❌ Error loading flow data for {guide_slug}: {e}")
    else:
        print(f"⚠️ No flow.json found for {guide_slug}")

    templates = get_templates()
    print(
        f"🔍 Debug: flow_data type: {type(flow_data)}, flow_data content: {flow_data is not None}")
    if flow_data:
        print(
            f"🔍 Debug: flow_data has {len(flow_data.get('phases', []))} phases")
    rendered_html = templates["tutorial"].render(
        title=tutorial.get("title", ""),
        description=tutorial.get("description", ""),
        css_links=css_links,
        js_links=js_links,
        tutorial_data=tutorial,
        total_steps=total_steps,
        flow_content=flow_content,
        flow_data=flow_data,
        tutorial_data_json=json.dumps(tutorial),
        is_preview=is_preview
    )
    return Response(content=rendered_html, media_type="text/html")


@app.get("/guides")
def list_guides():
    """Return only published guides with their slug, titles and descriptions"""
    guides = get_guides()
    guides_data = []

    for guide_slug, guide_path in guides.items():
        tutorial_json = guide_path / "tutorial.json"

        if tutorial_json.exists():
            try:
                with open(tutorial_json, encoding="utf-8") as f:
                    data = json.load(f)
                    tutorial_data = data.get("tutorial", {})
                    title = tutorial_data.get("title", guide_slug)
                    description = tutorial_data.get("description", "")
                guides_data.append({
                    "slug": guide_slug,
                    "title": title,
                    "description": description
                })
            except Exception as e:
                print(
                    f"Warning: Could not read tutorial.json for {guide_slug}: {e}")

    return guides_data


@app.get("/guides/{guide_slug}/stats")
def get_guide_view_stats(guide_slug: str):
    """Get view statistics for a specific guide"""
    guide_path = GUIDES_DIR / guide_slug
    if not guide_path.exists():
        raise HTTPException(status_code=404, detail="Guide not found")

    stats = get_guide_stats(guide_slug)
    return {
        "slug": guide_slug,
        "total_views": stats["total_views"],
        "unique_viewers": stats["unique_viewers"]
    }


@app.get("/admin/stats")
def get_overall_stats(current_user: bool = Depends(get_current_user_flexible)):
    """Get overall statistics for the dashboard"""
    guides = get_guides()

    # Get overall stats from database
    db_stats = view_tracker.get_overall_stats()

    published_guides = 0
    # All guides with drafts (including published ones with drafts)
    draft_guides = 0
    published_with_draft_guides = 0

    for guide_slug in guides.keys():
        guide_path = guides[guide_slug]
        tutorial_json = guide_path / "tutorial.json"
        draft_json = guide_path / "draft.json"

        has_published = tutorial_json.exists()
        has_draft = draft_json.exists()

        if has_published:
            published_guides += 1

            if has_draft:
                published_with_draft_guides += 1
                draft_guides += 1  # Count as draft guide too
        elif has_draft:
            draft_guides += 1  # Draft-only guide

    return {
        "total_guides": len(guides),
        "published_guides": published_guides,
        "draft_guides": draft_guides,
        "published_with_draft_guides": published_with_draft_guides,
        "total_views": db_stats["total_views"],
        "unique_viewers": db_stats["total_unique_viewers"]
    }


@app.get("/admin/top-guides")
def get_top_guides(current_user: bool = Depends(get_current_user_flexible)):
    """Get top guides by unique viewers"""
    top_guides = view_tracker.get_top_guides(limit=3)

    # Add guide titles to the results
    guides = get_guides()
    for guide in top_guides:
        guide_slug = guide["slug"]
        guide_path = guides.get(guide_slug)
        if guide_path:
            tutorial_json = guide_path / "tutorial.json"
            if tutorial_json.exists():
                try:
                    with open(tutorial_json, encoding="utf-8") as f:
                        data = json.load(f)
                        tutorial_data = data.get("tutorial", {})
                        guide["title"] = tutorial_data.get("title", guide_slug)
                except:
                    guide["title"] = guide_slug
            else:
                guide["title"] = guide_slug
        else:
            guide["title"] = guide_slug

    return {"top_guides": top_guides}


@app.get("/guides/api/guides")
def get_guides_with_titles():
    """Return all guides with their titles, links, and statistics"""
    guides = get_guides()
    guides_data = []

    for guide_slug, guide_path in guides.items():
        tutorial_json = guide_path / "tutorial.json"
        flow_json = guide_path / "flow.json"
        draft_json = guide_path / "draft.json"

        # Default values
        title = guide_slug
        description = ""
        tutorial_data = None
        flow_data = None

        # Check if draft exists and if published files exist
        has_draft = draft_json.exists()
        has_published = tutorial_json.exists() or flow_json.exists()

        # Try to get tutorial data (prefer published, fallback to draft)
        if tutorial_json.exists():
            try:
                with open(tutorial_json, encoding="utf-8") as f:
                    data = json.load(f)
                    tutorial_data = data.get("tutorial", {})
                    title = tutorial_data.get("title", guide_slug)
                    description = tutorial_data.get("description", "")
            except Exception as e:
                print(
                    f"Warning: Could not read tutorial.json for {guide_slug}: {e}")
        elif draft_json.exists():
            try:
                with open(draft_json, encoding="utf-8") as f:
                    data = json.load(f)
                    tutorial_data = data.get("tutorial", {})
                    title = tutorial_data.get("title", guide_slug)
                    description = tutorial_data.get("description", "")
            except Exception as e:
                print(
                    f"Warning: Could not read draft.json for {guide_slug}: {e}")

        # Try to get flow data (prefer published, fallback to draft)
        if flow_json.exists():
            try:
                with open(flow_json, encoding="utf-8") as f:
                    flow_data = json.load(f)
            except Exception as e:
                print(
                    f"Warning: Could not read flow.json for {guide_slug}: {e}")
        elif draft_json.exists():
            try:
                with open(draft_json, encoding="utf-8") as f:
                    data = json.load(f)
                    flow_data = data.get("flow", {})
            except Exception as e:
                print(
                    f"Warning: Could not read draft.json for {guide_slug}: {e}")

        # Get view statistics for published guides
        view_stats = get_guide_stats(guide_slug) if has_published else {
            "total_views": 0, "unique_viewers": 0}

        guides_data.append({
            "slug": guide_slug,
            "title": title,
            "description": description,
            "tutorial_url": f"/guides/{guide_slug}/tutorial",
            "tutorial": tutorial_data,
            "flow": flow_data,
            "has_draft": has_draft,
            "has_published": has_published,
            "view_stats": view_stats
        })

    return {
        "guides": guides_data,
        "total": len(guides_data)
    }


@app.post("/regenerate")
async def regenerate_all_guides(current_user: bool = Depends(get_current_user_flexible)):
    """Manually regenerate all guides (useful for development)"""
    try:
        generate_all_guides()
        return {"status": "success", "message": "All guides regenerated successfully"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to regenerate guides: {str(e)}"}


@app.post("/save-tutorial")
async def save_tutorial(request: Request, current_user: bool = Depends(get_current_user_flexible)):
    """Save tutorial changes to the JSON file"""
    print(f"🔧 Save tutorial request received")
    print(f"   Current user: {current_user}")
    print(f"   Request method: {request.method}")
    print(f"   Request URL: {request.url}")

    try:
        # Get the request body
        body = await request.json()
        guide_slug = body.get("guide_slug", "fastapi-chat-app")
        tutorial_data = body.get("tutorial_data")

        print(f"   Guide slug: {guide_slug}")
        print(f"   Tutorial data present: {tutorial_data is not None}")

        if not tutorial_data:
            print(f"   ❌ No tutorial data provided")
            return Response(
                content=json.dumps(
                    {"status": "error", "message": "No tutorial data provided"}),
                media_type="application/json"
            )

        # Construct the path to the tutorial JSON file
        guide_path = GUIDES_DIR / guide_slug
        tutorial_json = guide_path / "tutorial.json"

        print(f"   Guide path: {guide_path}")
        print(f"   Tutorial JSON exists: {tutorial_json.exists()}")

        if not tutorial_json.exists():
            print(f"   ❌ Tutorial file not found for {guide_slug}")
            return Response(
                content=json.dumps(
                    {"status": "error", "message": f"Tutorial file not found for {guide_slug}"}),
                media_type="application/json"
            )

        # Load existing data to preserve other fields (like assets)
        with open(tutorial_json, encoding="utf-8") as f:
            existing_data = json.load(f)

        print(f"   ✅ Loaded existing data")

        # Update the tutorial data
        existing_data["tutorial"] = tutorial_data

        # Save back to file
        with open(tutorial_json, "w", encoding="utf-8") as f:
            json.dump(existing_data, f, indent=2, ensure_ascii=False)

        print(f"   ✅ Saved updated data")

        # Regenerate the HTML
        generate_all_guides()

        print(f"   ✅ Regenerated HTML")

        return Response(
            content=json.dumps(
                {"status": "success", "message": "Tutorial saved successfully"}),
            media_type="application/json"
        )

    except Exception as e:
        print(f"   ❌ Exception occurred: {str(e)}")
        return Response(
            content=json.dumps(
                {"status": "error", "message": f"Failed to save tutorial: {str(e)}"}),
            media_type="application/json"
        )


@app.post("/api/auth/login")
async def login(request: LoginRequest):
    """Login endpoint"""
    cleanup_expired_sessions()

    if request.password == ADMIN_PASSWORD:
        token = create_session()
        expires_at = active_sessions[token]["expires_at"]
        return LoginResponse(
            token=token,
            expires_at=expires_at.isoformat()
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )


@app.post("/api/auth/logout")
async def logout(current_user: bool = Depends(get_current_user_flexible)):
    """Logout endpoint"""
    # Note: In a real implementation, you'd need to get the token from the request
    # For now, this just validates the user is authenticated
    return {"status": "success", "message": "Logged out successfully"}


@app.get("/api/auth/check")
async def check_auth(current_user: bool = Depends(get_current_user_flexible)):
    """Check if user is authenticated"""
    return {"authenticated": True}


@app.post("/admin/save-draft")
async def save_draft(request: Request, current_user: bool = Depends(get_current_user_flexible)):
    """Save guide draft"""
    try:
        body = await request.json()
        guide_data = GuideData(**body)

        # Validate slug
        is_valid, error_msg = validate_slug(guide_data.basic_info.slug)
        if not is_valid:
            return {"status": "error", "message": error_msg}

        # Check if guide already exists (for new guides)
        guide_dir = GUIDES_DIR / guide_data.basic_info.slug
        if guide_dir.exists() and not (guide_dir / "draft.json").exists():
            # This is a new guide trying to use an existing slug
            return {"status": "error", "message": f"Guide with slug '{guide_data.basic_info.slug}' already exists. Please choose a different slug."}

        # Create guide directory if it doesn't exist
        guide_dir.mkdir(exist_ok=True)

        # Save draft
        draft_file = guide_dir / "draft.json"
        with open(draft_file, "w", encoding="utf-8") as f:
            json.dump(body, f, indent=2, ensure_ascii=False)

        return {"status": "success", "message": "Draft saved successfully"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to save draft: {str(e)}"}


@app.post("/admin/publish-guide")
async def publish_guide(request: Request, current_user: bool = Depends(get_current_user_flexible)):
    """Publish guide"""
    try:
        body = await request.json()
        guide_data = GuideData(**body)

        # Validate slug
        is_valid, error_msg = validate_slug(guide_data.basic_info.slug)
        if not is_valid:
            return {"status": "error", "message": error_msg}

        # Check if guide already exists (for new guides)
        guide_dir = GUIDES_DIR / guide_data.basic_info.slug
        if guide_dir.exists() and not (guide_dir / "draft.json").exists() and not (guide_dir / "tutorial.json").exists():
            # This is a new guide trying to use an existing slug
            return {"status": "error", "message": f"Guide with slug '{guide_data.basic_info.slug}' already exists. Please choose a different slug."}

        # Create guide directory
        guide_dir.mkdir(exist_ok=True)

        # Generate tutorial.json with exact structure
        tutorial_json = {
            "assets": {
                "css": ["/guides/static/css/style.css"],
                "js": ["/guides/static/js/scripts.js", "/guides/static/js/flow_diagram.js"]
            },
            "tutorial": {
                "title": guide_data.tutorial.title,
                "description": guide_data.tutorial.description,
                "youtube_video": guide_data.tutorial.youtube_video or "",
                "phases": []
            }
        }

        # Add phases and steps
        for phase in guide_data.tutorial.phases:
            tutorial_phase = {
                "phase": phase.phase,
                "title": phase.title,
                "steps": []
            }

            for step in phase.steps:
                tutorial_step = {
                    "title": step.title,
                    "description": step.description,
                    "file": step.file,
                    "code_snippet": step.code_snippet
                }
                tutorial_phase["steps"].append(tutorial_step)

            tutorial_json["tutorial"]["phases"].append(tutorial_phase)

        # Save tutorial.json
        tutorial_file = guide_dir / "tutorial.json"
        with open(tutorial_file, "w", encoding="utf-8") as f:
            json.dump(tutorial_json, f, indent=2, ensure_ascii=False)

        # Generate flow.json with exact structure
        flow_json = {
            "title": guide_data.flow.title,
            "description": guide_data.flow.description,
            "phases": []
        }

        # Add flow phases and steps
        for phase in guide_data.flow.phases:
            flow_phase = {
                "phase": phase.phase,
                "title": phase.title,
                "flow_title": phase.flow_title,
                "steps": []
            }

            for step in phase.steps:
                flow_step = {
                    "step": step.step,
                    "title": step.title,
                    "description": step.description,
                    "location": step.location,
                    "step_type": step.step_type
                }
                flow_phase["steps"].append(flow_step)

            flow_json["phases"].append(flow_phase)

        # Save flow.json
        flow_file = guide_dir / "flow.json"
        with open(flow_file, "w", encoding="utf-8") as f:
            json.dump(flow_json, f, indent=2, ensure_ascii=False)

        # Regenerate HTML
        generate_all_guides()

        return {"status": "success", "message": "Guide published successfully"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to publish guide: {str(e)}"}


@app.post("/admin/update-guide/{guide_slug}")
async def update_guide(guide_slug: str, request: Request, current_user: bool = Depends(get_current_user_flexible)):
    """Update an existing guide - saves as draft"""
    try:
        body = await request.json()
        guide_data = body.get("guide_data")

        if not guide_data:
            return {"status": "error", "message": "No guide data provided"}

        # Check if guide exists
        guide_dir = GUIDES_DIR / guide_slug
        if not guide_dir.exists():
            return {"status": "error", "message": f"Guide '{guide_slug}' not found"}

        # Create guide directory if it doesn't exist
        guide_dir.mkdir(exist_ok=True)

        # Save as draft.json instead of overwriting published files
        draft_file = guide_dir / "draft.json"

        # Debug: Print the guide data being saved
        print(f"🔍 Saving draft for {guide_slug}:")
        print(
            f"   Tutorial title: {guide_data.get('tutorial', {}).get('title', 'N/A')}")
        print(
            f"   YouTube video: {guide_data.get('tutorial', {}).get('youtube_video', 'N/A')}")

        with open(draft_file, "w", encoding="utf-8") as f:
            json.dump(guide_data, f, indent=2, ensure_ascii=False)

        return {"status": "success", "message": "Draft saved successfully"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to save draft: {str(e)}"}


@app.post("/admin/publish-from-draft/{guide_slug}")
async def publish_from_draft(guide_slug: str, current_user: bool = Depends(get_current_user_flexible)):
    """Publish guide from draft data"""
    try:
        # Check if guide exists
        guide_dir = GUIDES_DIR / guide_slug
        if not guide_dir.exists():
            return {"status": "error", "message": f"Guide '{guide_slug}' not found"}

        # Check if draft exists
        draft_file = guide_dir / "draft.json"
        if not draft_file.exists():
            return {"status": "error", "message": "No draft found to publish"}

        # Load draft data
        with open(draft_file, 'r', encoding='utf-8') as f:
            draft_data = json.load(f)

        # Debug: Print the draft data being read
        print(f"🔍 Publishing from draft for {guide_slug}:")
        print(
            f"   Tutorial title: {draft_data.get('tutorial', {}).get('title', 'N/A')}")
        print(
            f"   YouTube video: {draft_data.get('tutorial', {}).get('youtube_video', 'N/A')}")

        # Generate tutorial.json from draft
        tutorial_json = {
            "assets": {
                "css": ["/guides/static/css/style.css"],
                "js": ["/guides/static/js/scripts.js", "/guides/static/js/flow_diagram.js"]
            },
            "tutorial": {
                "title": draft_data.get("tutorial", {}).get("title", ""),
                "description": draft_data.get("tutorial", {}).get("description", ""),
                "youtube_video": draft_data.get("tutorial", {}).get("youtube_video", ""),
                "phases": []
            }
        }

        # Add phases and steps
        for phase in draft_data.get("tutorial", {}).get("phases", []):
            tutorial_phase = {
                "phase": phase.get("phase", 1),
                "title": phase.get("title", ""),
                "steps": []
            }

            for step in phase.get("steps", []):
                tutorial_step = {
                    "title": step.get("title", ""),
                    "description": step.get("description", ""),
                    "file": step.get("file", ""),
                    "code_snippet": step.get("code_snippet", "")
                }
                tutorial_phase["steps"].append(tutorial_step)

            tutorial_json["tutorial"]["phases"].append(tutorial_phase)

        # Save tutorial.json
        tutorial_file = guide_dir / "tutorial.json"
        with open(tutorial_file, "w", encoding="utf-8") as f:
            json.dump(tutorial_json, f, indent=2, ensure_ascii=False)

        # Generate flow.json from draft
        flow_json = {
            "title": draft_data.get("flow", {}).get("title", ""),
            "description": draft_data.get("flow", {}).get("description", ""),
            "phases": []
        }

        # Add flow phases and steps
        for phase in draft_data.get("flow", {}).get("phases", []):
            flow_phase = {
                "phase": phase.get("phase", 1),
                "title": phase.get("title", ""),
                "flow_title": phase.get("flow_title", ""),
                "steps": []
            }

            for step in phase.get("steps", []):
                flow_step = {
                    "step": step.get("step", 1),
                    "title": step.get("title", ""),
                    "description": step.get("description", ""),
                    "location": step.get("location", {"type": "server", "file": ""}),
                    "step_type": step.get("step_type", "normal")
                }
                flow_phase["steps"].append(flow_step)

            flow_json["phases"].append(flow_phase)

        # Save flow.json
        flow_file = guide_dir / "flow.json"
        with open(flow_file, "w", encoding="utf-8") as f:
            json.dump(flow_json, f, indent=2, ensure_ascii=False)

        # Regenerate HTML
        generate_all_guides()

        return {"status": "success", "message": "Guide published successfully from draft"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to publish guide: {str(e)}"}


@app.get("/login")
def login_page():
    """Simple login page"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Guide Server Login</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 0; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .login-container {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                width: 100%;
                max-width: 400px;
            }
            h1 {
                text-align: center;
                color: #333;
                margin-bottom: 30px;
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                color: #555;
                font-weight: bold;
            }
            input[type="password"] {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 5px;
                font-size: 16px;
                box-sizing: border-box;
            }
            input[type="password"]:focus {
                outline: none;
                border-color: #667eea;
            }
            button {
                width: 100%;
                padding: 12px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                transition: background 0.3s;
            }
            button:hover {
                background: #5a6fd8;
            }
            .message {
                margin-top: 20px;
                padding: 10px;
                border-radius: 5px;
                text-align: center;
                display: none;
            }
            .success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            .error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            .back-link {
                text-align: center;
                margin-top: 20px;
            }
            .back-link a {
                color: #667eea;
                text-decoration: none;
            }
            .back-link a:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <div class="login-container">
            <h1>🔐 Guide Server Login</h1>
            <form id="loginForm">
                <div class="form-group">
                    <label for="password">Admin Password:</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <button type="submit">Login</button>
            </form>
            <div id="message" class="message"></div>
            <div class="back-link">
                <a href="/">← Back to Guides</a>
            </div>
        </div>

        <script>
            document.getElementById('loginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const password = document.getElementById('password').value;
                const messageDiv = document.getElementById('message');
                
                try {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ password: password })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        // Store token in localStorage (not in URL for security)
                        localStorage.setItem('admin_auth_token', data.token);
                        
                        messageDiv.textContent = 'Login successful! Redirecting...';
                        messageDiv.className = 'message success';
                        messageDiv.style.display = 'block';
                        
                        // Check for redirect parameter
                        const urlParams = new URLSearchParams(window.location.search);
                        const redirect = urlParams.get('redirect');
                        
                        // Redirect after a short delay (without token in URL)
                        setTimeout(() => {
                            if (redirect) {
                                window.location.href = redirect;
                            } else {
                                window.location.href = '/admin/dashboard';
                            }
                        }, 1500);
                    } else {
                        messageDiv.textContent = 'Invalid password. Please try again.';
                        messageDiv.className = 'message error';
                        messageDiv.style.display = 'block';
                    }
                } catch (error) {
                    messageDiv.textContent = 'Login failed. Please try again.';
                    messageDiv.className = 'message error';
                    messageDiv.style.display = 'block';
                }
            });
        </script>
    </body>
    </html>
    """
    return Response(content=html, media_type="text/html")


@app.get("/admin/dashboard")
async def admin_dashboard(request: Request):
    """Admin dashboard page - authentication handled by client-side JavaScript"""
    # Load the admin dashboard template
    template = get_jinja_env().get_template("admin_dashboard.html")
    return Response(content=template.render(), media_type="text/html")


@app.get("/admin/edit-guide/{guide_slug}")
async def edit_guide_page(guide_slug: str, request: Request):
    """Edit guide page - also handles new guide creation when guide_slug is 'new'"""
    # Authentication handled by client-side JavaScript
    guide_data = {}

    # Check if this is actually a new guide creation or an existing guide with slug "new"
    guide_dir = GUIDES_DIR / guide_slug

    if guide_slug == "new" and not guide_dir.exists():
        # Create new guide template
        guide_data = {
            'tutorial': {
                'title': 'New Guide',
                'description': 'Enter your guide description here',
                'youtube_video': '',
                'phases': []
            },
            'flow': {
                'title': 'New Flow',
                'description': 'Enter your flow description here',
                'phases': []
            }
        }
    else:
        # Load existing guide data (including guides with slug "new")
        if not guide_dir.exists():
            raise HTTPException(status_code=404, detail="Guide not found")

            # Check if draft exists first, load from draft if available
        draft_file = guide_dir / "draft.json"

        if draft_file.exists():
            with open(draft_file, 'r', encoding='utf-8') as f:
                draft_data = json.load(f)
                guide_data['tutorial'] = draft_data.get('tutorial', {})
                guide_data['flow'] = draft_data.get('flow', {})
        else:
            # Load from published files if no draft exists
            tutorial_file = guide_dir / "tutorial.json"
            flow_file = guide_dir / "flow.json"

            if tutorial_file.exists():
                with open(tutorial_file, 'r', encoding='utf-8') as f:
                    tutorial_data = json.load(f)
                    guide_data['tutorial'] = tutorial_data.get('tutorial', {})

            if flow_file.exists():
                with open(flow_file, 'r', encoding='utf-8') as f:
                    flow_data = json.load(f)
                    guide_data['flow'] = flow_data

            # Create initial draft from published data so we can track changes
            if tutorial_file.exists() or flow_file.exists():
                draft_file = guide_dir / "draft.json"
                draft_data = {
                    'tutorial': guide_data.get('tutorial', {}),
                    'flow': guide_data.get('flow', {})
                }
                with open(draft_file, 'w', encoding='utf-8') as f:
                    json.dump(draft_data, f, indent=2, ensure_ascii=False)

        # Load the edit guide template
    template = get_jinja_env().get_template("edit_guide.html")
    return Response(
        content=template.render(
            guide_slug=guide_slug,
            guide_data=guide_data
        ),
        media_type="text/html"
    )


@app.get("/admin/preview-guide/{guide_slug}")
async def preview_guide(guide_slug: str, request: Request, current_user: bool = Depends(get_current_user_flexible)):
    """Preview guide from draft data (temporary)"""
    print(f"🔍 Preview request for guide: {guide_slug}")

    # Check if guide exists
    guide_dir = GUIDES_DIR / guide_slug
    if not guide_dir.exists():
        print(f"❌ Guide directory not found: {guide_dir}")
        raise HTTPException(status_code=404, detail="Guide not found")

    # Check if draft exists
    draft_file = guide_dir / "draft.json"
    if not draft_file.exists():
        print(f"❌ Draft file not found: {draft_file}")
        raise HTTPException(
            status_code=404, detail="No draft found to preview")

    print(f"✅ Draft file found: {draft_file}")

    try:
        # Load draft data
        with open(draft_file, 'r', encoding='utf-8') as f:
            draft_data = json.load(f)

        # Generate temporary tutorial.json from draft
        tutorial_json = {
            "assets": {
                "css": ["/guides/static/css/style.css"],
                "js": ["/guides/static/js/scripts.js", "/guides/static/js/flow_diagram.js"]
            },
            "tutorial": {
                "title": draft_data.get("tutorial", {}).get("title", ""),
                "description": draft_data.get("tutorial", {}).get("description", ""),
                "youtube_video": draft_data.get("tutorial", {}).get("youtube_video", ""),
                "phases": []
            }
        }

        # Add phases and steps
        for phase in draft_data.get("tutorial", {}).get("phases", []):
            tutorial_phase = {
                "phase": phase.get("phase", 1),
                "title": phase.get("title", ""),
                "steps": []
            }

            for step in phase.get("steps", []):
                tutorial_step = {
                    "title": step.get("title", ""),
                    "description": step.get("description", ""),
                    "file": step.get("file", ""),
                    "code_snippet": step.get("code_snippet", "")
                }
                tutorial_phase["steps"].append(tutorial_step)

            tutorial_json["tutorial"]["phases"].append(tutorial_phase)

        # Generate temporary flow.json from draft
        flow_json = {
            "title": draft_data.get("flow", {}).get("title", ""),
            "description": draft_data.get("flow", {}).get("description", ""),
            "phases": []
        }

        # Add flow phases and steps
        for phase in draft_data.get("flow", {}).get("phases", []):
            flow_phase = {
                "phase": phase.get("phase", 1),
                "title": phase.get("title", ""),
                "flow_title": phase.get("flow_title", ""),
                "steps": []
            }

            for step in phase.get("steps", []):
                flow_step = {
                    "step": step.get("step", 1),
                    "title": step.get("title", ""),
                    "description": step.get("description", ""),
                    "location": step.get("location", {"type": "server", "file": ""}),
                    "step_type": step.get("step_type", "normal")
                }
                flow_phase["steps"].append(flow_step)

            flow_json["phases"].append(flow_phase)

        # Create temporary files for preview
        temp_tutorial_file = guide_dir / "temp_tutorial.json"
        temp_flow_file = guide_dir / "temp_flow.json"

        with open(temp_tutorial_file, "w", encoding="utf-8") as f:
            json.dump(tutorial_json, f, indent=2, ensure_ascii=False)

        with open(temp_flow_file, "w", encoding="utf-8") as f:
            json.dump(flow_json, f, indent=2, ensure_ascii=False)

        # Generate temporary HTML
        generate_guide(guide_slug, use_temp_files=True)

        # Check if draft still exists after generating preview
        if draft_file.exists():
            print(f"✅ Draft file still exists after preview generation")
        else:
            print(f"❌ Draft file was deleted during preview generation!")

        # Redirect to the preview
        return Response(
            status_code=302,
            headers={"Location": f"/guides/{guide_slug}/tutorial?preview=true"}
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate preview: {str(e)}")


@app.get("/admin/clear-preview/{guide_slug}")
async def clear_preview(guide_slug: str, request: Request, current_user: bool = Depends(get_current_user_flexible)):
    """Clear temporary preview files"""
    try:
        guide_dir = GUIDES_DIR / guide_slug

        # Remove temporary files
        temp_tutorial_file = guide_dir / "temp_tutorial.json"
        temp_flow_file = guide_dir / "temp_flow.json"
        temp_html_file = guide_dir / "temp_tutorial.html"

        if temp_tutorial_file.exists():
            temp_tutorial_file.unlink()
        if temp_flow_file.exists():
            temp_flow_file.unlink()
        if temp_html_file.exists():
            temp_html_file.unlink()

        return {"status": "success", "message": "Preview cleared"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to clear preview: {str(e)}"}


@app.post("/admin/regenerate-guide/{guide_slug}")
async def regenerate_single_guide(guide_slug: str, current_user: bool = Depends(get_current_user_flexible)):
    """Regenerate a specific guide for testing"""
    try:
        guide_path = GUIDES_DIR / guide_slug
        if not guide_path.exists():
            return {"status": "error", "message": f"Guide '{guide_slug}' not found"}

        # Force regeneration by calling the generation logic directly
        tutorial_json = guide_path / "tutorial.json"
        flow_json = guide_path / "flow.json"
        tutorial_html = guide_path / "tutorial.html"
        flow_html = guide_path / "flow.html"

        if tutorial_json.exists():
            with open(tutorial_json, encoding="utf-8") as f:
                data = json.load(f)
            tutorial = data.get("tutorial", {})
            assets = data.get("assets", {}) or {}
            if 'assets' in assets:
                assets = assets['assets']
            css_links = "\n".join(
                f"<link rel='stylesheet' href='{href}'>" for href in assets.get("css", []) or [])
            js_links = "\n".join(
                f"<script src='{src}' defer></script>" for src in assets.get("js", []) or [])
            total_steps = sum(len(p["steps"])
                              for p in tutorial.get("phases", []))

            # Generate flow content if flow.json exists
            flow_content = ""
            flow_data = None
            if flow_json.exists():
                try:
                    with open(flow_json, encoding="utf-8") as f:
                        flow_data = json.load(f)
                    flow_content = f'<div id="flow-data" data-flow="{json.dumps(flow_data)}"></div>'
                    print(
                        f"✅ Loaded flow data for {guide_slug}: {len(flow_data.get('phases', []))} phases")
                except Exception as e:
                    print(f"❌ Error loading flow data for {guide_slug}: {e}")
            else:
                print(f"⚠️ No flow.json found for {guide_slug}")

            templates = get_templates()
            rendered_html = templates["tutorial"].render(
                title=tutorial.get("title", ""),
                description=tutorial.get("description", ""),
                css_links=css_links,
                js_links=js_links,
                tutorial_data=tutorial,
                total_steps=total_steps,
                flow_content=flow_content,
                flow_data=flow_data,
                tutorial_data_json=json.dumps(tutorial),
            )
            tutorial_html.write_text(rendered_html, encoding="utf-8")
            print(f"✅ Regenerated tutorial for {guide_slug}")
            return {"status": "success", "message": f"Guide {guide_slug} regenerated successfully"}
        else:
            return {"status": "error", "message": f"tutorial.json not found for {guide_slug}"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to regenerate guide: {str(e)}"}


@app.get("/admin/check-slug/{slug}")
async def check_slug_availability(slug: str, current_user: bool = Depends(get_current_user_flexible)):
    """Check if a slug is available and suggest alternatives"""
    try:
        # Validate the slug format
        is_valid, error_msg = validate_slug(slug)
        if not is_valid:
            return {
                "available": False,
                "error": error_msg,
                "suggestions": [generate_unique_slug(slug)]
            }

        # Check if slug exists
        guide_dir = GUIDES_DIR / slug
        if guide_dir.exists():
            # Generate suggestions
            suggestions = []
            for i in range(1, 6):  # Generate 5 suggestions
                suggestions.append(f"{slug}-{i}")

            return {
                "available": False,
                "error": f"Slug '{slug}' is already taken",
                "suggestions": suggestions
            }
        else:
            return {
                "available": True,
                "error": None,
                "suggestions": []
            }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to check slug: {str(e)}")


@app.delete("/admin/delete-guide/{guide_slug}")
async def delete_guide(guide_slug: str, current_user: bool = Depends(get_current_user_flexible)):
    """Delete a guide"""
    try:
        guide_dir = GUIDES_DIR / guide_slug
        if not guide_dir.exists():
            raise HTTPException(status_code=404, detail="Guide not found")

        # Remove the entire guide directory
        import shutil
        shutil.rmtree(guide_dir)

        return {"message": f"Guide {guide_slug} deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete guide: {str(e)}")


@app.post("/test-regenerate/{guide_slug}")
async def test_regenerate_guide(guide_slug: str):
    """Simple endpoint to regenerate a guide without authentication"""
    try:
        guide_path = GUIDES_DIR / guide_slug
        if not guide_path.exists():
            return {"status": "error", "message": f"Guide '{guide_slug}' not found"}

        # Force regeneration by calling the generation logic directly
        tutorial_json = guide_path / "tutorial.json"
        flow_json = guide_path / "flow.json"
        tutorial_html = guide_path / "tutorial.html"
        flow_html = guide_path / "flow.html"

        if tutorial_json.exists():
            with open(tutorial_json, encoding="utf-8") as f:
                data = json.load(f)
            tutorial = data.get("tutorial", {})
            assets = data.get("assets", {}) or {}
            if 'assets' in assets:
                assets = assets['assets']
            css_links = "\n".join(
                f"<link rel='stylesheet' href='{href}'>" for href in assets.get("css", []) or [])
            js_links = "\n".join(
                f"<script src='{src}' defer></script>" for src in assets.get("js", []) or [])
            total_steps = sum(len(p["steps"])
                              for p in tutorial.get("phases", []))

            # Generate flow content if flow.json exists
            flow_content = ""
            flow_data = None
            if flow_json.exists():
                try:
                    with open(flow_json, encoding="utf-8") as f:
                        flow_data = json.load(f)
                    flow_content = f'<div id="flow-data" data-flow="{json.dumps(flow_data)}"></div>'
                    print(
                        f"✅ Loaded flow data for {guide_slug}: {len(flow_data.get('phases', []))} phases")
                except Exception as e:
                    print(f"❌ Error loading flow data for {guide_slug}: {e}")
            else:
                print(f"⚠️ No flow.json found for {guide_slug}")

            templates = get_templates()
            rendered_html = templates["tutorial"].render(
                title=tutorial.get("title", ""),
                description=tutorial.get("description", ""),
                css_links=css_links,
                js_links=js_links,
                tutorial_data=tutorial,
                total_steps=total_steps,
                flow_content=flow_content,
                flow_data=flow_data,
                tutorial_data_json=json.dumps(tutorial),
            )
            tutorial_html.write_text(rendered_html, encoding="utf-8")
            print(f"✅ Regenerated tutorial for {guide_slug}")
            return {"status": "success", "message": f"Guide {guide_slug} regenerated successfully"}
        else:
            return {"status": "error", "message": f"tutorial.json not found for {guide_slug}"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to regenerate guide: {str(e)}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
