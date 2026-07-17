#!/usr/bin/env bash
# Preflight tool check for macOS / Linux / Git Bash.
# Verifies the terminal tools this repo needs and prints install hints.
# Run:  bash scripts/check-tools.sh
# Exit 0 = all required tools OK, 1 = something required is missing.

missing=()

# ver_ge A B  -> true if version A >= B  (dotted numeric)
ver_ge() {
  [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

check() {
  local name="$1" cmd="$2" min="$3" required="$4" hint="$5"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    printf '%-16s [%s]  MISSING\n' "$name" "$required"
    [ "$required" = "required" ] && missing+=("$name -> $hint")
    return
  fi
  local raw
  raw="$("$cmd" --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -n1)"
  if [ -n "$min" ] && [ -n "$raw" ] && ! ver_ge "$raw" "$min"; then
    printf '%-16s [%s]  OUTDATED (have %s, need >= %s)\n' "$name" "$required" "$raw" "$min"
    [ "$required" = "required" ] && missing+=("$name -> $hint")
  else
    printf '%-16s [%s]  OK  %s\n' "$name" "$required" "$raw"
  fi
}

echo ""
echo "=== Dev tools check ==="
echo ""

# macOS: brew install ... | Debian/Ubuntu: apt install ...
check "Git"            git     2.0    required "brew install git   |  apt install git"
check "Python"         python3 3.11   required "brew install python@3.12  |  apt install python3.12"
check "Node.js"        node    18.17  required "brew install node  |  see https://nodejs.org"
check "npm"            npm     9.0    required "(bundled with Node.js)"
check "Docker"         docker  20.0   optional "https://www.docker.com/products/docker-desktop/"

echo ""
if [ "${#missing[@]}" -eq 0 ]; then
  echo "All required tools present. You're good to go."
  echo ""
  exit 0
fi

echo "Missing/outdated required tools:"
for m in "${missing[@]}"; do echo "  - $m"; done
echo ""
echo "Install them, reopen your terminal, then re-run this script."
echo ""
exit 1
