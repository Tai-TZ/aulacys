#!/usr/bin/env python3
"""Export raw desktop AI sessions for the current repository."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

MEMBERS = {
    "nguyen-thanh-tai",
    "nguyen-thanh-toan",
    "hoang-kim-tuan-anh",
    "nguyen-minh-anh",
    "vu-huyen-dieu",
}
TOOLS = {"cursor", "claude", "codex", "antigravity"}
VN_TZ = timezone(timedelta(hours=7))
USER_REQUEST = re.compile(r"<USER_REQUEST>(.*?)</USER_REQUEST>", re.DOTALL)


def git(*args: str) -> str:
    try:
        return subprocess.check_output(
            ["git", *args],
            text=True,
            encoding="utf-8",
            errors="replace",
            stderr=subprocess.DEVNULL,
        ).strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def normalized_path(value: str) -> str:
    return value.strip().casefold().replace("/", "\\").rstrip("\\")


def paths_related(first: str, second: str) -> bool:
    a, b = normalized_path(first), normalized_path(second)
    return bool(a and b) and (
        a == b or a.startswith(b + "\\") or b.startswith(a + "\\")
    )


def walk_strings(value: Any) -> Iterable[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from walk_strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from walk_strings(item)


def transcript_matches_repo(path: Path, root: Path) -> bool:
    try:
        with path.open(encoding="utf-8", errors="replace") as handle:
            for line in handle:
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                for value in walk_strings(row):
                    if paths_related(value, str(root)):
                        return True
    except OSError:
        return False
    return False


def copy_session(source: Path, destination: Path, session_id: str) -> bool:
    target = destination / f"{session_id}.jsonl"
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        shutil.copy2(source, target)
        return True
    except OSError:
        return False


def cursor_transcripts(root: Path) -> list[tuple[Path, str]]:
    key = re.sub(r"[:\\/ ]+", "-", str(root))
    project_dir = Path.home() / ".cursor" / "projects" / key
    source = project_dir / "agent-transcripts"
    if not source.is_dir():
        return []
    return [(path, path.stem) for path in source.rglob("*.jsonl")]


def matching_transcripts(base: Path, root: Path) -> list[tuple[Path, str]]:
    if not base.is_dir():
        return []
    result: list[tuple[Path, str]] = []
    for path in base.rglob("*.jsonl"):
        if transcript_matches_repo(path, root):
            result.append((path, path.stem))
    return result


def antigravity_transcripts(root: Path) -> list[tuple[Path, str]]:
    result: list[tuple[Path, str]] = []
    brain_dirs = (
        Path.home() / ".gemini" / "antigravity-ide" / "brain",
        Path.home() / ".gemini" / "antigravity" / "brain",
    )
    for brain in brain_dirs:
        if not brain.is_dir():
            continue
        for conversation in brain.iterdir():
            transcript = (
                conversation / ".system_generated" / "logs" / "transcript.jsonl"
            )
            if transcript.is_file() and transcript_matches_repo(transcript, root):
                result.append((transcript, conversation.name))
    return result


def append_antigravity_index(
    transcript: Path,
    session_id: str,
    output: Path,
    root: Path,
) -> None:
    existing: set[tuple[str, str]] = set()
    if output.is_file():
        for line in output.read_text(encoding="utf-8", errors="replace").splitlines():
            try:
                row = json.loads(line)
                existing.add((str(row.get("session_id", "")), str(row.get("prompt", ""))))
            except json.JSONDecodeError:
                continue

    rows: list[dict[str, Any]] = []
    try:
        with transcript.open(encoding="utf-8", errors="replace") as handle:
            for line in handle:
                try:
                    item = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if item.get("type") != "USER_INPUT" or item.get("source") != "USER_EXPLICIT":
                    continue
                content = str(item.get("content") or "")
                match = USER_REQUEST.search(content)
                prompt = (match.group(1) if match else content).strip()
                if not prompt or (session_id, prompt) in existing:
                    continue
                existing.add((session_id, prompt))
                rows.append(
                    {
                        "ts": item.get("created_at") or datetime.now(VN_TZ).isoformat(),
                        "tool": "antigravity",
                        "event": "USER_INPUT",
                        "session_id": session_id,
                        "model": "default",
                        "repo": root.name,
                        "branch": git("rev-parse", "--abbrev-ref", "HEAD"),
                        "commit": git("rev-parse", "--short", "HEAD"),
                        "student": git("config", "user.email"),
                        "prompt": prompt[:4000],
                        "files_context": [],
                    }
                )
    except OSError:
        return

    if rows:
        output.parent.mkdir(parents=True, exist_ok=True)
        with output.open("a", encoding="utf-8") as handle:
            for row in rows:
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def sources_for(tool: str, root: Path) -> list[tuple[Path, str]]:
    if tool == "cursor":
        return cursor_transcripts(root)
    if tool == "claude":
        return matching_transcripts(Path.home() / ".claude" / "projects", root)
    if tool == "codex":
        return matching_transcripts(Path.home() / ".codex" / "sessions", root)
    return antigravity_transcripts(root)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--member", choices=sorted(MEMBERS))
    parser.add_argument("--tools")
    args = parser.parse_args()

    root_raw = git("rev-parse", "--show-toplevel")
    if not root_raw:
        parser.error("run inside the aulacys Git repository")
    root = Path(root_raw)

    member = args.member
    if not member:
        member_file = root / ".git" / "ai-log-member"
        member = member_file.read_text(encoding="utf-8").strip() if member_file.is_file() else ""
    if member not in MEMBERS:
        parser.error("AI log member is not configured; run setup-ai-logs.ps1")

    tools_raw = args.tools
    if not tools_raw:
        tools_file = root / ".git" / "ai-log-tools"
        tools_raw = tools_file.read_text(encoding="utf-8").strip() if tools_file.is_file() else ""
    selected = {item.strip().lower() for item in tools_raw.split(",") if item.strip()}
    invalid = selected - TOOLS
    if invalid:
        parser.error(f"unsupported tools: {', '.join(sorted(invalid))}")
    if not selected:
        parser.error("AI log tools are not configured; run setup-ai-logs.ps1")

    for tool in sorted(selected):
        tool_root = root / "ai-logs" / member / tool
        sessions = tool_root / "sessions"
        (tool_root / "screenshots").mkdir(parents=True, exist_ok=True)
        count = 0
        for source, session_id in sources_for(tool, root):
            if copy_session(source, sessions, session_id):
                count += 1
                if tool == "antigravity":
                    append_antigravity_index(
                        source,
                        session_id,
                        tool_root / "ai-log.jsonl",
                        root,
                    )
        print(f"[ai-log] {tool}: exported {count} raw session(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
