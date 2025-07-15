import os
from fastapi import FastAPI, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
import json
from fastapi.staticfiles import StaticFiles
from slugify import slugify
from fastapi import Request
from pydantic import BaseModel
from typing import Dict, Any

app = FastAPI()

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

# Development mode - set to True for auto-reload of templates
DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"

app.mount("/guides/static", StaticFiles(directory=STATIC_DIR), name="static")
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


@app.on_event("startup")
def on_startup():
    generate_all_guides()


@app.get("/guides/{guide_slug}/tutorial")
def serve_guide_tutorial(guide_slug: str):
    guide_path = GUIDES_DIR / guide_slug
    tutorial_json = guide_path / "tutorial.json"
    flow_json = guide_path / "flow.json"
    if not tutorial_json.exists():
        return Response("<h1>Tutorial not found</h1>", media_type="text/html")

    # Load tutorial data
    with open(tutorial_json, encoding="utf-8") as f:
        data = json.load(f)
    tutorial = data.get("tutorial", {})
    assets = data.get("assets", {}) or {}
    css_links = "\n".join(
        f"<link rel='stylesheet' href='{href}'>" for href in assets.get("css", []) or [])
    js_links = "\n".join(
        f"<script src='{src}' defer></script>" for src in assets.get("js", []) or [])
    total_steps = sum(len(p["steps"]) for p in tutorial.get("phases", []))

    # Generate flow content if flow.json exists
    flow_content = ""
    flow_data = None
    if flow_json.exists():
        with open(flow_json, encoding="utf-8") as f:
            flow_data = json.load(f)
        flow_content = f'<div id="flow-data" data-flow="{json.dumps(flow_data)}"></div>'

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
    return Response(content=rendered_html, media_type="text/html")


@app.get("/guides")
def list_guides():
    guides = get_guides()
    return {"guides": list(guides.keys())}


@app.get("/guides/api/guides")
def get_guides_with_titles():
    """Return all guides with their titles and links"""
    guides = get_guides()
    guides_data = []

    for guide_slug, guide_path in guides.items():
        tutorial_json = guide_path / "tutorial.json"

        # Default values
        title = guide_slug
        description = ""

        # Try to get title and description from tutorial.json
        if tutorial_json.exists():
            try:
                with open(tutorial_json, encoding="utf-8") as f:
                    data = json.load(f)
                    tutorial = data.get("tutorial", {})
                    title = tutorial.get("title", guide_slug)
                    description = tutorial.get("description", "")
            except Exception as e:
                print(
                    f"Warning: Could not read tutorial.json for {guide_slug}: {e}")

        guides_data.append({
            "slug": guide_slug,
            "title": title,
            "description": description,
            "tutorial_url": f"/guides/{guide_slug}/tutorial"
        })

    return {
        "guides": guides_data,
        "total": len(guides_data)
    }


@app.post("/regenerate")
def regenerate_all_guides():
    """Manually regenerate all guides (useful for development)"""
    try:
        generate_all_guides()
        return {"status": "success", "message": "All guides regenerated successfully"}
    except Exception as e:
        return {"status": "error", "message": f"Failed to regenerate guides: {str(e)}"}


@app.post("/save-tutorial")
async def save_tutorial(request: Request):
    """Save tutorial changes to the JSON file"""
    try:
        # Get the request body
        body = await request.json()
        guide_slug = body.get("guide_slug", "fastapi-chat-app")
        tutorial_data = body.get("tutorial_data")

        if not tutorial_data:
            return {"status": "error", "message": "No tutorial data provided"}

        # Construct the path to the tutorial JSON file
        guide_path = GUIDES_DIR / guide_slug
        tutorial_json = guide_path / "tutorial.json"

        if not tutorial_json.exists():
            return {"status": "error", "message": f"Tutorial file not found for {guide_slug}"}

        # Load existing data to preserve other fields (like assets)
        with open(tutorial_json, encoding="utf-8") as f:
            existing_data = json.load(f)

        # Update the tutorial data
        existing_data["tutorial"] = tutorial_data

        # Save back to file
        with open(tutorial_json, "w", encoding="utf-8") as f:
            json.dump(existing_data, f, indent=2, ensure_ascii=False)

        # Regenerate the HTML
        generate_all_guides()

        return {"status": "success", "message": "Tutorial saved successfully"}

    except Exception as e:
        return {"status": "error", "message": f"Failed to save tutorial: {str(e)}"}


@app.get("/")
def root():
    """Root endpoint with guide links"""
    guides = get_guides()
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Guide Server</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .guide { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .guide a { margin-right: 15px; text-decoration: none; color: #007bff; }
            .guide a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <h1>Available Guides</h1>
    """

    for guide_slug in guides.keys():
        html += f"""
        <div class="guide">
            <h3>{guide_slug}</h3>
            <a href="/guides/{guide_slug}/tutorial">📖 Tutorial & Flow</a>
        </div>
        """

    html += """
    </body>
    </html>
    """
    return Response(content=html, media_type="text/html")
