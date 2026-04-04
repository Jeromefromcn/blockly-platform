#!/bin/bash

# Claude Code PreToolUse hook for Bash commands
# Blocks dangerous patterns with exit code 2

COMMAND=$(jq -r '.tool_input.command // ""' < /dev/stdin)

# Skip if no command
[[ -z "$COMMAND" ]] && exit 0

# 1. Block delete root filesystem
if echo "$COMMAND" | grep -qE 'rm\s+-[rf]+\s+/($|[^a-zA-Z])'; then
    echo "🛡️ BLOCKED: Cannot delete root filesystem (rm -rf /)" >&2
    exit 2
fi

# 2. Block pipe remote scripts to shell
if echo "$COMMAND" | grep -qE '(curl|wget).*\|\s*(sh|bash)'; then
    echo "🛡️ BLOCKED: Cannot pipe remote scripts to shell" >&2
    exit 2
fi

# 3. Block force push to main/master
if echo "$COMMAND" | grep -qE 'git\s+push.*--force.*\s+(main|master)'; then
    echo "🛡️ BLOCKED: Cannot force push to main/master" >&2
    exit 2
fi

# 4. Block DROP TABLE
if echo "$COMMAND" | grep -qiE 'DROP\s+TABLE'; then
    echo "🛡️ BLOCKED: Cannot execute DROP TABLE" >&2
    exit 2
fi

# Allow execution
exit 0
