#!/usr/bin/env python3
"""Normalize Cursor, Codex, and Claude hook events into team JSONL logs."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

VN_TZ = timezone(timedelta(hours=7))
MEMBERS = {
    "nguyen-thanh-tai",
    "nguyen-thanh-toan",
    "hoang-kim-tuan-anh",
    "nguyen-minh-anh",
    "vu-huyen-dieu",
}
TOOLS = {"cursor", "claude", "codex", "antigravity"}
USER_QUERY = re.compile(r"<user_query>\s*(.*?)\s*</user_query>", re.DOTALL)


def git(root: Path, *args: str) -> str:
    try:
        return subprocess.check_output(
            ["git", *args],
            cwd=root,
            text=True,
            encoding="utf-8",
            errors="replace",
            stderr=subprocess.DEVNULL,
        ).strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def repository_root() -> Path | None:
    raw = git(Path.cwd(), "rev-parse", "--show-toplevel")
    return Path(raw) if raw else None


def configured_member(root: Path) -> str:
    member = os.environ.get("AI_LOG_MEMBER", "").strip()
    config = root / ".git" / "ai-log-member"
    if not member and config.is_file():
        member = config.read_text(encoding="utf-8").strip()
    return member if member in MEMBERS else ""


def configured_tools(root: Path) -> set[str]:
    raw = os.environ.get("AI_LOG_TOOLS", "").strip()
    config = root / ".git" / "ai-log-tools"
    if not raw and config.is_file():
        raw = config.read_text(encoding="utf-8").strip()
    selected = {item.strip().lower() for item in raw.split(",") if item.strip()}
    return selected & TOOLS


def repo_name(root: Path) -> str:
    origin = git(root, "remote", "get-url", "origin")
    if origin:
        return origin.rstrip("/").rsplit("/", 1)[-1].removesuffix(".git")
    return root.name


def read_payload() -> dict[str, Any]:
    raw = sys.stdin.buffer.read().decode("utf-8", errors="replace").strip()
    if not raw:
        return {}
    try:
        value = json.loads(raw)
        return value if isinstance(value, dict) else {}
    except json.JSONDecodeError:
        return {}


def latest_cursor_prompt(transcript_path: str) -> tuple[str, str]:
    path = Path(transcript_path)
    if not path.is_file():
        return "", ""

    prompt = ""
    try:
        with path.open(encoding="utf-8") as handle:
            for line in handle:
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if row.get("role") != "user":
                    continue
                for part in row.get("message", {}).get("content", []):
                    if isinstance(part, dict) and part.get("type") == "text":
                        text = str(part.get("text", "")).strip()
                        match = USER_QUERY.search(text)
                        prompt = match.group(1).strip() if match else text
    except OSError:
        return "", path.stem
    return prompt, path.stem


def prompt_from(data: dict[str, Any], tool: str) -> str:
    prompt = data.get("prompt", "")
    if prompt:
        return str(prompt)[:4000]

    if tool == "claude" and isinstance(data.get("tool_input"), dict):
        tool_input = data["tool_input"]
        return str(tool_input.get("prompt") or tool_input.get("content") or "")[:4000]
    return ""


def normalize(
    data: dict[str, Any],
    *,
    tool: str,
    event_override: str,
    root: Path,
) -> dict[str, Any]:
    event = event_override or str(data.get("hook_event_name") or data.get("event") or "")
    transcript = os.environ.get("CURSOR_TRANSCRIPT_PATH", "") if tool == "cursor" else ""
    cursor_prompt, cursor_session = latest_cursor_prompt(transcript) if transcript else ("", "")
    attachments = data.get("attachments") or data.get("files_context") or []

    return {
        "ts": datetime.now(VN_TZ).isoformat(),
        "tool": tool,
        "event": event,
        "session_id": str(
            data.get("session_id")
            or data.get("conversation_id")
            or data.get("generation_id")
            or cursor_session
            or ""
        ),
        "model": str(data.get("model") or "default"),
        "repo": repo_name(root),
        "branch": git(root, "rev-parse", "--abbrev-ref", "HEAD"),
        "commit": git(root, "rev-parse", "--short", "HEAD"),
        "student": git(root, "config", "user.email"),
        "prompt": prompt_from(data, tool) or cursor_prompt,
        "files_context": attachments if isinstance(attachments, list) else [],
    }


def copy_raw_transcript(
    root: Path,
    member: str,
    tool: str,
    data: dict[str, Any],
) -> str:
    """Refresh a raw desktop transcript when the hook exposes its path."""
    source_raw = str(data.get("transcript_path") or "").strip()
    if tool == "cursor":
        source_raw = os.environ.get("CURSOR_TRANSCRIPT_PATH", "").strip() or source_raw
    if not source_raw:
        return ""

    source = Path(source_raw)
    if not source.is_file():
        return ""

    session_id = source.stem
    destination = root / "ai-logs" / member / tool / "sessions" / f"{session_id}.jsonl"
    destination.parent.mkdir(parents=True, exist_ok=True)
    try:
        shutil.copy2(source, destination)
    except OSError:
        return ""
    return str(destination.relative_to(root))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tool", required=True, choices=sorted(TOOLS))
    parser.add_argument("--event", default="")
    args = parser.parse_args()

    root = repository_root()
    if root is None:
        print('{"status":"skipped","reason":"not a git repository"}')
        return 0

    member = configured_member(root)
    if not member:
        print('{"status":"skipped","reason":"AI log member is not configured"}')
        return 0

    if args.tool not in configured_tools(root):
        print('{"status":"skipped","reason":"tool is not enabled for this member"}')
        return 0

    payload = read_payload()
    entry = normalize(payload, tool=args.tool, event_override=args.event, root=root)
    if not entry["event"] and not entry["session_id"] and not entry["prompt"]:
        print('{"status":"skipped","reason":"empty hook payload"}')
        return 0

    output_dir = root / "ai-logs" / member / args.tool
    output_dir.mkdir(parents=True, exist_ok=True)
    with (output_dir / "ai-log.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, ensure_ascii=False) + "\n")

    session_file = copy_raw_transcript(root, member, args.tool, payload)
    print(json.dumps({"status": "logged", "tool": args.tool, "session_file": session_file}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
